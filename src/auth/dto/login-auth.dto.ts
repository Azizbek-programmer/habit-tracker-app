import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginAuthDto {
  @ApiProperty({ example: 'azizbekmirzavaliyev31@gmail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPassword123@' })
  @IsNotEmpty()
  password!: string;
}
