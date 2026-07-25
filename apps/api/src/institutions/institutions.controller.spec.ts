import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';
import { ROLES_KEY } from '../auth/decorators';

describe('InstitutionsController', () => {
  let controller: InstitutionsController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    approve: jest.Mock;
    reject: jest.Mock;
    suspend: jest.Mock;
    reactivate: jest.Mock;
    updateAdminEmail: jest.Mock;
    addAdmin: jest.Mock;
  };

  const user = {
    id: 'super-1',
    fullName: 'Super Admin',
    role: 'SUPER_ADMIN',
  } as never;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      suspend: jest.fn(),
      reactivate: jest.fn(),
      updateAdminEmail: jest.fn(),
      addAdmin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionsController],
      providers: [
        {
          provide: InstitutionsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<InstitutionsController>(InstitutionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // These endpoints manage institution suspension and admin accounts — a
  // regression that drops @Roles('SUPER_ADMIN') from any of them would open
  // up institution suspend/reactivate or admin creation to any authenticated
  // user, so the role metadata itself is asserted directly.
  describe('SUPER_ADMIN-only role metadata', () => {
    it.each([
      ['suspend', InstitutionsController.prototype.suspend],
      ['reactivate', InstitutionsController.prototype.reactivate],
      ['addAdmin', InstitutionsController.prototype.addAdmin],
      ['updateAdminEmail', InstitutionsController.prototype.updateAdminEmail],
      ['approve', InstitutionsController.prototype.approve],
      ['reject', InstitutionsController.prototype.reject],
    ])('%s is restricted to SUPER_ADMIN', (_name, handler) => {
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['SUPER_ADMIN']);
    });
  });

  describe('suspend', () => {
    it('forwards the id to the service and returns a confirmation message', async () => {
      service.suspend.mockResolvedValue({ id: 'inst-1', status: 'SUSPENDED' });

      const result = await controller.suspend('inst-1');

      expect(service.suspend).toHaveBeenCalledWith('inst-1');
      expect(result).toEqual({
        message: 'Institution suspended successfully',
        institution: { id: 'inst-1', status: 'SUSPENDED' },
      });
    });
  });

  describe('reactivate', () => {
    it('forwards the id to the service and returns a confirmation message', async () => {
      service.reactivate.mockResolvedValue({ id: 'inst-1', status: 'ACTIVE' });

      const result = await controller.reactivate('inst-1');

      expect(service.reactivate).toHaveBeenCalledWith('inst-1');
      expect(result).toEqual({
        message: 'Institution reactivated successfully',
        institution: { id: 'inst-1', status: 'ACTIVE' },
      });
    });
  });

  describe('addAdmin', () => {
    it('forwards the actor id and name so the invite email is attributed correctly', async () => {
      service.addAdmin.mockResolvedValue({ id: 'inst-1' });
      const body = {
        fullName: 'New Admin',
        email: 'new@example.com',
        phone: '+1',
      } as never;

      await controller.addAdmin('inst-1', body, user);

      expect(service.addAdmin).toHaveBeenCalledWith(
        'inst-1',
        body,
        'super-1',
        'Super Admin',
      );
    });
  });

  describe('updateAdminEmail', () => {
    it('forwards institution id, admin id, and new email to the service', async () => {
      service.updateAdminEmail.mockResolvedValue({ id: 'inst-1' });

      await controller.updateAdminEmail(
        'inst-1',
        'admin-2',
        { email: 'new@example.com' } as never,
        user,
      );

      expect(service.updateAdminEmail).toHaveBeenCalledWith(
        'inst-1',
        'admin-2',
        'new@example.com',
        'Super Admin',
      );
    });
  });
});
