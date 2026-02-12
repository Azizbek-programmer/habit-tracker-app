import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsEnum,
  IsNumberString,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

enum Locale {
  UZ = 'uz',
  RU = 'ru',
  EN = 'en',
}

enum WeekStartDay {
  MONDAY = 'monday',
  SUNDAY = 'sunday',
}

export class CreateAuthDto {
  // ================= FULL NAME =================
  @ApiProperty({
    example: 'John Doe',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  fullName!: string;

  // ================= USERNAME =================
  @ApiProperty({
    example: 'john_doe',
    description: 'Only lowercase letters, numbers and underscore',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'username can contain only lowercase letters, numbers and "_"',
  })
  username!: string;

  // ================= EMAIL =================
  @ApiProperty({
    example: 'azizbekmirzavaliyev31@gmail.com',
  })
  @IsEmail()
  email!: string;

  // ================= PASSWORD =================
  @ApiProperty({
    example: 'StrongPassword123@',
    minLength: 8,
    description:
      'Minimum 8 characters, at least 1 letter and 1 number',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password!: string;

  // ================= PHONE =================
  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'Uzbekistan phone number',
  })
  @IsOptional()
  @Matches(/^\+998\d{9}$/, {
    message: 'phoneNumber must be valid Uzbekistan number',
  })
  phoneNumber?: string;

  // ================= TIMEZONE =================
  @ApiPropertyOptional({
    example: 'Asia/Tashkent',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  // ================= LOCALE =================
  @ApiPropertyOptional({
    example: 'uz',
    enum: Locale,
  })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;

  // ================= THEME =================
  @ApiPropertyOptional({
    example: 'dark',
    enum: Theme,
  })
  @IsOptional()
  @IsEnum(Theme)
  theme?: Theme;

  // ================= WEEK START =================
  @ApiPropertyOptional({
    example: 'monday',
    enum: WeekStartDay,
  })
  @IsOptional()
  @IsEnum(WeekStartDay)
  weekStartDay?: WeekStartDay;

  // ================= BIRTH DATE =================
  @ApiProperty({
    example: '946684800000',
    description: 'Birth date as timestamp (milliseconds)',
  })
  @IsNumberString()
  birthDate!: string;

  hashedRefreshToken!: string
}
