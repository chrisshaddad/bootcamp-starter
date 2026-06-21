import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow larger JSON payloads for profile image uploads.
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Enable cookie parsing for session management
  app.use(cookieParser());

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.APP_URL,
    credentials: true,
  });

  await app.listen(3001);
}
void bootstrap();
