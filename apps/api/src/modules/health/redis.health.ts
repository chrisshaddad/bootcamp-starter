import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { Queue } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from '@/modules/notifications/notifications.constants';

/** How long a health-check PING may take before Redis is considered down. */
export const REDIS_HEALTH_TIMEOUT_MS = 1500;

/**
 * Terminus health indicator that reports whether Redis (the BullMQ backend) is
 * reachable. It reuses the notifications queue's own ioredis connection — the
 * exact client the app depends on — and issues a bounded `PING`. The timeout is
 * essential: when Redis is down ioredis sits in a reconnect loop, so an
 * un-raced ping would hang the whole `/health` request instead of failing it.
 */
@Injectable()
export class RedisHealthIndicator {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      const pong = await this.pingWithTimeout(REDIS_HEALTH_TIMEOUT_MS);
      if (pong !== 'PONG') {
        return indicator.down({ message: `unexpected ping reply: ${pong}` });
      }
      return indicator.up();
    } catch (error) {
      return indicator.down({
        message: (error as Error)?.message ?? 'redis unreachable',
      });
    }
  }

  private async pingWithTimeout(ms: number): Promise<string> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`redis ping timed out after ${ms}ms`)),
        ms,
      );
    });
    try {
      return await Promise.race([
        (async () => {
          // bullmq types the client as a minimal IRedisClient; the runtime
          // object is the ioredis connection, which implements PING.
          const client = (await this.queue.client) as unknown as {
            ping: () => Promise<string>;
          };
          return client.ping();
        })(),
        timeout,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
