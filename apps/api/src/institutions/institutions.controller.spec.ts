import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';

describe('InstitutionsController', () => {
  let controller: InstitutionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionsController],
      providers: [
        {
          provide: InstitutionsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            approve: jest.fn(),
            reject: jest.fn(),
            suspend: jest.fn(),
            reactivate: jest.fn(),
            updateAdminEmail: jest.fn(),
            addAdmin: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InstitutionsController>(InstitutionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
