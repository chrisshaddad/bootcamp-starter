import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  // Enable raw body parsing globally (needed for Stripe webhook sig verification).
  // We selectively expose it only for the /webhooks/stripe path by reading req.rawBody.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  app.useLogger(app.get(Logger));

  // Helmet
  app.use(
    helmet({
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );
  app.use(compression());

  // CORS
  const frontendUrl = configService.getOrThrow<string>('app.frontendUrl');
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger at /docs with Bearer auth
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Forward-Mena API')
    .setDescription('Multi-org rentals SaaS backend — v1 foundation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = configService.get<number>('app.port') ?? 4000;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`Application listening on :${port}`, 'Bootstrap');
  logger.log(`Swagger docs at http://localhost:${port}/docs`, 'Bootstrap');
}

void bootstrap();
