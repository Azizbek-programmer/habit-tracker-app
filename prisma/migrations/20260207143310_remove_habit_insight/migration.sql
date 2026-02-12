/*
  Warnings:

  - You are about to drop the `habit_insights` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "habit_insights" DROP CONSTRAINT "habit_insights_habitId_fkey";

-- DropTable
DROP TABLE "habit_insights";
