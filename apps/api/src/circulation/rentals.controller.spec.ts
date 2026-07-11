import { Test, TestingModule } from '@nestjs/testing';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';

describe('RentalsController', () => {
  let controller: RentalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RentalsController],
      providers: [
        {
          provide: RentalsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            checkout: jest.fn(),
            return: jest.fn(),
            markLost: jest.fn(),
            payFine: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RentalsController>(RentalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
