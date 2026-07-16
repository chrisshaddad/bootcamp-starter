import { Test, TestingModule } from '@nestjs/testing';
import { PortalCartController } from './portal-cart.controller';
import { CartService } from '../commerce/cart.service';
import { LibraryMembersService } from '../library-members/library-members.service';

describe('PortalCartController', () => {
  let controller: PortalCartController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalCartController],
      providers: [
        {
          provide: CartService,
          useValue: {
            getCart: jest.fn(),
            addItem: jest.fn(),
            removeItem: jest.fn(),
            checkout: jest.fn(),
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

    controller = module.get<PortalCartController>(PortalCartController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
