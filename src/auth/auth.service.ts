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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
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
      const exists = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: dto.email }, { username: dto.username }],
        },
      });

      if (exists) {
        throw new ConflictException(AUTH_MESSAGES.USER_EXISTS[lang]);
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
        // USER CREATE
        const createdUser = await tx.user.create({
          data: {
            id: randomUUID(),
            fullName: dto.fullName,
            username: dto.username,
            email: dto.email,
            phoneNumber: dto.phoneNumber,
            password: hashedPassword,

            timezone: dto.timezone ?? 'Asia/Tashkent',
            locale: lang,
            theme: dto.theme ?? 'dark',
            weekStartDay: dto.weekStartDay ?? 'monday',

            birthDate: BigInt(birthMs),
            lastLoginAt: new Date(),
            lastActiveAt: new Date(),
          },
        });

        // OTP SAVE (update)
        await tx.user.update({
          where: { id: createdUser.id },
          data: {
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

    // ===== IP olish (login dagidek) =====
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    // ===== Redis =====
    const redis = this.redisService.redis;

    // ===== Redis keylar (verify-otp uchun) =====
    const ipRateKey = `rate:verify-otp:ip:${ip}`;
    const ipBlockKey = `block:verify-otp:ip:${ip}`;
    const ipFailKey = `fail:verify-otp:ip:${ip}`;

    // ===== 1) IP BLOCK check =====
    const ipBlockedUntil = await redis.get(ipBlockKey);
    if (ipBlockedUntil && Number(ipBlockedUntil) > Date.now()) {
      // timing signal bermaslik uchun bcrypt compare baribir ishlaydi
      await bcrypt.compare(otp, this.fakeOtpHash);
      throw new BadRequestException('Invalid OTP');
    }

    // ===== 2) GLOBAL RATE LIMIT (per IP) =====
    // Masalan: 15 request / 60 sec
    const RATE_LIMIT = 15;
    const RATE_WINDOW_SEC = 60;

    const ipCount = await redis.incr(ipRateKey);
    if (ipCount === 1) {
      await redis.expire(ipRateKey, RATE_WINDOW_SEC);
    }

    if (ipCount > RATE_LIMIT) {
      // 5 minut IP block
      const ipBlockMs = 5 * 60 * 1000;
      await redis.set(ipBlockKey, Date.now() + ipBlockMs, 'PX', ipBlockMs);

      // timing signal bermaslik uchun bcrypt compare baribir ishlaydi
      await bcrypt.compare(otp, this.fakeOtpHash);
      throw new BadRequestException('Invalid OTP');
    }

    // ===== Timing attack uchun =====
    let otpHashToCompare = this.fakeOtpHash;
    let isOtpMatch = false;

    const now = new Date();

    try {
      const user = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          otpCode: true,
          otpExpiresAt: true,
          isVerified: true,

          otpAttempts: true,
          otpBlockedUntil: true,
        },
      });

      // ===== Timing attackdan himoya: compare doim ishlaydi =====
      otpHashToCompare = user?.otpCode ?? this.fakeOtpHash;
      isOtpMatch = await bcrypt.compare(otp, otpHashToCompare);

      // ===== Expire check =====
      const isExpired = !user?.otpExpiresAt || user.otpExpiresAt < now;

      // ===== Account OTP block (DB) =====
      const isAccountBlocked =
        !!user?.otpBlockedUntil && user.otpBlockedUntil > now;

      /**
       * INVALID holatlar:
       * - user yo'q
       * - otp yo'q
       * - verified bo'lgan
       * - expired
       * - account block
       * - otp match emas
       */
      const isInvalid =
        !user ||
        !user.otpCode ||
        user.isVerified ||
        isExpired ||
        isAccountBlocked ||
        !isOtpMatch;

      // ===== 3) FAIL bo‘lsa: DB attempt + Redis IP fail =====
      if (isInvalid) {
        // ===== IP fail count (user bo'lmasa ham ishlaydi) =====
        const ipFails = await redis.incr(ipFailKey);
        if (ipFails === 1) {
          await redis.expire(ipFailKey, 15 * 60); // 15 min
        }

        // 10 ta fail bo‘lsa IP block (login dagidek)
        if (ipFails >= 10) {
          const ipBlockMs = 10 * 60 * 1000;
          await redis.set(ipBlockKey, Date.now() + ipBlockMs, 'PX', ipBlockMs);
        }

        /**
         * DB attempt faqat user mavjud bo‘lsa oshadi:
         * (otp bor, verified emas, expired emas, account block emas)
         */
        if (
          user &&
          user.otpCode &&
          !user.isVerified &&
          !isExpired &&
          !isAccountBlocked
        ) {
          const newAttempts = (user.otpAttempts ?? 0) + 1;

          // ===== EXPO BACKOFF (login dagidek) =====
          // 3 urinish -> 10 min
          // 4 urinish -> 30 min
          // 5 urinish -> 2 soat
          // 6+ -> 24 soat
          const getOtpLockMinutes = (attempts: number) => {
            if (attempts < 3) return 0;
            if (attempts === 3) return 10;
            if (attempts === 4) return 30;
            if (attempts === 5) return 120;
            return 1440;
          };

          const lockMinutes = getOtpLockMinutes(newAttempts);

          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              otpAttempts: newAttempts,
              otpBlockedUntil:
                lockMinutes > 0
                  ? new Date(Date.now() + lockMinutes * 60 * 1000)
                  : null,
            },
          });
        }

        // ===== Har doim bir xil response =====
        throw new BadRequestException('Invalid OTP');
      }

      // ===== SUCCESS bo‘lsa: verify + reset =====
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          otpCode: null,
          otpExpiresAt: null,

          otpAttempts: 0,
          otpBlockedUntil: null,
        },
      });

      // ===== SUCCESS bo‘lsa: IP fail reset =====
      await redis.del(ipFailKey);

      return { message: 'Email verified successfully' };
    } catch (err) {
      // timing uchun: har qanday error bo‘lsa ham compare ishlagan bo‘lsin
      if (!isOtpMatch) {
        await bcrypt.compare(otp, otpHashToCompare);
      }
      throw err;
    }
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
      // user yo‘q bo‘lsa ham IP bo‘yicha fail hisoblaymiz
      const ipFailKey = `fail:login:ip:${ip}`;
      const ipFails = await redis.incr(ipFailKey);

      if (ipFails === 1) {
        await redis.expire(ipFailKey, 15 * 60); // 15 min
      }

      // 10 ta fail bo‘lsa IP block
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
      const newAttempts = (user.failedLoginAttempts ?? 0) + 1;

      const MAX_ATTEMPTS = 5;

      // ===== NEW (EXPO BACKOFF) =====
      // 5 urinish -> 10 min
      // 6 urinish -> 30 min
      // 7 urinish -> 2 soat
      // 8+ -> 24 soat
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

      // ===== NEW (IP fail count) =====
      const ipFailKey = `fail:login:ip:${ip}`;
      const ipFails = await redis.incr(ipFailKey);

      if (ipFails === 1) {
        await redis.expire(ipFailKey, 15 * 60); // 15 min
      }

      // 10 ta fail bo‘lsa IP block
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

    // 5) verify check
    if (!user.isVerified) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 6) banned check
    if (user.status === 'BANNED') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.ACCESS_TOKEN_KEY!,
      expiresIn: process.env.ACCESS_TOKEN_TIME as StringValue,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.REFRESH_TOKEN_KEY!,
      expiresIn: process.env.REFRESH_TOKEN_TIME as StringValue,
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'ACTIVE',
        hashedRefreshToken,
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: Number(process.env.COOKIE_TIME),
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
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      // 🔥 Timing attackdan himoya: user topilmasa ham compare ishlaydi
      const hashToCompare = user?.hashedRefreshToken ?? this.fakeRefreshHash;

      const isValid = await bcrypt.compare(refreshToken, hashToCompare);

      if (!user || !user.hashedRefreshToken) {
        throw new UnauthorizedException('Access denied');
      }

      if (!isValid) {
        throw new UnauthorizedException('Access denied'); // ❗ bitta xil error
      }

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const newAccessToken = await this.jwtService.signAsync(payload, {
        secret: process.env.ACCESS_TOKEN_KEY!,
        expiresIn: process.env.ACCESS_TOKEN_TIME as StringValue,
      });

      const newRefreshToken = await this.jwtService.signAsync(payload, {
        secret: process.env.REFRESH_TOKEN_KEY!,
        expiresIn: process.env.REFRESH_TOKEN_TIME as StringValue,
      });

      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { hashedRefreshToken },
      });

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        maxAge: Number(process.env.COOKIE_TIME),
        sameSite: 'strict',
      });

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw error;
    }
  }

  // ================= LOGOUT =================
  async logout(userId: string, res: Response) {
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
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          hashedRefreshToken: null,
          status: 'INACTIVE',
          lastActiveAt: new Date(),
        },
      });

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
