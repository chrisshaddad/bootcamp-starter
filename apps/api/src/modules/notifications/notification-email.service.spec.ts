import { NotificationEmailService } from './notification-email.service';
import { NotificationJobData } from './notifications.constants';

describe('NotificationEmailService', () => {
  const job: NotificationJobData = {
    orgId: 'org-1',
    userId: 'sub-123',
    type: 'support_ticket.acknowledged',
    title: 'Support ticket received',
    body: "We've received your ticket.",
    data: { ticketId: 't-1' },
  };

  function makeService(
    opts: { enabled: boolean; email?: unknown } = { enabled: true },
  ) {
    const config: any = {
      // Only `mail.enabled` is read by this service.
      get: jest.fn((key: string) =>
        key === 'mail.enabled' ? opts.enabled : undefined,
      ),
    };
    const keycloak: any = {
      getUser: jest
        .fn()
        .mockResolvedValue(
          'email' in opts
            ? { id: job.userId, email: opts.email }
            : { id: job.userId, email: 'tenant@example.com' },
        ),
    };
    const mail: any = { sendMail: jest.fn().mockResolvedValue(undefined) };
    const service = new NotificationEmailService(config, keycloak, mail);
    return { service, config, keycloak, mail };
  }

  describe('flag gating (NOTIFICATIONS_EMAIL)', () => {
    it('does no work when disabled — no Keycloak lookup, no send', async () => {
      const { service, keycloak, mail } = makeService({ enabled: false });
      await service.deliver(job);
      expect(keycloak.getUser).not.toHaveBeenCalled();
      expect(mail.sendMail).not.toHaveBeenCalled();
    });

    it('resolves the recipient and sends when enabled', async () => {
      const { service, keycloak, mail } = makeService({
        enabled: true,
        email: 'tenant@example.com',
      });
      await service.deliver(job);
      expect(keycloak.getUser).toHaveBeenCalledWith('sub-123');
      expect(mail.sendMail).toHaveBeenCalledWith({
        to: 'tenant@example.com',
        subject: 'Support ticket received',
        text: "We've received your ticket.",
      });
    });

    it('falls back to the title as body text when the job has no body', async () => {
      const { service, mail } = makeService({
        enabled: true,
        email: 'a@b.com',
      });
      await service.deliver({ ...job, body: undefined });
      expect(mail.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Support ticket received' }),
      );
    });
  });

  describe('best-effort (never throws, never blocks the in-app notification)', () => {
    it('skips sending when the recipient has no email on record', async () => {
      const { service, mail } = makeService({
        enabled: true,
        email: undefined,
      });
      await expect(service.deliver(job)).resolves.toBeUndefined();
      expect(mail.sendMail).not.toHaveBeenCalled();
    });

    it('does not throw when Keycloak lookup fails', async () => {
      const { service, mail } = makeService({ enabled: true });
      service['keycloak'].getUser = jest
        .fn()
        .mockRejectedValue(new Error('keycloak down'));
      await expect(service.deliver(job)).resolves.toBeUndefined();
      expect(mail.sendMail).not.toHaveBeenCalled();
    });

    it('does not throw when SMTP send fails', async () => {
      const { service, mail } = makeService({
        enabled: true,
        email: 'a@b.com',
      });
      mail.sendMail.mockRejectedValue(new Error('ECONNREFUSED 1025'));
      await expect(service.deliver(job)).resolves.toBeUndefined();
      expect(mail.sendMail).toHaveBeenCalled();
    });

    it('treats a null Keycloak user as no email (no send, no throw)', async () => {
      const { service, keycloak, mail } = makeService({ enabled: true });
      keycloak.getUser.mockResolvedValue(null);
      await expect(service.deliver(job)).resolves.toBeUndefined();
      expect(mail.sendMail).not.toHaveBeenCalled();
    });
  });
});
