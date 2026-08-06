import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { DatabaseModule } from './database/database.module';
import { GithubModule } from './github/github.module';
import { ProjectsModule } from './projects/projects.module';
import { UsersModule } from './users/users.module';
import { TechnologiesModule } from './technologies/technologies.module';
import { SavedProjectsModule } from './saved-projects/saved-projects.module';
import { ProjectInvitationsModule } from './project-invitations/project-invitations.module';
import { AdminModule } from './admin/admin.module';
import { SettingsModule } from './settings/settings.module';
import { SavedCandidatesModule } from './saved-candidates/saved-candidates.module';
import { AnalyticsModule } from './analytics/analytics.module';
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
    GithubModule,
    ProjectsModule,
    UsersModule,
    TechnologiesModule,
    SavedProjectsModule,
    ProjectInvitationsModule,
    AdminModule,
    SettingsModule,
    SavedCandidatesModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
