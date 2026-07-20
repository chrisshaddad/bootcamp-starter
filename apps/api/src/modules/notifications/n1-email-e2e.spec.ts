/**
 * Sprint N1 — deterministic runtime evidence that the notification EMAIL step
 * actually delivers over SMTP to mailpit.
 *
 * Guarded: only runs when N1_E2E=1 (needs a real SMTP server), so the normal
 * `jest` suite skips it. It drives the REAL delivery code end-to-end over a REAL
 * SMTP transport:
 *
 *   NotificationEmailService.deliver  (flag gate + KC `sub`→email + best-effort)
 *     →  MailService.sendMail  →  SMTP  →  mailpit
 *
 * Only KeycloakAdminService.getUser is stubbed (KC `sub`→email resolution is
 * unit-proven in notification-email.service.spec.ts). The BullMQ enqueue →
 * worker → persist half is covered by notifications.processor.spec.ts /
 * notifications.service.spec.ts and was additionally exercised live against the
 * real queue + DB during this sprint (see the checkpoint notes); this spec keeps
 * the automated check deterministic by isolating the one thing that needs a real
 * server: the SMTP send landing in an inbox.
 *
 * Requires isolated, additive infra (see the run command below):
 *   - mailpit on 127.0.0.1:2025 SMTP / :8126 API+UI   (fm-n1-mailpit)
 *
 * Run:
 *   N1_E2E=1 SMTP_PORT=2025 MAILPIT_API=http://127.0.0.1:8126 \
 *     npx jest n1-email-e2e --runInBand --forceExit
 */
import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { mailConfig } from '@/config/mail.config';
import { KeycloakAdminService } from '@/infrastructure/keycloak/keycloak-admin.service';
import { MailService } from '@/infrastructure/mail/mail.service';
import { NotificationEmailService } from './notification-email.service';
import { NotificationJobData } from './notifications.constants';

const RUN = process.env.N1_E2E === '1';
const d = RUN ? describe : describe.skip;

const SMTP_PORT = Number(process.env.SMTP_PORT ?? 2025);
const MAILPIT_API = process.env.MAILPIT_API ?? 'http://127.0.0.1:8126';

interface MailpitMessage {
  ID: string;
  From: { Address: string; Name: string };
  To: { Address: string; Name: string }[];
  Subject: string;
  Snippet: string;
  Created: string;
}

async function mailpitMessages(): Promise<MailpitMessage[]> {
  const res = await fetch(`${MAILPIT_API}/api/v1/messages`);
  const body = (await res.json()) as { messages: MailpitMessage[] };
  return body.messages;
}

async function poll<T>(
  fn: () => Promise<T | null>,
  { timeoutMs = 15000, intervalMs = 400 } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await fn();
    if (result) return result;
    if (Date.now() > deadline) throw new Error('poll timed out');
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/**
 * Build a NotificationEmailService with a real MailService (→ mailpit) and a
 * stub Keycloak. `enabled` toggles the NOTIFICATIONS_EMAIL flag so both the
 * on and off paths are exercised against the same real transport.
 */
async function buildApp(
  enabled: boolean,
  recipientEmail: string | null,
): Promise<INestApplication> {
  process.env.NOTIFICATIONS_EMAIL = enabled ? 'on' : 'off';
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = String(SMTP_PORT);

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [mailConfig],
      }),
    ],
    providers: [
      NotificationEmailService,
      MailService,
      {
        provide: KeycloakAdminService,
        useValue: {
          getUser: jest.fn(async (sub: string) =>
            recipientEmail ? { id: sub, email: recipientEmail } : { id: sub },
          ),
        },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

function makeJob(userId: string): NotificationJobData {
  return {
    orgId: 'n1-e2e-org',
    userId,
    type: 'support_ticket.acknowledged',
    title: 'Support ticket received',
    body: "We've received your support ticket and will follow up shortly.",
    data: { ticketId: 'n1-e2e-ticket' },
  };
}

d('Sprint N1 — notification email delivery (real SMTP → mailpit)', () => {
  it('delivers the notification as an email to mailpit when the flag is on', async () => {
    const recipient = `tenant.on.${Date.now()}@example.com`;
    const app = await buildApp(true, recipient);
    try {
      const svc = app.get(NotificationEmailService);
      const job = makeJob(`n1-e2e-on-${Date.now()}`);

      await svc.deliver(job); // real gate + KC stub + MailService + SMTP

      const msg = await poll(async () => {
        const messages = await mailpitMessages();
        return (
          messages.find(
            (m) =>
              m.Subject === job.title &&
              m.To.some((t) => t.Address === recipient),
          ) ?? null
        );
      });

      expect(msg.To[0].Address).toBe(recipient);
      expect(msg.Subject).toBe(job.title);
      expect(msg.Snippet).toContain('received your support ticket');

      // eslint-disable-next-line no-console
      console.log(
        '\n=== N1 EVIDENCE: mailpit message ===\n' +
          JSON.stringify(
            {
              id: msg.ID,
              from: msg.From.Address,
              to: msg.To.map((t) => t.Address),
              subject: msg.Subject,
              snippet: msg.Snippet,
            },
            null,
            2,
          ) +
          '\n====================================\n',
      );
    } finally {
      await app.close();
    }
  }, 30000);

  it('sends NO email when NOTIFICATIONS_EMAIL is off (flag gate)', async () => {
    const recipient = `tenant.off.${Date.now()}@example.com`;
    const app = await buildApp(false, recipient);
    try {
      const kc = app.get<{ getUser: jest.Mock }>(KeycloakAdminService);
      const svc = app.get(NotificationEmailService);
      await svc.deliver(makeJob(`n1-e2e-off-${Date.now()}`));

      // Off = zero work: no Keycloak lookup, and nothing lands in mailpit.
      expect(kc.getUser).not.toHaveBeenCalled();
      await new Promise((r) => setTimeout(r, 1500));
      const messages = await mailpitMessages();
      expect(messages.some((m) => m.To.some((t) => t.Address === recipient))).toBe(
        false,
      );
    } finally {
      await app.close();
    }
  }, 30000);

  it('best-effort: a recipient with no email on record sends nothing and never throws', async () => {
    const app = await buildApp(true, null); // KC returns a user without an email
    try {
      const svc = app.get(NotificationEmailService);
      await expect(
        svc.deliver(makeJob(`n1-e2e-noemail-${Date.now()}`)),
      ).resolves.toBeUndefined();
    } finally {
      await app.close();
    }
  }, 30000);
});
