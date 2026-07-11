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
import { BuildingAccessModule } from '@/common/building-access/building-access.module';
import { LeaseStatusModule } from '@/common/lease-status/lease-status.module';
import { HealthModule } from '@/modules/health/health.module';
import { TimelineModule } from '@/modules/timeline/timeline.module';
import { MeModule } from '@/modules/me/me.module';
import { OrgModule } from '@/modules/org/org.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { WebhooksModule } from '@/modules/webhooks/webhooks.module';
import { PaymentsModule } from '@/modules/payments/payments.module';
import { UsersModule } from '@/modules/users/users.module';
import { BuildingsModule } from '@/modules/buildings/buildings.module';
import { FloorsModule } from '@/modules/floors/floors.module';
import { ApartmentsModule } from '@/modules/apartments/apartments.module';
import { RentersModule } from '@/modules/renters/renters.module';
import { LeasesModule } from '@/modules/leases/leases.module';
import { VendorsModule } from '@/modules/vendors/vendors.module';
import { MaintenanceRequestsModule } from '@/modules/maintenance-requests/maintenance-requests.module';
import { WorkOrdersModule } from '@/modules/work-orders/work-orders.module';
import { ExpensesModule } from '@/modules/expenses/expenses.module';

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
    BuildingAccessModule,
    LeaseStatusModule,
    TimelineModule,
    HealthModule,
    MeModule,
    OrgModule,
    BillingModule,
    WebhooksModule,
    PaymentsModule,
    UsersModule,
    BuildingsModule,
    FloorsModule,
    ApartmentsModule,
    RentersModule,
    LeasesModule,
    VendorsModule,
    MaintenanceRequestsModule,
    WorkOrdersModule,
    ExpensesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
