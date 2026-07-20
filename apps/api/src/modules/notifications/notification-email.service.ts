import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KeycloakAdminService } from '@/infrastructure/keycloak/keycloak-admin.service';
import { MailService } from '@/infrastructure/mail/mail.service';
import { NotificationJobData } from './notifications.constants';

/**
 * Delivers a notification as an email — the "email step" of the notifications
 * worker. It is deliberately BEST-EFFORT and never throws: the in-app
 * Notification row is the source of truth, so a missing recipient email, an
 * unreachable Keycloak, or an SMTP failure must neither fail the queue job nor
 * block the in-app notification (mirrors TimelineService.emit /
 * NotificationsService.enqueue).
 *
 * Gated behind NOTIFICATIONS_EMAIL=on (config `mail.enabled`), which defaults
 * OFF so the app runs without an SMTP server (e.g. when mailpit is absent).
 */
@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly keycloak: KeycloakAdminService,
    private readonly mail: MailService,
  ) {}

  async deliver(job: NotificationJobData): Promise<void> {
    // Flag gate first — when off we do no work at all (no KC lookup, no SMTP).
    if (!this.config.get<boolean>('mail.enabled')) {
      return;
    }

    try {
      const email = await this.resolveEmail(job.userId);
      if (!email) {
        this.logger.warn(
          `No email on record for ${job.userId}; skipping email for '${job.type}'.`,
        );
        return;
      }

      await this.mail.sendMail({
        to: email,
        subject: job.title,
        text: job.body ?? job.title,
      });
      this.logger.debug(`Emailed notification '${job.type}' to ${email}`);
    } catch (error) {
      // Best-effort: swallow so the in-app notification still succeeds.
      this.logger.error(
        `Failed to email notification '${job.type}' to ${job.userId}: ${String(error)}`,
      );
    }
  }

  /** Resolve a recipient's email from Keycloak by `sub`. */
  private async resolveEmail(sub: string): Promise<string | null> {
    const user = await this.keycloak.getUser(sub);
    const email = user?.['email'];
    return typeof email === 'string' && email.length > 0 ? email : null;
  }
}
