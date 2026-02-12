/*
  Warnings:

  - You are about to drop the `user_activity_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_activity_logs" DROP CONSTRAINT "user_activity_logs_userId_fkey";

-- DropTable
DROP TABLE "user_activity_logs";
