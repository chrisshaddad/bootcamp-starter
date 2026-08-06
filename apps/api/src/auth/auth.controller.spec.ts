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
  const objectStorage = { upload: jest.fn(), deleteMany: jest.fn() };

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
    objectStorage.upload
      .mockResolvedValueOnce({
        key: 'profile-pictures/cropped.png',
        publicUrl:
          'http://localhost:9000/bootcamp-media/profile-pictures/cropped.png',
      })
      .mockResolvedValueOnce({
        key: 'profile-pictures/original.png',
        publicUrl:
          'http://localhost:9000/bootcamp-media/profile-pictures/original.png',
      });
    const image = {
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    } as Express.Multer.File;

    await expect(
      controller.uploadProfilePicture({ file: [image], originalFile: [image] }),
    ).resolves.toEqual({
      profilePictureUrl:
        'http://localhost:9000/bootcamp-media/profile-pictures/cropped.png',
      profilePictureOriginalUrl:
        'http://localhost:9000/bootcamp-media/profile-pictures/original.png',
    });
    expect(objectStorage.upload).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/^profile-pictures\/[0-9a-f-]+\.png$/),
      image.buffer,
      'image/png',
    );
    expect(objectStorage.upload).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid image bytes before object storage is called', async () => {
    const file = { buffer: Buffer.from('not-an-image') } as Express.Multer.File;

    await expect(
      controller.uploadProfilePicture({ file: [file], originalFile: [file] }),
    ).rejects.toThrow('The uploaded file is not a valid image');
    expect(objectStorage.upload).not.toHaveBeenCalled();
  });
});
