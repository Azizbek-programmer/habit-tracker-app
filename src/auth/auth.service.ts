import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import type { StringValue } from 'ms';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  // ================= REGISTER + SEND OTP =================
  async register(dto: CreateAuthDto, res: Response) {
    const now = new Date();

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // 1️⃣ PASSWORD HASH
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 2️⃣ USER CREATE
    const user = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        fullName: dto.fullName,
        username: dto.username,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        password: hashedPassword,

        timezone: dto.timezone ?? 'Asia/Tashkent',
        locale: dto.locale ?? 'uz',
        theme: dto.theme ?? 'dark',
        weekStartDay: dto.weekStartDay ?? 'monday',

        birthDate: BigInt(dto.birthDate),
        lastLoginAt: now,
        lastActiveAt: now,
      },
    });

    // 3️⃣ OTP GENERATE
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otp,
        otpExpiresAt: otpExpires,
      },
    });

    // 4️⃣ SEND EMAIL
    await this.mailService.sendOtp(user.email, otp);

    return {
      message: 'User registered. OTP sent to email',
    };
  }

  // ================= VERIFY OTP =================
  async verifyOtp(email: string, otp: string) {
  const user = await this.prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      otpCode: true,
      otpExpiresAt: true,
    },
  });

  if (!user || !user.otpCode || !user.otpExpiresAt) {
    throw new BadRequestException('OTP not found');
  }

  if (user.otpCode !== otp) {
    throw new BadRequestException('Invalid OTP');
  }

  if (user.otpExpiresAt < new Date()) {
    throw new BadRequestException('OTP expired');
  }

  await this.prisma.user.update({
    where: { id: user.id },
    data: {
      otpCode: null,
      otpExpiresAt: null,
    },
  });

  return { message: 'Email verified successfully' };
}


  // ================= LOGIN =================
  async login(dto: LoginAuthDto, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // ACCESS TOKEN
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.ACCESS_TOKEN_KEY!,
      expiresIn: process.env.ACCESS_TOKEN_TIME as StringValue,
    });

    // REFRESH TOKEN
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.REFRESH_TOKEN_KEY!,
      expiresIn: process.env.REFRESH_TOKEN_TIME as StringValue,
    });

    // HASH REFRESH TOKEN
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // DB UPDATE
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        hashedRefreshToken,
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    // COOKIE
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: Number(process.env.COOKIE_TIME),
      sameSite: 'strict',
    });

    return {
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  // ================= REFRESH =================
  async refreshTokens(userId: string, refreshToken: string, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const isValid = await bcrypt.compare(refreshToken, user.hashedRefreshToken);

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.ACCESS_TOKEN_KEY!,
      expiresIn: process.env.ACCESS_TOKEN_TIME as StringValue,
    });

    const newRefreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.REFRESH_TOKEN_KEY!,
      expiresIn: process.env.REFRESH_TOKEN_TIME as StringValue,
    });

    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      maxAge: Number(process.env.COOKIE_TIME),
      sameSite: 'strict',
    });

    return {
      accessToken: newAccessToken,
    };
  }

  // ================= LOGOUT =================
  async logout(userId: string, res: Response) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });

    res.clearCookie('refreshToken');

    return { message: 'Logged out successfully' };
  }
}
