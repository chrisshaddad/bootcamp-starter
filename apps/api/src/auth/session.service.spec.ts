import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { PrismaService } from '../database/prisma.service';

describe('SessionService', () => {
  let service: SessionService;
  let prisma: {
    session: {
      create: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
    };
    user: { findUnique: jest.Mock };
  };
  let redis: {
    get: jest.Mock;
    setex: jest.Mock;
    del: jest.Mock;
  };

  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 60_000);

  beforeEach(async () => {
    prisma = {
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
      },
      user: { findUnique: jest.fn() },
    };
    redis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'REDIS_CLIENT', useValue: redis },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateSession', () => {
    // These two cover the actual enforcement point for institution
    // suspension: whichever path a request takes must surface the
    // institution's current status, not a stale/path-dependent view of it.
    it('returns the institution status via the Redis fast path', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-1', expiresAt: future }),
      );
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        institution: { status: 'SUSPENDED' },
      });

      const result = await service.validateSession('session-1');

      expect(result?.institution.status).toBe('SUSPENDED');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { institution: { select: { status: true } } },
      });
    });

    it('returns the institution status via the DB fallback path on a cache miss', async () => {
      redis.get.mockResolvedValue(null);
      prisma.session.findUnique.mockResolvedValue({
        userId: 'user-1',
        expiresAt: future,
        user: { id: 'user-1', institution: { status: 'SUSPENDED' } },
      });

      const result = await service.validateSession('session-1');

      expect(result?.institution.status).toBe('SUSPENDED');
    });

    it('re-caches the session in Redis after a DB-fallback hit', async () => {
      redis.get.mockResolvedValue(null);
      prisma.session.findUnique.mockResolvedValue({
        userId: 'user-1',
        expiresAt: future,
        user: { id: 'user-1', institution: { status: 'ACTIVE' } },
      });

      await service.validateSession('session-1');

      expect(redis.setex).toHaveBeenCalledWith(
        'session:session-1',
        expect.any(Number),
        expect.any(String),
      );
    });

    it('deletes the session and returns null when the Redis-cached session has expired', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-1', expiresAt: past }),
      );

      const result = await service.validateSession('session-1');

      expect(result).toBeNull();
      expect(prisma.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
      expect(redis.del).toHaveBeenCalledWith('session:session-1');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('deletes the session and returns null when the DB-fallback session has expired', async () => {
      redis.get.mockResolvedValue(null);
      prisma.session.findUnique.mockResolvedValue({
        userId: 'user-1',
        expiresAt: past,
        user: { id: 'user-1', institution: { status: 'ACTIVE' } },
      });

      const result = await service.validateSession('session-1');

      expect(result).toBeNull();
      expect(prisma.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });

    it('returns null when the session exists in neither Redis nor the DB', async () => {
      redis.get.mockResolvedValue(null);
      prisma.session.findUnique.mockResolvedValue(null);

      const result = await service.validateSession('missing-session');

      expect(result).toBeNull();
    });
  });
});
