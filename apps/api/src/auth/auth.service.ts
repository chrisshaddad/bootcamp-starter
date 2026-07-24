import {
  ConflictException,
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
import type { PatronRegisterResponse } from '@repo/contracts';

const MAGIC_LINK_EXPIRY_MINUTES = 15;
// Invitation links live longer than login links (7 days) — the copy in
// invitation.email.ts states this window, so keep them in sync.
const INVITATION_EXPIRY_MINUTES = 7 * 24 * 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  /**
   * Public patron self-signup. Not tied to any library - joining a specific
   * library is a separate, later step (portal membership requests). Unlike
   * requestMagicLink's deliberate "don't reveal" behavior, this endpoint is
   * explicitly "create my account", so an existing email is a clear conflict
   * rather than a silently-successful no-op.
   */
  async registerPatron(
    name: string,
    email: string,
  ): Promise<PatronRegisterResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException(
        `An account with the email "${email}" already exists.`,
      );
    }

    const user = await this.prisma.user.create({
      data: { email, name, role: 'MEMBER' },
    });

    await this.requestMagicLink(email);

    return { id: user.id, name: user.name, email: user.email };
  }

  /**
   * Mint a fresh single-use magic-link token for a user (invalidating any
   * outstanding ones) and return the sign-in URL. Shared by the login flow and
   * the staff-invitation flow.
   */
  private async issueMagicLinkToken(
    userId: string,
    expiryMinutes: number = MAGIC_LINK_EXPIRY_MINUTES,
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Invalidate any existing (unused, unexpired) magic links for this user.
    await this.prisma.magicLink.updateMany({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() }, // Mark as used to invalidate
    });

    await this.prisma.magicLink.create({
      data: { userId, token, expiresAt },
    });

    return `${process.env.APP_URL}/auth/verify?token=${token}`;
  }

  /**
   * Request a magic link for the given email.
   * Creates a magic link token and queues a sign-in email. Brand-new accounts
   * (never confirmed) get a "welcome" heading; returning users get "welcome back".
   */
  async requestMagicLink(email: string): Promise<{ success: boolean }> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists - still return success
      this.logger.warn(`Magic link requested for non-existent email: ${email}`);
      return { success: true };
    }

    const magicLinkUrl = await this.issueMagicLinkToken(user.id);

    // Queue email
    await this.mailQueue.add(MAIL_JOBS.SEND_MAGIC_LINK, {
      email: user.email,
      magicLink: magicLinkUrl,
      userName: user.name,
      isNewAccount: !user.isConfirmed,
    });

    this.logger.log(`Magic link queued for user ${user.id}`);
    return { success: true };
  }

  /**
   * Send a newly-invited staff member their first sign-in link as an
   * invitation email (naming the inviter + library) rather than the
   * "welcome back" login email. Uses a longer expiry so an invitee has time
   * to act on it.
   */
  async sendStaffInvitation(
    email: string,
    inviterName: string,
    organizationName: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      this.logger.warn(`Invitation requested for non-existent email: ${email}`);
      return;
    }

    const invitationLink = await this.issueMagicLinkToken(
      user.id,
      INVITATION_EXPIRY_MINUTES,
    );

    await this.mailQueue.add(MAIL_JOBS.SEND_INVITATION, {
      email: user.email,
      inviterName,
      organizationName,
      invitationLink,
    });

    this.logger.log(`Invitation queued for user ${user.id}`);
  }

  /**
   * Send a walk-in library member's newly-linked account their first sign-in
   * link, so they can start using the patron portal for a membership staff
   * just linked to their (new or existing) account. Takes the already-
   * resolved user directly, unlike sendStaffInvitation, since the caller has
   * already found-or-created the account and knows its real stored name.
   */
  async sendMembershipClaimInvitation(
    user: { id: string; email: string; name: string },
    details: { organizationName: string; libraryCardNumber: string },
  ): Promise<void> {
    const claimLink = await this.issueMagicLinkToken(
      user.id,
      INVITATION_EXPIRY_MINUTES,
    );

    await this.mailQueue.add(MAIL_JOBS.SEND_MEMBERSHIP_CLAIM, {
      email: user.email,
      patronName: user.name,
      organizationName: details.organizationName,
      libraryCardNumber: details.libraryCardNumber,
      claimLink,
    });

    this.logger.log(`Membership claim invitation queued for user ${user.id}`);
  }

  /**
   * Verify a magic link token and create a session
   * Returns the session ID on success
   */
  async verifyMagicLink(token: string): Promise<{
    sessionId: string;
    user: { id: string; email: string; name: string; role: string };
  }> {
    // Find the magic link
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
      include: { user: true },
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
      user: {
        id: magicLink.user.id,
        email: magicLink.user.email,
        name: magicLink.user.name,
        role: magicLink.user.role,
      },
    };
  }

  /**
   * Switch a patron's session to a different one of their ACTIVE library
   * memberships. Login itself no longer resolves a library (an account can
   * hold memberships across many), so this is how a patron picks one after
   * signing in.
   */
  async setActiveOrganization(
    userId: string,
    sessionId: string,
    organizationId: string,
  ): Promise<void> {
    const membership = await this.prisma.libraryMember.findFirst({
      where: { organizationId, userId },
    });

    if (!membership || membership.membershipStatus !== 'ACTIVE') {
      throw new NotFoundException(
        'No active membership found for this library',
      );
    }

    await this.sessionService.updateActiveOrganization(
      sessionId,
      organizationId,
    );
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
    const session = await this.sessionService.validateSession(sessionId);
    if (!session) {
      return null;
    }

    const { user, activeOrganizationId } = session;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      activeOrganizationId,
      isConfirmed: user.isConfirmed,
    };
  }
}
