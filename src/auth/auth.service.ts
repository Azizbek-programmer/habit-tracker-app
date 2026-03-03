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
import { MailService } from 'src/mail/mail.service';
import { AUTH_MESSAGES } from 'src/common/message/user/messages';
import { RedisService } from 'src/redis/redis.service';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';
import { generateOtp } from '../common/utils/otp.util';
import { TokenService } from './utils/token.service';
import { SessionService } from './utils/session.service';
import { RateLimitService } from './utils/rateLimit.service';

@Injectable()
export class AuthService {
  private async failOtp(ip: string, otp: string): Promise<never> {
    await this.rateLimitService.registerFail(ip, 'verify-otp');
    await bcrypt.compare(otp, this.fakeOtpHash);
    throw new BadRequestException('Invalid OTP');
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
    private readonly config: ConfigService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly rateLimitService: RateLimitService,
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
        select: {
          id: true,
          email: true,
          status: true,
        },
      });

      if (existingUser) {
        // 🔥 Agar user ACTIVE bo‘lsa — to‘xtatamiz
        if (existingUser.status === 'ACTIVE') {
          throw new ConflictException(AUTH_MESSAGES.USER_EXISTS[lang]);
        }

        // 🔥 Agar user PENDING bo‘lsa — OTP resend qilamiz
        if (existingUser.status === 'PENDING') {
          const otp = generateOtp(6);
          const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
          const hashedOtp = await bcrypt.hash(otp, 10);

          await this.sessionService.create(
            existingUser.id,
            '',
            randomUUID(),
            undefined,
            { code: hashedOtp, expiresAt: otpExpires },
          );

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
      const otp = generateOtp(6);
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
        await this.sessionService.create(
          createdUser.id,
          '',
          randomUUID(),
          undefined,
          { code: hashedOtp, expiresAt: otpExpires },
          tx,
        );

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

    // 1️⃣ IP RATE LIMIT
    const ip = await this.rateLimitService.extractIp(req); // ✅ await qo‘shildi
    await this.rateLimitService.checkRate(ip, 'verify-otp');

    // 🔥 Helper function: fail holatlari uchun
    const failOtp = async () => {
      await this.rateLimitService.registerFail(ip, 'verify-otp');
      await bcrypt.compare(otp, this.fakeOtpHash);
      throw new BadRequestException('Invalid OTP');
    };

    // 2️⃣ USER TOPISH
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user) return failOtp();
    if (user.status === UserStatus.ACTIVE) return failOtp();

    // 3️⃣ LATEST OTP SESSION OLISH
    const session = await this.sessionService.findLatestOtpSession(user.id);
    if (!session) return failOtp();

    // 4️⃣ OTP VALIDATION
    const isExpired = !session.otpExpiresAt || session.otpExpiresAt < now;
    const isBlocked =
      !!session.otpBlockedUntil && session.otpBlockedUntil > now;
    const isMatch = await bcrypt.compare(
      otp,
      session.otpCode || this.fakeOtpHash,
    );

    if (!isMatch || isExpired || isBlocked) {
      // 5️⃣ ATTEMPT LOGIC
      const newAttempts = (session.otpAttempts ?? 0) + 1;
      const getOtpLockMinutes = (attempts: number) => {
        if (attempts < 3) return 0;
        if (attempts === 3) return 10;
        if (attempts === 4) return 30;
        if (attempts === 5) return 120;
        return 1440;
      };
      const lockMinutes = getOtpLockMinutes(newAttempts);

      await this.sessionService.incrementOtpAttempts(
        session.id,
        newAttempts,
        lockMinutes,
      );

      return failOtp(); // Redis fail va fake compare bir joyda
    }

    // 6️⃣ SUCCESSFUL OTP
    await this.prisma.$transaction(async (tx) => {
      const updatedSession = await this.sessionService.clearOtpData(session.id); // ✅ tx olib tashlandi
      if (updatedSession.count === 0) {
        throw new BadRequestException('OTP already used or expired');
      }

      // User ACTIVE qilamiz
      await tx.user.update({
        where: { id: user.id },
        data: { status: UserStatus.ACTIVE },
      });

      // Oldingi OTP sessionlarni o‘chiramiz
      await this.sessionService.deleteOtherOtpSessions(user.id); // ✅ tx olib tashlandi
    });

    // 🔥 Redis fail reset
    await this.rateLimitService.resetFails(ip, 'verify-otp');

    return { message: 'Email verified successfully' };
  }

  // ================= LOGIN =================
  async login(dto: LoginAuthDto, res: Response, req: Request) {
    const email = dto.email.toLowerCase().trim();

    // ===== NEW (IP olish) =====
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

    // 1) USER YO‘Q bo‘lsa ham bir xil error qaytarish kerak
    if (!user) {
      await this.rateLimitService.registerFail(ip, 'login');

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

      await this.rateLimitService.registerFail(ip, 'login');

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

    await this.rateLimitService.resetFails(ip, 'login');

    const { accessToken, refreshToken, jti, familyId } =
      await this.tokenService.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
      });

    const hashedRefreshToken = await this.tokenService.hash(refreshToken);

    // Create new session
    const createdSession = await this.sessionService.create(
      user.id,
      hashedRefreshToken,
      familyId,
      req,
    );

    // ===== NEW: refresh jti store (Redis) =====
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

  // ================= REFRESH =================
  async refreshTokens(refreshToken: string, res: Response) {
    const redis = this.redisService.redis;

    let tokenPayload: any = null;

    const refreshTtlSec = this.config.getOrThrow<number>(
      'REFRESH_TOKEN_TTL_SEC',
    );

    try {
      tokenPayload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('REFRESH_TOKEN_KEY'),
        ignoreExpiration: false,
      });
    } catch {
      throw new UnauthorizedException('Access denied');
    }
    const userId = tokenPayload?.sub;

    if (!userId) {
      throw new UnauthorizedException('Access denied');
    }

    const tokenJti = tokenPayload?.jti;
    const familyId = tokenPayload?.familyId;

    if (!tokenJti || !familyId) {
      throw new UnauthorizedException('Access denied');
    }
    // 1️⃣ Session topamiz
    const session = await this.sessionService.findByFamily(userId, familyId);

    if (!session) {
      await bcrypt.compare(refreshToken, this.fakeRefreshHash);
      throw new UnauthorizedException('Access denied');
    }

    if (!session.hashedRefreshToken) {
      await bcrypt.compare(refreshToken, this.fakeRefreshHash);
      throw new UnauthorizedException('Access denied');
    }

    // 🔐 REFRESH TOKEN INTEGRITY CHECK
    const isValid = await this.sessionService.compare(
      refreshToken,
      session.hashedRefreshToken,
    );

    if (!isValid) {
      throw new UnauthorizedException('Access denied');
    }

    // 2️⃣ Redis-based lock (saqlanadi)
    const lockKey = `lock:refresh:session:${session.id}`;

    const lockAcquired = await redis.set(lockKey, '1', 'EX', 10, 'NX');

    if (!lockAcquired) {
      throw new UnauthorizedException('Too many refresh requests, try again');
    }

    try {
      // 3️⃣ Reuse detection (Redis JTI)
      const redisKey = `refresh:jti:session:${session.id}`;

      const redisJti = await redis.get(redisKey);

      if (!redisJti || redisJti !== tokenJti) {
        // 🔥 reuse detected
        await bcrypt.compare(refreshToken, this.fakeRefreshHash);
        await this.sessionService.revoke(session.id);

        res.clearCookie('refreshToken', {
          httpOnly: true,
          sameSite: 'strict',
        });

        throw new UnauthorizedException('Access denied (token reuse)');
      }
      // ✅ faqat valid bo‘lsa delete qilamiz
      await redis.del(redisKey);

      // 4️⃣ Rotate JTI + Family
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        await this.sessionService.revoke(session.id);

        res.clearCookie('refreshToken', {
          httpOnly: true,
          sameSite: 'strict',
        });

        throw new UnauthorizedException('User not found');
      }

      const {
        newAccessToken,
        newRefreshToken,
        hashedRefreshToken,
        newJti,
        familyId: newFamilyId,
      } = await this.tokenService.rotateTokensWithPayload(
        user,
        session.refreshFamilyId!,
      );

      // 5️⃣ Session update
      try {
        await this.prisma.$transaction(async (tx) => {
          // session update
          await this.sessionService.rotate(
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
        // agar xatolik bo‘lsa session revoke qilamiz
        await this.sessionService.revoke(session.id);
        throw new InternalServerErrorException(
          'Failed to finalize refresh rotation',
        );
      }

      // 7️⃣ Cookie update
      res.cookie('refreshToken', newRefreshToken, {
        secure: this.config.get('NODE_ENV') === 'production',
        path: '/',
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
  async logout(userId: string, refreshToken: string) {
    const redis = this.redisService.redis;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    let payload: any;

    // 1️⃣ Token verification with try/catch
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('REFRESH_TOKEN_KEY'),
      });
    } catch {
      // agar token invalid bo‘lsa
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
