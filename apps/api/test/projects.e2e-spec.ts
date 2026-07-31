import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/prisma.service';
import { AuthGuard } from '../src/auth/guards/auth.guard';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;

  const mockUser = {
    id: 'test-user-id',
    email: 'developer@example.com',
    accountType: 'DEVELOPER',
    isConfirmed: true,
    hasSeenDashboardTour: true,
  };

  const mockPrismaService = {
    project: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(mockUser),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
          req.sessionId = 'mock-session-id';
          return true;
        },
      })
      .overrideProvider(DatabaseService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /projects', () => {
    it('should return 200 and list of projects', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /projects/:id', () => {
    it('should return 404 if project is not found', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/projects/unknown-id')
        .expect(404);
    });
  });
});
