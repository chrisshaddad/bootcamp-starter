import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  PROJECT_INVITATION_JOBS,
  PROJECT_INVITATIONS_QUEUE,
} from './project-invitations.constants';
import { ProjectInvitationsService } from './project-invitations.service';

@Processor(PROJECT_INVITATIONS_QUEUE)
export class ProjectInvitationsProcessor extends WorkerHost {
  private readonly logger = new Logger(ProjectInvitationsProcessor.name);

  constructor(
    private readonly projectInvitationsService: ProjectInvitationsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== PROJECT_INVITATION_JOBS.EXPIRE_PENDING) {
      this.logger.warn(`Unknown project invitation job: ${job.name}`);
      return;
    }
    const expired =
      await this.projectInvitationsService.expirePendingInvitations();
    if (expired > 0) {
      this.logger.log(`Expired ${expired} pending project invitation(s).`);
    }
  }
}
