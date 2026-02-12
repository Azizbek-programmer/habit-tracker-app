import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
// import { RefreshTokenStrategy } from './common/strategies/refresh-token.strategy';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [UsersModule, PrismaModule, AuthModule,RedisModule],
  controllers: [AppController],
  providers: [AppService, PrismaService,],
})
export class AppModule {}
