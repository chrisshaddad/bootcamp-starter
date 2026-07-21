import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AccountType } from '@repo/db';
import {
  adminAccountResponseSchema,
  adminAuditLogListResponseSchema,
  adminOverviewResponseSchema,
  adminProjectResponseSchema,
} from '@repo/contracts';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from './../src/app.module';
import { AuthGuard } from './../src/auth/guards/auth.guard';
import { PrismaService } from './../src/database/prisma.service';

interface TestRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: { id: string; accountType: AccountType };
}

describe('AdminController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: string;
  let developerId: string;
  let projectId: string;
  let repositoryId: string;
  let guardSpy: jest.SpyInstance;

  beforeAll(async () => {
    guardSpy = jest
      .spyOn(AuthGuard.prototype, 'canActivate')
      .mockImplementation(function (context: ExecutionContext) {
        const req = context.switchToHttp().getRequest<TestRequest>();
        const userId = req.headers['x-test-user-id'];
        const accountType = req.headers['x-test-account-type'];
        if (typeof userId !== 'string' || typeof accountType !== 'string') {
          return Promise.resolve(false);
        }
        req.user = { id: userId, accountType: accountType as AccountType };
        return Promise.resolve(true);
      });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();

    await prisma.adminAuditLog.deleteMany({
      where: { reason: { contains: '[admin-e2e]' } },
    });
    const existingProject = await prisma.project.findUnique({
      where: { slug: 'admin-e2e-project' },
      select: { id: true, repositoryId: true },
    });
    if (existingProject) {
      await prisma.project.delete({ where: { id: existingProject.id } });
      await prisma.repository.delete({
        where: { id: existingProject.repositoryId },
      });
    }
    await prisma.user.deleteMany({
      where: {
        email: { in: ['admin-e2e@test.com', 'developer-admin-e2e@test.com'] },
      },
    });

    const admin = await prisma.user.create({
      data: {
        email: 'admin-e2e@test.com',
        passwordHash: 'unused',
        accountType: 'SUPER_ADMIN',
        isConfirmed: true,
      },
    });
    adminId = admin.id;
    const developer = await prisma.user.create({
      data: {
        email: 'developer-admin-e2e@test.com',
        passwordHash: 'unused',
        accountType: 'DEVELOPER',
        isConfirmed: true,
        developerProfile: {
          create: {
            publicSlug: 'developer-admin-e2e',
            displayName: 'Admin E2E Developer',
          },
        },
      },
    });
    developerId = developer.id;
    const repository = await prisma.repository.create({
      data: {
        githubRepoId: 918273645n,
        fullName: 'e2e/admin-panel',
        ownerLogin: 'e2e',
        repoName: 'admin-panel',
        htmlUrl: 'https://github.com/e2e/admin-panel',
      },
    });
    repositoryId = repository.id;
    const project = await prisma.project.create({
      data: {
        repositoryId,
        createdByUserId: developerId,
        title: 'Admin E2E Project',
        slug: 'admin-e2e-project',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.adminAuditLog.deleteMany({
      where: { reason: { contains: '[admin-e2e]' } },
    });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.repository.deleteMany({ where: { id: repositoryId } });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, developerId] } },
    });
    guardSpy.mockRestore();
    await app.close();
  });

  it('rejects non-super-admin accounts', async () => {
    await request(app.getHttpServer() as Server)
      .get('/admin/overview')
      .set('x-test-user-id', developerId)
      .set('x-test-account-type', 'DEVELOPER')
      .expect(403);
  });

  it('returns a contract-validated overview to super admins', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/admin/overview')
      .set('x-test-user-id', adminId)
      .set('x-test-account-type', 'SUPER_ADMIN')
      .expect(200);
    expect(() =>
      adminOverviewResponseSchema.parse(response.body),
    ).not.toThrow();
  });

  it('suspends and reactivates an account with an audit trail', async () => {
    const suspend = await request(app.getHttpServer() as Server)
      .patch(`/admin/accounts/${developerId}/status`)
      .set('x-test-user-id', adminId)
      .set('x-test-account-type', 'SUPER_ADMIN')
      .send({
        status: 'SUSPENDED',
        reason: '[admin-e2e] account moderation test',
      })
      .expect(200);
    expect(adminAccountResponseSchema.parse(suspend.body).status).toBe(
      'SUSPENDED',
    );

    const reactivate = await request(app.getHttpServer() as Server)
      .patch(`/admin/accounts/${developerId}/status`)
      .set('x-test-user-id', adminId)
      .set('x-test-account-type', 'SUPER_ADMIN')
      .send({
        status: 'ACTIVE',
        reason: '[admin-e2e] account moderation resolved',
      })
      .expect(200);
    expect(adminAccountResponseSchema.parse(reactivate.body).status).toBe(
      'ACTIVE',
    );

    const logs = await request(app.getHttpServer() as Server)
      .get('/admin/audit-logs?targetType=USER')
      .set('x-test-user-id', adminId)
      .set('x-test-account-type', 'SUPER_ADMIN')
      .expect(200);
    const parsed = adminAuditLogListResponseSchema.parse(logs.body);
    expect(
      parsed.data.filter((log) => log.targetId === developerId),
    ).toHaveLength(2);
  });

  it('suspends and restores a project with an audit trail', async () => {
    const suspension = await request(app.getHttpServer() as Server)
      .patch(`/admin/projects/${projectId}/moderation`)
      .set('x-test-user-id', adminId)
      .set('x-test-account-type', 'SUPER_ADMIN')
      .send({ action: 'SUSPEND', reason: '[admin-e2e] unsafe content' })
      .expect(200);
    expect(adminProjectResponseSchema.parse(suspension.body).status).toBe(
      'SUSPENDED',
    );

    await request(app.getHttpServer() as Server)
      .patch(`/projects/${projectId}`)
      .set('x-test-user-id', developerId)
      .set('x-test-account-type', 'DEVELOPER')
      .send({ status: 'PUBLISHED' })
      .expect(403);

    const restore = await request(app.getHttpServer() as Server)
      .patch(`/admin/projects/${projectId}/moderation`)
      .set('x-test-user-id', adminId)
      .set('x-test-account-type', 'SUPER_ADMIN')
      .send({ action: 'RESTORE', reason: '[admin-e2e] concern resolved' })
      .expect(200);
    expect(adminProjectResponseSchema.parse(restore.body).status).toBe('DRAFT');

    const logs = await request(app.getHttpServer() as Server)
      .get('/admin/audit-logs?targetType=PROJECT')
      .set('x-test-user-id', adminId)
      .set('x-test-account-type', 'SUPER_ADMIN')
      .expect(200);
    const parsed = adminAuditLogListResponseSchema.parse(logs.body);
    expect(
      parsed.data.filter((log) => log.targetId === projectId),
    ).toHaveLength(2);
  });

  it('documents moderation bodies in Swagger', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Admin E2E').build(),
    );
    const operation = document.paths['/admin/projects/{id}/moderation']?.patch;
    expect(operation?.requestBody).toBeDefined();
    expect(operation?.security).toEqual(
      expect.arrayContaining([expect.objectContaining({ session: [] })]),
    );
  });
});
