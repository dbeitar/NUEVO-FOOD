import {
  Controller, Get, Post, Delete, Patch, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MeasurementsService } from './measurements.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Measurements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('measurements')
export class MeasurementsController {
  constructor(private svc: MeasurementsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar medidas corporales' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('photos', 4, {
    storage: diskStorage({
      destination: '/app/uploads/measurements',
      filename: (_req, file, cb) => cb(null, `meas-${Date.now()}${extname(file.originalname)}`),
    }),
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/image\/(jpeg|png|webp|heic|heif|jpg)/)) return cb(new Error('Solo imágenes'), false);
      cb(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async save(@CurrentUser() user: any, @Body() dto: any, @UploadedFiles() photos?: any[]) {
    const urls = (photos || []).map(p => `/uploads/measurements/${p.filename}`);
    return this.svc.save(user.id, dto, urls[0], urls[1], urls[2], urls[3]);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historial de medidas del usuario' })
  getHistory(@CurrentUser() user: any, @Query('limit') limit?: number) {
    return this.svc.getHistory(user.id, limit);
  }

  @Get('photo/:filename')
  @ApiOperation({ summary: 'Ver foto de medidas' })
  getPhoto(@Param('filename') filename: string, @Param() _p: any, res: any) {
    const { join } = require('path');
    const { createReadStream } = require('fs');
    const path = join('/app/uploads/measurements', filename);
    return createReadStream(path);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER)
  @Get('student/:studentId')
  @ApiOperation({ summary: 'Entrenador ve medidas de asesorado' })
  getStudentHistory(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.svc.getStudentHistory(user.id, studentId);
  }

  @Post('reminder/send')
  @ApiOperation({ summary: 'Enviar recordatorio de medidas' })
  sendReminder(@CurrentUser() user: any) {
    return this.svc.sendWeeklyReminder(user.id);
  }

  @Post('reminder/toggle')
  @ApiOperation({ summary: 'Activar/desactivar recordatorio semanal' })
  toggleReminder(@CurrentUser() user: any, @Body('enabled') enabled: boolean) {
    return this.svc.toggleWeeklyReminder(user.id, enabled);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('reminder/config')
  @ApiOperation({ summary: 'Ver config de recordatorio de medidas' })
  getReminderConfig(@CurrentUser() user: any) {
    return this.svc.getReminderConfig(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('reminder/config')
  @ApiOperation({ summary: 'Guardar config de recordatorio de medidas' })
  saveReminderConfig(@CurrentUser() user: any, @Body() dto: any) {
    return this.svc.saveReminderConfig(user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('reminder/send-to-students')
  @ApiOperation({ summary: 'Enviar recordatorio de medidas a asesorados' })
  sendReminderToStudents(@CurrentUser() user: any) {
    return this.svc.sendReminderToStudents(user.id);
  }


  @Get('reminder/trainer-config')
  @ApiOperation({ summary: 'Config de recordatorio del entrenador para este usuario' })
  getTrainerReminderConfig(@CurrentUser() user: any) {
    return this.svc.getTrainerReminderConfigForUser(user.id);
  }


  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete('student/measurement/:id')
  @ApiOperation({ summary: 'Entrenador elimina medición de asesorado' })
  deleteMeasurement(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.deleteMeasurement(user.id, id);
  }


  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar medición propia' })
  deleteOwnMeasurement(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.deleteOwnMeasurement(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar medición propia' })
  updateMeasurement(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updateMeasurement(user.id, id, dto);
  }
}