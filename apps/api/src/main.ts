import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable cookie parsing for session management
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.APP_URL,
    credentials: true,
  });

  // Serve locally-uploaded files (e.g. profile pictures)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  setupSwagger(app);

  await app.listen(3001);
}
void bootstrap();
