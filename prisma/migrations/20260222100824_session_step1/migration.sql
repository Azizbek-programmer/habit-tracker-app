/*
  Warnings:

  - You are about to drop the column `avatarUrl` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `birthDate` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `hashedRefreshToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastActiveAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `locale` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `onboardingCompleted` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `otpAttempts` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `otpBlockedUntil` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `otpCode` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `otpExpiresAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `theme` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `weekStartDay` on the `users` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserStatus" ADD VALUE 'PENDING';
ALTER TYPE "UserStatus" ADD VALUE 'SUSPENDED';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "avatarUrl",
DROP COLUMN "birthDate",
DROP COLUMN "hashedRefreshToken",
DROP COLUMN "isVerified",
DROP COLUMN "lastActiveAt",
DROP COLUMN "lastLoginAt",
DROP COLUMN "locale",
DROP COLUMN "onboardingCompleted",
DROP COLUMN "otpAttempts",
DROP COLUMN "otpBlockedUntil",
DROP COLUMN "otpCode",
DROP COLUMN "otpExpiresAt",
DROP COLUMN "theme",
DROP COLUMN "timezone",
DROP COLUMN "weekStartDay",
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshFamilyId" TEXT NOT NULL,
    "hashedRefreshToken" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "otpCode" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "otpBlockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_refreshFamilyId_idx" ON "UserSession"("refreshFamilyId");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
