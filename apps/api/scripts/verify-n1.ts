/**
 * Sprint N1 runtime verification (throwaway; not part of the app).
 *
 * Boots the real Nest DI graph with NOTIFICATIONS_EMAIL=on, resolves a real
 * Keycloak user with an email, and drives NotificationsProcessor.process() with
 * the exact job SupportTicketsService.create enqueues — proving that one
 * "support ticket received" produces BOTH an in-app Notification row AND an
 * email (captured by mailpit). Run via:
 *
 *   NOTIFICATIONS_EMAIL=on SMTP_HOST=127.0.0.1 SMTP_PORT=2025 \
 *     npx ts-node -r tsconfig-paths/register scripts/verify-n1.ts
 */
import { NestFactory } from '@nestjs/core';
import type { Job } from 'bullmq';
import { AppModule } from '../src/app.module';
import { KeycloakAdminService } from '../src/infrastructure/keycloak/keycloak-admin.service';
import { NotificationsProcessor } from '../src/modules/notifications/notifications.processor';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { NotificationJobData } from '../src/modules/notifications/notifications.constants';
import { Role } from '../src/common/enums';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const keycloak = app.get(KeycloakAdminService);
    const processor = app.get(NotificationsProcessor);
    const prisma = app.get(PrismaService);

    // Find any real realm user that has an email on record.
    let recipient: { sub: string; email: string; orgId: string } | null = null;
    for (const role of Object.values(Role)) {
      const users = await keycloak.getUsersWithClientRole(role);
      const withEmail = users.find((u) => u.email && u.email.includes('@'));
      if (withEmail) {
        recipient = {
          sub: withEmail.id,
          email: withEmail.email as string,
          orgId: withEmail.attributes?.['org_id']?.[0] ?? 'verify-n1-org',
        };
        console.log(`\n▶ Recipient resolved from Keycloak (role=${role}):`);
        break;
      }
    }
    if (!recipient) {
      console.error('✖ No Keycloak user with an email found — cannot verify email send.');
      return;
    }
    console.log(`   sub=${recipient.sub}\n   email=${recipient.email}\n   orgId=${recipient.orgId}`);

    const job: NotificationJobData = {
      orgId: recipient.orgId,
      userId: recipient.sub,
      type: 'support_ticket.acknowledged',
      title: 'Support ticket received',
      body: 'We\'ve received your ticket "N1 verification" and will follow up shortly.',
      data: { ticketId: 'verify-n1', category: 'general' },
    };

    const before = await prisma.notification.count({
      where: { userId: recipient.sub, type: job.type },
    });

    console.log('\n▶ Driving NotificationsProcessor.process() (persist + email step)…');
    await processor.process({ data: job } as Job<NotificationJobData>);

    const after = await prisma.notification.count({
      where: { userId: recipient.sub, type: job.type },
    });
    const latest = await prisma.notification.findFirst({
      where: { userId: recipient.sub, type: job.type },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`\n✔ In-app Notification rows for this user (type=${job.type}): ${before} → ${after}`);
    if (latest) {
      console.log(
        `   latest row: id=${latest.id} title="${latest.title}" createdAt=${latest.createdAt.toISOString()}`,
      );
    }
    console.log('\n(now querying mailpit for the delivered email — see next step)');
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
