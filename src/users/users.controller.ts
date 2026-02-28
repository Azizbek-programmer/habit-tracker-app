import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // CREATE
  @Post()
  @ApiOperation({ summary: 'Yangi user yaratish' })
  @ApiResponse({ status: 201, description: 'User muvaffaqiyatli yaratildi' })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  // GET ALL
  @Get()
  @ApiOperation({ summary: 'Userlar ro‘yxatini olish' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Userlar ro‘yxati' })
  findAll(@Query() query: QueryUserDto) {
    return this.userService.findAll(query);
  }

  // GET BY ID
  @Get(':id')
  @ApiOperation({ summary: 'Userni ID orqali olish' })
  @ApiParam({ name: 'id', example: 'clx123abc' })
  @ApiResponse({ status: 200, description: 'Topilgan user' })
  @ApiResponse({ status: 404, description: 'User topilmadi' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  // UPDATE
  @Patch(':id')
  @ApiOperation({ summary: 'Userni yangilash' })
  @ApiParam({ name: 'id', example: 'clx123abc' })
  @ApiResponse({ status: 200, description: 'User yangilandi' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  // DELETE
  @Delete(':id')
  @ApiOperation({ summary: 'Userni o‘chirish' })
  @ApiParam({ name: 'id', example: 'clx123abc' })
  @ApiResponse({ status: 200, description: 'User o‘chirildi' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
