import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Thin SMTP wrapper (nodemailer). Local dev sends to the docker-compose mailpit
 * on 127.0.0.1:1025, which accepts any/insecure auth. The transporter is
 * created lazily on first send so simply constructing this service (e.g. when
 * delivery is disabled) never opens a socket.
 *
 * This service intentionally lets errors propagate — callers decide whether a
 * send is best-effort. Notification email is delivered via NotificationEmailService,
 * which wraps every send in a never-throw guard.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const host = this.config.get<string>('mail.host', '127.0.0.1');
      const port = this.config.get<number>('mail.port', 1025);
      this.transporter = createTransport({
        host,
        port,
        // mailpit (and most dev relays) speak plaintext SMTP on 1025.
        secure: false,
        // Do not fail on self-signed certs if a relay upgrades to TLS.
        tls: { rejectUnauthorized: false },
      });
      this.logger.log(`SMTP transport ready → ${host}:${port}`);
    }
    return this.transporter;
  }

  /** Send an email. Throws on failure (caller decides best-effort semantics). */
  async sendMail(options: SendMailOptions): Promise<void> {
    const from = this.config.get<string>(
      'mail.from',
      'Forward-Mena <notifications@forward-mena.local>',
    );
    await this.getTransporter().sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }
}
