import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from './mail.service';
import { MAIL_QUEUE, MAIL_JOBS } from './mail.constants';

interface SendMagicLinkJobData {
  email: string;
  magicLink: string;
  userName?: string;
}

interface SendInvitationJobData {
  email: string;
  inviterName: string;
  institutionName: string;
  invitationLink: string;
}

interface NotifyNewUserJobData {
  adminEmails: string[];
  newUserName: string;
  newUserRoleLabel: string;
  institutionName: string;
  createdByName: string;
}

type MailJobData =
  | SendMagicLinkJobData
  | SendInvitationJobData
  | NotifyNewUserJobData;

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<MailJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case MAIL_JOBS.SEND_MAGIC_LINK:
        await this.handleSendMagicLink(job.data as SendMagicLinkJobData);
        break;
      case MAIL_JOBS.SEND_INVITATION:
        await this.handleSendInvitation(job.data as SendInvitationJobData);
        break;
      case MAIL_JOBS.NOTIFY_NEW_USER:
        await this.handleNotifyNewUser(job.data as NotifyNewUserJobData);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleSendMagicLink(data: SendMagicLinkJobData): Promise<void> {
    const { email, magicLink, userName } = data;

    const greeting = userName ? `Hello ${userName},` : 'Hello,';
    const text = `${greeting}\n\nClick the link below to sign in to your MediLink account:\n\n${magicLink}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email — your account is still secure.\n\n— MediLink`;

    const success = await this.mailService.sendEmail({
      to: email,
      from: 'no-reply@medilink.local',
      subject: 'Sign in to MediLink',
      text,
    });

    if (success) {
      this.logger.log('Magic link email sent successfully');
    } else {
      this.logger.error('Failed to send magic link email');
      throw new Error('Failed to send magic link email');
    }
  }

  private async handleSendInvitation(
    data: SendInvitationJobData,
  ): Promise<void> {
    const { email, inviterName, institutionName, invitationLink } = data;

    const text = `Hello,\n\n${inviterName} has invited you to join ${institutionName} on MediLink.\n\nClick the link below to accept the invitation and set up your account:\n\n${invitationLink}\n\nThis invitation link will expire in 7 days.\n\nIf you weren't expecting this invitation, you can safely ignore this email.\n\n— MediLink`;

    const success = await this.mailService.sendEmail({
      to: email,
      from: 'no-reply@medilink.local',
      subject: `You've been invited to join ${institutionName} on MediLink`,
      text,
    });

    if (success) {
      this.logger.log('Invitation email sent successfully');
    } else {
      this.logger.error('Failed to send invitation email');
      throw new Error('Failed to send invitation email');
    }
  }

  private async handleNotifyNewUser(data: NotifyNewUserJobData): Promise<void> {
    const {
      adminEmails,
      newUserName,
      newUserRoleLabel,
      institutionName,
      createdByName,
    } = data;

    const text = `Hello,\n\n${createdByName} added a new ${newUserRoleLabel} (${newUserName}) to ${institutionName} on MediLink.\n\nNo action is needed — this is just a heads-up.\n\n— MediLink`;

    let sent = 0;
    let failed = 0;
    for (const email of adminEmails) {
      const success = await this.mailService.sendEmail({
        to: email,
        from: 'no-reply@medilink.local',
        subject: `New ${newUserRoleLabel} added to ${institutionName}`,
        text,
      });

      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    this.logger.log(
      `New-user notification: ${sent} sent, ${failed} failed (institution ${institutionName})`,
    );
  }
}
