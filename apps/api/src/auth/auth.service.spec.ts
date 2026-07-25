import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from './session.service';
import { MAIL_QUEUE } from '../mail/mail.constants';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock; findMany: jest.Mock };
    magicLink: {
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findUnique: jest.Mock;
    };
    institution: { findUniqueOrThrow: jest.Mock };
  };
  let sessionService: { createSession: jest.Mock };
  let mailQueue: { add: jest.Mock };
  let redis: { eval: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      magicLink: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
      institution: { findUniqueOrThrow: jest.fn() },
    };
    sessionService = { createSession: jest.fn() };
    mailQueue = { add: jest.fn() };
    redis = { eval: jest.fn().mockResolvedValue(1) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: SessionService,
          useValue: {
            ...sessionService,
            deleteSession: jest.fn(),
            validateSession: jest.fn(),
          },
        },
        {
          provide: getQueueToken(MAIL_QUEUE),
          useValue: mailQueue,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendInvitation', () => {
    it('mints a token that expires in about 7 days, not the 15-minute sign-in window', async () => {
      await service.sendInvitation(
        { id: 'user-1', email: 'new-hire@example.com' },
        'Inviter Name',
        'Acme Clinic',
      );

      const createCall = prisma.magicLink.create.mock.calls[0][0];
      const expiresAt: Date = createCall.data.expiresAt;
      const hoursUntilExpiry =
        (expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);

      expect(hoursUntilExpiry).toBeGreaterThan(24); // well beyond 15 minutes
      expect(hoursUntilExpiry).toBeLessThanOrEqual(7 * 24);
      expect(mailQueue.add).toHaveBeenCalledWith(
        'send-invitation',
        expect.objectContaining({ email: 'new-hire@example.com' }),
      );
    });
  });

  describe('requestMagicLink', () => {
    it('throws NotFoundException for an email with no matching account', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.requestMagicLink('nobody@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for a deactivated account and never queues an email', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'inactive@example.com',
        isActive: false,
      });

      await expect(
        service.requestMagicLink('inactive@example.com'),
      ).rejects.toThrow(ForbiddenException);
      expect(mailQueue.add).not.toHaveBeenCalled();
      expect(prisma.magicLink.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the user institution is not ACTIVE and never queues an email', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'suspended@example.com',
        isActive: true,
        institution: { status: 'SUSPENDED' },
      });

      await expect(
        service.requestMagicLink('suspended@example.com'),
      ).rejects.toThrow(ForbiddenException);
      expect(mailQueue.add).not.toHaveBeenCalled();
      expect(prisma.magicLink.create).not.toHaveBeenCalled();
    });

    it('runs the rate limit as a single atomic script, keyed per email with the rolling window', async () => {
      redis.eval.mockResolvedValue(1);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.requestMagicLink('nobody@example.com'),
      ).rejects.toThrow(NotFoundException);

      // INCR and EXPIRE must run inside one EVAL — two separate Redis round
      // trips would leave a window where a crash between them drops the TTL
      // and turns the counter into a permanent block for that email.
      expect(redis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'magic-link-rate-limit:nobody@example.com',
        15 * 60,
      );
    });

    it('throws ForbiddenException once the per-email cap is exceeded, before ever touching the database', async () => {
      redis.eval.mockResolvedValue(6); // cap is 5

      await expect(
        service.requestMagicLink('victim@example.com'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(mailQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('verifyMagicLink', () => {
    it('throws ForbiddenException for a deactivated account and never creates a session', async () => {
      prisma.magicLink.findUnique.mockResolvedValue({
        id: 'link-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: { id: 'user-1', isActive: false, isConfirmed: true },
      });

      await expect(service.verifyMagicLink('some-token')).rejects.toThrow(
        ForbiddenException,
      );
      expect(sessionService.createSession).not.toHaveBeenCalled();
      expect(prisma.magicLink.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the user institution is not ACTIVE and never creates a session', async () => {
      prisma.magicLink.findUnique.mockResolvedValue({
        id: 'link-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: {
          id: 'user-1',
          isActive: true,
          isConfirmed: true,
          institution: { status: 'REJECTED' },
        },
      });

      await expect(service.verifyMagicLink('some-token')).rejects.toThrow(
        ForbiddenException,
      );
      expect(sessionService.createSession).not.toHaveBeenCalled();
      expect(prisma.magicLink.update).not.toHaveBeenCalled();
    });
  });

  describe('notifyAdminsOfNewUser', () => {
    it('queues a notification to every other active admin, excluding the actor', async () => {
      prisma.user.findMany.mockResolvedValue([
        { email: 'other-admin@example.com' },
      ]);
      prisma.institution.findUniqueOrThrow.mockResolvedValue({
        name: 'Acme Clinic',
      });

      await service.notifyAdminsOfNewUser({
        institutionId: 'inst-1',
        excludeUserId: 'actor-1',
        newUserName: 'Jane Doe',
        newUserRoleLabel: 'staff member',
        createdByName: 'Actor Name',
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionId: 'inst-1',
            role: 'INSTITUTION_ADMIN',
            isActive: true,
            id: { not: 'actor-1' },
          }),
        }),
      );
      expect(mailQueue.add).toHaveBeenCalledWith(
        'notify-new-user',
        expect.objectContaining({
          adminEmails: ['other-admin@example.com'],
          newUserName: 'Jane Doe',
          newUserRoleLabel: 'staff member',
          institutionName: 'Acme Clinic',
          createdByName: 'Actor Name',
        }),
      );
    });

    it('does not queue anything when there are no other admins to notify', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.institution.findUniqueOrThrow.mockResolvedValue({
        name: 'Acme Clinic',
      });

      await service.notifyAdminsOfNewUser({
        institutionId: 'inst-1',
        excludeUserId: 'actor-1',
        newUserName: 'Jane Doe',
        newUserRoleLabel: 'staff member',
        createdByName: 'Actor Name',
      });

      expect(mailQueue.add).not.toHaveBeenCalled();
    });
  });
});
