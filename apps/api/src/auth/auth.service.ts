import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from './session.service';
import { MAIL_QUEUE, MAIL_JOBS } from '../mail/mail.constants';

const MAGIC_LINK_EXPIRY_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  /**
   * Request a magic link for the given email
   * Creates a magic link token and queues an email to be sent
   */
  async requestMagicLink(email: string): Promise<{ success: boolean }> {
    // Find user by email (include gym for ORG_ADMIN check, member for MEMBER check)
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { gym: true, member: true },
    });

    if (!user) {
      // Don't reveal if user exists - still return success
      this.logger.warn(`Magic link requested for non-existent email: ${email}`);
      return { success: true };
    }

    // Don't send a login link to gym owners whose gym is not active
    if (user.role === 'ORG_ADMIN' && user.gym && user.gym.status !== 'ACTIVE') {
      this.logger.warn(
        `Magic link blocked for non-active gym owner: ${user.id} (gym status: ${user.gym.status})`,
      );
      return { success: true };
    }

    // Don't send a login link to deactivated members
    if (user.role === 'MEMBER' && user.member?.status === 'INACTIVE') {
      this.logger.warn(`Magic link blocked for inactive member: ${user.id}`);
      return { success: true };
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000,
    );

    // Invalidate any existing magic links for this user
    await this.prisma.magicLink.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() }, // Mark as used to invalidate
    });

    // Create new magic link
    await this.prisma.magicLink.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Build magic link URL
    const appUrl = process.env.APP_URL;
    const magicLinkUrl = `${appUrl}/auth/verify?token=${token}`;

    // Queue email
    await this.mailQueue.add(MAIL_JOBS.SEND_MAGIC_LINK, {
      email: user.email,
      magicLink: magicLinkUrl,
      userName: user.name,
    });

    this.logger.log(`Magic link queued for user ${user.id}`);
    return { success: true };
  }

  /**
   * Verify a magic link token and create a session
   * Returns the session ID on success
   */
  async verifyMagicLink(token: string): Promise<{
    sessionId: string;
    user: { id: string; email: string; name: string; role: string };
  }> {
    // Find the magic link (include gym for ORG_ADMIN check, member for MEMBER check)
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
      include: { user: { include: { gym: true, member: true } } },
    });

    if (!magicLink) {
      throw new NotFoundException('Invalid or expired magic link');
    }

    // Check if already used
    if (magicLink.usedAt) {
      throw new NotFoundException('This magic link has already been used');
    }

    // Check if expired
    if (magicLink.expiresAt < new Date()) {
      throw new NotFoundException('This magic link has expired');
    }

    // Block gym owners whose gym is not active
    if (magicLink.user.role === 'ORG_ADMIN' && magicLink.user.gym) {
      const gymStatus = magicLink.user.gym.status;
      if (gymStatus === 'PENDING') {
        throw new ForbiddenException(
          'Your gym registration is pending approval by an administrator',
        );
      }
      if (gymStatus === 'REJECTED') {
        throw new ForbiddenException('Your gym registration has been rejected');
      }
      if (gymStatus === 'SUSPENDED') {
        throw new ForbiddenException('Your gym account has been suspended');
      }
      if (gymStatus === 'INACTIVE') {
        throw new ForbiddenException('Your gym account is inactive');
      }
    }

    // Block deactivated members
    if (
      magicLink.user.role === 'MEMBER' &&
      magicLink.user.member?.status === 'INACTIVE'
    ) {
      throw new ForbiddenException('Your account has been deactivated');
    }

    // Atomically mark as used — WHERE usedAt IS NULL ensures only one concurrent
    // request wins; a second concurrent verify will see count === 0 and be rejected.
    const claim = await this.prisma.magicLink.updateMany({
      where: { id: magicLink.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (claim.count === 0) {
      throw new NotFoundException('This magic link has already been used');
    }

    // Confirm user email if not already confirmed
    if (!magicLink.user.isConfirmed) {
      await this.prisma.user.update({
        where: { id: magicLink.user.id },
        data: { isConfirmed: true },
      });
    }

    // Create session
    const sessionId = await this.sessionService.createSession(magicLink.userId);

    this.logger.log(`User ${magicLink.userId} authenticated via magic link`);

    return {
      sessionId,
      user: {
        id: magicLink.user.id,
        email: magicLink.user.email,
        name: magicLink.user.name,
        role: magicLink.user.role,
      },
    };
  }

  /**
   * Logout user by deleting their session
   */
  async logout(sessionId: string): Promise<void> {
    await this.sessionService.deleteSession(sessionId);
  }

  /**
   * Get the current user from session
   */
  async getCurrentUser(sessionId: string) {
    const user = await this.sessionService.validateSession(sessionId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      gymId: user.gymId,
      isConfirmed: user.isConfirmed,
    };
  }

  /**
   * Fetch user with gym/member status for the /auth/me endpoint
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        gym: { select: { status: true, statusReason: true } },
        member: { select: { status: true } },
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      gymId: user.gymId,
      isConfirmed: user.isConfirmed,
      gymStatus: user.gym?.status ?? null,
      gymStatusReason: user.gym?.statusReason ?? null,
      memberStatus: user.member?.status ?? null,
    };
  }
}
