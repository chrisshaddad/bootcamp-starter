import { Test, TestingModule } from '@nestjs/testing';
import { GithubService } from './github.service';
import { DatabaseService } from '../database/prisma.service';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('GithubService', () => {
  let service: GithubService;
  let databaseService: Record<string, any>;

  beforeEach(async () => {
    databaseService = {
      connectedAccount: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      developerProfile: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      repository: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubService,
        { provide: DatabaseService, useValue: databaseService },
      ],
    }).compile();

    service = module.get<GithubService>(GithubService);
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
