import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { PrismaService } from '../database/prisma.service';

describe('BooksService', () => {
  let service: BooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: PrismaService,
          useValue: {
            book: {
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            bookAuthor: {
              createMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            bookCategory: {
              createMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            publisher: {
              findFirst: jest.fn(),
            },
            author: {
              count: jest.fn(),
            },
            category: {
              count: jest.fn(),
            },
            $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
              callback({}),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
