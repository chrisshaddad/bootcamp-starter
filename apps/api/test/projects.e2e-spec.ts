import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { AuthGuard } from './../src/auth/guards/auth.guard';
import {
  AccountType,
  ProjectRoleKey,
  ProjectStatus,
  VerificationStatus,
} from '@repo/db';
import {
  projectByIdResponseSchema,
  projectsListResponseSchema,
  developerPublicProfileResponseSchema,
  type CreateProjectRequest,
  type UpdateProjectRequest,
} from '@repo/contracts';
import { Server } from 'http';
import { Reflector } from '@nestjs/core';
import { GithubService } from './../src/github/github.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Safe interface to bypass "any" for request objects
interface AuthenticatedTestRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: { id: string; accountType: AccountType };
}

interface ProjectResponseBody {
  id: string;
  title: string;
  createdByUserId: string;
  status: ProjectStatus;
}

// Custom interface to strictly type "this" inside the spied mock and prevent ESLint warnings
interface GuardWithReflector {
  reflector: Reflector;
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
    jest.spyOn(AuthGuard.prototype, 'canActivate').mockImplementation(function (
      this: GuardWithReflector,
      context: ExecutionContext,
    ) {
      // Handle routes decorated with @Public()
      const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isPublic) {
        return Promise.resolve(true);
      }

      const req = context.switchToHttp().getRequest<AuthenticatedTestRequest>();
      const testUserId = req.headers['x-test-user-id'];

      if (!testUserId || typeof testUserId !== 'string') {
        return Promise.resolve(false); // Return a Promise to satisfy the types
      }

      req.user = { id: testUserId, accountType: AccountType.DEVELOPER };
      return Promise.resolve(true); // Return a Promise to satisfy the types
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GithubService)
      .useValue({
        verifyRepositoryOwnership: jest
          .fn()
          .mockImplementation((_userId: string, repositoryUrl: string) =>
            Promise.resolve({
              githubRepoId: repositoryUrl.endsWith('/repo2')
                ? '222222'
                : '111111',
              ownerGithubUserId: 1001n,
              ownerLogin: 'test',
              ownerType: 'User',
              isFork: false,
            }),
          ),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);

    await app.init();

    // Recover cleanly if a previous local E2E run was interrupted mid-suite.
    await prisma.project.deleteMany({
      where: {
        slug: {
          in: ['test-project-1', 'draft-project', 'archived-project'],
        },
      },
    });
    await prisma.repository.deleteMany({
      where: { githubRepoId: { in: [111111n, 222222n] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['user1-projects-e2e@test.com', 'user2-projects-e2e@test.com'],
        },
      },
    });

    // 1. Seed Test Data
    const user1 = await prisma.user.create({
      data: {
        email: 'user1-projects-e2e@test.com',
        passwordHash: 'dummyhash',
        accountType: AccountType.DEVELOPER,
        isConfirmed: true,
        developerProfile: {
          create: {
            publicSlug: 'user1-projects-e2e',
            displayName: 'Project Owner',
            headline: 'Full-stack developer',
            githubUsername: 'project-owner-e2e',
          },
        },
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: 'user2-projects-e2e@test.com',
        passwordHash: 'dummyhash',
        accountType: AccountType.DEVELOPER,
        isConfirmed: true,
        developerProfile: {
          create: {
            publicSlug: 'user2-projects-e2e',
            displayName: 'Project Contributor',
            headline: 'Backend developer',
            linkedinUrl: 'https://linkedin.com/in/project-contributor-e2e',
          },
        },
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

  describe('verified collaborator access', () => {
    beforeAll(async () => {
      await prisma.projectMember.create({
        data: {
          projectId: createdProjectId,
          userId: user2Id,
          role: ProjectRoleKey.EDITOR,
          verificationStatus: VerificationStatus.VERIFIED,
          verifiedAt: new Date(),
          addedByUserId: user1Id,
        },
      });
    });

    it('lists an accepted editor collaboration using server pagination', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get('/projects?scope=COLLABORATIONS&page=1&limit=10')
        .set('x-test-user-id', user2Id)
        .expect(200);

      const body = projectsListResponseSchema.parse(response.body as unknown);
      expect(body).toMatchObject({
        data: [
          expect.objectContaining({
            id: createdProjectId,
            access: expect.objectContaining({ currentUserRole: 'EDITOR' }),
          }),
        ],
        meta: expect.objectContaining({ totalItems: 1, currentPage: 1 }),
      });
    });

    it('lets an editor view and update content but rejects status changes', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get(`/projects/id/${createdProjectId}`)
        .set('x-test-user-id', user2Id)
        .expect(200);
      const body = projectByIdResponseSchema.parse(response.body as unknown);
      expect(body.access.capabilities.canEditContent).toBe(true);
      expect(body.access.capabilities.canPublish).toBe(false);

      await request(app.getHttpServer() as Server)
        .patch(`/projects/${createdProjectId}`)
        .set('x-test-user-id', user2Id)
        .send({ shortDescription: 'Edited by a verified editor' })
        .expect(200);

      await request(app.getHttpServer() as Server)
        .patch(`/projects/${createdProjectId}`)
        .set('x-test-user-id', user2Id)
        .send({ status: 'ARCHIVED' })
        .expect(403);
    });

    it('keeps a verified contributor read-only', async () => {
      await prisma.projectMember.update({
        where: {
          projectId_userId: {
            projectId: createdProjectId,
            userId: user2Id,
          },
        },
        data: { role: ProjectRoleKey.CONTRIBUTOR },
      });

      const response = await request(app.getHttpServer() as Server)
        .get(`/projects/id/${createdProjectId}`)
        .set('x-test-user-id', user2Id)
        .expect(200);
      const body = projectByIdResponseSchema.parse(response.body as unknown);
      expect(body.access.currentUserRole).toBe('CONTRIBUTOR');
      expect(body.access.capabilities.canEditContent).toBe(false);

      await request(app.getHttpServer() as Server)
        .patch(`/projects/${createdProjectId}`)
        .set('x-test-user-id', user2Id)
        .send({ shortDescription: 'Forbidden contributor edit' })
        .expect(403);
    });
  });

  describe('Swagger document', () => {
    it('documents project scope and capability responses at runtime', () => {
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().build(),
      );
      const serializedOperation = JSON.stringify(
        document.paths['/projects']?.get,
      );

      expect(serializedOperation).toContain('"scope"');
      expect(serializedOperation).toContain('"COLLABORATIONS"');
      expect(serializedOperation).toContain('"capabilities"');
      expect(document.paths['/users/developers/{slug}']?.get).toBeDefined();
    });
  });

  describe('GET /users/developers/:slug', () => {
    it('shows a verified contributor and their published collaboration', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get('/users/developers/user2-projects-e2e')
        .expect(200);

      const body = developerPublicProfileResponseSchema.parse(
        response.body as unknown,
      );
      expect(body).toMatchObject({
        publicSlug: 'user2-projects-e2e',
        displayName: 'Project Contributor',
        linkedinUrl: 'https://linkedin.com/in/project-contributor-e2e',
        stats: {
          publishedProjects: 1,
          ownedProjects: 0,
          collaborationProjects: 1,
        },
        projects: [
          expect.objectContaining({
            id: createdProjectId,
            role: 'CONTRIBUTOR',
          }),
        ],
      });
    });

    it('returns 404 for an unknown developer slug', async () => {
      await request(app.getHttpServer() as Server)
        .get('/users/developers/not-a-real-developer')
        .expect(404);
    });
  });

