import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
}));
