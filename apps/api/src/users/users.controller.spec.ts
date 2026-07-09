import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import type { User } from '@repo/db';

const createServiceMock = () => ({
  findAllForOrg: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
});

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'admin-1',
    organizationId: 'org-1',
    role: 'ORG_ADMIN',
    name: 'Admin',
    email: 'admin@x.com',
    ...overrides,
  }) as User;

describe('UsersController', () => {
  let controller: UsersController;
  let service: ReturnType<typeof createServiceMock>;

  beforeEach(async () => {
    service = createServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('forbids access when the caller has no organization', async () => {
      await expect(
        controller.findAll(makeUser({ organizationId: null }), {
          page: 1,
          limit: 20,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(service.findAllForOrg).not.toHaveBeenCalled();
    });

    it('delegates to the service with the caller organization', async () => {
      service.findAllForOrg.mockResolvedValue({ users: [], total: 0 });

      await controller.findAll(makeUser(), { page: 2, limit: 5 });

      expect(service.findAllForOrg).toHaveBeenCalledWith('org-1', {
        page: 2,
        limit: 5,
      });
    });
  });

  describe('create', () => {
    it('passes the full caller and body to the service', async () => {
      const user = makeUser({ role: 'RECEPTIONIST' });
      const body = { name: 'M', email: 'm@x.com', role: 'MEMBER' as const };
      service.create.mockResolvedValue({ user: {} });

      await controller.create(user, body);

      expect(service.create).toHaveBeenCalledWith(user, body);
    });
  });

  describe('update', () => {
    it('forbids access when the caller has no organization', async () => {
      await expect(
        controller.update(makeUser({ organizationId: null }), 'u1', {
          name: 'New',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('passes the caller, id and body to the service', async () => {
      const user = makeUser();
      const body = { name: 'New' };
      service.update.mockResolvedValue({ user: {} });

      await controller.update(user, 'u1', body);

      expect(service.update).toHaveBeenCalledWith(user, 'u1', body);
    });
  });
});
