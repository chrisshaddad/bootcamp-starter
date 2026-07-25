import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FileStorageService } from '../files/file-storage.service';

describe('MedicalRecordsService', () => {
  let service: MedicalRecordsService;
  let prisma: {
    patient: { findFirst: jest.Mock };
    assignment: { findFirst: jest.Mock };
    medicalRecord: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
    };
    labResultDetail: { update: jest.Mock };
    consultationDetail: { update: jest.Mock };
    scanDetail: { update: jest.Mock };
    vaccinationDetail: { update: jest.Mock };
    prescription: { update: jest.Mock };
    prescriptionItem: { deleteMany: jest.Mock };
    recordFile: { create: jest.Mock; findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  const professional = {
    id: 'prof-1',
    institutionId: 'inst-1',
    role: 'PROFESSIONAL',
  } as never;
  const patient = { id: 'patient-user-1', role: 'PATIENT' } as never;

  const accessibleRecordRow = {
    id: 'rec-1',
    patientId: 'patient-1',
    institutionId: 'inst-1',
    recordType: 'LAB_RESULT',
    patient: { userId: 'patient-user-1' },
  };

  beforeEach(async () => {
    prisma = {
      patient: { findFirst: jest.fn() },
      assignment: { findFirst: jest.fn() },
      medicalRecord: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      labResultDetail: { update: jest.fn() },
      consultationDetail: { update: jest.fn() },
      scanDetail: { update: jest.fn() },
      vaccinationDetail: { update: jest.fn() },
      prescription: { update: jest.fn() },
      prescriptionItem: { deleteMany: jest.fn() },
      recordFile: { create: jest.fn(), findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
      cb(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalRecordsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
        {
          provide: FileStorageService,
          useValue: {
            saveFile: jest.fn(),
            getFileStream: jest.fn(),
            fileExists: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MedicalRecordsService>(MedicalRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findForPatient', () => {
    it('paginates using skip/take derived from page and limit, excluding voided records', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'patient-1',
        institutionId: 'inst-1',
        userId: 'patient-user-1',
      });
      prisma.assignment.findFirst.mockResolvedValue({ id: 'assign-1' });
      prisma.medicalRecord.findMany.mockResolvedValue([]);
      prisma.medicalRecord.count.mockResolvedValue(0);

      await service.findForPatient(
        'patient-1',
        { page: 2, limit: 10 } as never,
        professional,
      );

      expect(prisma.medicalRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'patient-1', isVoid: false },
          skip: 10,
          take: 10,
        }),
      );
      expect(prisma.medicalRecord.count).toHaveBeenCalledWith({
        where: { patientId: 'patient-1', isVoid: false },
      });
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when the actor is not a professional', async () => {
      await expect(
        service.update('rec-1', { recordType: 'LAB_RESULT' } as never, patient),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.medicalRecord.findFirst).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when trying to change the record type', async () => {
      prisma.medicalRecord.findFirst.mockResolvedValue(accessibleRecordRow);
      prisma.assignment.findFirst.mockResolvedValue({ id: 'assign-1' });

      await expect(
        service.update(
          'rec-1',
          {
            recordType: 'CONSULTATION',
            recordDate: '2026-01-01',
            consultation: { chiefComplaint: 'x' },
          } as never,
          professional,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.medicalRecord.updateMany).not.toHaveBeenCalled();
    });

    it('updates the base record and the matching detail table', async () => {
      prisma.medicalRecord.findFirst.mockResolvedValue(accessibleRecordRow);
      prisma.assignment.findFirst.mockResolvedValue({ id: 'assign-1' });
      prisma.medicalRecord.updateMany.mockResolvedValue({ count: 1 });
      prisma.medicalRecord.findUniqueOrThrow.mockResolvedValue({
        id: 'rec-1',
        patientId: 'patient-1',
        recordType: 'LAB_RESULT',
        recordDate: new Date('2026-01-05'),
        institutionOfOrigin: null,
        requestedBy: null,
        notes: null,
        isVoid: false,
        uploadedBy: { fullName: 'Dr. Actor' },
        files: [],
        labResultDetail: {
          testName: 'CBC (corrected)',
          testDate: new Date('2026-01-05'),
          labName: null,
        },
        consultationDetail: null,
        scanDetail: null,
        vaccinationDetail: null,
        prescription: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.update(
        'rec-1',
        {
          recordType: 'LAB_RESULT',
          recordDate: '2026-01-05',
          labResult: { testName: 'CBC (corrected)', testDate: '2026-01-05' },
        } as never,
        professional,
      );

      expect(prisma.medicalRecord.updateMany).toHaveBeenCalledWith({
        where: { id: 'rec-1', institutionId: 'inst-1' },
        data: {
          recordDate: new Date('2026-01-05'),
          institutionOfOrigin: null,
          requestedBy: null,
          notes: null,
        },
      });
      expect(prisma.labResultDetail.update).toHaveBeenCalledWith({
        where: { recordId: 'rec-1' },
        data: {
          testName: 'CBC (corrected)',
          testDate: new Date('2026-01-05'),
          labName: null,
        },
      });
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when the actor is not a professional', async () => {
      await expect(service.remove('rec-1', patient)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.medicalRecord.updateMany).not.toHaveBeenCalled();
    });

    it('soft-deletes by flipping isVoid, leaving the row and files in place', async () => {
      prisma.medicalRecord.findFirst.mockResolvedValue(accessibleRecordRow);
      prisma.assignment.findFirst.mockResolvedValue({ id: 'assign-1' });
      prisma.medicalRecord.updateMany.mockResolvedValue({ count: 1 });

      await service.remove('rec-1', professional);

      expect(prisma.medicalRecord.updateMany).toHaveBeenCalledWith({
        where: { id: 'rec-1', institutionId: 'inst-1' },
        data: { isVoid: true },
      });
      expect(prisma.recordFile.findFirst).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an already-deleted record', async () => {
      // isVoid: false is baked into getAccessibleRecord's query, so a
      // previously-deleted record simply looks like it doesn't exist.
      prisma.medicalRecord.findFirst.mockResolvedValue(null);

      await expect(service.remove('rec-1', professional)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
