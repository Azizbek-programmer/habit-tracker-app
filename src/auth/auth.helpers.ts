// src/auth/auth.helpers.ts
import {
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/message/user/messages';
import { PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * =========================
 * BIRTH DATE VALIDATION
 * =========================
 */
export function validateBirthDate(
  birthDateInput: string | number,
  lang = 'uz',
) {
  const birthMs = Number(birthDateInput);
  if (!Number.isFinite(birthMs)) {
    throw new BadRequestException(AUTH_MESSAGES.BIRTH_INVALID[lang]);
  }

  const birthDate = new Date(birthMs);
  if (isNaN(birthDate.getTime())) {
    throw new BadRequestException(AUTH_MESSAGES.BIRTH_INVALID[lang]);
  }

  const now = new Date();
  const minDate = new Date('1900-01-01');

  if (birthDate > now)
    throw new BadRequestException(AUTH_MESSAGES.BIRTH_FUTURE[lang]);
  if (birthDate < minDate)
    throw new BadRequestException(AUTH_MESSAGES.BIRTH_TOO_OLD[lang]);

  return birthDate;
}

/**
 * =========================
 * PASSWORD VALIDATION
 * =========================
 */
export function validatePassword(password: string, lang = 'uz') {
  const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/;
  if (!strongPassword.test(password)) {
    throw new BadRequestException(AUTH_MESSAGES.PASSWORD_WEAK[lang]);
  }
}

/**
 * =========================
 * EMAIL NORMALIZATION
 * =========================
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * =========================
 * USER STATUS VALIDATION (LOGIN)
 * =========================
 */
export function validateUserStatus(userStatus: UserStatus) {
  if (userStatus === UserStatus.PENDING) {
    throw new UnauthorizedException('Email verify required');
  }
  if (userStatus === UserStatus.SUSPENDED) {
    throw new UnauthorizedException('Account suspended');
  }
  if (userStatus === UserStatus.BANNED) {
    throw new UnauthorizedException('Account banned');
  }
}

/**
 * =========================
 * PASSWORD COMPARISON HELPER
 * =========================
 */
export async function comparePassword(plain: string, hashed: string) {
  const isValid = await bcrypt.compare(plain, hashed);
  if (!isValid) throw new UnauthorizedException('Invalid credentials');
  return true;
}

/**
 * =========================
 * ATTEMPT / LOCK MINUTES CALCULATION
 * =========================
 */
export function calculateLockMinutes(
  attempts: number,
  type: 'login' | 'otp',
): number {
  if (type === 'login') {
    if (attempts < 5) return 0;
    if (attempts === 5) return 10;
    if (attempts === 6) return 30;
    if (attempts === 7) return 120;
    return 1440;
  }
  if (type === 'otp') {
    if (attempts < 3) return 0;
    if (attempts === 3) return 10;
    if (attempts === 4) return 30;
    if (attempts === 5) return 120;
    return 1440;
  }
  return 0;
}

/**
 * =========================
 * EXISTING USER CHECK
 * =========================
 */
export function handleExistingUser(existingUser: any, lang: string) {
  if (existingUser.status === 'ACTIVE') {
    throw new ConflictException(AUTH_MESSAGES.USER_EXISTS[lang]);
  }
  if (existingUser.status === 'PENDING') {
    return true; // signal OTP resend required
  }
  return false;
}

export async function updateFailedAttempts(
  prisma: PrismaClient,
  userId: string,
  currentAttempts: number,
  type: 'login' | 'otp',
) {
  const newAttempts = (currentAttempts ?? 0) + 1;
  const lockMinutes = calculateLockMinutes(newAttempts, type);

  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: newAttempts,
      lockUntil:
        lockMinutes > 0 ? new Date(Date.now() + lockMinutes * 60 * 1000) : null,
    },
  });

  return { newAttempts, lockMinutes };
}

export async function resetFailedAttempts(
  prisma: PrismaClient,
  userId: string,
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockUntil: null,
    },
  });
}
