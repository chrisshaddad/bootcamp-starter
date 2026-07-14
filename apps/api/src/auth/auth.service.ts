import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash, randomBytes } from 'crypto';
import { Prisma, type User } from '@repo/db';
import type { UserResponse } from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from './session.service';
import { PasswordService } from './password.service';
import { MAIL_QUEUE, MAIL_JOBS } from '../mail/mail.constants';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../audit/audit.constants';

const MAGIC_LINK_EXPIRY_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly passwordService: PasswordService,
    private readonly audit: AuditService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  /**
   * Request a magic link for the given email.
   *
   * Magic link is a login mechanism for accounts that already exist — it never
   * creates one. The email must resolve to a real user first:
   *   - not found            -> reject; the caller must register first.
   *   - SUSPENDED / INACTIVE -> reject via assertCanAuthenticate.
   *   - PENDING (invited, no password yet) -> issue a link; verifying it routes
   *     them to the set-password screen (see verifyMagicLink consumers).
   *   - ACTIVE               -> issue a link that logs them straight in.
   *
   * Note: this deliberately reveals whether an email is registered (a clear
   * "no account" error is required by product) and so is NOT enumeration-safe,
   * unlike the constant-time password login.
   */
  async requestMagicLink(email: string): Promise<{ success: boolean }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      this.logger.warn('Magic link requested for non-existent email');
      throw new NotFoundException(
        'No account found with this email — please register first.',
      );
    }

    // Throws for SUSPENDED/INACTIVE; PENDING and ACTIVE are allowed through.
    this.assertCanAuthenticate(user);

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

    // Atomically consume the link: only mark used if it is still unused and not
    // yet expired. This closes both the race where the same token is verified
    // twice concurrently and the one where it expires between the checks above
    // and this write.
    const consumed = await this.prisma.magicLink.updateMany({
      where: { id: magicLink.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    if (consumed.count === 0) {
      throw new NotFoundException('This magic link has already been used');
    }

    const sessionId = await this.sessionService.createSession(magicLink.userId);

    this.logger.log(`User ${magicLink.userId} authenticated via magic link`);

    await this.audit.record({
      userId: magicLink.userId,
      action: AUDIT_ACTIONS.AUTH_LOGIN,
      entity: AUDIT_ENTITIES.USER,
      entityId: magicLink.userId,
      details: { method: 'magic_link' },
    });

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

    await this.audit.record({
      userId: user.id,
      action: AUDIT_ACTIONS.AUTH_LOGIN,
      entity: AUDIT_ENTITIES.USER,
      entityId: user.id,
      details: { method: 'password' },
    });

    return { sessionId, user: this.toUserResponse(user) };
  }

  /**
   * CLIENT self-registration. This is the only path that creates a
   * self-registered client's record. The account is created PENDING with no
   * password and a magic link is emailed — the caller is NOT signed in. Clicking
   * that link authenticates them and, because they're PENDING, routes them to
   * the set-password screen (see verifyMagicLink consumers + the web PENDING
   * guard). Setting that first password flips them to ACTIVE; from then on both
   * password and magic-link login work.
   *
   * The email must be brand new. If it already exists — including an
   * admin-invited PENDING account — registration is rejected so the existing
   * user is directed to their login link instead of overwriting the record.
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
    if (existing) {
      throw this.emailTakenError();
    }

    let created: User;
    try {
      created = await this.prisma.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email,
          phoneNumber: input.phoneNumber ?? null,
          role: 'CLIENT',
          // PENDING until they set a password; verifying the magic link routes
          // PENDING users to the set-password screen before the rest of the app.
          status: 'PENDING',
        },
      });
    } catch (error) {
      // A concurrent signup for the same email can win the race between the
      // findUnique above and this create, raising a unique-constraint
      // violation. Surface it as the same "email taken" rejection.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw this.emailTakenError();
      }
      throw error;
    }

    this.logger.log('New CLIENT registered');

    await this.audit.record({
      userId: created.id,
      action: AUDIT_ACTIONS.AUTH_SIGNUP,
      entity: AUDIT_ENTITIES.USER,
      entityId: created.id,
      details: { email },
    });

    // Email the link that carries them into the set-password step. The record
    // now exists, so we can issue it directly without the existence check.
    await this.issueMagicLink(created);

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

    await this.audit.record({
      userId,
      action: AUDIT_ACTIONS.AUTH_SET_PASSWORD,
      entity: AUDIT_ENTITIES.USER,
      entityId: userId,
      // Flags the onboarding case where setting a password activates an invited
      // (PENDING) account.
      details: { onboarded: user.status === 'PENDING' },
    });

    return this.toUserResponse(updated);
  }

  /**
   * Logout user by deleting their session
   */
  async logout(sessionId: string, userId: string | null): Promise<void> {
    await this.sessionService.deleteSession(sessionId);

    await this.audit.record({
      userId,
      action: AUDIT_ACTIONS.AUTH_LOGOUT,
      entity: AUDIT_ENTITIES.USER,
      entityId: userId,
    });
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

    // Logged here (not in requestMagicLink) so it only fires for a real,
    // authenticatable account — non-existent / blocked emails never reach this
    // point, preserving the non-enumerable behaviour of the request endpoint.
    await this.audit.record({
      userId: user.id,
      action: AUDIT_ACTIONS.AUTH_MAGIC_LINK_REQUESTED,
      entity: AUDIT_ENTITIES.USER,
      entityId: user.id,
    });
  }

  /** Only the random token reaches the user; the DB stores its SHA-256 hash. */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Rejection for a signup whose email is already registered — whether it's an
   * admin invite, a finished account, or a half-finished signup. Sends them to
   * the login page, which offers both a magic link and password login, so the
   * message holds regardless of which case it is.
   */
  private emailTakenError(): ConflictException {
    return new ConflictException(
      'An account with this email already exists. Head to the login page to ' +
        'sign in with your password or request a magic link.',
    );
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
