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
import { PrismaService } from '../database/prisma.service';
import { SessionService } from './session.service';
import { MAIL_QUEUE, MAIL_JOBS } from '../mail/mail.constants';
import { SignupRequest, LoginRequest, UpdateProfileRequest, UserResponse } from '@repo/contracts';

const MAGIC_LINK_EXPIRY_MINUTES = 15;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, hash: string): boolean {
  try {
    if (!hash || typeof hash !== 'string' || !hash.includes(':')) return false;
    const parts = hash.split(':');
    if (parts.length !== 2) return false;

    // Explicit assertions to appease strict TypeScript rules
    const salt = parts[0] as string;
    const key = parts[1] as string;

    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey as Buffer);
  } catch (e) {
    return false;
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  async signup(data: SignupRequest) {
    // 1. Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('User already exists');
    }

    // 2. Safely verify that publicSlug is unique for developers to prevent raw 500 DB errors
    if (data.accountType === 'DEVELOPER' && data.publicSlug) {
      const existingSlug = await this.prisma.developerProfile.findUnique({
        where: { publicSlug: data.publicSlug },
      });
      if (existingSlug) {
        throw new ConflictException(
          'The requested public slug is already taken',
        );
      }
    }

    const passwordHash = hashPassword(data.password);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        accountType: data.accountType,
        isConfirmed: false,
        developerProfile:
          data.accountType === 'DEVELOPER'
            ? {
                create: {
                  displayName: data.displayName!,
                  publicSlug: data.publicSlug!,
                },
              }
            : undefined,
        hiringProfile:
          data.accountType === 'HIRING'
            ? {
                create: {
                  organizationName: data.organizationName!,
                  organizationType: data.organizationType!,
                },
              }
            : undefined,
      },
      include: {
        developerProfile: true,
        hiringProfile: true,
      },
    });

    const sessionId = await this.sessionService.createSession(user.id);

    let name = 'User';
    if (user.developerProfile?.displayName) {
      name = user.developerProfile.displayName;
    } else if (user.hiringProfile?.organizationName) {
      name = user.hiringProfile.organizationName;
    }

    let role: 'SUPER_ADMIN' | 'MEMBER' | 'ORG_ADMIN' = 'MEMBER';
    if (user.accountType === 'SUPER_ADMIN') {
      role = 'SUPER_ADMIN';
    } else if (user.accountType === 'HIRING') {
      role = 'ORG_ADMIN';
    }

    return {
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        name,
        role,
      },
    };
  }

  async login(data: LoginRequest) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        developerProfile: true,
        hiringProfile: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const sessionId = await this.sessionService.createSession(user.id);

    let name = 'User';
    if (user.developerProfile?.displayName) {
      name = user.developerProfile.displayName;
    } else if (user.hiringProfile?.organizationName) {
      name = user.hiringProfile.organizationName;
    }

    let role: 'SUPER_ADMIN' | 'MEMBER' | 'ORG_ADMIN' = 'MEMBER';
    if (user.accountType === 'SUPER_ADMIN') {
      role = 'SUPER_ADMIN';
    } else if (user.accountType === 'HIRING') {
      role = 'ORG_ADMIN';
    }

    return {
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        name,
        role,
      },
    };
  }

  /**
   * Request a magic link for the given email
   * Creates a magic link token and queues an email to be sent
   */
  async requestMagicLink(email: string): Promise<{ success: boolean }> {
    // Find user by email and include profiles for names
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        developerProfile: true,
        hiringProfile: true,
      },
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

    // Resolve a user display name dynamically
    let userName = 'User';
    if (user.developerProfile?.displayName) {
      userName = user.developerProfile.displayName;
    } else if (user.hiringProfile?.organizationName) {
      userName = user.hiringProfile.organizationName;
    }

    // Build magic link URL
    const appUrl = process.env.APP_URL;
    const magicLinkUrl = `${appUrl}/auth/verify?token=${token}`;

    // Queue email
    await this.mailQueue.add(MAIL_JOBS.SEND_MAGIC_LINK, {
      email: user.email,
      magicLink: magicLinkUrl,
      userName: userName,
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
    user: { id: string; email: string; name: string; role: 'SUPER_ADMIN' | 'MEMBER' | 'ORG_ADMIN' };
  }> {
    // Find the magic link and load associated profiles
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            developerProfile: true,
            hiringProfile: true,
          },
        },
      },
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

    // Dynamically map display properties to maintain compatibility with client contracts
    let name = 'User';
    if (magicLink.user.developerProfile?.displayName) {
      name = magicLink.user.developerProfile.displayName;
    } else if (magicLink.user.hiringProfile?.organizationName) {
      name = magicLink.user.hiringProfile.organizationName;
    }

    // Maps your new AccountType to the client package expected roles
    let role: 'SUPER_ADMIN' | 'MEMBER' | 'ORG_ADMIN' = 'MEMBER';
    if (magicLink.user.accountType === 'SUPER_ADMIN') {
      role = 'SUPER_ADMIN';
    } else if (magicLink.user.accountType === 'HIRING') {
      role = 'ORG_ADMIN';
    }

    return {
      sessionId,
      user: {
        id: magicLink.user.id,
        email: magicLink.user.email,
        name,
        role,
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

    let name = 'User';
    if (user.developerProfile?.displayName) {
      name = user.developerProfile.displayName;
    } else if (user.hiringProfile?.organizationName) {
      name = user.hiringProfile.organizationName;
    }

    let role: 'SUPER_ADMIN' | 'MEMBER' | 'ORG_ADMIN' = 'MEMBER';
    if (user.accountType === 'SUPER_ADMIN') {
      role = 'SUPER_ADMIN';
    } else if (user.accountType === 'HIRING') {
      role = 'ORG_ADMIN';
    }

    return {
      id: user.id,
      email: user.email,
      name,
      role,
      isConfirmed: user.isConfirmed,
    };
  }

  /**
   * Update authenticated user's profile
   */
  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        developerProfile: true,
        hiringProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If the user is a developer, enforce unique publicSlug constraints to avoid DB-level conflicts
    if (user.accountType === 'DEVELOPER' && data.publicSlug) {
      const existingSlug = await this.prisma.developerProfile.findUnique({
        where: { publicSlug: data.publicSlug },
      });
      if (existingSlug && existingSlug.userId !== userId) {
        throw new ConflictException('The requested public slug is already taken');
      }
    }

    const updatePayload: any = {};

    if (user.accountType === 'DEVELOPER') {
      updatePayload.developerProfile = {
        update: {
          displayName: data.displayName,
          publicSlug: data.publicSlug,
          headline: data.headline,
          bio: data.bio,
          location: data.location,
          profilePictureUrl: data.profilePictureUrl,
          // Un-comment and match with Prisma model if these fields are mapped:
          // linkedinUrl: data.linkedinUrl,
          // personalWebsiteUrl: data.personalWebsiteUrl,
        },
      };
    } else if (user.accountType === 'HIRING') {
      updatePayload.hiringProfile = {
        update: {
          organizationName: data.organizationName,
          organizationType: data.organizationType,
          jobTitle: data.jobTitle,
          // Un-comment and match with Prisma model if this field is mapped:
          // organizationWebsiteUrl: data.organizationWebsiteUrl,
        },
      };
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updatePayload,
      include: {
        developerProfile: true,
        hiringProfile: true,
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      accountType: updatedUser.accountType,
      isConfirmed: updatedUser.isConfirmed,
      developerProfile: updatedUser.developerProfile
        ? {
            id: updatedUser.developerProfile.id,
            publicSlug: updatedUser.developerProfile.publicSlug,
            displayName: updatedUser.developerProfile.displayName,
            headline: updatedUser.developerProfile.headline ?? null,
            bio: updatedUser.developerProfile.bio ?? null,
            location: updatedUser.developerProfile.location ?? null,
            profilePictureUrl: updatedUser.developerProfile.profilePictureUrl ?? null,
            githubUsername: (updatedUser.developerProfile as any).githubUsername ?? null,
          }
        : null,
      hiringProfile: updatedUser.hiringProfile
        ? {
            id: updatedUser.hiringProfile.id,
            organizationName: updatedUser.hiringProfile.organizationName,
            organizationType: updatedUser.hiringProfile.organizationType,
            jobTitle: updatedUser.hiringProfile.jobTitle ?? null,
          }
        : null,
    };
  }
}