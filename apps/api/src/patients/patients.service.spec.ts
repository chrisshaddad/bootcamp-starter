import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
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
    };
    authService = {
      sendInvitation: jest.fn(),
      notifyAdminsOfNewUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: PrismaService,
          useValue: {
            ...prisma,
            assignment: { findFirst: jest.fn() },
            $transaction: jest.fn(),
          },
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

  describe('resendInvitation', () => {
    it('resends the invitation for an existing patient', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'patient-1',
        institutionId: 'inst-1',
        userId: 'user-1',
      });
      prisma.patient.findUniqueOrThrow.mockResolvedValue({
        user: { id: 'user-1', email: 'patient@example.com' },
      });
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

      await expect(
        service.resendInvitation('missing', actor),
      ).rejects.toThrow(NotFoundException);
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
