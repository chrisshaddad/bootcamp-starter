import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UpdateProfileRequest, UserResponse } from '@repo/contracts';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    updateProfile: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate updateProfile to AuthService', async () => {
    const user = { id: 'user-1' } as UserResponse;
    const body = { slug: 'new-slug' } as UpdateProfileRequest;
    await controller.updateProfile(user, body);
    expect(mockAuthService.updateProfile).toHaveBeenCalledWith(user.id, body);
  });
});
