import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '@/common/decorators';
import { RedisHealthIndicator } from './redis.health';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redis: RedisHealthIndicator,
  ) {}

  /**
   * Liveness + dependency readiness. Returns the Terminus envelope
   * (`{ status, info, error, details }`); `status` is `ok` when Redis answers
   * PING and `error` (HTTP 503) when it does not — so load balancers and uptime
   * checks see the backend as unhealthy while its queue backend is unreachable.
   */
  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.redis.isHealthy('redis')]);
  }
}
