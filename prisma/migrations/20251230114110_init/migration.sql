-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "TaskRepeatType" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "TaskLogStatus" AS ENUM ('DONE', 'MISSED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO', 'ELITE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK_REMINDER', 'HABIT_REMINDER', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" CHAR(36) NOT NULL,
    "fullName" VARCHAR(100) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phoneNumber" VARCHAR(20),
    "password" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" VARCHAR(50),
    "locale" VARCHAR(10),
    "theme" VARCHAR(10),
    "weekStartDay" VARCHAR(10),
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "birthDate" BIGINT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" CHAR(36) NOT NULL,
    "userId" CHAR(36) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(20),
    "priority" VARCHAR(10),
    "status" VARCHAR(15),
    "repeatType" "TaskRepeatType" NOT NULL DEFAULT 'ONCE',
    "repeatConfig" JSONB,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "estimatedDuration" INTEGER,
    "actualDuration" INTEGER,
    "energyLevelRequired" TEXT,
    "context" TEXT,
    "completionRate" DOUBLE PRECISION,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_logs" (
    "id" CHAR(36) NOT NULL,
    "taskId" CHAR(36) NOT NULL,
    "userId" CHAR(36) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "TaskLogStatus" NOT NULL,
    "timeSpent" INTEGER,
    "note" TEXT,

    CONSTRAINT "task_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habits" (
    "id" CHAR(36) NOT NULL,
    "userId" CHAR(36) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "frequency" TEXT,
    "targetDays" INTEGER,
    "goalCount" INTEGER,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "reminderTime" TEXT,
    "motivationText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_logs" (
    "id" CHAR(36) NOT NULL,
    "habitId" CHAR(36) NOT NULL,
    "userId" CHAR(36) NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT,

    CONSTRAINT "habit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_insights" (
    "id" CHAR(36) NOT NULL,
    "habitId" CHAR(36) NOT NULL,
    "weekSuccessRate" INTEGER,
    "monthSuccessRate" INTEGER,
    "dropReason" TEXT,

    CONSTRAINT "habit_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" CHAR(36) NOT NULL,
    "userId" CHAR(36) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "type" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_tasks" (
    "goalId" CHAR(36) NOT NULL,
    "taskId" CHAR(36) NOT NULL,

    CONSTRAINT "goal_tasks_pkey" PRIMARY KEY ("goalId","taskId")
);

-- CreateTable
CREATE TABLE "user_time_sessions" (
    "id" CHAR(36) NOT NULL,
    "userId" CHAR(36) NOT NULL,
    "sessionStart" TIMESTAMP(3) NOT NULL,
    "sessionEnd" TIMESTAMP(3),
    "activeDuration" INTEGER,
    "idleDuration" INTEGER,

    CONSTRAINT "user_time_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_days" (
    "id" CHAR(36) NOT NULL,
    "userId" CHAR(36) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "completedTasks" INTEGER,
    "missedTasks" INTEGER,
    "habitScore" INTEGER,
    "moodScore" INTEGER,

    CONSTRAINT "calendar_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_analytics_daily" (
    "id" CHAR(36) NOT NULL,
    "userId" CHAR(36) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "focusScore" INTEGER,
    "disciplineScore" INTEGER,
    "consistencyScore" INTEGER,
    "burnoutRisk" INTEGER,

    CONSTRAINT "user_analytics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_analytics_monthly" (
    "id" CHAR(36) NOT NULL,
    "userId" CHAR(36) NOT NULL,
    "month" TEXT NOT NULL,
    "productivityTrend" TEXT,
    "habitStability" INTEGER,
    "bestDayOfWeek" TEXT,
    "worstDayOfWeek" TEXT,

    CONSTRAINT "user_analytics_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" CHAR(36) NOT NULL,
    "userId" CHAR(36) NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" CHAR(36) NOT NULL,
    "userId" CHAR(36) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" CHAR(36) NOT NULL,
    "userId" CHAR(36) NOT NULL,
    "type" "NotificationType" NOT NULL,
    "schedule" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activity_logs" (
    "id" CHAR(36) NOT NULL,
    "userId" CHAR(36) NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "habit_insights_habitId_key" ON "habit_insights"("habitId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_logs" ADD CONSTRAINT "task_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_logs" ADD CONSTRAINT "task_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habits" ADD CONSTRAINT "habits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_insights" ADD CONSTRAINT "habit_insights_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_tasks" ADD CONSTRAINT "goal_tasks_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_tasks" ADD CONSTRAINT "goal_tasks_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_time_sessions" ADD CONSTRAINT "user_time_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_days" ADD CONSTRAINT "calendar_days_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_analytics_daily" ADD CONSTRAINT "user_analytics_daily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_analytics_monthly" ADD CONSTRAINT "user_analytics_monthly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
