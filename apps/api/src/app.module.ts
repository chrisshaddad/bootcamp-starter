import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { DatabaseModule } from './database/database.module';

// Margin feature modules
import { ProductsModule } from './products/products.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { ExpensesModule } from './expenses/expenses.module';
import { SalesModule } from './sales/sales.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ImportsModule } from './imports/imports.module';
import { GoalsModule } from './goals/goals.module';
import { AlertsModule } from './alerts/alerts.module';
import { AiInsightsModule } from './ai-insights/ai-insights.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL,
      },
    }),
    // Core
    DatabaseModule,
    AuthModule,
    MailModule,
    OrganizationsModule,
    // Margin
    ProductsModule,
    ExpenseCategoriesModule,
    ExpensesModule,
    SalesModule,
    DashboardModule,
    ImportsModule,
    GoalsModule,
    AlertsModule,
    AiInsightsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
