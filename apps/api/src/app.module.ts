import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { UsersModule } from './users/users.module';
import { PharmaciesModule } from './pharmacies/pharmacies.module';
import { MedicinesModule } from './medicines/medicines.module';
import { StatsModule } from './stats/stats.module';
import { AuditModule } from './audit/audit.module';
import { ProfileModule } from './profile/profile.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL,
      },
    }),
    DatabaseModule,
    AuthModule,
    MailModule,
    UsersModule,
    PharmaciesModule,
    MedicinesModule,
    StatsModule,
    AuditModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
