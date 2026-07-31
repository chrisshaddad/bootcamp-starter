import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { DatabaseService } from '../database/prisma.service';
import { ProjectStatus } from '@repo/db';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let databaseService: Record<string, any>;

  beforeEach(async () => {
    databaseService = {
      project: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      projectMember: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(databaseService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: DatabaseService, useValue: databaseService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProjectById', () => {
    it('should throw NotFoundException if project is missing', async () => {
      databaseService.project.findUnique.mockResolvedValue(null);

      // Provide both required arguments: projectId and userId
      await expect(
        service.getProjectById('non-existent-id', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return project details when project exists', async () => {
      const mockProject = {
        id: 'proj-1',
        title: 'Awesome Project',
        status: ProjectStatus.PUBLISHED,
        createdByUserId: 'user-1',
      };
      databaseService.project.findUnique.mockResolvedValue(mockProject);

      // Provide both required arguments: projectId and userId
      const result = await service.getProjectById('proj-1', 'user-1');
      expect(result).toBeDefined();
    });
  });
});
