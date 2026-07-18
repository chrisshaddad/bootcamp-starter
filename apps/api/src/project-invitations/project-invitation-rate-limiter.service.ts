import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type Redis from 'ioredis';

const WINDOW_SECONDS = 60;
const LOOKUP_LIMIT = 20;
const CREATE_LIMIT = 10;

@Injectable()
export class ProjectInvitationRateLimiter {
  private readonly logger = new Logger(ProjectInvitationRateLimiter.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  assertLookupAllowed(userId: string, projectId: string): Promise<void> {
    return this.assertAllowed('lookup', userId, projectId, LOOKUP_LIMIT);
  }

  assertCreateAllowed(userId: string, projectId: string): Promise<void> {
    return this.assertAllowed('create', userId, projectId, CREATE_LIMIT);
  }

  private async assertAllowed(
    action: 'lookup' | 'create',
    userId: string,
    projectId: string,
    limit: number,
  ): Promise<void> {
    const key = `rate-limit:project-invitations:${action}:${userId}:${projectId}`;

    let count: number;
    try {
      const result = await this.redis.eval(
        "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count",
        1,
        key,
        WINDOW_SECONDS,
      );
      count = Number(result);
    } catch (error) {
      this.logger.error(
        'Project invitation rate limiting is unavailable.',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Collaborator validation is temporarily unavailable. Please try again later.',
      );
    }

    if (!Number.isFinite(count)) {
      throw new ServiceUnavailableException(
        'Collaborator validation is temporarily unavailable. Please try again later.',
      );
    }

    if (count > limit) {
      throw new HttpException(
        'Too many collaborator requests. Please wait a minute and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
