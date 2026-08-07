// apps/api/src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from './session.service';
import { getQueueToken } from '@nestjs/bullmq';
import { ForbiddenException } from '@nestjs/common';
import { randomBytes, scryptSync } from 'crypto';
import { signupRequestSchema } from '@repo/contracts';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  };
  let sessions: { createSession: jest.Mock; deleteSession: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    sessions = { createSession: jest.fn(), deleteSession: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: SessionService,
          useValue: sessions,
        },
        {
          // Resolves to BullQueue_mail automatically
          provide: getQueueToken('mail'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a hiring account without requiring organization details', async () => {
    const signupData = signupRequestSchema.parse({
      email: 'recruiter@example.com',
      password: 'Password123!',
      accountType: 'HIRING',
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'recruiter@example.com',
      accountType: 'HIRING',
      developerProfile: null,
      hiringProfile: null,
    });

    await expect(service.signup(signupData)).resolves.toMatchObject({
      user: {
        email: 'recruiter@example.com',
        role: 'ORG_ADMIN',
      },
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'recruiter@example.com',
        passwordHash: expect.any(String),
        accountType: 'HIRING',
        isConfirmed: false,
        developerProfile: undefined,
      },
      include: {
        developerProfile: true,
        hiringProfile: true,
      },
    });
  });

  it('creates the hiring profile when onboarding is submitted', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'recruiter@example.com',
      accountType: 'HIRING',
      isConfirmed: true,
      hasSeenDashboardTour: false,
      developerProfile: null,
      hiringProfile: null,
    });
    prisma.user.update.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'recruiter@example.com',
      accountType: 'HIRING',
      isConfirmed: true,
      hasSeenDashboardTour: false,
      developerProfile: null,
      hiringProfile: {
        id: '00000000-0000-4000-8000-000000000002',
        organizationName: 'Acme Inc.',
        organizationType: 'COMPANY',
        jobTitle: 'Talent Lead',
        linkedinUrl: null,
        organizationWebsiteUrl: null,
      },
    });

    await service.updateProfile('00000000-0000-4000-8000-000000000001', {
      organizationName: 'Acme Inc.',
      organizationType: 'COMPANY',
      jobTitle: 'Talent Lead',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          hiringProfile: {
            create: {
              organizationName: 'Acme Inc.',
              organizationType: 'COMPANY',
              jobTitle: 'Talent Lead',
              linkedinUrl: undefined,
              organizationWebsiteUrl: undefined,
            },
          },
        },
      }),
    );
  });

  it('does not create a session for a suspended account with valid credentials', async () => {
    const password = 'Password123!';
    const salt = randomBytes(16).toString('hex');
    const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
    prisma.user.findUnique.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'suspended@example.com',
      passwordHash,
      accountType: 'DEVELOPER',
      status: 'SUSPENDED',
      isConfirmed: true,
      developerProfile: { displayName: 'Suspended Developer' },
      hiringProfile: null,
    });

    await expect(
      service.login({ email: 'suspended@example.com', password }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(sessions.createSession).not.toHaveBeenCalled();
  });
});
