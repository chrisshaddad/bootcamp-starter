import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { appConfig } from '@/config/app.config';
import { databaseConfig } from '@/config/database.config';
import { envValidationSchema } from '@/config/env.validation';
import { keycloakConfig } from '@/config/keycloak.config';
import { stripeConfig } from '@/config/stripe.config';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { KeycloakModule } from '@/infrastructure/keycloak/keycloak.module';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { OrgScopeModule } from '@/common/org-scope/org-scope.module';
import { HealthModule } from '@/modules/health/health.module';
import { TimelineModule } from '@/modules/timeline/timeline.module';
import { MeModule } from '@/modules/me/me.module';
import { OrgModule } from '@/modules/org/org.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { WebhooksModule } from '@/modules/webhooks/webhooks.module';
import { PaymentsModule } from '@/modules/payments/payments.module';
import { UsersModule } from '@/modules/users/users.module';
import { BuildingsModule } from '@/modules/buildings/buildings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env.local',
        '.env',
      ],
      load: [appConfig, databaseConfig, keycloakConfig, stripeConfig],
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty' },
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    KeycloakModule,
    OrgScopeModule,
    TimelineModule,
    HealthModule,
    MeModule,
    OrgModule,
    BillingModule,
    WebhooksModule,
    PaymentsModule,
    UsersModule,
    BuildingsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
