/*
  Warnings:

  - You are about to drop the `calendar_days` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "calendar_days" DROP CONSTRAINT "calendar_days_userId_fkey";

-- DropTable
DROP TABLE "calendar_days";
