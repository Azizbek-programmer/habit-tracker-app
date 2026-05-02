import { Injectable, BadRequestException } from '@nestjs/common';
import { SessionService } from './session.service';
import { RateLimitService } from './rateLimit.service';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { generateOtp } from 'src/common/utils/otp.util';
import { MailService } from 'src/mail/mail.service';
import { CreateAuthDto } from '../dto/create-auth.dto';
import { Lang } from 'src/common/types/lang.type';

@Injectable()
export class OtpService {
  private readonly fakeOtpHash =
    '$2b$10$3Qqz2d5JQfH2m7k8fXl7qOQqW8j3kqYd3oWfEw5p8Y4j1r9q2s9tK';

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly rateLimitService: RateLimitService,
    private readonly mailService: MailService,
  ) {}

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

  // ================= CREATE OTP SESSION =================
  async createOtpSession(
    userId: string,
    otpCode: string,
    expiresAt: Date,
    tx?: any,
  ) {
    const hashedOtp = await bcrypt.hash(otpCode, 10);
    return this.sessionService.create(
      userId,
      '',
      randomUUID(),
      undefined,
      { code: hashedOtp, expiresAt },
      tx,
    );
  }

  // ================= REGISTER OTP HELPERS =================

  // Generate OTP + hash + expiry
  async generateOtpData(length = 6) {
    const otp = generateOtp(length);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const hashedOtp = await bcrypt.hash(otp, 10);
    return { otp, hashedOtp, expiresAt };
  }
  // Send OTP email
  async sendOtpEmail(email: string, otp: string, lang: Lang) {
    await this.mailService.sendOtp(email, otp, lang);
  }

  // Create OTP session (for register or resend)
  async createOtpForUser(
    userId: string,
    hashedOtp: string,
    expiresAt: Date,
    tx?: any,
  ) {
    return this.sessionService.create(
      userId,
      '',
      randomUUID(),
      undefined,
      { code: hashedOtp, expiresAt },
      tx,
    );
  }

  // Resend OTP for PENDING user
  async resendOtpForPendingUser(userId: string, email: string, lang: Lang) {
    const { otp, hashedOtp, expiresAt } = await this.generateOtpData();
    await this.createOtpForUser(userId, hashedOtp, expiresAt);
    await this.sendOtpEmail(email, otp, lang);
    return { userId, email };
  }
}
