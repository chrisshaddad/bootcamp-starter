import { Test, TestingModule } from '@nestjs/testing';
import { PortalBookCopiesController } from './portal-book-copies.controller';
import { BookCopiesService } from '../catalog/book-copies.service';

describe('PortalBookCopiesController', () => {
  let controller: PortalBookCopiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalBookCopiesController],
      providers: [
        {
          provide: BookCopiesService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PortalBookCopiesController>(
      PortalBookCopiesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
