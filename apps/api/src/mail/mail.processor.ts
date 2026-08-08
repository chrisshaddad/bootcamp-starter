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
  membershipApprovedEmail,
  membershipStatusNoticeEmail,
  customerBookNoticeEmail,
  staffBookNoticeEmail,
  organizationRegistrationReceivedEmail,
  organizationApprovedEmail,
  organizationStatusNoticeEmail,
  type OrganizationBlockedStatus,
  type MembershipStatusNoticeType,
  type CustomerBookNoticeType,
  type StaffBookNoticeType,
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

interface SendMembershipApprovedJobData {
  email: string;
  patronName: string;
  organizationName: string;
  browseLink: string;
}

interface SendMembershipStatusNoticeJobData {
  email: string;
  patronName: string;
  organizationName: string;
  status: MembershipStatusNoticeType;
  browseLink?: string;
}

interface SendCustomerBookNoticeJobData {
  email: string;
  patronName: string;
  organizationName: string;
  type: CustomerBookNoticeType;
  bookTitle?: string;
  dueDate?: string;
  itemTitles?: string[];
  total?: string;
  reason?: string;
  actionLink?: string;
  actionLabel?: string;
}

interface SendStaffBookNoticeJobData {
  email: string;
  staffName?: string;
  organizationName: string;
  type: StaffBookNoticeType;
  patronName?: string;
  patronEmail?: string;
  libraryCardNumber?: string;
  bookTitle?: string;
  itemTitles?: string[];
  total?: string;
  dueDate?: string;
}

interface SendOrgRegistrationReceivedJobData {
  email: string;
  adminName: string;
  organizationName: string;
}

interface SendOrgApprovedJobData {
  email: string;
  adminName: string;
  organizationName: string;
  signInLink: string;
}

interface SendOrgStatusNoticeJobData {
  email: string;
  adminName: string;
  organizationName: string;
  status: OrganizationBlockedStatus;
}

