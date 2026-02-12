<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).





============================================================================================================================






















Keling, senior level uchun ushbu schemani optimallashtirish bo'yicha bir nechta yondashuvlarni ko'rib chiqamiz.

## Asosiy muammolar va yechimlar:

### 1. **Ortiqcha analytics jadvallar**
```prisma
// ❌ Olib tashlash kerak
model UserAnalyticsDaily { ... }
model UserAnalyticsMonthly { ... }
```

**Sabab:** Analytics ma'lumotlarni runtime'da hisoblash yoki alohida analytics service'ga ko'chirish yaxshiroq. Database'da saqlash ortiqcha.

### 2. **CalendarDay jadvali**
```prisma
// ❌ Olib tashlash kerak  
model CalendarDay { ... }
```

**Sabab:** Bu ma'lumotlarni TaskLog va HabitLog'lardan query qilish orqali olish mumkin.

### 3. **HabitInsight jadvali**
```prisma
// ❌ Olib tashlash kerak
model HabitInsight { ... }
```

**Sabab:** Success rate'larni HabitLog'dan hisoblash mumkin. Computed data database'da saqlanmasligi kerak.

### 4. **UserTimeSession jadvali**
```prisma
// ❌ Olib tashlash kerak
model UserTimeSession { ... }
```

**Sabab:** Agar frontend'da user activity tracking kerak bo'lsa, buni Redis yoki analytics tool bilan hal qilish yaxshiroq.

### 5. **UserActivityLog jadvali**
```prisma
// ❌ Olib tashlash kerak  
model UserActivityLog { ... }
```

**Sabab:** Audit logging uchun alohida logging service (ELK, Datadog) ishlatish kerak.

## Optimallashtirilgan schema:

