import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { GithubModule } from '../github/github.module';
import { MailModule } from '../mail/mail.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectInvitationsController } from './project-invitations.controller';
import { PROJECT_INVITATIONS_QUEUE } from './project-invitations.constants';
import { ProjectInvitationsProcessor } from './project-invitations.processor';
import { ProjectInvitationRateLimiter } from './project-invitation-rate-limiter.service';
import { ProjectInvitationsService } from './project-invitations.service';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    GithubModule,
    MailModule,
    ProjectsModule,
    BullModule.registerQueue({ name: PROJECT_INVITATIONS_QUEUE }),
  ],
  controllers: [ProjectInvitationsController],
  providers: [
    ProjectInvitationsService,
    ProjectInvitationsProcessor,
    ProjectInvitationRateLimiter,
  ],
  exports: [ProjectInvitationsService],
})
export class ProjectInvitationsModule {}
