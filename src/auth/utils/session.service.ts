import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  // ================= CREATE SESSION =================
  async create(
    userId: string,
    hashedRefreshToken: string,
    familyId: string,
    req?: Request,
    otp?: { code: string; expiresAt: Date },
    tx?: Prisma.TransactionClient,
  ) {
    const ipAddress =
      req?.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req?.socket.remoteAddress ||
      'unknown';

    const deviceInfo = req?.headers['user-agent']?.toString() || null;

    const prismaClient = tx ?? this.prisma;

    return prismaClient.userSession.create({
      data: {
        userId,
        hashedRefreshToken,
        refreshFamilyId: familyId,
        deviceInfo,
        ipAddress,
        lastLoginAt: new Date(),
        // ip: req?.ip,
        userAgent: req?.headers['user-agent'],
        otpCode: otp?.code || null,
        otpExpiresAt: otp?.expiresAt || null,
      },
    });
  }

  // ================= ROTATE SESSION =================
  async rotate(
    sessionId: string,
    newHashedToken: string,
    newFamilyId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    await prismaClient.userSession.update({
      where: { id: sessionId },
      data: {
        hashedRefreshToken: newHashedToken,
        refreshFamilyId: newFamilyId,
      },
    });
  }

  // ================= DELETE SESSION =================
  async delete(sessionId: string) {
    await this.prisma.userSession.delete({
      where: { id: sessionId },
    });
  }

  // ================= FIND BY FAMILY =================
  async findByFamily(userId: string, familyId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: {
        userId,
        refreshFamilyId: familyId,
      },
    });
    return session;
  }

  // ================= REVOKE SESSION =================
  async revoke(sessionId: string) {
    const redis = this.redisService.redis;

    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return;

    // Redis JTI remove
    await redis.del(`refresh:jti:session:${session.id}`);

    // Delete session
    await this.prisma.userSession.delete({
      where: { id: session.id },
    });
  }

  async findLatestOtpSession(userId: string) {
    return this.prisma.userSession.findFirst({
      where: {
        userId,
        otpCode: { not: null },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        otpCode: true,
        otpExpiresAt: true,
        otpAttempts: true,
        otpBlockedUntil: true,
      },
    });
  }

  async incrementOtpAttempts(
    sessionId: string,
    attempts: number,
    lockMinutes: number,
  ) {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        otpAttempts: attempts,
        otpBlockedUntil:
          lockMinutes > 0
            ? new Date(Date.now() + lockMinutes * 60 * 1000)
            : null,
      },
    });
  }

  async clearOtpData(sessionId: string) {
    return this.prisma.userSession.updateMany({
      where: {
        id: sessionId,
        otpCode: { not: null },
        otpExpiresAt: { gt: new Date() },
      },
      data: {
        otpCode: null,
        otpExpiresAt: null,
      },
    });
  }

  async deleteOtherOtpSessions(userId: string) {
    await this.prisma.userSession.deleteMany({
      where: {
        userId,
        otpCode: { not: null },
      },
    });
  }

  // ================= HASH AND COMPARE =================
  async compare(token: string, hashed: string) {
    return bcrypt.compare(token, hashed);
  }

  async hash(token: string) {
    return bcrypt.hash(token, 10);
  }
}
