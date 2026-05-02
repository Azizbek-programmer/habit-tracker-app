import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { AUTH_MESSAGES } from 'src/common/message/user/messages';
import { RedisService } from 'src/redis/redis.service';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './utils/token.service';
import { SessionService } from './utils/session.service';
import { RateLimitService } from './utils/rateLimit.service';
import { OtpService } from './utils/otp.service';
import {
  comparePassword,
  handleExistingUser,
  normalizeEmail,
  resetFailedAttempts,
  updateFailedAttempts,
  validateBirthDate,
  validatePassword,
  validateUserStatus,
} from './auth.helpers';
import {
  verifyRefreshToken,
  acquireRedisLock,
  checkTokenReuse,
  rotateSessionAndTokens,
} from './utils/refresh-token.helpers';
import { Lang } from 'src/common/types/lang.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly config: ConfigService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly rateLimitService: RateLimitService,
    private readonly otpService: OtpService,
  ) {}
  private readonly fakeRefreshHash =
    '$2b$10$1bQvB2m6n7k8fXl7qOQqW8j3kqYd3oWfEw5p8Y4j1r9q2s9tK0';
  async register(dto: CreateAuthDto, res: Response) {
    const lang: Lang = dto.locale ?? 'uz';
    try {
      validateBirthDate(dto.birthDate, lang);
      validatePassword(dto.password, lang);

      dto.email = normalizeEmail(dto.email);
      const existingUser = await this.prisma.user.findFirst({
        where: { OR: [{ email: dto.email }, { username: dto.username }] },
        select: { id: true, email: true, status: true },
      });
      if (existingUser) {
        const otpResendRequired = handleExistingUser(existingUser, lang);
        if (otpResendRequired) {
          const data = await this.otpService.resendOtpForPendingUser(
            existingUser.id,
            existingUser.email,
            lang,
          );
          return {
            statusCode: 200,
            success: true,
            message: AUTH_MESSAGES.OTP_RESENT[lang],
            data,
          };
        }
      }
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const { otp, hashedOtp, expiresAt } =
        await this.otpService.generateOtpData();
      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            id: randomUUID(),
            fullName: dto.fullName,
            username: dto.username,
            email: dto.email,
            phoneNumber: dto.phoneNumber,
            password: hashedPassword,
          },
        });
        await this.otpService.createOtpForUser(
          createdUser.id,
          hashedOtp,
          expiresAt,
          tx,
        );
        return createdUser;
      });
      this.otpService.sendOtpEmail(user.email, otp, lang);
      return {
        statusCode: 201,
        success: true,
        message: AUTH_MESSAGES.REGISTER_SUCCESS[lang],
        data: { userId: user.id, email: user.email },
      };
    } catch (error: any) {
      if (error?.code === 'P2002')
        throw new ConflictException(AUTH_MESSAGES.USER_EXISTS[lang]);
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      )
        throw error;
      throw new InternalServerErrorException(
        AUTH_MESSAGES.REGISTER_FAILED[lang],
      );
    }
  }
  async login(dto: LoginAuthDto, res: Response, req: Request) {
    const email = normalizeEmail(dto.email);
    const ip = await this.rateLimitService.extractIp(req);
    await this.rateLimitService.checkRate(ip, 'login');
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        status: true,
        fullName: true,
        failedLoginAttempts: true,
        lockUntil: true,
      },
    });
    if (!user) {
      await this.rateLimitService.registerFail(ip, 'login');

      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.lockUntil && user.lockUntil <= new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockUntil: null,
        },
      });
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }
    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new UnauthorizedException('Invalid credentials');
    }
    try {
      await comparePassword(dto.password, user.password);
      await resetFailedAttempts(this.prisma, user.id);
    } catch (error) {
      await updateFailedAttempts(
        this.prisma,
        user.id,
        user.failedLoginAttempts,
        'login',
      );
      await this.rateLimitService.registerFail(ip, 'login');
      throw error; // UnauthorizedException tashlanadi comparePassword dan
    }
    validateUserStatus(user.status);

    await this.rateLimitService.resetFails(ip, 'login');

    const { accessToken, refreshToken, jti, familyId } =
      await this.tokenService.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
      });

    const hashedRefreshToken = await this.tokenService.hash(refreshToken);
    const createdSession = await this.sessionService.create(
      user.id,
      hashedRefreshToken,
      familyId,
      req,
    );
    const refreshTtlSec = this.config.getOrThrow<number>(
      'REFRESH_TOKEN_TTL_SEC',
    );
    await this.redisService.redis.set(
      `refresh:jti:session:${createdSession.id}`,
      jti,
      'EX',
      refreshTtlSec,
    );
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: Number(this.config.getOrThrow<string>('COOKIE_TIME')),
      sameSite: 'strict',
      secure: this.config.get('NODE_ENV') === 'production',
    });
    return {
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
  async refreshTokens(refreshToken: string, res: Response) {
    const redis = this.redisService.redis;
    const refreshTtlSec = this.config.getOrThrow<number>(
      'REFRESH_TOKEN_TTL_SEC',
    );
    let payload: any;
    let session: any;
    let lockKey: string | null = null;
    try {
      try {
        payload = await verifyRefreshToken(
          this.jwtService,
          refreshToken,
          this.config,
        );
      } catch {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const userId = payload.sub;
      const tokenJti = payload.jti;
      const familyId = payload.familyId;
      try {
        session = await this.sessionService.findByFamily(userId, familyId);
      } catch {
        throw new UnauthorizedException('Session lookup failed');
      }
      if (!session || !session.hashedRefreshToken) {
        await bcrypt.compare(refreshToken, this.fakeRefreshHash);
        throw new UnauthorizedException('Access denied');
      }
      let isValid = false;
      try {
        isValid = await this.sessionService.compare(
          refreshToken,
          session.hashedRefreshToken,
        );
      } catch {
        throw new UnauthorizedException('Token comparison failed');
      }
      if (!isValid) {
        throw new UnauthorizedException('Access denied');
      }
      try {
        lockKey = await acquireRedisLock(redis, session.id);
      } catch {
        throw new UnauthorizedException('Failed to acquire session lock');
      }
      try {
        try {
          await checkTokenReuse(
            redis,
            session,
            tokenJti,
            this.fakeRefreshHash,
            this.sessionService,
            res,
          );
        } catch {
          throw new UnauthorizedException('Access denied');
        }
        let user;
        try {
          user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true },
          });
        } catch {
          throw new InternalServerErrorException('User lookup failed');
        }
        if (!user) {
          await this.sessionService.revoke(session.id);
          res.clearCookie('refreshToken', {
            httpOnly: true,
            sameSite: 'strict',
          });

          throw new UnauthorizedException('User not found');
        }
        try {
          return await rotateSessionAndTokens(
            user,
            session,
            this.tokenService,
            redis,
            this.prisma,
            refreshTtlSec,
            res,
            this.config,
          );
        } catch {
          throw new InternalServerErrorException('Token rotation failed');
        }
      } finally {
        if (lockKey) {
          await redis.del(lockKey);
        }
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Refresh token process failed');
    }
  }
  async logout(userId: string, refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('REFRESH_TOKEN_KEY'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.sub !== userId) {
      throw new UnauthorizedException('Invalid token owner');
    }
    const familyId = payload.familyId;
    if (!familyId) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const session = await this.sessionService.findByFamily(userId, familyId);
    if (session) {
      await this.sessionService.revoke(session.id);
    }
    return { success: true };
  }
}
