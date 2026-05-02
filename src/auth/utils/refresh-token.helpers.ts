import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';

/* =====================================================================
  VERIFY REFRESH TOKEN
  =====================
  - Tokenni verify qiladi
  - Payloadni qaytaradi
  - Agar invalid bo‘lsa UnauthorizedException tashlaydi
===================================================================== */
export async function verifyRefreshToken(
  jwtService: JwtService,
  refreshToken: string,
  config: ConfigService,
) {
  try {
    const payload = await jwtService.verifyAsync(refreshToken, {
      secret: config.getOrThrow<string>('REFRESH_TOKEN_KEY'),
      ignoreExpiration: false,
    });
    if (!payload?.sub || !payload?.jti || !payload?.familyId) {
      throw new UnauthorizedException('Access denied');
    }
    return payload;
  } catch {
    throw new UnauthorizedException('Access denied');
  }
}

/* =====================================================================
  ACQUIRE REDIS LOCK
  =================
  - Redis orqali lock yaratadi
  - Agar lock olinmasa UnauthorizedException tashlaydi
===================================================================== */
export async function acquireRedisLock(
  redis: RedisService['redis'],
  sessionId: string,
  ttlSec = 10,
) {
  const lockKey = `lock:refresh:session:${sessionId}`;
  const lockAcquired = await redis.set(lockKey, '1', 'EX', ttlSec, 'NX');
  if (!lockAcquired) {
    throw new UnauthorizedException('Too many refresh requests, try again');
  }
  return lockKey;
}

/* =====================================================================
  CHECK TOKEN REUSE
  =================
  - Redis orqali JTI tekshiradi
  - Agar token reused bo‘lsa UnauthorizedException tashlaydi
===================================================================== */
export async function checkTokenReuse(
  redis: RedisService['redis'],
  session: any,
  tokenJti: string,
  fakeHash: string,
  sessionService: SessionService,
  res: Response,
) {
  const redisKey = `refresh:jti:session:${session.id}`;
  const redisJti = await redis.get(redisKey);

  if (!redisJti || redisJti !== tokenJti) {
    await bcrypt.compare(tokenJti, fakeHash); // fake hash timing attack prevention
    await sessionService.revoke(session.id);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict',
    });
    throw new UnauthorizedException('Access denied (token reuse)');
  }

  await redis.del(redisKey);
}

/* =====================================================================
  ROTATE SESSION & TOKENS
  ======================
  - Yangi access + refresh token generatsiya qiladi
  - Session va Redis update qiladi
  - Cookiega yangi refresh token qo‘yadi
===================================================================== */
export async function rotateSessionAndTokens(
  user: { id: string; email: string; role: string },
  session: any,
  tokenService: TokenService,
  redis: RedisService['redis'],
  prisma: PrismaService,
  refreshTtlSec: number,
  res: Response,
  config: ConfigService,
): Promise<{ accessToken: string }> {
  const {
    newAccessToken,
    newRefreshToken,
    hashedRefreshToken,
    newJti,
    familyId: newFamilyId,
  } = await tokenService.rotateTokensWithPayload(user, session.refreshFamilyId);

  try {
    await prisma.$transaction(async (tx) => {
      // Session update
      await tokenService.sessionService.rotate(
        session.id,
        hashedRefreshToken,
        newFamilyId,
        tx,
      );

      // Redis update
      await redis.set(
        `refresh:jti:session:${session.id}`,
        newJti,
        'EX',
        refreshTtlSec,
      );
    });
  } catch {
    await tokenService.sessionService.revoke(session.id);
    throw new InternalServerErrorException(
      'Failed to finalize refresh rotation',
    );
  }

  // Cookie update
  res.cookie('refreshToken', newRefreshToken, {
    secure: config.get('NODE_ENV') === 'production',
    path: '/',
    httpOnly: true,
    maxAge: Number(config.getOrThrow<string>('COOKIE_TIME')),
    sameSite: 'strict',
  });

  return { accessToken: newAccessToken };
}
