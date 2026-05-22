import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RecipesService } from './recipes.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Recipes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recipes')
export class RecipesController {
  constructor(private readonly service: RecipesService) {}

  // ── All authenticated users: view recipes ──
  @Get()
  @ApiOperation({ summary: 'Listar recetas del Chef Nico' })
  findAll(
    @Query('category') category?: string,
    @Query('objective') objective?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({ category, objective, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de una receta' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // ── SuperAdmin only: manage recipes ──
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Crear nueva receta (Super Admin)' })
  create(@CurrentUser() user: any, @Body() dto: any) {
    return this.service.create(dto, user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar receta (Super Admin)' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar receta (Super Admin)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }


  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('import/excel')
  @ApiOperation({ summary: 'Importar recetas desde Excel (Super Admin)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: '/tmp',
      filename: (_, file, cb) => cb(null, `recipes-import-${Date.now()}${extname(file.originalname)}`),
    }),
  }))
  async importFromExcel(@CurrentUser() user: any, @UploadedFile() file: any) {
    if (!file) throw new Error('No se recibió el archivo');
    return this.service.importFromExcel(file.path, user.id);
  }
}