import { Injectable, BadRequestException } from '@nestjs/common';
import { SessionService } from './session.service';
import { RateLimitService } from './rateLimit.service';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class OtpService {
  private readonly fakeOtpHash =
    '$2b$10$3Qqz2d5JQfH2m7k8fXl7qOQqW8j3kqYd3oWfEw5p8Y4j1r9q2s9tK';

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  // 🔥 Helper: fail holatlari uchun
  private async failOtp(ip: string, otp: string): Promise<never> {
    await this.rateLimitService.registerFail(ip, 'verify-otp');
    await bcrypt.compare(otp, this.fakeOtpHash); // timing-safe fake compare
    throw new BadRequestException('Invalid OTP');
  }

  // ================= VERIFY OTP =================
  async verifyOtp(email: string, otp: string, req: Request) {
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();

    // 1️⃣ IP RATE LIMIT
    const ip = await this.rateLimitService.extractIp(req);
    await this.rateLimitService.checkRate(ip, 'verify-otp');

    // 2️⃣ USER TOPISH
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, status: true },
    });

    if (!user) return this.failOtp(ip, otp);
    if (user.status === UserStatus.ACTIVE) return this.failOtp(ip, otp);

    // 3️⃣ LATEST OTP SESSION OLISH
    const session = await this.sessionService.findLatestOtpSession(user.id);
    if (!session) return this.failOtp(ip, otp);

    // 4️⃣ OTP VALIDATION
    const isExpired = !session.otpExpiresAt || session.otpExpiresAt < now;
    const isBlocked = !!session.otpBlockedUntil && session.otpBlockedUntil > now;
    const isMatch = await bcrypt.compare(otp, session.otpCode || this.fakeOtpHash);

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

      await this.sessionService.incrementOtpAttempts(session.id, newAttempts, lockMinutes);

      return this.failOtp(ip, otp);
    }

    // 6️⃣ SUCCESSFUL OTP
    await this.prisma.$transaction(async (tx) => {
      const updatedSession = await this.sessionService.clearOtpData(session.id); 
      if (updatedSession.count === 0) throw new BadRequestException('OTP already used or expired');

      // User ACTIVE qilamiz
      await tx.user.update({
        where: { id: user.id },
        data: { status: UserStatus.ACTIVE },
      });

      // Oldingi OTP sessionlarni o‘chiramiz
      await this.sessionService.deleteOtherOtpSessions(user.id);
    });

    // 🔥 Redis fail reset
    await this.rateLimitService.resetFails(ip, 'verify-otp');

    return { message: 'Email verified successfully' };
  }

  // ================= CREATE OTP SESSION =================
  async createOtpSession(userId: string, otpCode: string, expiresAt: Date, tx?: any) {
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
}