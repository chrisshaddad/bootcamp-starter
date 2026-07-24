import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import { PrismaService } from '../database/prisma.service';

describe('InstitutionsService', () => {
  let service: InstitutionsService;
  let prisma: {
    institution: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      institution: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionsService,
        {
          provide: PrismaService,
          useValue: { ...prisma, $transaction: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InstitutionsService>(InstitutionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('suspend', () => {
    it('sets status to SUSPENDED for an existing institution', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
      prisma.institution.update.mockResolvedValue({});

      await service.suspend('inst-1');

      expect(prisma.institution.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: { status: 'SUSPENDED' },
      });
    });

    it('throws NotFoundException for a non-existent institution', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);

      await expect(service.suspend('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.institution.update).not.toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('sets status to ACTIVE for an existing institution', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
      prisma.institution.update.mockResolvedValue({});

      await service.reactivate('inst-1');

      expect(prisma.institution.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: { status: 'ACTIVE' },
      });
    });

    it('throws NotFoundException for a non-existent institution', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);

      await expect(service.reactivate('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.institution.update).not.toHaveBeenCalled();
    });
  });
});
