import { Test, TestingModule } from '@nestjs/testing';
import { PortalRentalsController } from './portal-rentals.controller';
import { RentalsService } from '../circulation/rentals.service';
import { LibraryMembersService } from '../library-members/library-members.service';

describe('PortalRentalsController', () => {
  let controller: PortalRentalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalRentalsController],
      providers: [
        {
          provide: RentalsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: LibraryMembersService,
          useValue: {
            findByUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PortalRentalsController>(PortalRentalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