```prisma
// Minimal, production-ready schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

////////////////////
/// ENUMS
////////////////////

enum UserStatus {
  ACTIVE
  INACTIVE
  BANNED
}

enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}

enum TaskRepeatType {
  ONCE
  DAILY
  WEEKLY
  MONTHLY
  YEARLY
}

enum TaskLogStatus {
  DONE
  MISSED
  SKIPPED
}

enum SubscriptionPlan {
  FREE
  PRO
  ELITE
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
}

enum NotificationType {
  TASK_REMINDER
  HABIT_REMINDER
  SYSTEM
}

////////////////////
/// USER & AUTH
////////////////////

model User {
  id                    String      @id @db.Char(36)
  fullName              String      @db.VarChar(100)
  username              String      @unique @db.VarChar(50)
  email                 String      @unique @db.VarChar(150)
  phoneNumber           String?     @db.VarChar(20)
  password              String      @db.Text
  avatarUrl             String?
  role                  UserRole    @default(USER)
  status                UserStatus  @default(ACTIVE)
  timezone              String?     @db.VarChar(50)
  locale                String?     @db.VarChar(10)
  theme                 String?     @db.VarChar(10)
  weekStartDay          String?     @db.VarChar(10)
  onboardingCompleted   Boolean     @default(false)
  isActive              Boolean     @default(true)
  otpCode               String?
  otpExpiresAt          DateTime?
  hashedRefreshToken    String?
  birthDate             BigInt
  lastLoginAt           DateTime?
  lastActiveAt          DateTime?
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  // Relations
  tasks                 Task[]
  habits                Habit[]
  goals                 Goal[]
  taskLogs              TaskLog[]
  habitLogs             HabitLog[]
  notifications         UserNotification[]
  subscription          Subscription?
  payments              Payment[]

  @@index([email])
  @@index([username])
  @@map("users")
}

////////////////////
/// TASK SYSTEM
////////////////////

model Task {
  id                  String          @id @db.Char(36)
  userId              String          @db.Char(36)
  title               String          @db.VarChar(200)
  description         String?         @db.Text
  type                String?         @db.VarChar(20)
  priority            String?         @db.VarChar(10)
  status              String?         @db.VarChar(15)
  repeatType          TaskRepeatType  @default(ONCE)
  repeatConfig        Json?
  startAt             DateTime?
  endAt               DateTime?
  dueDate             DateTime?
  estimatedDuration   Int?
  actualDuration      Int?
  energyLevelRequired String?
  context             String?
  completionRate      Float?
  archivedAt          DateTime?
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  // Relations
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs        TaskLog[]
  goalTasks   GoalTask[]

  @@index([userId])
  @@index([dueDate])
  @@index([status])
  @@map("tasks")
}

model TaskLog {
  id         String        @id @db.Char(36)
  taskId     String        @db.Char(36)
  userId     String        @db.Char(36)
  date       DateTime
  status     TaskLogStatus
  timeSpent  Int?
  note       String?
  createdAt  DateTime      @default(now())

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
  @@index([taskId])
  @@map("task_logs")
}

////////////////////
/// HABIT SYSTEM
////////////////////

model Habit {
  id              String    @id @db.Char(36)
  userId          String    @db.Char(36)
  title           String    @db.VarChar(150)
  frequency       String?
  targetDays      Int?
  goalCount       Int?
  currentStreak   Int       @default(0)
  bestStreak      Int       @default(0)
  reminderTime    String?
  motivationText  String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user   User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs   HabitLog[]

  @@index([userId])
  @@map("habits")
}

model HabitLog {
  id        String   @id @db.Char(36)
  habitId   String   @db.Char(36)
  userId    String   @db.Char(36)
  logDate   DateTime
  status    String?
  createdAt DateTime @default(now())

  habit Habit @relation(fields: [habitId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, logDate])
  @@index([habitId])
  @@map("habit_logs")
}

////////////////////
/// GOALS
////////////////////

model Goal {
  id        String    @id @db.Char(36)
  userId    String    @db.Char(36)
  title     String    @db.VarChar(200)
  type      String?
  startDate DateTime?
  endDate   DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  goalTasks GoalTask[]

  @@index([userId])
  @@map("goals")
}

model GoalTask {
  goalId String @db.Char(36)
  taskId String @db.Char(36)

  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@id([goalId, taskId])
  @@map("goal_tasks")
}

////////////////////
/// MONETIZATION
////////////////////

model Subscription {
  id          String           @id @db.Char(36)
  userId      String           @unique @db.Char(36)
  plan        SubscriptionPlan @default(FREE)
  startsAt    DateTime
  endsAt      DateTime?
  autoRenew   Boolean          @default(false)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}

model Payment {
  id            String        @id @db.Char(36)
  userId        String        @db.Char(36)
  amount        Float
  currency      String        @db.VarChar(3)
  provider      String        @db.VarChar(50)
  status        PaymentStatus
  transactionId String        @unique
  createdAt     DateTime      @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([transactionId])
  @@map("payments")
}

////////////////////
/// NOTIFICATIONS
////////////////////

model UserNotification {
  id        String           @id @db.Char(36)
  userId    String           @db.Char(36)
  type      NotificationType
  schedule  String?
  enabled   Boolean          @default(true)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("user_notifications")
}
```

## Senior-level yaxshilanishlar:

### ✅ Qo'shilgan:
1. **`updatedAt`** - barcha asosiy modellarga
2. **Indexes** - tez-tez query qilinadigan fieldlarga
3. **Unique constraints** - data integrity uchun
4. **Field validations** - VARCHAR length'lar

### ❌ Olib tashlangan:
1. UserAnalyticsDaily/Monthly
2. CalendarDay
3. HabitInsight
4. UserTimeSession
5. UserActivityLog

### 💡 Qanday analytics olish:

```typescript
// Service layer'da analytics compute qilish
class AnalyticsService {
  async getDailyStats(userId: string, date: Date) {
    const taskLogs = await prisma.taskLog.findMany({
      where: { userId, date }
    });
    
    const habitLogs = await prisma.habitLog.findMany({
      where: { userId, logDate: date }
    });
    
    return {
      focusScore: this.calculateFocusScore(taskLogs),
      completedTasks: taskLogs.filter(t => t.status === 'DONE').length,
      habitScore: this.calculateHabitScore(habitLogs)
    };
  }
}
```

Bu yondashuv senior level uchun to'g'riroq, chunki:
- Database minimal va clean
- Analytics on-demand hisoblanadi
- Caching Redis'da bo'ladi
- Scaling oson
