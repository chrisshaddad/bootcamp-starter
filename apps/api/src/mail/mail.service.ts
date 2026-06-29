import { Injectable, Logger } from '@nestjs/common';
import { MailpitClient } from 'mailpit-api';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private mailpit: MailpitClient | null = null;
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor() {
    // Only initialize Mailpit in non-production environments
    if (!this.isProduction && process.env.MAILPIT_URL) {
      this.mailpit = new MailpitClient(process.env.MAILPIT_URL);
      this.logger.log(
        `Mailpit client initialized with URL: ${process.env.MAILPIT_URL}`,
      );
    } else if (this.isProduction) {
      // TODO: Integrate with a real email service provider in production
      this.logger.warn('No production email service configured.');
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
      if (!this.isProduction && process.env.MAILPIT_URL) {
        const res = await fetch(`${process.env.MAILPIT_URL}/api/v1/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            To: [{ Email: params.to }],
            From: { Email: params.from || 'no-reply@bootcamp-starter.local' },
            Subject: params.subject,
            Text: params.text || '',
            HTML: params.html || '',
          }),
        });
        
        if (!res.ok) {
          throw new Error(`Mailpit failed: ${res.status} ${await res.text()}`);
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
