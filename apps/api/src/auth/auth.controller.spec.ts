import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UpdateProfileRequest, UserResponse } from '@repo/contracts';
import { ObjectStorageService } from '../storage/storage.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    updateProfile: jest.fn(),
  };
  const objectStorage = { upload: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        { provide: ObjectStorageService, useValue: objectStorage },
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

  it('uploads a validated profile picture to object storage', async () => {
    objectStorage.upload.mockResolvedValue({
      key: 'profile-pictures/generated.png',
      publicUrl:
        'http://localhost:9000/bootcamp-media/profile-pictures/generated.png',
    });
    const file = {
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    } as Express.Multer.File;

    await expect(controller.uploadProfilePicture(file)).resolves.toEqual({
      profilePictureUrl:
        'http://localhost:9000/bootcamp-media/profile-pictures/generated.png',
    });
    expect(objectStorage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^profile-pictures\/[0-9a-f-]+\.png$/),
      file.buffer,
      'image/png',
    );
  });

  it('rejects invalid image bytes before object storage is called', async () => {
    const file = { buffer: Buffer.from('not-an-image') } as Express.Multer.File;

    await expect(controller.uploadProfilePicture(file)).rejects.toThrow(
      'The uploaded file is not a valid image',
    );
    expect(objectStorage.upload).not.toHaveBeenCalled();
  });
});
