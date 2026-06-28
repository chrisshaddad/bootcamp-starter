import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import type { UserProfileUpdateRequest, UserResponse } from '@repo/contracts';
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
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists - still return success
      this.logger.warn(`Magic link requested for non-existent email: ${email}`);
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
   * Register a new organization and admin user
   */
  async register(
    organizationName: string,
    name: string,
    email: string,
  ): Promise<{ success: boolean }> {
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Create user and organization in a transaction.
    // Circular FK: org needs createdById (user), user needs organizationId (org).
    // Resolution: create user first (no org), create org with createdById, then link user.
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          name,
          role: 'ORG_ADMIN',
        },
      });

      const org = await tx.organization.create({
        data: {
          name: organizationName,
          status: 'ACTIVE', // auto-approve: no super admin exists yet
          createdById: newUser.id,
        },
      });

      return tx.user.update({
        where: { id: newUser.id },
        data: { organizationId: org.id },
      });
    });

    this.logger.log(
      `Registered new org "${organizationName}" with admin ${user.id}`,
    );

    // Immediately send them a magic link to log in
    return this.requestMagicLink(normalizedEmail);
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

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      isConfirmed: user.isConfirmed,
      profile: profile
        ? {
            firstName: null,
            lastName: null,
            phone: profile.phoneNumber,
            avatarUrl: profile.profilePictureUrl,
            dateOfBirth: profile.dateOfBirth
              ? profile.dateOfBirth.toISOString()
              : null,
            bio: profile.bio,
            street1: profile.street1,
            street2: profile.street2,
            city: profile.city,
            state: profile.state,
            postalCode: profile.postalCode,
            country: profile.country,
          }
        : null,
    };
  }

  /**
   * Update user profile information
   */
  async updateProfile(
    sessionId: string,
    data: UserProfileUpdateRequest,
  ): Promise<UserResponse> {
    const user = await this.sessionService.validateSession(sessionId);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const {
      phoneNumber,
      bio,
      street1,
      street2,
      city,
      state,
      postalCode,
      country,
      name,
      profilePictureUrl,
    } = data;

    // Build update object for userProfile
    const updateData: {
      phoneNumber?: string | null;
      profilePictureUrl?: string | null;
      bio?: string | null;
      street1?: string | null;
      street2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
    } = {};
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (profilePictureUrl !== undefined)
      updateData.profilePictureUrl = profilePictureUrl;
    if (bio !== undefined) updateData.bio = bio;
    if (street1 !== undefined) updateData.street1 = street1;
    if (street2 !== undefined) updateData.street2 = street2;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (country !== undefined) updateData.country = country;

    // Keep user + profile writes atomic to avoid partial updates
    const userProfile = await this.prisma.$transaction(async (tx) => {
      if (name !== undefined) {
        await tx.user.update({
          where: { id: user.id },
          data: { name },
        });
      }

      return tx.userProfile.upsert({
        where: { userId: user.id },
        update: updateData,
        create: {
          userId: user.id,
          ...updateData,
        },
        include: { user: true },
      });
    });

    return {
      id: userProfile.user.id,
      email: userProfile.user.email,
      name: userProfile.user.name,
      role: userProfile.user.role,
      organizationId: userProfile.user.organizationId,
      isConfirmed: userProfile.user.isConfirmed,
      profile: {
        firstName: null,
        lastName: null,
        phone: userProfile.phoneNumber,
        avatarUrl: userProfile.profilePictureUrl,
        dateOfBirth: userProfile.dateOfBirth
          ? userProfile.dateOfBirth.toISOString()
          : null,
        bio: userProfile.bio,
        street1: userProfile.street1,
        street2: userProfile.street2,
        city: userProfile.city,
        state: userProfile.state,
        postalCode: userProfile.postalCode,
        country: userProfile.country,
      },
    };
  }
}
