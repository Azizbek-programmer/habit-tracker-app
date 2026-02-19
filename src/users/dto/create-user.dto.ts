import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'Ali Valiyev' })
  @IsNotEmpty()
  @IsString()
  fullName?: string;

  @ApiProperty({ example: 'ali_99' })
  @IsNotEmpty()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'ali@gmail.com' })
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsNotEmpty()
  password?: string;

  @ApiPropertyOptional({ example: 'https://cdn.site/avatar.png' })
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: 'Asia/Tashkent' })
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: 'uz' })
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({ example: 'dark' })
  @IsOptional()
  theme?: string;

  @ApiPropertyOptional({ example: 'monday' })
  @IsOptional()
  weekStartDay?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;

  @ApiProperty({
    example: '946684800000',
    description: 'Tug‘ilgan sana (timestamp, birthDatestring)',
  })
  @IsNotEmpty()
  birthDate!: string;
}
