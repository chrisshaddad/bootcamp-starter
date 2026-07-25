import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    institution: { findUniqueOrThrow: jest.Mock };
  };
  let authService: {
    sendInvitation: jest.Mock;
    notifyAdminsOfNewUser: jest.Mock;
  };

  const actor = {
    id: 'admin-1',
    fullName: 'Admin One',
    institutionId: 'inst-1',
    role: 'INSTITUTION_ADMIN',
  } as never;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      institution: { findUniqueOrThrow: jest.fn() },
    };
    authService = {
      sendInvitation: jest.fn(),
      notifyAdminsOfNewUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            ...prisma,
            professionalProfile: { create: jest.fn(), update: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setStatus', () => {
    it('throws ForbiddenException when deactivating the last active institution admin', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'admin-2',
        role: 'INSTITUTION_ADMIN',
      });
      prisma.user.count.mockResolvedValue(1);

      await expect(service.setStatus('admin-2', false, actor)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('allows deactivating an institution admin when another active admin remains', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'admin-2',
        role: 'INSTITUTION_ADMIN',
      });
      prisma.user.count.mockResolvedValue(2);
      prisma.user.update.mockResolvedValue({});

      await service.setStatus('admin-2', false, actor);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'admin-2' },
        data: { isActive: false },
      });
    });
  });

  describe('findAll', () => {
    it("includes a professional's bio in the mapped list item", async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'prof-1',
          fullName: 'Dr. One',
          email: 'dr.one@example.com',
          phone: '+1',
          role: 'PROFESSIONAL',
          isActive: true,
          isConfirmed: true,
          createdAt: new Date(),
          professionalProfile: { specialty: 'Cardiology', bio: 'Heart stuff' },
        },
      ]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll(
        { page: 1, limit: 10 } as never,
        actor,
      );

      expect(result.users[0].bio).toBe('Heart stuff');
    });
  });

  describe('resendInvitation', () => {
    it('resends the invitation for an existing managed user', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'staff-1',
        role: 'STAFF',
      });
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'staff-1',
        email: 'staff@example.com',
      });
      prisma.institution.findUniqueOrThrow.mockResolvedValue({
        name: 'Acme Clinic',
      });

      await service.resendInvitation('staff-1', actor);

      expect(authService.sendInvitation).toHaveBeenCalledWith(
        { id: 'staff-1', email: 'staff@example.com' },
        'Admin One',
        'Acme Clinic',
      );
    });

    it('throws NotFoundException for a user outside the institution', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resendInvitation('someone-else', actor),
      ).rejects.toThrow(NotFoundException);
      expect(authService.sendInvitation).not.toHaveBeenCalled();
    });
  });
});
