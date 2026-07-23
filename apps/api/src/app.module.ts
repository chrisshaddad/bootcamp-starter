import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { ApplicationsModule } from './applications/applications.module';
import { SkillGapsModule } from './skill-gaps/skill-gaps.module';
import { SkillsModule } from './skills/skills.module';
import { DepartmentsModule } from './departments/departments.module';
import { CareerPathsModule } from './career-paths/career-paths.module';

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
    UsersModule,
    EmployeesModule,
    OpportunitiesModule,
    ApplicationsModule,
    SkillGapsModule,
    SkillsModule,
    DepartmentsModule,
    CareerPathsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
