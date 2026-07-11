import { Test, TestingModule } from '@nestjs/testing';
import { LibraryMembersService } from './library-members.service';
import { PrismaService } from '../database/prisma.service';

describe('LibraryMembersService', () => {
  let service: LibraryMembersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryMembersService,
        {
          provide: PrismaService,
          useValue: {
            libraryMember: {
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<LibraryMembersService>(LibraryMembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
