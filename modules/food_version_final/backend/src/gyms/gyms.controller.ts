import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GymsService } from './gyms.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, Public } from '../common/guards/auth.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Gyms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gyms')
export class GymsController {
  constructor(private gymsService: GymsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar gimnasios' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.gymsService.findAll(page, limit);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear gimnasio' })
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.gymsService.create(dto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener gimnasio' })
  findOne(@Param('id') id: string) {
    return this.gymsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar gimnasio' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.gymsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Eliminar gimnasio' })
  remove(@Param('id') id: string) {
    return this.gymsService.remove(id);
  }

  @Post('join')
  @ApiOperation({ summary: 'Unirse a un gimnasio con código' })
  join(@Body('gymCode') gymCode: string, @CurrentUser() user: any) {
    return this.gymsService.join(user.id, gymCode);
  }

  @Get(':id/trainers')
  @ApiOperation({ summary: 'Listar entrenadores de un gimnasio' })
  getTrainers(@Param('id') id: string) {
    return this.gymsService.getTrainers(id);
  }
}