  describe('GET /projects/slug/:slug', () => {
    it('should retrieve a published project by slug without authentication (200)', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get('/projects/slug/test-project-1')
        .expect(200);

      const body = response.body as ProjectResponseBody;
      expect(body).toHaveProperty('id');
      expect(body.title).toBe('Updated Title');
      expect(body.status).toBe(ProjectStatus.PUBLISHED);
    });

    it('should return 404 when trying to retrieve a draft project by slug', async () => {
      await prisma.project.create({
        data: {
          title: 'Draft Project',
          slug: 'draft-project',
          repositoryId: repository2Id,
          createdByUserId: user1Id,
          status: ProjectStatus.DRAFT,
        },
      });

      await request(app.getHttpServer() as Server)
        .get('/projects/slug/draft-project')
        .expect(404);

      await prisma.project.delete({
        where: { slug: 'draft-project' },
      });
    });

    it('should return 404 when trying to retrieve an archived project by slug', async () => {
      await prisma.project.create({
        data: {
          title: 'Archived Project',
          slug: 'archived-project',
          repositoryId: repository2Id,
          createdByUserId: user1Id,
          status: ProjectStatus.ARCHIVED,
        },
      });

      await request(app.getHttpServer() as Server)
        .get('/projects/slug/archived-project')
        .expect(404);

      await prisma.project.delete({
        where: { slug: 'archived-project' },
      });
    });

    it('should return 404 for a non-existent slug', async () => {
      await request(app.getHttpServer() as Server)
        .get('/projects/slug/non-existent-slug')
        .expect(404);
    });
  });
});
