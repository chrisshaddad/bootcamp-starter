import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import type { User } from '@repo/db';
import type { UserResponse } from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from './session.service';
import { MAIL_QUEUE, MAIL_JOBS } from '../mail/mail.constants';

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const INVITATION_EXPIRY_DAYS = 7;
const INACTIVE_ACCOUNT_MESSAGE =
  'This account is currently inactive. Please contact your administrator for access.';
const INACTIVE_INSTITUTION_MESSAGE =
  'Your institution is not currently active. Please contact platform support.';

// Caps how often a magic link can be requested for a given email. Without
// this, anyone who knows an email can repeatedly call requestMagicLink to
// invalidate the real owner's outstanding link (createMagicLinkToken kills
// the prior one on every call) — a zero-auth way to lock someone out.
const MAGIC_LINK_RATE_LIMIT_MAX = 5;
const MAGIC_LINK_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const RATE_LIMIT_MESSAGE =
  'Too many login link requests for this email address. Please wait a few minutes and try again.';

/**
 * Single source of truth for shaping a Prisma User into the UserResponse
 * wire contract — every endpoint returning user data to the client should
 * go through this instead of listing fields inline, so they can't drift.
 */
export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    institutionId: user.institutionId,
    isActive: user.isActive,
    isConfirmed: user.isConfirmed,
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  /**
   * Mint a fresh magic-link token for a user, invalidating any outstanding
   * ones. Returns the token so callers can build the URL they need
   * (sign-in vs. invitation). Shared by requestMagicLink and sendInvitation
   * so the token/expiry logic lives in one place. Sign-in links default to
   * the short-lived expiry; sendInvitation passes the longer one explicitly
   * since a new hire may not check their email for a few days.
   */
  private async createMagicLinkToken(
    userId: string,
    expiryMs: number = MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000,
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiryMs);

    // Invalidate any existing magic links for this user
    await this.prisma.magicLink.updateMany({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() }, // Mark as used to invalidate
    });

    await this.prisma.magicLink.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  // INCR and EXPIRE run as one Lua script on the Redis server, so there's no
  // window between them where a crash/disconnect could leave the key
  // incremented but without a TTL — which would otherwise turn into a
  // permanent block for that email instead of a bounded one.
  private static readonly RATE_LIMIT_SCRIPT = `
    local attempts = redis.call("INCR", KEYS[1])
    if tonumber(attempts) == 1 then
      redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    return attempts
  `;

  /**
   * Counts requests per email in a rolling window and rejects once the cap
   * is exceeded. Keyed by email, not IP — this bounds the damage from
   * someone spamming a known victim's address to a limited window, rather
   * than stopping it outright (we can't tell the real owner's request from
   * an attacker's by email alone).
   */
  private async enforceMagicLinkRateLimit(email: string): Promise<void> {
    const key = `magic-link-rate-limit:${email}`;
    const attempts = await this.redis.eval(
      AuthService.RATE_LIMIT_SCRIPT,
      1,
      key,
      MAGIC_LINK_RATE_LIMIT_WINDOW_SECONDS,
    );

    if (Number(attempts) > MAGIC_LINK_RATE_LIMIT_MAX) {
      this.logger.warn('Magic link rate limit exceeded');
      throw new ForbiddenException(RATE_LIMIT_MESSAGE);
    }
  }

  /**
   * Request a magic link for the given email
   * Creates a magic link token and queues an email to be sent
   */
  async requestMagicLink(email: string): Promise<{ success: boolean }> {
    const normalizedEmail = email.toLowerCase();

    await this.enforceMagicLinkRateLimit(normalizedEmail);

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { institution: { select: { status: true } } },
    });

    if (!user) {
      // Deliberately reveals account existence, per product decision — this
      // is an anti-pattern for most auth flows (enables email enumeration)
      // but was explicitly requested over the safer silent-success default.
      this.logger.warn('Magic link requested for a non-existent account');
      throw new NotFoundException('No account found with this email address');
    }

    if (!user.isActive) {
      this.logger.warn(`Magic link requested for deactivated user ${user.id}`);
      throw new ForbiddenException(INACTIVE_ACCOUNT_MESSAGE);
    }

    if (user.institution.status !== 'ACTIVE') {
      this.logger.warn(
        `Magic link requested for user ${user.id} in non-active institution ${user.institutionId}`,
      );
      throw new ForbiddenException(INACTIVE_INSTITUTION_MESSAGE);
    }

    const token = await this.createMagicLinkToken(user.id);

    // Build magic link URL
    const appUrl = process.env.APP_URL;
    const magicLinkUrl = `${appUrl}/auth/verify?token=${token}`;

    // Queue email
    await this.mailQueue.add(MAIL_JOBS.SEND_MAGIC_LINK, {
      email: user.email,
      magicLink: magicLinkUrl,
      userName: user.fullName,
    });

    this.logger.log(`Magic link queued for user ${user.id}`);
    return { success: true };
  }

  /**
   * Send an onboarding invitation to a freshly-created user. Mints a magic
   * link (so the invitee can log in immediately) and queues the invitation
   * email. Used by Users/Patients modules right after account creation.
   */
  async sendInvitation(
    user: Pick<User, 'id' | 'email'>,
    inviterName: string,
    institutionName: string,
  ): Promise<void> {
    const token = await this.createMagicLinkToken(
      user.id,
      INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    const appUrl = process.env.APP_URL;
    const invitationLink = `${appUrl}/auth/verify?token=${token}`;

    await this.mailQueue.add(MAIL_JOBS.SEND_INVITATION, {
      email: user.email,
      inviterName,
      institutionName,
      invitationLink,
    });

    this.logger.log(`Invitation queued for user ${user.id}`);
  }

  /**
   * Let an institution's other admins know a new user was created — the
   * invitee already got their own invitation email via sendInvitation; this
   * is a separate heads-up for admins who didn't do the creating themselves.
   * Best-effort: callers should not let a failure here fail the creation.
   */
  async notifyAdminsOfNewUser(params: {
    institutionId: string;
    excludeUserId: string;
    newUserName: string;
    newUserRoleLabel: string;
    createdByName: string;
  }): Promise<void> {
    const [admins, institution] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          institutionId: params.institutionId,
          role: 'INSTITUTION_ADMIN',
          isActive: true,
          id: { not: params.excludeUserId },
        },
        select: { email: true },
      }),
      this.prisma.institution.findUniqueOrThrow({
        where: { id: params.institutionId },
        select: { name: true },
      }),
    ]);

    if (admins.length === 0) {
      return;
    }

    await this.mailQueue.add(MAIL_JOBS.NOTIFY_NEW_USER, {
      adminEmails: admins.map((admin) => admin.email),
      newUserName: params.newUserName,
      newUserRoleLabel: params.newUserRoleLabel,
      institutionName: institution.name,
      createdByName: params.createdByName,
    });

    this.logger.log(
      `Queued new-user notification for ${admins.length} admin(s) in institution ${params.institutionId}`,
    );
  }

  /**
   * Verify a magic link token and create a session
   * Returns the session ID on success
   */
  async verifyMagicLink(token: string): Promise<{
    sessionId: string;
    user: UserResponse;
  }> {
    // Find the magic link
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
      include: {
        user: { include: { institution: { select: { status: true } } } },
      },
    });

    if (!magicLink) {
      throw new NotFoundException('Invalid or expired magic link');
    }

    if (!magicLink.user.isActive) {
      this.logger.warn(
        `Magic link verification attempted for deactivated user ${magicLink.userId}`,
      );
      throw new ForbiddenException(INACTIVE_ACCOUNT_MESSAGE);
    }

    if (magicLink.user.institution.status !== 'ACTIVE') {
      this.logger.warn(
        `Magic link verification attempted for user ${magicLink.userId} in non-active institution`,
      );
      throw new ForbiddenException(INACTIVE_INSTITUTION_MESSAGE);
    }

    // Check if already used
    if (magicLink.usedAt) {
      throw new NotFoundException('This magic link has already been used');
    }

    // Check if expired
    if (magicLink.expiresAt < new Date()) {
      throw new NotFoundException('This magic link has expired');
    }

    // Mark as used
    await this.prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

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
      user: toUserResponse(magicLink.user),
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
  async getCurrentUser(sessionId: string): Promise<UserResponse | null> {
    const user = await this.sessionService.validateSession(sessionId);
    if (!user) {
      return null;
    }

    return toUserResponse(user);
  }
}
