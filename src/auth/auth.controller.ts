import { Body, Controller, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { Request, Response } from 'express';


@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

@Post('register')
register(@Body() dto: CreateAuthDto, @Res({ passthrough: true }) res: Response) {
  return this.authService.register(dto, res);
}


@Post('login')
login(@Body() dto: LoginAuthDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
  return this.authService.login(dto, res, req);
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


@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@UseGuards(AuthGuard('jwt'))
@Post('logout')
logout(@Req() req: Request, @Res() res: Response) {
  if (!req.user?.sub || !req.user?.jti) {
    throw new UnauthorizedException('Invalid token');
  }

  return this.authService.logout(req.user.sub, req.user.jti, res);
}



@Post('verify-otp')
verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
  return this.authService.verifyOtp(dto.email, dto.otp, req);
}




}
