import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from './mail.service';
import { MAIL_QUEUE, MAIL_JOBS } from './mail.constants';
import {
  magicLinkEmail,
  invitationEmail,
  dueReminderEmail,
  membershipClaimEmail,
} from './templates';

interface SendMagicLinkJobData {
  email: string;
  magicLink: string;
  userName?: string;
  isNewAccount?: boolean;
}

interface SendInvitationJobData {
  email: string;
  inviterName: string;
  organizationName: string;
  invitationLink: string;
}

interface SendDueReminderJobData {
  email: string;
  userName?: string;
  bookTitle: string;
  // ISO string - job data must be JSON-serializable, so this isn't a Date.
  dueDate: string;
  reminderType: 'DUE_IN_5_DAYS' | 'DUE_TOMORROW' | 'DUE_TODAY';
}

interface SendMembershipClaimJobData {
  email: string;
  patronName: string;
  organizationName: string;
  libraryCardNumber: string;
  claimLink: string;
}

type MailJobData =
  | SendMagicLinkJobData
  | SendInvitationJobData
  | SendDueReminderJobData
  | SendMembershipClaimJobData;

const FROM_ADDRESS = 'no-reply@nextshelf.local';

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
      case MAIL_JOBS.SEND_DUE_REMINDER:
        await this.handleSendDueReminder(job.data as SendDueReminderJobData);
        break;
      case MAIL_JOBS.SEND_MEMBERSHIP_CLAIM:
        await this.handleSendMembershipClaim(
          job.data as SendMembershipClaimJobData,
        );
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleSendMagicLink(data: SendMagicLinkJobData): Promise<void> {
    const { email, magicLink, userName, isNewAccount } = data;
    const { subject, text, html } = magicLinkEmail({
      magicLink,
      userName,
      isNewAccount,
    });

    const success = await this.mailService.sendEmail({
      to: email,
      from: FROM_ADDRESS,
      subject,
      text,
      html,
    });

    if (success) {
      this.logger.log(`Magic link email sent successfully to ${email}`);
    } else {
      this.logger.error(`Failed to send magic link email to ${email}`);
      throw new Error(`Failed to send email to ${email}`);
    }
  }

  private async handleSendInvitation(
    data: SendInvitationJobData,
  ): Promise<void> {
    const { email, inviterName, organizationName, invitationLink } = data;
    const { subject, text, html } = invitationEmail({
      inviterName,
      organizationName,
      invitationLink,
    });

    const success = await this.mailService.sendEmail({
      to: email,
      from: FROM_ADDRESS,
      subject,
      text,
      html,
    });

    if (success) {
      this.logger.log(`Invitation email sent successfully to ${email}`);
    } else {
      this.logger.error(`Failed to send invitation email to ${email}`);
      throw new Error(`Failed to send email to ${email}`);
    }
  }

  private async handleSendDueReminder(
    data: SendDueReminderJobData,
  ): Promise<void> {
    const { email, userName, bookTitle, dueDate, reminderType } = data;
    const { subject, text, html } = dueReminderEmail({
      userName,
      bookTitle,
      dueDate,
      reminderType,
    });

    const success = await this.mailService.sendEmail({
      to: email,
      from: FROM_ADDRESS,
      subject,
      text,
      html,
    });

    if (success) {
      this.logger.log(`Due reminder email sent successfully to ${email}`);
    } else {
      this.logger.error(`Failed to send due reminder email to ${email}`);
      throw new Error(`Failed to send email to ${email}`);
    }
  }

  private async handleSendMembershipClaim(
    data: SendMembershipClaimJobData,
  ): Promise<void> {
    const {
      email,
      patronName,
      organizationName,
      libraryCardNumber,
      claimLink,
    } = data;
    const { subject, text, html } = membershipClaimEmail({
      patronName,
      organizationName,
      libraryCardNumber,
      claimLink,
    });

    const success = await this.mailService.sendEmail({
      to: email,
      from: FROM_ADDRESS,
      subject,
      text,
      html,
    });

    if (success) {
      this.logger.log(`Membership claim email sent successfully to ${email}`);
    } else {
      this.logger.error(`Failed to send membership claim email to ${email}`);
      throw new Error(`Failed to send email to ${email}`);
    }
  }
}
