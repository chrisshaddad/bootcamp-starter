import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'http';
import { AccountType, ProjectStatus, RepositoryVisibility } from '@repo/db';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthGuard } from './../src/auth/guards/auth.guard';
import { PrismaService } from './../src/database/prisma.service';

interface AuthenticatedTestRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: { id: string; accountType: AccountType };
}

interface GuardWithReflector {
  reflector: Reflector;
}

describe('AnalyticsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerId: string;
  let otherDeveloperId: string;
  let projectId: string;

  const projectSlug = 'analytics-e2e-project';
  const ownerEmail = 'analytics-owner-e2e@test.com';
  const otherEmail = 'analytics-other-e2e@test.com';
  const githubRepoId = 987654321n;

  beforeAll(async () => {
    jest.spyOn(AuthGuard.prototype, 'canActivate').mockImplementation(function (
      this: GuardWithReflector,
      context: ExecutionContext,
    ) {
      const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) return Promise.resolve(true);

      const request = context
        .switchToHttp()
        .getRequest<AuthenticatedTestRequest>();
      const userId = request.headers['x-test-user-id'];
      if (!userId || typeof userId !== 'string') return Promise.resolve(false);

      request.user = { id: userId, accountType: AccountType.DEVELOPER };
      return Promise.resolve(true);
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();

    await cleanUp();

    const owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        passwordHash: 'analytics-e2e-unused-password-hash',
        accountType: AccountType.DEVELOPER,
        isConfirmed: true,
        developerProfile: {
          create: {
            publicSlug: 'analytics-owner-e2e',
            displayName: 'Analytics Owner',
          },
        },
      },
    });
    ownerId = owner.id;

    const otherDeveloper = await prisma.user.create({
      data: {
        email: otherEmail,
        passwordHash: 'analytics-e2e-unused-password-hash',
        accountType: AccountType.DEVELOPER,
        isConfirmed: true,
        developerProfile: {
          create: {
            publicSlug: 'analytics-other-e2e',
            displayName: 'Other Developer',
          },
        },
      },
    });
    otherDeveloperId = otherDeveloper.id;

    const repository = await prisma.repository.create({
      data: {
        githubRepoId,
        fullName: 'analytics-owner-e2e/project',
        ownerLogin: 'analytics-owner-e2e',
        repoName: 'project',
        htmlUrl: 'https://github.com/analytics-owner-e2e/project',
        defaultBranch: 'main',
        visibility: RepositoryVisibility.PUBLIC,
      },
    });

    const project = await prisma.project.create({
      data: {
        repositoryId: repository.id,
        createdByUserId: ownerId,
        title: 'Analytics E2E Project',
        slug: projectSlug,
        status: ProjectStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
    jest.restoreAllMocks();
  });

  it('records a public project view and exposes it only to the owner', async () => {
    const event = {
      eventId: '00000000-0000-4000-8000-000000000001',
      eventType: 'PROJECT_VIEW',
      projectSlug,
    };
    const trackResponse = await request(app.getHttpServer() as Server)
      .post('/analytics/events')
      .set('User-Agent', 'Mozilla/5.0 analytics-e2e')
      .send(event)
      .expect(202);

    expect(trackResponse.body).toEqual({ accepted: true });

    await request(app.getHttpServer() as Server)
      .post('/analytics/events')
      .set('User-Agent', 'Mozilla/5.0 analytics-e2e')
      .send(event)
      .expect(202);

    await waitForVisit();
    await expect(
      prisma.analyticsVisit.count({ where: { projectId } }),
    ).resolves.toBe(1);

    const ownerResponse = await request(app.getHttpServer() as Server)
      .get(`/analytics/projects/${projectId}?range=7D`)
      .set('x-test-user-id', ownerId)
      .expect(200);

    expect(ownerResponse.body).toMatchObject({
      range: '7D',
      project: { id: projectId, slug: projectSlug },
      totals: { totalViews: 1, uniqueVisitors: 1, projectViews: 1 },
    });

    await request(app.getHttpServer() as Server)
      .get(`/analytics/projects/${projectId}?range=7D`)
      .set('x-test-user-id', otherDeveloperId)
      .expect(404);
  });

  async function waitForVisit(): Promise<void> {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const visit = await prisma.analyticsVisit.findFirst({
        where: { projectId },
      });
      if (visit) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Analytics visit was not processed by the queue');
  }

  async function cleanUp(): Promise<void> {
    await prisma.analyticsVisit.deleteMany({
      where: {
        OR: [
          { project: { slug: projectSlug } },
          { developer: { email: { in: [ownerEmail, otherEmail] } } },
        ],
      },
    });
    await prisma.project.deleteMany({ where: { slug: projectSlug } });
    await prisma.repository.deleteMany({ where: { githubRepoId } });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, otherEmail] } },
    });
  }
});
