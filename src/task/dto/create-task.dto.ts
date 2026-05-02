import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsNumber,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

enum TaskRepeatType {
  ONCE = 'ONCE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

export class CreateTaskDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ enum: TaskRepeatType })
  @IsEnum(TaskRepeatType)
  repeatType!: TaskRepeatType;

  @ApiPropertyOptional()
  @IsOptional()
  repeatConfig?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDuration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  actualDuration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  energyLevelRequired?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  completionRate?: number;
}
