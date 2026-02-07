import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

@Post('register')
register(@Body() dto: CreateAuthDto, @Res({ passthrough: true }) res: Response) {
  return this.authService.register(dto, res);
}


@Post('login')
login(
  @Body() dto: LoginAuthDto,
  @Res({ passthrough: true }) res: Response,
) {
  return this.authService.login(dto, res);
}

@UseGuards(AuthGuard('refresh-jwt'))
@Post('refresh')
refresh(@Req() req, @Res({ passthrough: true }) res: Response) {
  return this.authService.refreshTokens(
    req.user.sub,
    req.user.refreshToken,
    res,
  );
}


@UseGuards(AuthGuard('access-jwt'))
@Post('logout')
logout(@Req() req, @Res({ passthrough: true }) res: Response) {
  return this.authService.logout(req.user.sub, res);
}

@Post('verify-otp')
verifyOtp(@Body() dto: VerifyOtpDto) {
  return this.authService.verifyOtp(dto.email, dto.otp);
}



}
