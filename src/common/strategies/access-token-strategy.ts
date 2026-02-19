import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../types/user/payload.types';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'access-jwt') {
  constructor(
    config: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('ACCESS_TOKEN_KEY'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // payload ichida jti bo‘lishi shart
    if (!payload?.jti) {
      throw new UnauthorizedException('Invalid token');
    }

    // blacklist check
    const key = `blacklist:access:${payload.jti}`;
    const isRevoked = await this.redisService.redis.get(key);

    if (isRevoked) {
      throw new UnauthorizedException('Token revoked');
    }

    return payload;
  }
}
