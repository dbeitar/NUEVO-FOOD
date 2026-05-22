// users.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Res, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guard';
import { UserRole } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar todos los usuarios' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'gymId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('role') role?: string,
    @Query('gymId') gymId?: string,
    @Query('trainerId') trainerId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll({ role, gymId, trainerId, search, page, limit });
  }

  @Get('export/excel')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar usuarios a Excel' })
  async exportExcel(@Query() filters: any, @Res() res: Response) {
    const buffer = await this.usersService.exportToExcel(filters);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=usuarios.xlsx');
    res.status(HttpStatus.OK).send(buffer);
  }

  @Get('me')
  @ApiOperation({ summary: 'Obtener usuario autenticado' })
  getMe(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.usersService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.usersService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Eliminar usuario (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.remove(id, user);
  }

  @Post(':id/assign-trainer/:trainerId')
  @ApiOperation({ summary: 'Asignar entrenador a usuario' })
  assignTrainer(@Param('id') id: string, @Param('trainerId') trainerId: string) {
    return this.usersService.assignTrainer(id, trainerId);
  }


  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('export/by-trainer')
  @ApiOperation({ summary: 'Exportar usuarios por entrenador' })
  async exportByTrainer(@Res() res: any) {
    const XLSX = require('xlsx');
    const rows = await this.usersService.exportByTrainer();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Por Entrenador');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=usuarios_por_entrenador.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('export/by-gym')
  @ApiOperation({ summary: 'Exportar usuarios por gimnasio' })
  async exportByGym(@Res() res: any) {
    const XLSX = require('xlsx');
    const rows = await this.usersService.exportByGym();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Por Gimnasio');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=usuarios_por_gimnasio.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  }
}