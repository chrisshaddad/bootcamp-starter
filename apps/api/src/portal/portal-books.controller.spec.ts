import { Test, TestingModule } from '@nestjs/testing';
import { PortalBooksController } from './portal-books.controller';
import { BooksService } from '../catalog/books.service';

describe('PortalBooksController', () => {
  let controller: PortalBooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalBooksController],
      providers: [
        {
          provide: BooksService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PortalBooksController>(PortalBooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
