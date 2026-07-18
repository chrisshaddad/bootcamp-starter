import { Logger } from '@nestjs/common';
import { MAIL_JOBS } from './mail.constants';
import { MailProcessor } from './mail.processor';
import type { MailService } from './mail.service';

describe('MailProcessor project invitations', () => {
  type MailProcessorJob = Parameters<MailProcessor['process']>[0];
  const data = {
    email: 'invitee@example.com',
    inviterName: 'Inviter',
    projectTitle: 'Project',
    invitationLink: 'http://localhost:3000/invitations',
  };

  it('uses the job ID instead of the recipient email in success logs', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const processor = new MailProcessor({
      sendEmail: jest.fn().mockResolvedValue(true),
    } as unknown as MailService);

    await processor.process({
      id: 'project-invitation-job-1',
      name: MAIL_JOBS.SEND_PROJECT_INVITATION,
      data,
    } as MailProcessorJob);

    const messages = log.mock.calls.flat().join(' ');
    expect(messages).toContain('project-invitation-job-1');
    expect(messages).not.toContain(data.email);
  });

  it('uses the job ID instead of the recipient email in failures', async () => {
    const processor = new MailProcessor({
      sendEmail: jest.fn().mockResolvedValue(false),
    } as unknown as MailService);

    let thrown: unknown;
    try {
      await processor.process({
        id: 'project-invitation-job-2',
        name: MAIL_JOBS.SEND_PROJECT_INVITATION,
        data,
      } as MailProcessorJob);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain('project-invitation-job-2');
    expect((thrown as Error).message).not.toContain(data.email);
  });
});
