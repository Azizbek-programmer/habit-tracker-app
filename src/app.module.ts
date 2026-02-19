import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().port().required(),

        DATABASE_URL: Joi.string()
          .uri({ scheme: ['postgresql', 'postgres'] })
          .required(),

        REDIS_URL: Joi.string()
          .uri({ scheme: ['redis', 'rediss'] })
          .required(),

        ACCESS_TOKEN_KEY: Joi.string().min(20).required(),
        REFRESH_TOKEN_KEY: Joi.string().min(20).required(),

        ACCESS_TOKEN_TIME: Joi.string()
          .pattern(/^\d+(s|m|h|d)$/)
          .required(),

        REFRESH_TOKEN_TIME: Joi.string()
          .pattern(/^\d+(s|m|h|d)$/)
          .required(),

        REFRESH_TOKEN_TTL_SEC: Joi.number().integer().min(60).required(),

        COOKIE_TIME: Joi.number().integer().min(1000).required(),

        API_URL: Joi.string()
          .uri({ scheme: ['http', 'https'] })
          .required(),

        smtp_host: Joi.string().required(),
        smtp_port: Joi.number().port().required(),

        smtp_user: Joi.string().email().required(),
        smtp_password: Joi.string().min(8).required(),

        MAIL_FROM: Joi.string().email().required(),
      }).required(),
    }),
    UsersModule,
    PrismaModule,
    AuthModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
