import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { JwtPayload } from '../types/user/payload.types';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'access-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.ACCESS_TOKEN_KEY || 'default-secret',
    } as StrategyOptionsWithoutRequest);
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
