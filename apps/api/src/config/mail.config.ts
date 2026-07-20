import { registerAs } from '@nestjs/config';

/**
 * Outbound email for notification delivery. Delivery is OFF by default so a
 * missing SMTP server (e.g. no local mailpit) never breaks a deploy — flip
 * NOTIFICATIONS_EMAIL=on to enable it. Local dev points at the repo's
 * docker-compose mailpit on 127.0.0.1:1025 (accepts any/insecure auth); set
 * SMTP_HOST/SMTP_PORT/NOTIFICATIONS_EMAIL_FROM to target another relay.
 */
export const mailConfig = registerAs('mail', () => ({
  enabled: process.env.NOTIFICATIONS_EMAIL === 'on',
  host: process.env.SMTP_HOST ?? '127.0.0.1',
  port: Number(process.env.SMTP_PORT ?? 1025),
  from:
    process.env.NOTIFICATIONS_EMAIL_FROM ??
    'Forward-Mena <notifications@forward-mena.local>',
}));
