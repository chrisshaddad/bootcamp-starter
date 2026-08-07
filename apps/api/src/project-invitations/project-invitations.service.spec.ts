import { Test, TestingModule } from '@nestjs/testing';
import { ProjectInvitationsService } from './project-invitations.service';
import { DatabaseService } from '../database/prisma.service';
import { GithubService } from '../github/github.service';
import { ProjectInvitationRateLimiter } from './project-invitation-rate-limiter.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { getQueueToken } from '@nestjs/bullmq';
import { MAIL_QUEUE } from '../mail/mail.constants';
import { PROJECT_INVITATIONS_QUEUE } from './project-invitations.constants';

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
        { provide: GithubService, useValue: {} },
        { provide: ProjectInvitationRateLimiter, useValue: {} },
        { provide: ProjectAccessService, useValue: {} },
        { provide: getQueueToken(MAIL_QUEUE), useValue: {} },
        { provide: getQueueToken(PROJECT_INVITATIONS_QUEUE), useValue: {} },
      ],
    }).compile();

    service = module.get<ProjectInvitationsService>(ProjectInvitationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have database service injected', () => {
    expect((service as unknown as { db: unknown }).db).toBe(databaseService);
  });
});
