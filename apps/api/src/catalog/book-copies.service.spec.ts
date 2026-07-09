import { Test, TestingModule } from '@nestjs/testing';
import { BookCopiesService } from './book-copies.service';
import { PrismaService } from '../database/prisma.service';

describe('BookCopiesService', () => {
  let service: BookCopiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookCopiesService,
        {
          provide: PrismaService,
          useValue: {
            bookCopy: {
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            book: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BookCopiesService>(BookCopiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
