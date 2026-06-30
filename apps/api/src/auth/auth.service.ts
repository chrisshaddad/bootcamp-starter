import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash, randomBytes } from 'crypto';
import type { User } from '@repo/db';
import type { UserResponse } from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from './session.service';
import { PasswordService } from './password.service';
import { MAIL_QUEUE, MAIL_JOBS } from '../mail/mail.constants';

const MAGIC_LINK_EXPIRY_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly passwordService: PasswordService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  /**
   * Request a magic link for the given email.
   *
   * Always resolves to `{ success: true }` regardless of whether the email
   * exists or the account is allowed to log in — this prevents account
   * enumeration. A link is only actually created/sent for accounts that can
   * authenticate (not SUSPENDED/INACTIVE).
   */
  async requestMagicLink(email: string): Promise<{ success: boolean }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      this.logger.warn(
        `Magic link requested for non-existent email: ${normalizedEmail}`,
      );
      return { success: true };
    }

    if (!this.canAuthenticate(user)) {
      this.logger.warn(
        `Magic link requested for ${user.status} account ${user.id}; not sending`,
      );
      return { success: true };
    }

    await this.issueMagicLink(user);
    return { success: true };
  }

  /**
   * Verify a magic-link token, consume it, and create a session.
   * Blocks SUSPENDED/INACTIVE accounts. PENDING (invited staff) is allowed so
   * they can reach the set-password step.
   */
  async verifyMagicLink(token: string): Promise<{
    sessionId: string;
    user: UserResponse;
  }> {
    const tokenHash = this.hashToken(token);

    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (!magicLink) {
      throw new NotFoundException('Invalid or expired magic link');
    }

    if (magicLink.usedAt) {
      throw new NotFoundException('This magic link has already been used');
    }

    if (magicLink.expiresAt < new Date()) {
      throw new NotFoundException('This magic link has expired');
    }

    this.assertCanAuthenticate(magicLink.user);

    // Atomically consume the link: only mark used if it is still unused. This
    // closes the race where the same token is verified twice concurrently.
    const consumed = await this.prisma.magicLink.updateMany({
      where: { id: magicLink.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (consumed.count === 0) {
      throw new NotFoundException('This magic link has already been used');
    }

    const sessionId = await this.sessionService.createSession(magicLink.userId);

    this.logger.log(`User ${magicLink.userId} authenticated via magic link`);

    return { sessionId, user: this.toUserResponse(magicLink.user) };
  }

  /**
   * Authenticate with email + password (secondary flow).
   * Runs in roughly constant time whether or not the user/password exists, and
   * returns the same generic error for every failure mode to avoid enumeration.
   */
  async loginWithPassword(
    email: string,
    password: string,
  ): Promise<{ sessionId: string; user: UserResponse }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password) {
      // Spend comparable CPU so timing doesn't reveal whether the account
      // exists or has a password set.
      await this.passwordService.verifyAgainstDummy(password);
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await this.passwordService.verify(user.password, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Password matched — the account is real, so it's safe to be specific.
    this.assertCanAuthenticate(user);

    const sessionId = await this.sessionService.createSession(user.id);
    this.logger.log(`User ${user.id} authenticated via password`);

    return { sessionId, user: this.toUserResponse(user) };
  }

  /**
   * CLIENT self-registration. Forces role = CLIENT, status = ACTIVE, and emails
   * a magic link to verify the address. Non-enumerable: if the email already
   * exists we simply (re)send a magic link instead of erroring.
   */
  async signup(input: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  }): Promise<{ success: boolean }> {
    const email = input.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!existing) {
      await this.prisma.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email,
          phoneNumber: input.phoneNumber ?? null,
          role: 'CLIENT',
          status: 'ACTIVE',
        },
      });
      this.logger.log(`New CLIENT registered: ${email}`);
    } else {
      this.logger.warn(
        `Signup for existing email ${email}; sending login link instead`,
      );
    }

    // Sends a link for the new account, or for the pre-existing one — caller
    // can't tell the difference.
    await this.requestMagicLink(email);
    return { success: true };
  }

  /**
   * Set or change the current user's password. For invited staff this also
   * flips PENDING -> ACTIVE, completing onboarding.
   */
  async setPassword(userId: string, password: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await this.passwordService.hash(password);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        status: user.status === 'PENDING' ? 'ACTIVE' : user.status,
      },
    });

    this.logger.log(
      `Password set for user ${userId} (status ${updated.status})`,
    );
    return this.toUserResponse(updated);
  }

  /**
   * Logout user by deleting their session
   */
  async logout(sessionId: string): Promise<void> {
    await this.sessionService.deleteSession(sessionId);
  }

  // --- internals --------------------------------------------------------

  /** Generate a token, persist its hash, and queue the email. */
  private async issueMagicLink(user: User): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000,
    );

    // Invalidate any still-valid links for this user before issuing a new one.
    await this.prisma.magicLink.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    await this.prisma.magicLink.create({
      data: { userId: user.id, token: tokenHash, expiresAt },
    });

    const magicLinkUrl = `${process.env.APP_URL}/auth/verify?token=${rawToken}`;

    await this.mailQueue.add(MAIL_JOBS.SEND_MAGIC_LINK, {
      email: user.email,
      magicLink: magicLinkUrl,
      userName: `${user.firstName} ${user.lastName}`,
    });

    this.logger.log(`Magic link queued for user ${user.id}`);
  }

  /** Only the random token reaches the user; the DB stores its SHA-256 hash. */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private canAuthenticate(user: Pick<User, 'status'>): boolean {
    return user.status !== 'SUSPENDED' && user.status !== 'INACTIVE';
  }

  private assertCanAuthenticate(user: Pick<User, 'status'>): void {
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('This account has been suspended');
    }
    if (user.status === 'INACTIVE') {
      throw new ForbiddenException('This account is inactive');
    }
  }

  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      pharmacyId: user.pharmacyId,
      branchId: user.branchId,
    };
  }
}
