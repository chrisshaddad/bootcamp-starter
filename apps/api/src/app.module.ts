import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { GymsModule } from './gyms/gyms.module';
import { MembersModule } from './members/members.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { MePortalModule } from './me-portal/me-portal.module';
import { InstructorsModule } from './instructors/instructors.module';
import { DatabaseModule } from './database/database.module';
import { SessionsModule } from './sessions/sessions.module';
import { BookingsModule } from './bookings/bookings.module';
import { CheckInsModule } from './checkins/checkins.module';
import { AuditModule } from './audit/audit.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6380',
      },
    }),
    DatabaseModule,
    AuthModule,
    MailModule,
    GymsModule,
    MembersModule,
    PlansModule,
    AuditModule,
    SubscriptionsModule,
    MePortalModule,
    InstructorsModule,
    SessionsModule,
    BookingsModule,
    CheckInsModule,
    DashboardModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
