import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@repo/db';

const createPrismaMock = () => ({
  user: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
});

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllForOrg', () => {
    it('scopes the query to the organization and returns users with total', async () => {
      const users = [{ id: 'u1' }];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAllForOrg('org-1', {
        page: 2,
        limit: 10,
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1' },
          skip: 10,
          take: 10,
        }),
      );
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
      expect(result).toEqual({ users, total: 1 });
    });
  });

  describe('create', () => {
    it('rejects creators without an organization', async () => {
      await expect(
        service.create(
          { organizationId: null, role: 'ORG_ADMIN' },
          { name: 'A', email: 'a@x.com', role: 'MEMBER' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('lets an ORG_ADMIN create any assignable role in their org', async () => {
      const created = { id: 'u1', role: 'ORG_ADMIN' };
      prisma.user.create.mockResolvedValue(created);

      const result = await service.create(
        { organizationId: 'org-1', role: 'ORG_ADMIN' },
        { name: 'Admin', email: 'admin@x.com', role: 'ORG_ADMIN' },
      );

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'ORG_ADMIN',
            organizationId: 'org-1',
          }),
        }),
      );
      expect(result).toEqual({ user: created });
    });

    it('rejects a RECEPTIONIST creating a non-MEMBER role', async () => {
      await expect(
        service.create(
          { organizationId: 'org-1', role: 'RECEPTIONIST' },
          { name: 'X', email: 'x@x.com', role: 'ORG_ADMIN' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('lets a RECEPTIONIST create a MEMBER', async () => {
      const created = { id: 'u2', role: 'MEMBER' };
      prisma.user.create.mockResolvedValue(created);

      const result = await service.create(
        { organizationId: 'org-1', role: 'RECEPTIONIST' },
        { name: 'Member', email: 'm@x.com', role: 'MEMBER' },
      );

      expect(result).toEqual({ user: created });
    });

    it('maps a duplicate email (P2002) to a ConflictException', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create(
          { organizationId: 'org-1', role: 'ORG_ADMIN' },
          { name: 'A', email: 'dupe@x.com', role: 'MEMBER' },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    const caller = { id: 'admin-1', organizationId: 'org-1' };

    it('throws NotFound when the target is not in the caller org', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.update(caller, 'other-org-user', { name: 'New' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'other-org-user', organizationId: 'org-1' },
        }),
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects an empty update with no fields', async () => {
      await expect(service.update(caller, 'u9', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('blocks an admin from stripping their own admin role', async () => {
      await expect(
        service.update(caller, caller.id, { role: 'MEMBER' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('allows an admin to keep their own ORG_ADMIN role while editing themselves', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: caller.id });
      const updated = { id: caller.id, name: 'Renamed' };
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.update(caller, caller.id, {
        name: 'Renamed',
        role: 'ORG_ADMIN',
      });

      expect(result).toEqual({ user: updated });
    });

    it('updates a target user within the caller org', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u9' });
      const updated = { id: 'u9', role: 'RECEPTIONIST' };
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.update(caller, 'u9', {
        role: 'RECEPTIONIST',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u9' },
          data: { role: 'RECEPTIONIST' },
        }),
      );
      expect(result).toEqual({ user: updated });
    });
  });
});
