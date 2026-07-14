import { Test, TestingModule } from '@nestjs/testing';
import { PortalReservationsController } from './portal-reservations.controller';
import { ReservationsService } from '../circulation/reservations.service';
import { LibraryMembersService } from '../library-members/library-members.service';

describe('PortalReservationsController', () => {
  let controller: PortalReservationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalReservationsController],
      providers: [
        {
          provide: ReservationsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            cancel: jest.fn(),
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

    controller = module.get<PortalReservationsController>(
      PortalReservationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
