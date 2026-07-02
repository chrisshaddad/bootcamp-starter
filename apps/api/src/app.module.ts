import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { ApplicationsModule } from './applications/applications.module';
import { SkillGapsModule } from './skill-gaps/skill-gaps.module';

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
    OrganizationsModule,
    EmployeesModule,
    OpportunitiesModule,
    ApplicationsModule,
    SkillGapsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
