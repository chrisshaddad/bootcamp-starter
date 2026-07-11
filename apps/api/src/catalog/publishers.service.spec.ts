import { Test, TestingModule } from '@nestjs/testing';
import { PublishersService } from './publishers.service';
import { PrismaService } from '../database/prisma.service';

describe('PublishersService', () => {
  let service: PublishersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishersService,
        {
          provide: PrismaService,
          useValue: {
            publisher: {
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PublishersService>(PublishersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
