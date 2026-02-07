import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { MESSAGES } from 'src/common/message/user/messages';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
  const lang = dto.locale ?? 'uz';

  try {
    // 1️⃣ birthDate tekshiruv
    const birthTimestamp = BigInt(dto.birthDate);
    const now = BigInt(Date.now());

    if (birthTimestamp > now) {
      throw new BadRequestException(MESSAGES.BIRTH_FUTURE[lang]);
    }

    const minDate = BigInt(-2208988800000); // 1900-01-01
    if (birthTimestamp < minDate) {
      throw new BadRequestException(MESSAGES.BIRTH_TOO_OLD[lang]);
    }

    // 2️⃣ username / email tekshirish
    const exists = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email }],
      },
    });

    if (exists) {
      throw new ConflictException(MESSAGES.USER_EXISTS[lang]);
    }

    // 3️⃣ CREATE
    const user = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        ...dto,
        birthDate: birthTimestamp,
      },
    });

    // 4️⃣ RESPONSE
    return {
      statusCode: 201,
      success: true,
      message: MESSAGES.USER_CREATED[lang],
      data: this.serializeUser(user),
    };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw new ConflictException(MESSAGES.USER_EXISTS[lang]);
    }

    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException
    ) {
      throw error;
    }

    throw new InternalServerErrorException(
      MESSAGES.CREATE_FAILED[lang],
    );
  }
}

  // =========================
  // READ ALL
  // =========================
  async findAll(query: QueryUserDto) {
    const { role, status, search } = query;

    const users = await this.prisma.user.findMany({
      where: {
        role,
        status,
        OR: search
          ? [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.serializeUser(user));
  }

  // =========================
  // READ ONE
  // =========================
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.serializeUser(user);
  }

  // =========================
  // UPDATE
  // =========================
  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const data: any = { ...dto };

    if (dto.birthDate) {
      data.birthDate = BigInt(dto.birthDate);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.serializeUser(user);
  }

  // =========================
  // DELETE
  // =========================
  async remove(id: string) {
    await this.findOne(id);

    const user = await this.prisma.user.delete({
      where: { id },
    });

    return this.serializeUser(user);
  }

  // =========================
  // PRIVATE SERIALIZER
  // =========================
  private serializeUser(user: any) {
    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      birthDate: user.birthDate?.toString(),
      createdAt: user.createdAt,
    };
  }
}
