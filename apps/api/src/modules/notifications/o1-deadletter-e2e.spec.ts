import { Queue, Worker } from 'bullmq';
import { buildRedisConnection } from '@/config/redis.config';
import { NotificationsDeadLetterService } from './notifications-dead-letter.service';
import {
  DEAD_LETTER_JOB,
  DELIVER_NOTIFICATION_JOB,
  DeadLetterJobData,
  NOTIFICATIONS_DEAD_LETTER_QUEUE,
  NOTIFICATIONS_QUEUE,
  NotificationJobData,
} from './notifications.constants';

/**
 * O1 dead-letter END-TO-END drive (the one O1 piece the previous session left
 * UNVERIFIED). Guarded by `O1_E2E=1` so it is SKIPPED in normal `jest` / CI —
 * it needs a real, isolated Redis. Drive it with a throwaway instance:
 *
 *   O1_E2E=1 REDIS_URL=redis://127.0.0.1:6401 \
 *     npx jest o1-deadletter-e2e --runInBand --forceExit
 *
 * It exercises the REAL {@link NotificationsDeadLetterService}: a notifications
 * job that throws on every attempt must, after exhausting its retries, land on
 * the `notifications-dead-letter` queue (which has no worker) carrying the
 * original payload + failure reason. No mocks — real BullMQ Queue/Worker +
 * QueueEvents against real Redis.
 */
const RUN = process.env.O1_E2E === '1';
const URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6401';
const connection = buildRedisConnection(URL);

const payload: NotificationJobData = {
  orgId: 'o1-e2e-org',
  userId: 'o1-e2e-sub',
  type: 'support_ticket.acknowledged',
  title: 'Support ticket received',
};

/** Minimal ConfigService stand-in — the service only reads `redis.url`. */
const fakeConfig = { get: () => URL } as never;

(RUN ? describe : describe.skip)('O1 dead-letter e2e (real Redis)', () => {
  let queue: Queue;
  let deadLetter: Queue;
  let worker: Worker;
  let service: NotificationsDeadLetterService;

  beforeAll(async () => {
    queue = new Queue(NOTIFICATIONS_QUEUE, { connection });
    deadLetter = new Queue(NOTIFICATIONS_DEAD_LETTER_QUEUE, { connection });
    // Clean slate so a prior run can't mask a real result.
    await queue.obliterate({ force: true }).catch(() => undefined);
    await deadLetter.obliterate({ force: true }).catch(() => undefined);

    // The REAL service under test — attaches its QueueEvents `failed` listener.
    service = new NotificationsDeadLetterService(queue, deadLetter, fakeConfig);
    service.onModuleInit();

    // A worker that ALWAYS fails, so the job exhausts every attempt.
    worker = new Worker(
      NOTIFICATIONS_QUEUE,
      async () => {
        throw new Error('boom: simulated permanent delivery failure');
      },
      { connection },
    );
    await worker.waitUntilReady();
  });

  afterAll(async () => {
    await worker?.close();
    await service?.onModuleDestroy();
    await queue?.obliterate({ force: true }).catch(() => undefined);
    await deadLetter?.obliterate({ force: true }).catch(() => undefined);
    await queue?.close();
    await deadLetter?.close();
  });

  it('routes a job that exhausts all retries to the dead-letter queue', async () => {
    const job = await queue.add(DELIVER_NOTIFICATION_JOB, payload, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 50 },
      removeOnComplete: false,
      removeOnFail: false,
    });

    // Poll the DLQ until the terminally-failed job is copied across.
    const deadline = Date.now() + 25_000;
    let dlqJobs = await deadLetter.getJobs(['waiting', 'wait', 'paused']);
    while (dlqJobs.length === 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 250));
      dlqJobs = await deadLetter.getJobs(['waiting', 'wait', 'paused']);
    }

    expect(dlqJobs).toHaveLength(1);
    const dl = dlqJobs[0];
    expect(dl.name).toBe(DEAD_LETTER_JOB);

    const data = dl.data as DeadLetterJobData;
    expect(data.originalJobId).toBe(job.id);
    expect(data.attemptsMade).toBe(3);
    expect(data.failedReason).toContain('boom');
    expect(data.payload).toMatchObject({
      orgId: payload.orgId,
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
    });

    // The DLQ has no worker → the job stays put for inspection/replay.
    const waitingCount = await deadLetter.getWaitingCount();
    expect(waitingCount).toBe(1);

    // eslint-disable-next-line no-console
    console.log(
      `[O1-E2E] dead-lettered job ${data.originalJobId} after ${data.attemptsMade} attempts; reason="${data.failedReason}"`,
    );
  }, 30_000);
});
