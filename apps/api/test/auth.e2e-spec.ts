/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { Server } from 'http';

interface AuthResponse {
  user: {
    email: string;
  };
}

interface MeResponse {
  email: string;
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable cookie parser on test app so E2E tests can read/write session cookies
    app.use(cookieParser());

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up test user if it exists from previous aborted test runs
    try {
      await prisma.user.delete({ where: { email: 'e2e@test.com' } });
    } catch (_e) {
      // Ignore if user does not exist
    }
  });

  afterAll(async () => {
    try {
      await prisma.user.delete({ where: { email: 'e2e@test.com' } });
    } catch (_e) {
      // Ignore if user does not exist
    }
    await app.close();
  });

  it('/auth/signup (POST) - Creates an unconfirmed account', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/auth/signup')
      .send({
        email: 'e2e@test.com',
        password: 'Password123!',
        accountType: 'DEVELOPER',
        displayName: 'E2E User',
        publicSlug: 'e2e-user',
      });

    expect(response.status).toBe(201);

    const body = response.body as AuthResponse;
    expect(body.user.email).toBe('e2e@test.com');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('/auth/magic-link (POST) - Confirms the account and creates a session', async () => {
    await request(app.getHttpServer() as Server)
      .post('/auth/magic-link')
      .send({ email: 'e2e@test.com' })
      .expect(200);

    const magicLink = await prisma.magicLink.findFirst({
      where: { user: { email: 'e2e@test.com' }, usedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { token: true },
    });
    expect(magicLink).not.toBeNull();

    const response = await request(app.getHttpServer() as Server)
      .post('/auth/magic-link/verify')
      .send({ token: magicLink!.token })
      .expect(200);

    const body = response.body as AuthResponse;
    expect(body.user.email).toBe('e2e@test.com');
    expect(response.headers['set-cookie']).toBeDefined();

    const setCookie = response.headers['set-cookie'];
    cookie = setCookie?.[0] ?? '';
  });

  it('/auth/login (POST) - Success', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'e2e@test.com',
        password: 'Password123!',
      });

    expect(response.status).toBe(200);

    const body = response.body as AuthResponse;
    expect(body.user.email).toBe('e2e@test.com');
    cookie = response.headers['set-cookie']?.[0] ?? '';
  });

  it('/auth/me (GET) - Success with Cookie', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/auth/me')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);

    const body = response.body as MeResponse;
    expect(body.email).toBe('e2e@test.com');
  });

  it('/auth/logout (POST) - Clears cookie', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/auth/logout')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);

    // Safely verify the clearing of the cookie
    const setCookie = response.headers['set-cookie']?.[0] ?? '';
    expect(setCookie).toMatch(/Max-Age=0|Expires=/);
  });
});