type MailJobData =
  | SendMagicLinkJobData
  | SendInvitationJobData
  | SendDueReminderJobData
  | SendMembershipClaimJobData
  | SendMembershipApprovedJobData
  | SendMembershipStatusNoticeJobData
  | SendCustomerBookNoticeJobData
  | SendStaffBookNoticeJobData
  | SendOrgRegistrationReceivedJobData
  | SendOrgApprovedJobData
  | SendOrgStatusNoticeJobData;

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
      case MAIL_JOBS.SEND_MEMBERSHIP_APPROVED:
        await this.handleSendMembershipApproved(
          job.data as SendMembershipApprovedJobData,
        );
        break;
      case MAIL_JOBS.SEND_MEMBERSHIP_STATUS_NOTICE:
        await this.handleSendMembershipStatusNotice(
          job.data as SendMembershipStatusNoticeJobData,
        );
        break;
      case MAIL_JOBS.SEND_CUSTOMER_BOOK_NOTICE:
        await this.handleSendCustomerBookNotice(
          job.data as SendCustomerBookNoticeJobData,
        );
        break;
      case MAIL_JOBS.SEND_STAFF_BOOK_NOTICE:
        await this.handleSendStaffBookNotice(
          job.data as SendStaffBookNoticeJobData,
        );
        break;
      case MAIL_JOBS.SEND_ORG_REGISTRATION_RECEIVED:
        await this.handleSendOrgRegistrationReceived(
          job.data as SendOrgRegistrationReceivedJobData,
        );
        break;
      case MAIL_JOBS.SEND_ORG_APPROVED:
        await this.handleSendOrgApproved(job.data as SendOrgApprovedJobData);
        break;
      case MAIL_JOBS.SEND_ORG_STATUS_NOTICE:
        await this.handleSendOrgStatusNotice(
          job.data as SendOrgStatusNoticeJobData,
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

  private async handleSendMembershipApproved(
    data: SendMembershipApprovedJobData,
  ): Promise<void> {
    const { email, patronName, organizationName, browseLink } = data;
    const { subject, text, html } = membershipApprovedEmail({
      patronName,
      organizationName,
      browseLink,
    });

    const success = await this.mailService.sendEmail({
      to: email,
      from: FROM_ADDRESS,
      subject,
      text,
      html,
    });

    if (success) {
      this.logger.log(
        `Membership approval email sent successfully to ${email}`,
      );
    } else {
      this.logger.error(`Failed to send membership approval email to ${email}`);
      throw new Error(`Failed to send email to ${email}`);
    }
  }

  private async handleSendMembershipStatusNotice(
    data: SendMembershipStatusNoticeJobData,
  ): Promise<void> {
    const { email, patronName, organizationName, status, browseLink } = data;
    const { subject, text, html } = membershipStatusNoticeEmail({
      patronName,
      organizationName,
      status,
      browseLink,
    });

    await this.send(email, { subject, text, html }, 'membership status');
  }

  private async handleSendCustomerBookNotice(
    data: SendCustomerBookNoticeJobData,
  ): Promise<void> {
    const {
      email,
      patronName,
      organizationName,
      type,
      bookTitle,
      dueDate,
      itemTitles,
      total,
      reason,
      actionLink,
      actionLabel,
    } = data;

    const { subject, text, html } = customerBookNoticeEmail({
      patronName,
      organizationName,
      type,
      bookTitle,
      dueDate,
      itemTitles,
      total,
      reason,
      actionLink,
      actionLabel,
    });

    await this.send(email, { subject, text, html }, 'customer notice');
  }

  private async handleSendStaffBookNotice(
    data: SendStaffBookNoticeJobData,
  ): Promise<void> {
    const {
      email,
      staffName,
      organizationName,
      type,
      patronName,
      patronEmail,
      libraryCardNumber,
      bookTitle,
      itemTitles,
      total,
      dueDate,
    } = data;

    const { subject, text, html } = staffBookNoticeEmail({
      staffName,
      organizationName,
      type,
      patronName,
      patronEmail,
      libraryCardNumber,
      bookTitle,
      itemTitles,
      total,
      dueDate,
    });

    await this.send(email, { subject, text, html }, 'staff notice');
  }

  private async handleSendOrgRegistrationReceived(
    data: SendOrgRegistrationReceivedJobData,
  ): Promise<void> {
    const { email, adminName, organizationName } = data;
    const { subject, text, html } = organizationRegistrationReceivedEmail({
      adminName,
      organizationName,
    });

    await this.send(email, { subject, text, html }, 'org registration');
  }

  private async handleSendOrgApproved(
    data: SendOrgApprovedJobData,
  ): Promise<void> {
    const { email, adminName, organizationName, signInLink } = data;
    const { subject, text, html } = organizationApprovedEmail({
      adminName,
      organizationName,
      signInLink,
    });

    await this.send(email, { subject, text, html }, 'org approval');
  }

  private async handleSendOrgStatusNotice(
    data: SendOrgStatusNoticeJobData,
  ): Promise<void> {
    const { email, adminName, organizationName, status } = data;
    const { subject, text, html } = organizationStatusNoticeEmail({
      adminName,
      organizationName,
      status,
    });

    await this.send(email, { subject, text, html }, 'org status notice');
  }

  /**
   * Send + log + throw-on-failure, shared by the organization handlers.
   * (The older handlers above predate this and still inline the same shape.)
   */
  private async send(
    to: string,
    content: { subject: string; text: string; html: string },
    label: string,
  ): Promise<void> {
    const success = await this.mailService.sendEmail({
      to,
      from: FROM_ADDRESS,
      ...content,
    });

    if (success) {
      this.logger.log(`${label} email sent successfully to ${to}`);
    } else {
      this.logger.error(`Failed to send ${label} email to ${to}`);
      throw new Error(`Failed to send email to ${to}`);
    }
  }
}
