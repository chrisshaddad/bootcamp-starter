import { Test, TestingModule } from '@nestjs/testing';
import { PortalAuthorsController } from './portal-authors.controller';
import { AuthorsService } from '../catalog/authors.service';

describe('PortalAuthorsController', () => {
  let controller: PortalAuthorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalAuthorsController],
      providers: [
        {
          provide: AuthorsService,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PortalAuthorsController>(PortalAuthorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
