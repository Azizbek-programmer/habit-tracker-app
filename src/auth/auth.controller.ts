import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { Request, Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body() dto: CreateAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.register(dto, res);
  }

  @Post('login')
  login(
    @Body() dto: LoginAuthDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    return this.authService.login(dto, res, req);
  }

  @UseGuards(AuthGuard('refresh-jwt'))
  @Post('refresh')
  refresh(@Req() req, @Res({ passthrough: true }) res: Response) {
    return this.authService.refreshTokens(
      req.user.sub,
      req.user.refreshToken,
      // res,
    );
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies.refreshToken;

    const user = req.user as any;

    const result = await this.authService.logout(user.sub, refreshToken);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    return this.authService.verifyOtp(dto.email, dto.otp, req);
  }
}
