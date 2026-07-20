import { NotificationsDeadLetterService } from './notifications-dead-letter.service';
import {
  DEAD_LETTER_JOB,
  NotificationJobData,
} from './notifications.constants';

const payload: NotificationJobData = {
  orgId: 'org-1',
  userId: 'sub-123',
  type: 'support_ticket.acknowledged',
  title: 'Support ticket received',
};

function makeService(
  job: { attemptsMade: number; attempts: number; data?: NotificationJobData } | null,
) {
  const queue: any = {
    getJob: jest.fn().mockResolvedValue(
      job === null
        ? undefined
        : {
            data: job.data ?? payload,
            attemptsMade: job.attemptsMade,
            opts: { attempts: job.attempts },
          },
    ),
  };
  const deadLetter: any = { add: jest.fn().mockResolvedValue(undefined) };
  const config: any = { get: jest.fn(() => 'redis://127.0.0.1:6380') };
  const service = new NotificationsDeadLetterService(queue, deadLetter, config);
  return { service, queue, deadLetter };
}

describe('NotificationsDeadLetterService.handleFailed', () => {
  it('dead-letters a job that has exhausted all attempts', async () => {
    const { service, queue, deadLetter } = makeService({
      attemptsMade: 3,
      attempts: 3,
    });
    await service.handleFailed('job-1', 'SMTP exploded');

    expect(queue.getJob).toHaveBeenCalledWith('job-1');
    expect(deadLetter.add).toHaveBeenCalledTimes(1);
    expect(deadLetter.add).toHaveBeenCalledWith(
      DEAD_LETTER_JOB,
      {
        payload,
        originalJobId: 'job-1',
        failedReason: 'SMTP exploded',
        attemptsMade: 3,
      },
      // must persist — the DLQ has no worker, so jobs must not be auto-removed
      { removeOnComplete: false, removeOnFail: false },
    );
  });

  it('does NOT dead-letter while retry attempts remain', async () => {
    const { service, deadLetter } = makeService({
      attemptsMade: 1,
      attempts: 3,
    });
    await service.handleFailed('job-1', 'transient');
    expect(deadLetter.add).not.toHaveBeenCalled();
  });

  it('does not dead-letter (and never throws) when the job is gone', async () => {
    const { service, deadLetter } = makeService(null);
    await expect(
      service.handleFailed('missing', 'reason'),
    ).resolves.toBeUndefined();
    expect(deadLetter.add).not.toHaveBeenCalled();
  });

  it('swallows errors from the queue lookup (never throws from the event handler)', async () => {
    const { service, queue, deadLetter } = makeService({
      attemptsMade: 3,
      attempts: 3,
    });
    queue.getJob.mockRejectedValue(new Error('redis down'));
    await expect(
      service.handleFailed('job-1', 'reason'),
    ).resolves.toBeUndefined();
    expect(deadLetter.add).not.toHaveBeenCalled();
  });

  it('swallows errors from the dead-letter add (best-effort)', async () => {
    const { service, deadLetter } = makeService({
      attemptsMade: 3,
      attempts: 3,
    });
    deadLetter.add.mockRejectedValue(new Error('dlq unavailable'));
    await expect(
      service.handleFailed('job-1', 'reason'),
    ).resolves.toBeUndefined();
  });
});
