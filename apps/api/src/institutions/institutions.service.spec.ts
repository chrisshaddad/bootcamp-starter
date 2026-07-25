import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { InstitutionsService } from './institutions.service';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { SessionService } from '../auth/session.service';

describe('InstitutionsService', () => {
  let service: InstitutionsService;
  let prisma: {
    institution: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };
  let authService: { sendInvitation: jest.Mock };
  let sessionService: { deleteAllUserSessions: jest.Mock };

  beforeEach(async () => {
    prisma = {
      institution: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    authService = { sendInvitation: jest.fn() };
    sessionService = { deleteAllUserSessions: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionsService,
        {
          provide: PrismaService,
          useValue: { ...prisma, $transaction: jest.fn() },
        },
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: SessionService,
          useValue: sessionService,
        },
      ],
    }).compile();

    service = module.get<InstitutionsService>(InstitutionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('maps the filtered users relation to admins', async () => {
      prisma.institution.findUnique.mockResolvedValue({
        id: 'inst-1',
        name: 'Acme Clinic',
        _count: { users: 3 },
        users: [
          {
            id: 'admin-1',
            fullName: 'Jane Doe',
            email: 'jane@example.com',
            isActive: true,
            isConfirmed: true,
          },
        ],
      });

      const result = await service.findOne('inst-1');

      expect(result.admins).toEqual([
        {
          id: 'admin-1',
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          isActive: true,
          isConfirmed: true,
        },
      ]);
      // Regression guard: the query must filter the nested relation to
      // INSTITUTION_ADMIN, not return every user in the institution.
      expect(prisma.institution.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inst-1' },
          select: expect.objectContaining({
            users: expect.objectContaining({
              where: { role: 'INSTITUTION_ADMIN' },
            }),
          }),
        }),
      );
    });

    it('returns an empty admins array when the institution genuinely has none', async () => {
      prisma.institution.findUnique.mockResolvedValue({
        id: 'inst-1',
        _count: { users: 0 },
        users: [],
      });

      const result = await service.findOne('inst-1');

      expect(result.admins).toEqual([]);
    });
  });

  describe('addAdmin', () => {
    it('creates an INSTITUTION_ADMIN user and sends an invitation', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
      prisma.user.create.mockResolvedValue({ id: 'admin-2' });
      prisma.institution.findUniqueOrThrow.mockResolvedValue({
        name: 'Acme Clinic',
      });

      await service.addAdmin(
        'inst-1',
        { fullName: 'New Admin', email: 'New.Admin@Example.com', phone: '+1' },
        'super-admin-1',
        'Platform Super Admin',
      );

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          fullName: 'New Admin',
          email: 'new.admin@example.com',
          phone: '+1',
          role: 'INSTITUTION_ADMIN',
          institutionId: 'inst-1',
          createdById: 'super-admin-1',
        },
      });
      expect(authService.sendInvitation).toHaveBeenCalledWith(
        { id: 'admin-2', email: 'new.admin@example.com' },
        'Platform Super Admin',
        'Acme Clinic',
      );
    });

    it('throws NotFoundException for a non-existent institution', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);

      await expect(
        service.addAdmin(
          'missing',
          { fullName: 'New Admin', email: 'new@example.com', phone: '+1' },
          'super-admin-1',
          'Platform Super Admin',
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the email is already in use', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['email'] },
        }),
      );

      await expect(
        service.addAdmin(
          'inst-1',
          { fullName: 'New Admin', email: 'taken@example.com', phone: '+1' },
          'super-admin-1',
          'Platform Super Admin',
        ),
      ).rejects.toThrow(ConflictException);
      expect(authService.sendInvitation).not.toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('sets status to ACTIVE and invites every current admin', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
      prisma.institution.update.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([
        { id: 'admin-1', email: 'admin1@example.com' },
        { id: 'admin-2', email: 'admin2@example.com' },
      ]);
      prisma.institution.findUniqueOrThrow.mockResolvedValue({
        name: 'Acme Clinic',
      });

      await service.approve('inst-1', 'Platform Super Admin');

      expect(prisma.institution.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: { status: 'ACTIVE' },
      });
      expect(authService.sendInvitation).toHaveBeenCalledTimes(2);
      expect(authService.sendInvitation).toHaveBeenCalledWith(
        { id: 'admin-1', email: 'admin1@example.com' },
        'Platform Super Admin',
        'Acme Clinic',
      );
      expect(authService.sendInvitation).toHaveBeenCalledWith(
        { id: 'admin-2', email: 'admin2@example.com' },
        'Platform Super Admin',
        'Acme Clinic',
      );
    });

    it('does not fail the approval if an invitation fails to send', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
      prisma.institution.update.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([
        { id: 'admin-1', email: 'admin1@example.com' },
      ]);
      prisma.institution.findUniqueOrThrow.mockResolvedValue({
        name: 'Acme Clinic',
      });
      authService.sendInvitation.mockRejectedValue(new Error('mail down'));

      await expect(
        service.approve('inst-1', 'Platform Super Admin'),
      ).resolves.toBeDefined();
    });

    it('throws NotFoundException for a non-existent institution', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);

      await expect(
        service.approve('missing', 'Platform Super Admin'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.institution.update).not.toHaveBeenCalled();
    });
  });

  describe('suspend', () => {
    it('sets status to SUSPENDED for an existing institution', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
      prisma.institution.update.mockResolvedValue({});

      await service.suspend('inst-1');

      expect(prisma.institution.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: { status: 'SUSPENDED' },
      });
    });

    it('throws NotFoundException for a non-existent institution', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);

      await expect(service.suspend('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.institution.update).not.toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('sets status to ACTIVE for an existing institution', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
      prisma.institution.update.mockResolvedValue({});

      await service.reactivate('inst-1');

      expect(prisma.institution.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: { status: 'ACTIVE' },
      });
    });

    it('throws NotFoundException for a non-existent institution', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);

      await expect(service.reactivate('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.institution.update).not.toHaveBeenCalled();
    });
  });

  describe('updateAdminEmail', () => {
    it('updates the email, resets isConfirmed, and sends a fresh invitation', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
      prisma.user.findFirst.mockResolvedValue({
        id: 'admin-1',
        role: 'INSTITUTION_ADMIN',
      });
      prisma.user.update.mockResolvedValue({});
      prisma.institution.findUniqueOrThrow.mockResolvedValue({
        name: 'Acme Clinic',
      });

      await service.updateAdminEmail(
        'inst-1',
        'admin-1',
        'Fixed@Example.com',
        'Super Admin',
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'admin-1' },
        data: { email: 'fixed@example.com', isConfirmed: false },
      });
      expect(sessionService.deleteAllUserSessions).toHaveBeenCalledWith(
        'admin-1',
      );
      expect(authService.sendInvitation).toHaveBeenCalledWith(
        { id: 'admin-1', email: 'fixed@example.com' },
        'Super Admin',
        'Acme Clinic',
      );
    });

    it('throws NotFoundException when the admin does not belong to the institution', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAdminEmail(
          'inst-1',
          'not-an-admin',
          'new@example.com',
          'Super Admin',
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the new email is already in use', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
      prisma.user.findFirst.mockResolvedValue({
        id: 'admin-1',
        role: 'INSTITUTION_ADMIN',
      });
      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['email'] },
        }),
      );

      await expect(
        service.updateAdminEmail(
          'inst-1',
          'admin-1',
          'taken@example.com',
          'Super Admin',
        ),
      ).rejects.toThrow(ConflictException);
      expect(sessionService.deleteAllUserSessions).not.toHaveBeenCalled();
      expect(authService.sendInvitation).not.toHaveBeenCalled();
    });
  });
});
