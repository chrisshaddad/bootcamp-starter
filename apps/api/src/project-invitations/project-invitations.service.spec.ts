import { Test, TestingModule } from '@nestjs/testing';
import { ProjectInvitationsService } from './project-invitations.service';
import { DatabaseService } from '../database/prisma.service';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('ProjectInvitationsService', () => {
  let service: ProjectInvitationsService;
  let databaseService: Record<string, any>;

  beforeEach(async () => {
    databaseService = {
      projectInvitation: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      projectMember: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(databaseService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectInvitationsService,
        { provide: DatabaseService, useValue: databaseService },
      ],
    }).compile();

    service = module.get<ProjectInvitationsService>(ProjectInvitationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have database service injected', () => {
    expect(
      (service as any).prisma || (service as any).databaseService,
    ).toBeDefined();
  });
});
