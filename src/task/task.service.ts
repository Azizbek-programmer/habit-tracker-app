import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ CREATE
  async create(createTaskDto: CreateTaskDto) {
    try {
      return await this.prisma.task.create({
        data: createTaskDto,
      });
    } catch (error) {
      throw new BadRequestException('Task yaratishda xatolik');
    }
  }

  // ✅ GET ALL (pagination + filtering)
  async findAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
  }) {
    const { page = 1, limit = 10, status, userId } = query;

    const skip = (page - 1) * limit;

    try {
      const [data, total] = await this.prisma.$transaction([
        this.prisma.task.findMany({
          where: {
            status,
            userId,
            archivedAt: null,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.task.count({
          where: {
            status,
            userId,
            archivedAt: null,
          },
        }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          lastPage: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Tasklarni olishda xatolik');
    }
  }

  // ✅ GET ONE
  async findOne(id: string) {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id },
      });

      if (!task) {
        throw new NotFoundException('Task topilmadi');
      }

      return task;
    } catch (error) {
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException();
    }
  }

  // ✅ UPDATE
  async update(id: string, updateTaskDto: UpdateTaskDto) {
    try {
      await this.findOne(id);

      return await this.prisma.task.update({
        where: { id },
        data: updateTaskDto,
      });
    } catch (error) {
      throw error instanceof NotFoundException
        ? error
        : new BadRequestException('Yangilashda xatolik');
    }
  }

  // ✅ DELETE (soft delete)
  async remove(id: string) {
    try {
      await this.findOne(id);

      return await this.prisma.task.update({
        where: { id },
        data: {
          archivedAt: new Date(),
        },
      });
    } catch (error) {
      throw error instanceof NotFoundException
        ? error
        : new BadRequestException('O‘chirishda xatolik');
    }
  }
}
