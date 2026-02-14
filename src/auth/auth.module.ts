import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { RefreshTokenStrategy } from 'src/common/strategies/refresh-token.strategy';
import { AccessTokenStrategy } from 'src/common/strategies/access-token-strategy';
import { MailModule } from 'src/mail/mail.module';
import { RedisService } from 'src/redis/redis.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
    MailModule
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    RedisService
  ],
})
export class AuthModule {}

