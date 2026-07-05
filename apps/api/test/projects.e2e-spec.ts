import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { AuthGuard } from './../src/auth/guards/auth.guard';
import { AccountType, ProjectStatus } from '@repo/db';
import { CreateProjectRequest, UpdateProjectRequest } from '@repo/contracts';
import { Server } from 'http';

// Safe interface to bypass "any" for request objects
interface AuthenticatedTestRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: { id: string };
}

interface ProjectResponseBody {
  id: string;
  title: string;
  createdByUserId: string;
  status: ProjectStatus;
}

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test data variables
  let user1Id: string;
  let user2Id: string;
  let repository1Id: string;
  let repository2Id: string;
  let createdProjectId: string;

  beforeAll(async () => {
    // Mock canActivate strictly using ExecutionContext and custom interface type
    jest
      .spyOn(AuthGuard.prototype, 'canActivate')
      .mockImplementation((context: ExecutionContext) => {
        // No 'async' keyword here
        const req = context
          .switchToHttp()
          .getRequest<AuthenticatedTestRequest>();
        const testUserId = req.headers['x-test-user-id'];

        if (!testUserId || typeof testUserId !== 'string') {
          return Promise.resolve(false); // Return a Promise to satisfy the types
        }

        req.user = { id: testUserId };
        return Promise.resolve(true); // Return a Promise to satisfy the types
      });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);

    await app.init();

    // 1. Seed Test Data
    const user1 = await prisma.user.create({
      data: {
        email: 'user1-projects-e2e@test.com',
        passwordHash: 'dummyhash',
        accountType: AccountType.DEVELOPER,
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: 'user2-projects-e2e@test.com',
        passwordHash: 'dummyhash',
        accountType: AccountType.DEVELOPER,
      },
    });
    user2Id = user2.id;

    const repo1 = await prisma.repository.create({
      data: {
        githubRepoId: 111111n,
        fullName: 'test/repo1',
        ownerLogin: 'test',
        repoName: 'repo1',
        htmlUrl: 'https://github.com/test/repo1',
      },
    });
    repository1Id = repo1.id;

    const repo2 = await prisma.repository.create({
      data: {
        githubRepoId: 222222n,
        fullName: 'test/repo2',
        ownerLogin: 'test',
        repoName: 'repo2',
        htmlUrl: 'https://github.com/test/repo2',
      },
    });
    repository2Id = repo2.id;
  });

  afterAll(async () => {
    await prisma.project.deleteMany({
      where: { repositoryId: { in: [repository1Id, repository2Id] } },
    });
    await prisma.repository.deleteMany({
      where: { id: { in: [repository1Id, repository2Id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [user1Id, user2Id] } },
    });

    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /projects', () => {
    it('should create a new project successfully (201)', async () => {
      const payload: CreateProjectRequest = {
        title: 'Test Project 1',
        slug: 'test-project-1',
        shortDescription: 'A test project',
        repositoryId: repository1Id,
        status: 'DRAFT',
      };

      const response = await request(app.getHttpServer() as Server)
        .post('/projects')
        .set('x-test-user-id', user1Id)
        .send(payload)
        .expect(201);

      const body = response.body as ProjectResponseBody;
      expect(body).toHaveProperty('id');
      expect(body.title).toBe(payload.title);
      expect(body.createdByUserId).toBe(user1Id);

      createdProjectId = body.id;
    });

    it('should fail if slug is already taken (409)', async () => {
      const payload: CreateProjectRequest = {
        title: 'Another Project',
        slug: 'test-project-1',
        repositoryId: repository2Id,
      };

      await request(app.getHttpServer() as Server)
        .post('/projects')
        .set('x-test-user-id', user1Id)
        .send(payload)
        .expect(409);
    });

    it('should fail if repository is already linked (409)', async () => {
      const payload: CreateProjectRequest = {
        title: 'Another Project',
        slug: 'unique-slug-2',
        repositoryId: repository1Id,
      };

      await request(app.getHttpServer() as Server)
        .post('/projects')
        .set('x-test-user-id', user1Id)
        .send(payload)
        .expect(409);
    });
  });

  describe('PATCH /projects/:id', () => {
    it('should update the project successfully (200)', async () => {
      const payload: UpdateProjectRequest = {
        title: 'Updated Title',
        status: 'PUBLISHED',
        deploymentUrl: null,
      };

      const response = await request(app.getHttpServer() as Server)
        .patch(`/projects/${createdProjectId}`)
        .set('x-test-user-id', user1Id)
        .send(payload)
        .expect(200);

      const body = response.body as ProjectResponseBody;
      expect(body.title).toBe('Updated Title');
      expect(body.status).toBe(ProjectStatus.PUBLISHED);
    });

    it('should block users from editing projects they do not own (403)', async () => {
      const payload: UpdateProjectRequest = {
        title: 'Malicious Update',
        deploymentUrl: null,
      };

      await request(app.getHttpServer() as Server)
        .patch(`/projects/${createdProjectId}`)
        .set('x-test-user-id', user2Id)
        .send(payload)
        .expect(403);
    });

    it('should return 404 for a non-existent project id', async () => {
      const randomUuid = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer() as Server)
        .patch(`/projects/${randomUuid}`)
        .set('x-test-user-id', user1Id)
        .send({ title: 'New Title', deploymentUrl: null })
        .expect(404);
    });
  });
});
