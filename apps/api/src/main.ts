import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable cookie parsing for session management
  app.use(cookieParser());
  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.APP_URL,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Gym Management API')
    .setDescription(
      'Multi-tenant REST API for gym management. All tenant-scoped endpoints require an active session cookie (`bootcamp_starter_session`) issued after magic-link login. ' +
        'Data is strictly isolated per gym — every query is filtered by the `gymId` resolved from the session.',
    )
    .setVersion('1.0')
    .addCookieAuth(
      'bootcamp_starter_session',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'bootcamp_starter_session',
        description:
          'HttpOnly session cookie issued after magic-link login (30-day TTL)',
      },
      'session-cookie',
    )
    .addTag('auth', 'Magic-link authentication')
    .addTag('gyms', 'Gym tenant management (SUPER_ADMIN)')
    .addTag('members', 'Gym member management (ORG_ADMIN)')
    .addTag('plans', 'Membership plan catalog (ORG_ADMIN)')
    .addTag('subscriptions', 'Member subscription tracking (ORG_ADMIN)')
    .addTag('sessions', 'Scheduled gym sessions / classes (ORG_ADMIN)')
    .addTag('bookings', 'Session bookings + capacity (ORG_ADMIN)')
    .addTag('checkins', 'Live occupancy + QR check-in (ORG_ADMIN / MEMBER)')
    .addTag('dashboard', 'Gym analytics dashboard (ORG_ADMIN)')
    .addTag('me', 'Member self-service portal (MEMBER)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Gym Management API Docs',
  });

  await app.listen(3001);
}
void bootstrap();
