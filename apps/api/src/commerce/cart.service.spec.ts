import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../database/prisma.service';

describe('CartService', () => {
  let service: CartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: {
            cart: {
              upsert: jest.fn(),
            },
            cartItem: {
              create: jest.fn(),
              deleteMany: jest.fn(),
            },
            book: {
              findFirst: jest.fn(),
            },
            bookCopy: {
              count: jest.fn(),
              findFirst: jest.fn(),
              updateMany: jest.fn(),
            },
            purchase: {
              create: jest.fn(),
            },
            $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
              callback({}),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
