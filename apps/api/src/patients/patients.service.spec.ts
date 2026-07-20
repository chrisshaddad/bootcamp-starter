import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';

describe('PatientsService', () => {
  let service: PatientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: PrismaService,
          useValue: {
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
            assignment: { findFirst: jest.fn() },
            institution: { findUniqueOrThrow: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: { sendInvitation: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
