import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SESSION_COOKIE_NAME } from './auth/guards/auth.guard';

type SwaggerRequest = {
  credentials?: 'include' | 'omit' | 'same-origin';
};

export function setupSwagger(app: INestApplication): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Bootcamp Starter API')
    .setDescription('Interactive API documentation for local development.')
    .setVersion('1.0')
    .addCookieAuth(
      SESSION_COOKIE_NAME,
      {
        type: 'apiKey',
        in: 'cookie',
        name: SESSION_COOKIE_NAME,
      },
      'session',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
      requestInterceptor: (request: SwaggerRequest) => {
        request.credentials = 'include';
        return request;
      },
    },
  });
}
