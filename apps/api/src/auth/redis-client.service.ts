import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisClientService extends Redis implements OnModuleDestroy {
  constructor() {
    super(process.env.REDIS_URL);
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit();
  }
}
