import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  public readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis(this.config.getOrThrow<string>('REDIS_URL'));
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
