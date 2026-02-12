/*
  Warnings:

  - You are about to drop the `user_analytics_daily` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_analytics_monthly` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_analytics_daily" DROP CONSTRAINT "user_analytics_daily_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_analytics_monthly" DROP CONSTRAINT "user_analytics_monthly_userId_fkey";

-- DropTable
DROP TABLE "user_analytics_daily";

-- DropTable
DROP TABLE "user_analytics_monthly";
