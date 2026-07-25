import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PatientsService } from './patients.service';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';

describe('PatientsService', () => {
  let service: PatientsService;
  let prisma: {
    patient: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    user: { create: jest.Mock; update: jest.Mock };
    institution: { findUniqueOrThrow: jest.Mock };
    assignment: { findFirst: jest.Mock };
    $transaction: jest.Mock;
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

  // Shape returned by patient.findUniqueOrThrow inside buildDetail().
  const fullPatientRow = (
    id: string,
    overrides: Record<string, unknown> = {},
  ) => ({
    id,
    userId: 'user-1',
    institutionId: 'inst-1',
    user: {
      fullName: 'Pat Newman',
      email: 'pat.newman@example.com',
      phone: '+1',
      isActive: true,
      isConfirmed: true,
    },
    assignments: [],
    dateOfBirth: null,
    gender: null,
    nationalId: null,
    address: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    emergencyContactRelationship: null,
    bloodType: null,
    allergies: [],
    chronicConditions: [],
    clinicalNotes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      patient: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: { create: jest.fn(), update: jest.fn() },
      institution: { findUniqueOrThrow: jest.fn() },
      assignment: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
      cb(prisma),
    );
    authService = {
      sendInvitation: jest.fn(),
      notifyAdminsOfNewUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const request = {
      fullName: 'Pat Newman',
      email: 'Pat.Newman@Example.com',
      phone: '+1',
    } as never;

    beforeEach(() => {
      prisma.user.create.mockResolvedValue({ id: 'user-1' });
      prisma.patient.create.mockResolvedValue({ id: 'patient-1' });
      prisma.institution.findUniqueOrThrow.mockResolvedValue({
        name: 'Acme Clinic',
      });
      prisma.patient.findUniqueOrThrow
        .mockResolvedValueOnce({
          user: { id: 'user-1', email: 'pat.newman@example.com' },
        })
        .mockResolvedValueOnce(fullPatientRow('patient-1'));
    });

    it('creates the user and patient in one transaction, lowercasing the email', async () => {
      await service.create(request, actor);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          fullName: 'Pat Newman',
          email: 'pat.newman@example.com',
          phone: '+1',
          role: 'PATIENT',
          institutionId: 'inst-1',
          createdById: 'admin-1',
        },
      });
      expect(prisma.patient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          institutionId: 'inst-1',
        }),
      });
    });

    it('sends an invitation and notifies the other institution admins', async () => {
      await service.create(request, actor);

      expect(authService.sendInvitation).toHaveBeenCalledWith(
        { id: 'user-1', email: 'pat.newman@example.com' },
        'Admin One',
        'Acme Clinic',
      );
      expect(authService.notifyAdminsOfNewUser).toHaveBeenCalledWith({
        institutionId: 'inst-1',
        excludeUserId: 'admin-1',
        newUserName: 'Pat Newman',
        newUserRoleLabel: 'patient',
        createdByName: 'Admin One',
      });
    });

    it('throws ConflictException when the email is already registered', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['email'] },
        }),
      );

      await expect(service.create(request, actor)).rejects.toThrow(
        ConflictException,
      );
      expect(authService.sendInvitation).not.toHaveBeenCalled();
      expect(authService.notifyAdminsOfNewUser).not.toHaveBeenCalled();
    });

    it('still returns the created patient if the invitation email fails to send', async () => {
      authService.sendInvitation.mockRejectedValue(new Error('mail down'));

      const result = await service.create(request, actor);

      expect(result.id).toBe('patient-1');
      expect(authService.notifyAdminsOfNewUser).toHaveBeenCalled();
    });

    it('still returns the created patient if the admin notification fails to send', async () => {
      authService.notifyAdminsOfNewUser.mockRejectedValue(
        new Error('mail down'),
      );

      const result = await service.create(request, actor);

      expect(result.id).toBe('patient-1');
    });
  });

  describe('findAll', () => {
    const patientRow = (overrides: Record<string, unknown> = {}) => ({
      id: 'patient-1',
      userId: 'user-1',
      gender: null,
      dateOfBirth: null,
      nationalId: null,
      createdAt: new Date('2026-01-01'),
      user: {
        fullName: 'Pat One',
        email: 'pat@example.com',
        phone: '+1',
        isActive: true,
        isConfirmed: true,
      },
      ...overrides,
    });

    it('derives skip/take from page and limit', async () => {
      prisma.patient.findMany.mockResolvedValue([]);
      prisma.patient.count.mockResolvedValue(0);

      await service.findAll({ page: 3, limit: 10 } as never, actor);

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('scopes a professional actor to only their actively assigned patients', async () => {
      prisma.patient.findMany.mockResolvedValue([]);
      prisma.patient.count.mockResolvedValue(0);
      const professional = {
        id: 'prof-1',
        institutionId: 'inst-1',
        role: 'PROFESSIONAL',
      } as never;

      await service.findAll({ page: 1, limit: 10 } as never, professional);

      const [{ where }] = prisma.patient.findMany.mock.calls[0];
      expect(where.AND).toEqual([
        {
          assignments: { some: { professionalId: 'prof-1', status: 'ACTIVE' } },
        },
      ]);
    });

    it('does not add an assignment filter for an institution admin', async () => {
      prisma.patient.findMany.mockResolvedValue([]);
      prisma.patient.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 } as never, actor);

      const [{ where }] = prisma.patient.findMany.mock.calls[0];
      expect(where.AND).toBeUndefined();
    });

    it('adds an unassigned filter when requested', async () => {
      prisma.patient.findMany.mockResolvedValue([]);
      prisma.patient.count.mockResolvedValue(0);

      await service.findAll(
        { page: 1, limit: 10, unassigned: true } as never,
        actor,
      );

      const [{ where }] = prisma.patient.findMany.mock.calls[0];
      expect(where.AND).toEqual([
        { assignments: { none: { status: 'ACTIVE' } } },
      ]);
    });

    it('maps patient rows to the list-item shape', async () => {
      prisma.patient.findMany.mockResolvedValue([patientRow()]);
      prisma.patient.count.mockResolvedValue(1);

      const result = await service.findAll(
        { page: 1, limit: 10 } as never,
        actor,
      );

      expect(result).toEqual({
        patients: [
          {
            id: 'patient-1',
            userId: 'user-1',
            fullName: 'Pat One',
            email: 'pat@example.com',
            phone: '+1',
            gender: null,
            dateOfBirth: null,
            nationalId: null,
            isActive: true,
            isConfirmed: true,
            createdAt: patientRow().createdAt,
          },
        ],
        total: 1,
      });
    });
  });

  describe('resendInvitation', () => {
    it('resends the invitation for an existing patient', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'patient-1',
        institutionId: 'inst-1',
        userId: 'user-1',
      });
      // First call is sendInvitationFor's lookup (just needs `user`); second
      // is buildDetail's, which needs the full patient row.
      prisma.patient.findUniqueOrThrow
        .mockResolvedValueOnce({
          user: { id: 'user-1', email: 'patient@example.com' },
        })
        .mockResolvedValueOnce(fullPatientRow('patient-1'));
      prisma.institution.findUniqueOrThrow.mockResolvedValue({
        name: 'Acme Clinic',
      });

      await service.resendInvitation('patient-1', actor);

      expect(authService.sendInvitation).toHaveBeenCalledWith(
        { id: 'user-1', email: 'patient@example.com' },
        'Admin One',
        'Acme Clinic',
      );
    });

    it('throws NotFoundException for a patient outside the institution', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(service.resendInvitation('missing', actor)).rejects.toThrow(
        NotFoundException,
      );
      expect(authService.sendInvitation).not.toHaveBeenCalled();
    });
  });

  describe('updateClinical', () => {
    it('normalizes allergies and chronic conditions — trims, dedupes case-insensitively', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'patient-1',
        institutionId: 'inst-1',
        userId: 'user-1',
      });
      prisma.patient.update.mockResolvedValue({});
      prisma.patient.findUniqueOrThrow.mockResolvedValue({
        id: 'patient-1',
        userId: 'user-1',
        institutionId: 'inst-1',
        user: {
          fullName: 'Pat',
          email: 'pat@example.com',
          phone: '+1',
          isActive: true,
          isConfirmed: true,
        },
        assignments: [],
        dateOfBirth: null,
        gender: null,
        nationalId: null,
        address: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        emergencyContactRelationship: null,
        bloodType: null,
        allergies: [],
        chronicConditions: [],
        clinicalNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.updateClinical(
        'patient-1',
        {
          allergies: ['Penicillin', '  penicillin ', 'Peanuts', ''],
          chronicConditions: ['Diabetes', 'diabetes', 'Asthma'],
        } as never,
        actor,
      );

      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: 'patient-1' },
        data: {
          allergies: ['Penicillin', 'Peanuts'],
          chronicConditions: ['Diabetes', 'Asthma'],
        },
      });
    });
  });
});
