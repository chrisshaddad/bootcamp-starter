import {
  ConflictException,
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
import type { OrganizationBlockedStatus } from '../mail/templates';
import type { PatronRegisterResponse } from '@repo/contracts';

const MAGIC_LINK_EXPIRY_MINUTES = 15;
// Invitation links live longer than login links (7 days) — the copy in
// invitation.email.ts states this window, so keep them in sync.
const INVITATION_EXPIRY_MINUTES = 7 * 24 * 60;

/**
 * What a staff member is told when their library isn't ACTIVE. A library only
 * gains access once a SUPER_ADMIN approves it, and loses it again if the
 * library is rejected or suspended — so these cover every non-ACTIVE status.
 */
const BLOCKED_ORGANIZATION_MESSAGE: Record<
  OrganizationBlockedStatus,
  (organizationName: string) => string
> = {
  PENDING: (org) =>
    `${org} is still awaiting approval by a NextShelf administrator. We'll email you a sign-in link as soon as it's approved.`,
  REJECTED: (org) =>
    `${org} was not approved by a NextShelf administrator, so it can't be accessed. Contact support if you think this is a mistake.`,
  SUSPENDED: (org) =>
    `${org} has been suspended by a NextShelf administrator. Contact support to restore access.`,
  INACTIVE: (org) =>
    `${org} is not currently active on NextShelf. Contact support to reactivate it.`,
};

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
   * A library's staff (ORG_ADMIN / LIBRARIAN) may only use NextShelf while
   * their library is ACTIVE — i.e. after a SUPER_ADMIN has approved it, and
   * for as long as it isn't rejected or suspended. Returns the offending
   * library when access should be denied, or null when it's allowed.
   *
   * SUPER_ADMINs and patrons are never blocked here: neither carries a
   * User.organizationId (a patron's library links live in LibraryMember, and
   * are gated separately by setActiveOrganization).
   */
  async findBlockingOrganization(user: {
    role: string;
    organizationId: string | null;
  }): Promise<{ name: string; status: OrganizationBlockedStatus } | null> {
    if (user.role === 'SUPER_ADMIN' || !user.organizationId) {
      return null;
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, status: true },
    });

    if (!organization || organization.status === 'ACTIVE') {
      return null;
    }

    return { name: organization.name, status: organization.status };
  }

  /**
   * Reject the request outright when the caller's library isn't ACTIVE, with
   * a message explaining which of the non-ACTIVE states it's in.
   */
  async assertOrganizationAccess(user: {
    role: string;
    organizationId: string | null;
  }): Promise<void> {
    const blocking = await this.findBlockingOrganization(user);

    if (blocking) {
      throw new ForbiddenException(
        BLOCKED_ORGANIZATION_MESSAGE[blocking.status](blocking.name),
      );
    }
  }

  /**
   * For members, the active organization in the session must still be an
   * ACTIVE membership in an ACTIVE library. If the membership becomes
   * pending/cancelled/suspended after login, portal browsing must stop until
   * the user is admitted again or switches libraries.
   */
  async assertMemberActiveOrganizationAccess(
    user: {
      id: string;
      role: string;
    },
    activeOrganizationId: string | null,
  ): Promise<void> {
    if (user.role !== 'MEMBER' || !activeOrganizationId) {
      return;
    }

    const membership = await this.prisma.libraryMember.findFirst({
      where: {
        userId: user.id,
        organizationId: activeOrganizationId,
        membershipStatus: 'ACTIVE',
        organization: { status: 'ACTIVE' },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Select an active library membership before browsing books',
      );
    }
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

    // Staff of a library that isn't ACTIVE can't sign in (verifyMagicLink
    // would reject them), so don't mint a link that's guaranteed to fail.
    // They still get *an* email — one that explains why — which keeps this
    // endpoint's "always answer 'check your email'" non-disclosure intact
    // while giving a real person a real answer.
    const blocking = await this.findBlockingOrganization(user);

    if (blocking) {
      await this.mailQueue.add(MAIL_JOBS.SEND_ORG_STATUS_NOTICE, {
        email: user.email,
        adminName: user.name,
        organizationName: blocking.name,
        status: blocking.status,
      });

      this.logger.warn(
        `Magic link suppressed for user ${user.id}: organization is ${blocking.status}`,
      );
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
   * Acknowledge a brand-new library registration. Deliberately carries NO
   * sign-in link: the library is PENDING and its admin can't sign in until a
   * SUPER_ADMIN approves it, at which point sendOrganizationApproved() sends
   * the link that actually works.
   */
  async sendOrganizationRegistrationReceived(
    adminEmail: string,
    adminName: string,
    organizationName: string,
  ): Promise<void> {
    await this.mailQueue.add(MAIL_JOBS.SEND_ORG_REGISTRATION_RECEIVED, {
      email: adminEmail,
      adminName,
      organizationName,
    });

    this.logger.log(
      `Registration acknowledgement queued for ${organizationName}`,
    );
  }

  /**
   * Tell a library's owning admin that it's been approved, and give them
   * their first sign-in link. Uses the long invitation expiry rather than the
   * 15-minute login expiry — approval is asynchronous, so the admin isn't
   * waiting at the keyboard for it.
   */
  async sendOrganizationApproved(
    admin: { id: string; email: string; name: string },
    organizationName: string,
  ): Promise<void> {
    const signInLink = await this.issueMagicLinkToken(
      admin.id,
      INVITATION_EXPIRY_MINUTES,
    );

    await this.mailQueue.add(MAIL_JOBS.SEND_ORG_APPROVED, {
      email: admin.email,
      adminName: admin.name,
      organizationName,
      signInLink,
    });

    this.logger.log(
      `Approval email queued for organization ${organizationName}`,
    );
  }

  /**
   * Tell a library's owning admin that it's in a non-ACTIVE state (currently
   * used when a SUPER_ADMIN rejects one). No sign-in link, by definition.
   */
  async sendOrganizationStatusNotice(
    admin: { email: string; name: string },
    organizationName: string,
    status: OrganizationBlockedStatus,
  ): Promise<void> {
    await this.mailQueue.add(MAIL_JOBS.SEND_ORG_STATUS_NOTICE, {
      email: admin.email,
      adminName: admin.name,
      organizationName,
      status,
    });

    this.logger.log(
      `Status notice (${status}) queued for organization ${organizationName}`,
    );
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

    // A library's staff get no session until a SUPER_ADMIN has approved the
    // library (and lose it again if it's rejected/suspended). Checked before
    // the token is consumed, so a link that lands minutes before approval
    // still works on a retry rather than being burned.
    await this.assertOrganizationAccess(magicLink.user);

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
      select: {
        membershipStatus: true,
        organization: { select: { status: true } },
      },
    });

    // Both halves have to hold: the patron's membership must be ACTIVE *and*
    // the library itself must be ACTIVE. A suspended library is closed to its
    // patrons too, not just its staff.
    if (
      !membership ||
      membership.membershipStatus !== 'ACTIVE' ||
      membership.organization.status !== 'ACTIVE'
    ) {
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
