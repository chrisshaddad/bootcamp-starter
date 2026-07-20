import { Test, TestingModule } from '@nestjs/testing';
import { MedicalRecordsService } from './medical-records.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FileStorageService } from '../files/file-storage.service';

describe('MedicalRecordsService', () => {
  let service: MedicalRecordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalRecordsService,
        {
          provide: PrismaService,
          useValue: {
            patient: { findFirst: jest.fn() },
            assignment: { findFirst: jest.fn() },
            medicalRecord: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findUniqueOrThrow: jest.fn(),
              findMany: jest.fn(),
            },
            recordFile: { create: jest.fn(), findFirst: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
        {
          provide: FileStorageService,
          useValue: {
            saveFile: jest.fn(),
            getFileStream: jest.fn(),
            fileExists: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MedicalRecordsService>(MedicalRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
