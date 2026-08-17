import { Injectable, Logger } from '@nestjs/common';
import { MailpitClient } from 'mailpit-api';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private mailpit: MailpitClient | null = null;
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly brevoApiKey = process.env.BREVO_API_KEY?.trim();
  private readonly brevoSenderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  private readonly brevoSenderName =
    process.env.BREVO_SENDER_NAME?.trim() || 'Bootcamp Starter';

  constructor() {
    // Only initialize Mailpit in non-production environments
    if (!this.isProduction && process.env.MAILPIT_URL) {
      this.mailpit = new MailpitClient(process.env.MAILPIT_URL);
      this.logger.log(
        `Mailpit client initialized with URL: ${process.env.MAILPIT_URL}`,
      );
    } else if (this.isProduction) {
      if (!this.brevoApiKey || !this.brevoSenderEmail) {
        this.logger.warn(
          'BREVO_API_KEY or BREVO_SENDER_EMAIL is not set. Production email is disabled.',
        );
      } else {
        this.logger.log('Brevo transactional email is configured.');
      }
    } else {
      this.logger.warn(
        'MAILPIT_URL environment variable not set. Email functionality disabled.',
      );
    }
  }

  async sendEmail(params: {
    to: string;
    from: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<boolean> {
    try {
      if (this.mailpit && !this.isProduction) {
        await this.mailpit.sendMessage({
          To: [{ Email: params.to }],
          From: { Email: params.from || 'no-reply@bootcamp-starter.local' },
          Subject: params.subject,
          Text: params.text || '',
          HTML: params.html || '',
        });
      } else if (this.isProduction) {
        if (!this.brevoApiKey || !this.brevoSenderEmail) return false;

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': this.brevoApiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              email: this.brevoSenderEmail,
              name: this.brevoSenderName,
            },
            to: [{ email: params.to }],
            subject: params.subject,
            textContent: params.text,
            htmlContent: params.html,
          }),
        });

        if (!response.ok) {
          const details = await response.text();
          throw new Error(
            `Brevo returned HTTP ${response.status}: ${details.slice(0, 500)}`,
          );
        }
      }

      this.logger.log(`Email sent to ${params.to}: ${params.subject}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${params.to}:`, error);
      return false;
    }
  }
}
