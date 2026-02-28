import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { JwtFromRequestFunction, Strategy } from 'passport-jwt';

const cookieExtractor: JwtFromRequestFunction = (req: Request) => {
  return req?.cookies?.refreshToken;
};

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-jwt',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: cookieExtractor,
      secretOrKey: config.getOrThrow<string>('REFRESH_TOKEN_KEY'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: any) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new ForbiddenException('Refresh token not found');
    }

    return {
      ...payload,
      refreshToken,
    };
  }
}
