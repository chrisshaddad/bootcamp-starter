import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@repo/db';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { PasswordService } from './password.service';
import { PrismaService } from '../database/prisma.service';

type Mock<T> = { [K in keyof T]: jest.Mock };

const ACTIVE_USER = {
  id: 'user-1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  role: 'CLIENT',
  status: 'ACTIVE',
  password: null as string | null,
  pharmacyId: null,
  branchId: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: Mock<PrismaService['user']>;
    magicLink: Mock<PrismaService['magicLink']>;
  };
  let sessionService: Mock<Pick<SessionService, 'createSession'>>;
  let passwordService: Mock<
    Pick<PasswordService, 'hash' | 'verify' | 'verifyAgainstDummy'>
  >;
  let mailQueue: { add: jest.Mock };

  beforeEach(() => {
    process.env.APP_URL = 'http://localhost:3000';
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      } as never,
      magicLink: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      } as never,
    };
    sessionService = { createSession: jest.fn().mockResolvedValue('sess-1') };
    passwordService = {
      hash: jest.fn().mockResolvedValue('argon-hash'),
      verify: jest.fn(),
      verifyAgainstDummy: jest.fn().mockResolvedValue(false),
    };
    mailQueue = { add: jest.fn().mockResolvedValue(undefined) };

    service = new AuthService(
      prisma as never,
      sessionService as never,
      passwordService as never,
      mailQueue as never,
    );
  });

  describe('requestMagicLink', () => {
    it('returns success without issuing a link for unknown emails', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.requestMagicLink('nobody@example.com'),
      ).resolves.toEqual({ success: true });
      expect(prisma.magicLink.create).not.toHaveBeenCalled();
      expect(mailQueue.add).not.toHaveBeenCalled();
    });

    it('does not issue a link for suspended accounts', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...ACTIVE_USER,
        status: 'SUSPENDED',
      });

      await expect(
        service.requestMagicLink(ACTIVE_USER.email),
      ).resolves.toEqual({ success: true });
      expect(prisma.magicLink.create).not.toHaveBeenCalled();
    });

    it('stores a hashed token (never the raw token) and queues mail', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...ACTIVE_USER });
      prisma.magicLink.updateMany.mockResolvedValue({ count: 0 });
      prisma.magicLink.create.mockResolvedValue({});

      await service.requestMagicLink(ACTIVE_USER.email);

      const createArg = prisma.magicLink.create.mock.calls[0][0] as {
        data: { token: string };
      };
      const stored = createArg.data.token;
      expect(stored).toHaveLength(64); // sha256 hex
      const mailArg = mailQueue.add.mock.calls[0][1] as { magicLink: string };
      const queuedUrl = mailArg.magicLink;
      const rawToken = new URL(queuedUrl).searchParams.get('token')!;
      expect(createHash('sha256').update(rawToken).digest('hex')).toEqual(
        stored,
      );
      expect(stored).not.toEqual(rawToken);
    });
  });

  describe('verifyMagicLink', () => {
    const rawToken = 'a'.repeat(64);
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    it('rejects unknown tokens', async () => {
      prisma.magicLink.findUnique.mockResolvedValue(null);
      await expect(service.verifyMagicLink(rawToken)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('looks up by the hashed token', async () => {
      prisma.magicLink.findUnique.mockResolvedValue(null);
      await service.verifyMagicLink(rawToken).catch(() => undefined);
      expect(prisma.magicLink.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { token: tokenHash } }),
      );
    });

    it('rejects already-used tokens', async () => {
      prisma.magicLink.findUnique.mockResolvedValue({
        id: 'ml-1',
        userId: ACTIVE_USER.id,
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        user: ACTIVE_USER,
      });
      await expect(service.verifyMagicLink(rawToken)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('blocks suspended accounts even with a valid token', async () => {
      prisma.magicLink.findUnique.mockResolvedValue({
        id: 'ml-1',
        userId: ACTIVE_USER.id,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: { ...ACTIVE_USER, status: 'SUSPENDED' },
      });
      await expect(service.verifyMagicLink(rawToken)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('consumes the token atomically and creates a session', async () => {
      prisma.magicLink.findUnique.mockResolvedValue({
        id: 'ml-1',
        userId: ACTIVE_USER.id,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: ACTIVE_USER,
      });
      prisma.magicLink.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.verifyMagicLink(rawToken);

      expect(prisma.magicLink.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'ml-1',
            usedAt: null,
            expiresAt: { gt: expect.any(Date) },
          }),
        }),
      );
      expect(sessionService.createSession).toHaveBeenCalledWith(ACTIVE_USER.id);
      expect(result.sessionId).toEqual('sess-1');
      expect(result.user).not.toHaveProperty('password');
    });

    it('throws if the token was consumed by a concurrent request', async () => {
      prisma.magicLink.findUnique.mockResolvedValue({
        id: 'ml-1',
        userId: ACTIVE_USER.id,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: ACTIVE_USER,
      });
      prisma.magicLink.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.verifyMagicLink(rawToken)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(sessionService.createSession).not.toHaveBeenCalled();
    });
  });

  describe('loginWithPassword', () => {
    it('burns a dummy verify and fails generically when no user exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.loginWithPassword('x@example.com', 'pw'),
      ).rejects.toThrow('Invalid email or password');
      expect(passwordService.verifyAgainstDummy).toHaveBeenCalledWith('pw');
    });

    it('fails generically when the user has no password set', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...ACTIVE_USER,
        password: null,
      });

      await expect(
        service.loginWithPassword(ACTIVE_USER.email, 'pw'),
      ).rejects.toThrow('Invalid email or password');
      expect(passwordService.verifyAgainstDummy).toHaveBeenCalled();
      expect(passwordService.verify).not.toHaveBeenCalled();
    });

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...ACTIVE_USER,
        password: 'argon-hash',
      });
      passwordService.verify.mockResolvedValue(false);

      await expect(
        service.loginWithPassword(ACTIVE_USER.email, 'pw'),
      ).rejects.toThrow('Invalid email or password');
      expect(sessionService.createSession).not.toHaveBeenCalled();
    });

    it('blocks suspended accounts after a correct password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...ACTIVE_USER,
        password: 'argon-hash',
        status: 'SUSPENDED',
      });
      passwordService.verify.mockResolvedValue(true);

      await expect(
        service.loginWithPassword(ACTIVE_USER.email, 'pw'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(sessionService.createSession).not.toHaveBeenCalled();
    });

    it('creates a session on a correct password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...ACTIVE_USER,
        password: 'argon-hash',
      });
      passwordService.verify.mockResolvedValue(true);

      const result = await service.loginWithPassword(ACTIVE_USER.email, 'pw');
      expect(result.sessionId).toEqual('sess-1');
      expect(result.user.email).toEqual(ACTIVE_USER.email);
    });
  });

  describe('signup', () => {
    it('creates a CLIENT (ACTIVE) and sends a magic link', async () => {
      // first call: existence check (none); second call (inside requestMagicLink)
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...ACTIVE_USER });
      prisma.user.create.mockResolvedValue({ ...ACTIVE_USER });
      prisma.magicLink.updateMany.mockResolvedValue({ count: 0 });
      prisma.magicLink.create.mockResolvedValue({});

      await expect(
        service.signup({
          firstName: 'Jane',
          lastName: 'Doe',
          email: ACTIVE_USER.email,
        }),
      ).resolves.toEqual({ success: true });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'CLIENT', status: 'ACTIVE' }),
        }),
      );
      expect(mailQueue.add).toHaveBeenCalled();
    });

    it('does not create a duplicate for an existing email but still succeeds', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: ACTIVE_USER.id })
        .mockResolvedValueOnce({ ...ACTIVE_USER });
      prisma.magicLink.updateMany.mockResolvedValue({ count: 0 });
      prisma.magicLink.create.mockResolvedValue({});

      await expect(
        service.signup({
          firstName: 'Jane',
          lastName: 'Doe',
          email: ACTIVE_USER.email,
        }),
      ).resolves.toEqual({ success: true });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('treats a concurrent duplicate (P2002) as success and still sends a link', async () => {
      // Lookup misses (race), but the create loses the unique-constraint race.
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...ACTIVE_USER });
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      prisma.magicLink.updateMany.mockResolvedValue({ count: 0 });
      prisma.magicLink.create.mockResolvedValue({});

      await expect(
        service.signup({
          firstName: 'Jane',
          lastName: 'Doe',
          email: ACTIVE_USER.email,
        }),
      ).resolves.toEqual({ success: true });
      expect(mailQueue.add).toHaveBeenCalled();
    });

    it('rethrows non-duplicate create errors', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue(new Error('db is down'));

      await expect(
        service.signup({
          firstName: 'Jane',
          lastName: 'Doe',
          email: ACTIVE_USER.email,
        }),
      ).rejects.toThrow('db is down');
    });
  });

  describe('setPassword', () => {
    it('hashes the password and flips PENDING -> ACTIVE', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...ACTIVE_USER,
        status: 'PENDING',
      });
      prisma.user.update.mockResolvedValue({
        ...ACTIVE_USER,
        status: 'ACTIVE',
      });

      const result = await service.setPassword(ACTIVE_USER.id, 'NewPassw0rd');

      expect(passwordService.hash).toHaveBeenCalledWith('NewPassw0rd');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: 'argon-hash',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(result.status).toEqual('ACTIVE');
    });

    it('keeps ACTIVE status when changing an existing password', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...ACTIVE_USER });
      prisma.user.update.mockResolvedValue({ ...ACTIVE_USER });

      await service.setPassword(ACTIVE_USER.id, 'NewPassw0rd');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('throws when the user no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.setPassword('ghost', 'NewPassw0rd'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
