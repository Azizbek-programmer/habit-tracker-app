import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { Request } from 'express';

type RateType = 'login' | 'verify-otp';

@Injectable()
export class RateLimitService {
  constructor(private readonly redisService: RedisService) {}

  private getKeys(type: RateType, ip: string) {
    return {
      rateKey: `rate:${type}:ip:${ip}`,
      blockKey: `block:${type}:ip:${ip}`,
      failKey: `fail:${type}:ip:${ip}`,
    };
  }

  async checkRate(ip: string, type: RateType) {
    const redis = this.redisService.redis;
    const { rateKey, blockKey } = this.getKeys(type, ip);

    const blockedUntil = await redis.get(blockKey);
    if (blockedUntil && Number(blockedUntil) > Date.now()) {
      this.throwByType(type);
    }

    const RATE_LIMIT = type === 'login' ? 20 : 15;
    const RATE_WINDOW_SEC = 60;

    const count = await redis.incr(rateKey);
    if (count === 1) {
      await redis.expire(rateKey, RATE_WINDOW_SEC);
    }

    if (count > RATE_LIMIT) {
      const blockMs = 5 * 60 * 1000;
      await redis.set(blockKey, Date.now() + blockMs, 'PX', blockMs);
      this.throwByType(type);
    }
  }

  async registerFail(ip: string, type: RateType) {
    const redis = this.redisService.redis;
    const { failKey, blockKey } = this.getKeys(type, ip);

    const fails = await redis.incr(failKey);
    if (fails === 1) {
      await redis.expire(failKey, 15 * 60);
    }

    if (fails >= 10) {
      const blockMs = 10 * 60 * 1000;
      await redis.set(blockKey, Date.now() + blockMs, 'PX', blockMs);
    }
  }

  async resetFails(ip: string, type: RateType) {
    const redis = this.redisService.redis;
    const { failKey } = this.getKeys(type, ip);
    await redis.del(failKey);
  }

  async extractIp(req: Request): Promise<string> {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private throwByType(type: RateType) {
    if (type === 'login') {
      throw new UnauthorizedException('Invalid credentials');
    }
    throw new BadRequestException('Invalid OTP');
  }
}
