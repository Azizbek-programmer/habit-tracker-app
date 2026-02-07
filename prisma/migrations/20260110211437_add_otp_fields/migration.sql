-- AlterTable
ALTER TABLE "users" ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3);
