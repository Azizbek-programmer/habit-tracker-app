import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { SessionService } from './session.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    public readonly sessionService: SessionService,
  ) {}
  async generateAccess(
    user: { id: string; email: string; role: string },
    jti?: string,
  ) {
    const tokenJti = jti ?? randomUUID();
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: tokenJti,
    };

    const expiresIn = this.config.getOrThrow<StringValue>('ACCESS_TOKEN_TIME');

    const token = await this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>('ACCESS_TOKEN_KEY'),
      expiresIn,
    });

    return { token, jti: tokenJti };
  }

  async generateRefresh(user: { id: string }, familyId?: string, jti?: string) {
    const refreshFamilyId = familyId ?? randomUUID();
    const tokenJti = jti ?? randomUUID();
    const payload = { sub: user.id, familyId: refreshFamilyId, jti: tokenJti };

    const expiresIn = this.config.getOrThrow<StringValue>('REFRESH_TOKEN_TIME');

    const token = await this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>('REFRESH_TOKEN_KEY'),
      expiresIn,
    });

    return { token, familyId: refreshFamilyId, jti: tokenJti };
  }

  async generateTokens(user: { id: string; email: string; role: string }) {
    const { token: accessToken, jti } = await this.generateAccess(user);
    const { token: refreshToken, familyId } = await this.generateRefresh({
      id: user.id,
    });

    return { accessToken, refreshToken, jti, familyId };
  }

  async rotateTokensWithPayload(
    user: { id: string; email: string; role: string },
    familyId?: string,
  ) {
    const newJti = randomUUID();
    const { token: newAccessToken } = await this.generateAccess(user, newJti);
    const { token: newRefreshToken, familyId: refreshFamilyId } =
      await this.generateRefresh({ id: user.id }, familyId, newJti);
    const hashedRefreshToken = await this.hash(newRefreshToken);
    return {
      newAccessToken,
      newRefreshToken,
      hashedRefreshToken,
      newJti,
      familyId: refreshFamilyId,
    };
  }
  async verifyRefresh(token: string) {
    return this.jwtService.verifyAsync(token, {
      secret: this.config.getOrThrow<string>('REFRESH_TOKEN_KEY'),
    });
  }

  async hash(token: string) {
    return bcrypt.hash(token, 10);
  }

  async compare(token: string, hash: string) {
    return bcrypt.compare(token, hash);
  }
}
