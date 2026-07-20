// apps/api/src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from './session.service';
import { getQueueToken } from '@nestjs/bullmq';
import { ForbiddenException } from '@nestjs/common';
import { randomBytes, scryptSync } from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let sessions: { createSession: jest.Mock; deleteSession: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
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
