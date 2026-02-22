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
import type { StringValue } from 'ms';
import { MailService } from 'src/mail/mail.service';
import { AUTH_MESSAGES } from 'src/common/message/user/messages';
import { RedisService } from 'src/redis/redis.service';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';
// import type { SetOptions } from 'ioredis';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
    private readonly config: ConfigService,
  ) {}
  private readonly fakeRefreshHash =
    '$2b$10$1bQvB2m6n7k8fXl7qOQqW8j3kqYd3oWfEw5p8Y4j1r9q2s9tK0';
  private readonly fakeOtpHash =
    '$2b$10$3Qqz2d5JQfH2m7k8fXl7qOQqW8j3kqYd3oWfEw5p8Y4j1r9q2s9tK';

  // ================= REGISTER + SEND OTP =================
  async register(dto: CreateAuthDto, res: Response) {
    const lang = dto.locale ?? 'uz';

    try {
      // 1️⃣ BIRTH DATE VALIDATION
      const birthMs = Number(dto.birthDate);

      if (!Number.isFinite(birthMs)) {
        throw new BadRequestException(AUTH_MESSAGES.BIRTH_INVALID[lang]);
      }

      const birthDate = new Date(birthMs);

      if (isNaN(birthDate.getTime())) {
        throw new BadRequestException(AUTH_MESSAGES.BIRTH_INVALID[lang]);
      }

      const now = new Date();
      const minDate = new Date('1900-01-01');

      if (birthDate > now) {
        throw new BadRequestException(AUTH_MESSAGES.BIRTH_FUTURE[lang]);
      }

      if (birthDate < minDate) {
        throw new BadRequestException(AUTH_MESSAGES.BIRTH_TOO_OLD[lang]);
      }

      // 2️⃣ PASSWORD VALIDATION
      const strongPassword =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/;

      if (!strongPassword.test(dto.password)) {
        throw new BadRequestException(AUTH_MESSAGES.PASSWORD_WEAK[lang]);
      }

      // 3️⃣ USER EXISTS CHECK
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: dto.email }, { username: dto.username }],
        },
        include: {
          sessions: true,
        },
      });

      if (existingUser) {
        // 🔥 Agar user ACTIVE bo‘lsa — to‘xtatamiz
        if (existingUser.status === 'ACTIVE') {
          throw new ConflictException(AUTH_MESSAGES.USER_EXISTS[lang]);
        }

        // 🔥 Agar user PENDING bo‘lsa — OTP resend qilamiz
        if (existingUser.status === 'PENDING') {
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
          const hashedOtp = await bcrypt.hash(otp, 10);

          await this.prisma.userSession.updateMany({
            where: {
              userId: existingUser.id,
            },
            data: {
              otpCode: hashedOtp,
              otpExpiresAt: otpExpires,
            },
          });

          await this.mailService.sendOtp(existingUser.email, otp);

          return {
            statusCode: 200,
            success: true,
            message: AUTH_MESSAGES.OTP_RESENT[lang],
            data: {
              userId: existingUser.id,
              email: existingUser.email,
            },
          };
        }
      }

      // 4️⃣ PASSWORD HASH
      const hashedPassword = await bcrypt.hash(dto.password, 10);

      // 5️⃣ OTP GENERATE (transaction ichidan tashqarida bo‘lsa ham bo‘ladi)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

      // 6️⃣ OTP HASH
      const hashedOtp = await bcrypt.hash(otp, 10);

      // emailni kichikka ogitib chiqish
      dto.email = dto.email.toLowerCase().trim();

      // 7️⃣ TRANSACTION (user create + otp save)
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

        // 🔥 YANGI: Session yaratamiz OTP bilan
        await tx.userSession.create({
          data: {
            userId: createdUser.id,
            refreshFamilyId: randomUUID(), // vaqtinchalik
            hashedRefreshToken: '', // hali login bo‘lmagan
            otpCode: hashedOtp,
            otpExpiresAt: otpExpires,
          },
        });

        return createdUser;
      });

      // 8️⃣ SEND OTP EMAIL (transactiondan keyin bo‘lishi kerak)
      await this.mailService.sendOtp(user.email, otp);

      // 9️⃣ RESPONSE
      return {
        statusCode: 201,
        success: true,
        message: AUTH_MESSAGES.REGISTER_SUCCESS[lang],
        data: {
          userId: user.id,
          email: user.email,
        },
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(AUTH_MESSAGES.USER_EXISTS[lang]);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        AUTH_MESSAGES.REGISTER_FAILED[lang],
      );
    }
  }

  // ================= VERIFY OTP =================
  async verifyOtp(email: string, otp: string, req: Request) {
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();

    // =========================
    // 1️⃣ IP RATE LIMIT (REDIS)
    // =========================
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    const redis = this.redisService.redis;

    const ipRateKey = `rate:verify-otp:ip:${ip}`;
    const ipBlockKey = `block:verify-otp:ip:${ip}`;
    const ipFailKey = `fail:verify-otp:ip:${ip}`;

    // IP block check
    const ipBlockedUntil = await redis.get(ipBlockKey);
    if (ipBlockedUntil && Number(ipBlockedUntil) > Date.now()) {
      await bcrypt.compare(otp, this.fakeOtpHash);
      throw new BadRequestException('Invalid OTP');
    }

    // Rate limit
    const RATE_LIMIT = 15;
    const RATE_WINDOW_SEC = 60;

    const ipCount = await redis.incr(ipRateKey);
    if (ipCount === 1) {
      await redis.expire(ipRateKey, RATE_WINDOW_SEC);
    }

    if (ipCount > RATE_LIMIT) {
      const ipBlockMs = 5 * 60 * 1000;
      await redis.set(ipBlockKey, Date.now() + ipBlockMs, 'PX', ipBlockMs);

      await bcrypt.compare(otp, this.fakeOtpHash);
      throw new BadRequestException('Invalid OTP');
    }

    // =========================
    // 2️⃣ USER FIND
    // =========================
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user) {
      await bcrypt.compare(otp, this.fakeOtpHash);
      throw new BadRequestException('Invalid OTP');
    }

    // Agar allaqachon ACTIVE bo‘lsa
    if (user.status === UserStatus.ACTIVE) {
      await bcrypt.compare(otp, this.fakeOtpHash);
      throw new BadRequestException('Invalid OTP');
    }

    // =========================
    // 3️⃣ LATEST SESSION OLISH
    // =========================
    const session = await this.prisma.userSession.findFirst({
      where: {
        userId: user.id,
        otpCode: { not: null },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!session) {
      await bcrypt.compare(otp, this.fakeOtpHash);
      throw new BadRequestException('Invalid OTP');
    }

    // =========================
    // 4️⃣ OTP VALIDATION
    // =========================
    const isExpired = !session.otpExpiresAt || session.otpExpiresAt < now;

    const isBlocked =
      !!session.otpBlockedUntil && session.otpBlockedUntil > now;

    const isMatch = await bcrypt.compare(
      otp,
      session.otpCode ?? this.fakeOtpHash,
    );

    if (!isMatch || isExpired || isBlocked) {
      // =========================
      // 5️⃣ ATTEMPT LOGIC (SESSION LEVEL)
      // =========================
      const newAttempts = (session.otpAttempts ?? 0) + 1;

      const getOtpLockMinutes = (attempts: number) => {
        if (attempts < 3) return 0;
        if (attempts === 3) return 10;
        if (attempts === 4) return 30;
        if (attempts === 5) return 120;
        return 1440;
      };

      const lockMinutes = getOtpLockMinutes(newAttempts);

      await this.prisma.userSession.update({
        where: { id: session.id },
        data: {
          otpAttempts: newAttempts,
          otpBlockedUntil:
            lockMinutes > 0
              ? new Date(Date.now() + lockMinutes * 60 * 1000)
              : null,
        },
      });

      // Redis fail tracking
      const ipFails = await redis.incr(ipFailKey);
      if (ipFails === 1) {
        await redis.expire(ipFailKey, 15 * 60);
      }

      if (ipFails >= 10) {
        const ipBlockMs = 10 * 60 * 1000;
        await redis.set(ipBlockKey, Date.now() + ipBlockMs, 'PX', ipBlockMs);
      }

      throw new BadRequestException('Invalid OTP');
    }

    // =========================
    // 6️⃣ SUCCESS
    // =========================
    await this.prisma.$transaction(async (tx) => {
      // User ACTIVE qilish
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.ACTIVE,
        },
      });

      // Session cleanup
      await tx.userSession.update({
        where: { id: session.id },
        data: {
          otpCode: null,
          otpExpiresAt: null,
          otpAttempts: 0,
          otpBlockedUntil: null,
        },
      });
    });

    await redis.del(ipFailKey);

    return { message: 'Email verified successfully' };
  }

  // ================= LOGIN =================
  async login(dto: LoginAuthDto, res: Response, req: Request) {
    const email = dto.email.toLowerCase().trim();

    // ===== NEW (IP olish) =====
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    // ===== NEW (Redis keylar) =====
    const redis = this.redisService.redis;

    const ipRateKey = `rate:login:ip:${ip}`; // global rate
    const ipBlockKey = `block:login:ip:${ip}`; // ip lock

    // ===== NEW (1) IP BLOCK check =====
    const ipBlockedUntil = await redis.get(ipBlockKey);
    if (ipBlockedUntil && Number(ipBlockedUntil) > Date.now()) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // ===== NEW (2) GLOBAL RATE LIMIT (per IP) =====
    // 20 request / 60 sec
    const RATE_LIMIT = 20;
    const RATE_WINDOW_SEC = 60;

    const ipCount = await redis.incr(ipRateKey);
    if (ipCount === 1) {
      await redis.expire(ipRateKey, RATE_WINDOW_SEC);
    }

    if (ipCount > RATE_LIMIT) {
      // 5 minut IP block
      const ipBlockMs = 5 * 60 * 1000;
      await redis.set(ipBlockKey, Date.now() + ipBlockMs, 'PX', ipBlockMs);

      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // 1) USER YO‘Q bo‘lsa ham bir xil error qaytarish kerak
    if (!user) {
      // ===== NEW (IP fail count) =====
      const ipFailKey = `fail:login:ip:${ip}`;
      const ipFails = await redis.incr(ipFailKey);

      if (ipFails === 1) {
        await redis.expire(ipFailKey, 15 * 60); // 15 min
      }

      if (ipFails >= 10) {
        const ipBlockMs = 10 * 60 * 1000;
        await redis.set(ipBlockKey, Date.now() + ipBlockMs, 'PX', ipBlockMs);
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // ===== NEW (lock expired bo‘lsa reset) =====
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

    // 2) LOCK tekshirish (ACCOUNT LOCK)
    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3) PASSWORD check
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      // ✅ faqat verify bo‘lgan userlarda attempts++ qilamiz
      const newAttempts = (user.failedLoginAttempts ?? 0) + 1;

      // ===== EXPO BACKOFF =====
      const getLockMinutes = (attempts: number) => {
        if (attempts < 5) return 0;
        if (attempts === 5) return 10;
        if (attempts === 6) return 30;
        if (attempts === 7) return 120;
        return 1440;
      };

      const lockMinutes = getLockMinutes(newAttempts);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockUntil:
            lockMinutes > 0
              ? new Date(Date.now() + lockMinutes * 60 * 1000)
              : null,
        },
      });

      // ===== IP fail count =====
      const ipFailKey = `fail:login:ip:${ip}`;
      const ipFails = await redis.incr(ipFailKey);

      if (ipFails === 1) {
        await redis.expire(ipFailKey, 15 * 60);
      }

      if (ipFails >= 10) {
        const ipBlockMs = 10 * 60 * 1000;
        await redis.set(ipBlockKey, Date.now() + ipBlockMs, 'PX', ipBlockMs);
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // 4) Agar password to‘g‘ri bo‘lsa attempts reset qilamiz
    if ((user.failedLoginAttempts ?? 0) > 0 || user.lockUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockUntil: null,
        },
      });
    }

    // ===== NEW (IP fail reset) =====
    await redis.del(`fail:login:ip:${ip}`);

    // ===== Status check faqat password to‘g‘ri bo‘lgandan keyin =====
    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException('Email verify required');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended');
    }

    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('Account banned');
    }

    const jti = randomUUID();
    const familyId = randomUUID(); // Yangi token family ID

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role, jti },
      {
        secret: this.config.getOrThrow<string>('ACCESS_TOKEN_KEY'),
        expiresIn: this.config.getOrThrow<string>(
          'ACCESS_TOKEN_TIME',
        ) as StringValue,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role, jti },
      {
        secret: this.config.getOrThrow<string>('REFRESH_TOKEN_KEY'),
        expiresIn: this.config.getOrThrow<string>(
          'REFRESH_TOKEN_TIME',
        ) as StringValue,
      },
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // Create new session
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshFamilyId: familyId,
        hashedRefreshToken,
        deviceInfo: req.headers['user-agent'],
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        lastLoginAt: new Date(),
      },
    });

    // ===== NEW: refresh jti store (Redis) =====
    const refreshTtlSec = this.config.getOrThrow<number>(
      'REFRESH_TOKEN_TTL_SEC',
    );

    await this.redisService.redis.set(
      `refresh:jti:user:${user.id}:${familyId}`,
      jti,
      'EX',
      refreshTtlSec,
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: Number(this.config.getOrThrow<string>('COOKIE_TIME')),
      sameSite: 'strict',
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

  // ================= REFRESH =================
  async refreshTokens(userId: string, refreshToken: string, res: Response) {
    const redis = this.redisService.redis;

    let tokenPayload: any = null;

    try {
      tokenPayload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('REFRESH_TOKEN_KEY'),
      });
    } catch {
      throw new UnauthorizedException('Access denied');
    }

    const tokenJti = tokenPayload?.jti;
    const familyId = tokenPayload?.familyId;

    if (!tokenJti || !familyId) {
      throw new UnauthorizedException('Access denied');
    }

    // =========================
    // 1️⃣ Session topamiz
    // =========================
    const session = await this.prisma.userSession.findFirst({
      where: {
        userId,
        refreshFamilyId: familyId,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Access denied');
    }

    // =========================
    // 2️⃣ Redis-based lock (saqlanadi)
    // =========================
    const lockKey = `lock:refresh:session:${session.id}`;

    const lockAcquired = await redis.set(lockKey, '1', 'EX', 10, 'NX');

    if (!lockAcquired) {
      throw new UnauthorizedException('Too many refresh requests, try again');
    }

    try {
      // =========================
      // 3️⃣ Reuse detection (Redis JTI)
      // =========================
      const redisKey = `refresh:jti:session:${session.id}`;

      const redisJti = await redis.getdel(redisKey);

      if (!redisJti || redisJti !== tokenJti) {
        // 🔥 Reuse detected → revoke session

        await this.prisma.userSession.delete({
          where: { id: session.id },
        });

        res.clearCookie('refreshToken', {
          httpOnly: true,
          sameSite: 'strict',
        });

        throw new UnauthorizedException('Access denied (token reuse)');
      }

      // =========================
      // 4️⃣ Rotate JTI + Family
      // =========================
      const newJti = randomUUID();
      const newFamilyId = randomUUID();

      const newAccessToken = await this.jwtService.signAsync(
        {
          sub: userId,
          jti: newJti,
          familyId: newFamilyId,
        },
        {
          secret: this.config.getOrThrow<string>('ACCESS_TOKEN_KEY'),
          expiresIn: this.config.getOrThrow<string>(
            'ACCESS_TOKEN_TIME',
          ) as StringValue,
        },
      );

      const newRefreshToken = await this.jwtService.signAsync(
        {
          sub: userId,
          jti: newJti,
          familyId: newFamilyId,
        },
        {
          secret: this.config.getOrThrow<string>('REFRESH_TOKEN_KEY'),
          expiresIn: this.config.getOrThrow<string>(
            'REFRESH_TOKEN_TIME',
          ) as StringValue,
        },
      );

      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

      // =========================
      // 5️⃣ Session update
      // =========================
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: {
          hashedRefreshToken,
          refreshFamilyId: newFamilyId,
        },
      });

      // =========================
      // 6️⃣ Redis update
      // =========================
      const refreshTtlSec = this.config.getOrThrow<number>(
        'REFRESH_TOKEN_TTL_SEC',
      );

      await redis.set(
        `refresh:jti:session:${session.id}`,
        newJti,
        'EX',
        refreshTtlSec,
      );

      // =========================
      // 7️⃣ Cookie update
      // =========================
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        maxAge: Number(this.config.getOrThrow<string>('COOKIE_TIME')),
        sameSite: 'strict',
      });

      return { accessToken: newAccessToken };
    } finally {
      await redis.del(lockKey);
    }
  }

  // ================= LOGOUT =================
  async logout(userId: string, jti: string, res: Response) {
    if (!userId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'User ID is required for logout',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // =========================
      // 1️⃣ Active session topamiz
      // =========================
      const session = await this.prisma.userSession.findFirst({
        where: {
          userId,
        },
      });

      if (session) {
        // =========================
        // 2️⃣ Redis refresh JTI o‘chirish
        // =========================
        await this.redisService.redis.del(`refresh:jti:session:${session.id}`);

        // =========================
        // 3️⃣ Session delete
        // =========================
        await this.prisma.userSession.delete({
          where: { id: session.id },
        });
      }

      // =========================
      // 4️⃣ Access token blacklist
      // =========================
      if (jti) {
        const ttlSec = 15 * 60 * 60; // kerak bo‘lsa env qilamiz

        await this.redisService.redis.set(
          `blacklist:access:${jti}`,
          'revoked',
          'EX',
          ttlSec,
        );
      }

      // =========================
      // 5️⃣ Cookie clear
      // =========================
      res.clearCookie('refreshToken', {
        httpOnly: true,
        sameSite: 'strict',
      });

      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Logged out successfully',
        data: null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Logout error:', error);

      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: 'Logout failed',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
