import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { RefreshTokenStrategy } from 'src/common/strategies/refresh-token.strategy';
import { AccessTokenStrategy } from 'src/common/strategies/access-token-strategy';
import { MailModule } from 'src/mail/mail.module';
import { RedisService } from 'src/redis/redis.service';
import { TokenService } from './utils/token.service';
import { SessionService } from './utils/session.service';
import { RateLimitService } from './utils/rateLimit.service';
import { OtpService } from './utils/otp.service';

@Module({
  imports: [PrismaModule, JwtModule.register({}), MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    RedisService,
    TokenService,
    SessionService,
    RateLimitService,
    OtpService,
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
