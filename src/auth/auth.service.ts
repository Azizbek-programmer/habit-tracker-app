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
  async verifyOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        otpCode: true,
        otpExpiresAt: true,
        isVerified: true,
      },
    });

    if (!user || !user.otpCode || !user.otpExpiresAt) {
      throw new BadRequestException('OTP not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    // ⛔ OTP muddati tekshiriladi
    if (user.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    // 🔐 HASHED OTP tekshiruv
    const isOtpValid = await bcrypt.compare(otp, user.otpCode);

    if (!isOtpValid) {
      throw new BadRequestException('Invalid OTP');
    }

    // ✅ Tasdiqlash
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const isValid = await bcrypt.compare(refreshToken, user.hashedRefreshToken);

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
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
  }

  // ================= LOGOUT =================
  async logout(userId: string, res: Response) {
    if (!userId) {
      throw new BadRequestException('User ID is required for logout');
    }

    try {
      // 1️⃣ DB update: hashedRefreshToken null qilish va statusni INACTIVE qilish (optional)
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          hashedRefreshToken: null,
          status: 'INACTIVE', // optional, lekin tavsiya qilinadi
          lastActiveAt: new Date(),
        },
      });

      // 2️⃣ Cookie o‘chirish: path va sameSite login bilan mos bo‘lishi kerak
      res.clearCookie('refreshToken', {
        httpOnly: true,
        sameSite: 'strict',
      });

      // 3️⃣ Response yuborish
      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      throw new InternalServerErrorException('Logout failed');
    }
  }
}
