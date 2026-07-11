import { Test, TestingModule } from '@nestjs/testing';
import { LibraryMembersController } from './library-members.controller';
import { LibraryMembersService } from './library-members.service';

describe('LibraryMembersController', () => {
  let controller: LibraryMembersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryMembersController],
      providers: [
        {
          provide: LibraryMembersService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LibraryMembersController>(LibraryMembersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
