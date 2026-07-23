import { Test, TestingModule } from '@nestjs/testing';
import { PortalCategoriesController } from './portal-categories.controller';
import { CategoriesService } from '../catalog/categories.service';

describe('PortalCategoriesController', () => {
  let controller: PortalCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalCategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PortalCategoriesController>(
      PortalCategoriesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
