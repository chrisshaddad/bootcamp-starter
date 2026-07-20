import { RedisHealthIndicator, REDIS_HEALTH_TIMEOUT_MS } from './redis.health';

/**
 * Fake Terminus HealthIndicatorService: `check(key)` returns a session whose
 * `up()`/`down()` produce recognizable, assertable results.
 */
function makeHealthIndicatorService() {
  const up = jest.fn(() => ({ redis: { status: 'up' } }));
  const down = jest.fn((meta?: Record<string, unknown>) => ({
    redis: { status: 'down', ...(meta ?? {}) },
  }));
  const check = jest.fn(() => ({ up, down }));
  return { service: { check } as any, up, down, check };
}

function makeIndicator(clientImpl: {
  ping?: () => Promise<string>;
  client?: Promise<unknown>;
}) {
  const queue: any = {
    client:
      clientImpl.client ??
      Promise.resolve({ ping: clientImpl.ping ?? (async () => 'PONG') }),
  };
  const health = makeHealthIndicatorService();
  const indicator = new RedisHealthIndicator(queue, health.service);
  return { indicator, health };
}

describe('RedisHealthIndicator', () => {
  it('reports UP when Redis replies PONG', async () => {
    const { indicator, health } = makeIndicator({ ping: async () => 'PONG' });
    const result = await indicator.isHealthy('redis');
    expect(health.check).toHaveBeenCalledWith('redis');
    expect(health.up).toHaveBeenCalledTimes(1);
    expect(health.down).not.toHaveBeenCalled();
    expect(result).toEqual({ redis: { status: 'up' } });
  });

  it('reports DOWN on an unexpected ping reply', async () => {
    const { indicator, health } = makeIndicator({ ping: async () => 'NOPE' });
    const result = await indicator.isHealthy('redis');
    expect(health.up).not.toHaveBeenCalled();
    expect(health.down).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('NOPE') }),
    );
    expect(result.redis.status).toBe('down');
  });

  it('reports DOWN (never throws) when the ping rejects', async () => {
    const { indicator, health } = makeIndicator({
      ping: async () => {
        throw new Error('ECONNREFUSED');
      },
    });
    const result = await indicator.isHealthy('redis');
    expect(health.down).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ECONNREFUSED' }),
    );
    expect(result.redis.status).toBe('down');
  });

  it('reports DOWN when the ping hangs past the timeout (does not block /health)', async () => {
    jest.useFakeTimers();
    try {
      // ping never resolves — simulates ioredis stuck in a reconnect loop.
      const { indicator, health } = makeIndicator({
        ping: () => new Promise<string>(() => {}),
      });
      const pending = indicator.isHealthy('redis');
      await jest.advanceTimersByTimeAsync(REDIS_HEALTH_TIMEOUT_MS + 10);
      const result = await pending;
      expect(health.down).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('timed out'),
        }),
      );
      expect(result.redis.status).toBe('down');
    } finally {
      jest.useRealTimers();
    }
  });
});
