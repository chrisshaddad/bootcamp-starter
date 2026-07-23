import { Test, TestingModule } from '@nestjs/testing';
import { PortalMembershipsController } from './portal-memberships.controller';
import { LibraryMembersService } from '../library-members/library-members.service';

describe('PortalMembershipsController', () => {
  let controller: PortalMembershipsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalMembershipsController],
      providers: [
        {
          provide: LibraryMembersService,
          useValue: {
            findMyMemberships: jest.fn(),
            requestMembership: jest.fn(),
            deactivate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PortalMembershipsController>(
      PortalMembershipsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
