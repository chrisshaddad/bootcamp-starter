import { Test, TestingModule } from '@nestjs/testing';
import { RentalsService } from './rentals.service';
import { PrismaService } from '../database/prisma.service';

describe('RentalsService', () => {
  let service: RentalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentalsService,
        {
          provide: PrismaService,
          useValue: {
            rental: {
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            bookCopy: {
              findFirst: jest.fn(),
              findFirstOrThrow: jest.fn(),
              update: jest.fn(),
            },
            libraryMember: {
              findFirst: jest.fn(),
            },
            $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
              callback({}),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<RentalsService>(RentalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
