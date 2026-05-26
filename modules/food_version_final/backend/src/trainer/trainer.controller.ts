import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { TrainerService } from './trainer.service';
import { NotificationService } from './notification.service';
import { TrafficLightLevel } from './notification-template.entity';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, Public } from '../common/guards/auth.guard';
import { UserRole } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@ApiTags('Trainer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trainer')
export class TrainerController {
  constructor(
    private trainerService: TrainerService,
    private notificationService: NotificationService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER)
  @Get('my-code')
  @ApiOperation({ summary: 'Ver mi código de entrenador' })
  getMyCode(@CurrentUser() user: any) {
    return this.trainerService.getMyTrainerCode(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER)
  @Get('my-gym')
  @ApiOperation({ summary: 'Ver mi gimnasio actual' })
  getMyGym(@CurrentUser() user: any) {
    return this.trainerService.getMyGym(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER)
  @Post('join-gym-by-code')
  @ApiOperation({ summary: 'Asociarse a gimnasio por código' })
  joinGymByCode(@CurrentUser() user: any, @Body('gymCode') gymCode: string) {
    return this.trainerService.joinGymByCode(user.id, gymCode);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER)
  @Post('leave-gym')
  @ApiOperation({ summary: 'Desvincularse de gimnasio' })
  leaveGym(@CurrentUser() user: any) {
    return this.trainerService.leaveGym(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('students')
  @ApiOperation({ summary: 'Listar asesorados' })
  getStudents(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('trafficLight') trafficLight?: string,
  ) {
    return this.trainerService.getStudents(user.id, { search, trafficLight });
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('students/:id/logs')
  @ApiOperation({ summary: 'Ver logs de asesorado' })
  getStudentLogs(@CurrentUser() user: any, @Param('id') sid: string, @Query('date') date?: string) {
    return this.trainerService.getStudentLogs(user.id, sid, date);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER)
  @Delete('students/:id')
  @ApiOperation({ summary: 'Desvincular asesorado' })
  removeStudent(@CurrentUser() user: any, @Param('id') sid: string) {
    return this.trainerService.removeStudent(user.id, sid);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('students/:id/reminder')
  @ApiOperation({ summary: 'Enviar recordatorio' })
  sendReminder(@CurrentUser() user: any, @Param('id') sid: string, @Body('message') message: string) {
    return this.trainerService.sendReminder(user.id, sid, message, null);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER)
  @Post('students/:id/meet')
  @ApiOperation({ summary: 'Enviar invitación Jitsi Meet' })
  sendMeet(@CurrentUser() user: any, @Param('id') sid: string) {
    return this.trainerService.sendMeetInvite(user.id, sid);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('students/:id/notes')
  @ApiOperation({ summary: 'Enviar nota al asesorado' })
  sendNote(@CurrentUser() user: any, @Param('id') sid: string, @Body('message') message: string) {
    return this.trainerService.sendNote(user.id, sid, message);
  }

  @Get('notes/my')
  @ApiOperation({ summary: 'Ver mis notas del entrenador' })
  getMyNotes(@CurrentUser() user: any) {
    return this.trainerService.getMyNotes(user.id);
  }

  @Post('notes/read')
  @ApiOperation({ summary: 'Marcar notas como leídas' })
  markRead(@CurrentUser() user: any) {
    return this.trainerService.markNotesRead(user.id);
  }

  @Get('notes/unread-count')
  @ApiOperation({ summary: 'Cantidad de notas no leídas' })
  unreadCount(@CurrentUser() user: any) {
    return this.trainerService.getUnreadCount(user.id);
  }

  @Post('link-by-code')
  @ApiOperation({ summary: 'Usuario se vincula a entrenador por código' })
  linkByCode(@CurrentUser() user: any, @Body('trainerCode') trainerCode: string) {
    return this.trainerService.linkToTrainerByCode(user.id, trainerCode);
  }

  @Delete('unlink')
  @ApiOperation({ summary: 'Usuario se desvincula de su entrenador' })
  unlink(@CurrentUser() user: any) {
    return this.trainerService.unlinkFromTrainer(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('students/:id/activity')
  @ApiOperation({ summary: 'Actividad reciente del asesorado' })
  getStudentActivity(@CurrentUser() user: any, @Param('id') sid: string) {
    return this.trainerService.getStudentActivity(user.id, sid);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('students/:id/note-history')
  @ApiOperation({ summary: 'Historial de notas enviadas al asesorado' })
  getNoteHistory(@CurrentUser() user: any, @Param('id') sid: string) {
    return this.trainerService.getStudentNoteHistory(user.id, sid);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('students/:id/weight-progress')
  @ApiOperation({ summary: 'Progreso de peso del asesorado' })
  getWeightProgress(@CurrentUser() user: any, @Param('id') sid: string) {
    return this.trainerService.getStudentWeightProgress(user.id, sid);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER)
  @Post('cv/upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir hoja de vida PDF' })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: '/app/uploads/cv',
      filename: (_req, file, cb) => cb(null, `cv-${Date.now()}${extname(file.originalname)}`),
    }),
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== 'application/pdf') return cb(new Error('Solo PDF'), false);
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadCv(@CurrentUser() user: any, @UploadedFile() file: any) {
    const trainer = await this.userRepo.findOne({ where: { id: user.id } });
    trainer.cvUrl = `/api/v1/trainer/cv/${file.filename}`;
    await this.userRepo.save(trainer);
    return { cvUrl: trainer.cvUrl, message: 'Hoja de vida subida exitosamente' };
  }

  @Public()
  @Get('cv/:filename')
  getCv(@Param('filename') filename: string, @Res() res: any) {
    return res.sendFile(join('/app/uploads/cv', filename));
  }

  // ── Notification templates ──
  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER)
  @Get('notification-templates')
  @ApiOperation({ summary: 'Ver plantillas de notificación' })
  getTemplates(@CurrentUser() user: any) {
    return this.notificationService.getTemplates(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER)
  @Post('notification-templates')
  @ApiOperation({ summary: 'Guardar plantilla de notificación' })
  saveTemplate(@CurrentUser() user: any, @Body() dto: any) {
    return this.notificationService.saveTemplate(user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER)
  @Delete('notification-templates/:level')
  @ApiOperation({ summary: 'Eliminar plantilla' })
  deleteTemplate(@CurrentUser() user: any, @Param('level') level: TrafficLightLevel) {
    return this.notificationService.deleteTemplate(user.id, level);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER)
  @Post('notification-templates/trigger')
  @ApiOperation({ summary: 'Disparar notificaciones manualmente' })
  triggerNotifications(@CurrentUser() user: any) {
    return this.notificationService.triggerForTrainer(user.id);
  }

  // ── Note replies ──
  @Post('notes/:id/reply')
  @ApiOperation({ summary: 'Usuario responde una nota' })
  replyNote(@CurrentUser() user: any, @Param('id') noteId: string, @Body('message') message: string) {
    return this.trainerService.replyToNote(user.id, noteId, message);
  }

  @Get('notes/:id/thread')
  @ApiOperation({ summary: 'Ver hilo de una nota' })
  getNoteThread(@CurrentUser() user: any, @Param('id') noteId: string) {
    return this.trainerService.getNoteThread(user.id, noteId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER)
  @Get('students/:id/replies')
  @ApiOperation({ summary: 'Ver respuestas del asesorado' })
  getStudentReplies(@CurrentUser() user: any, @Param('id') sid: string) {
    return this.trainerService.getTrainerReplies(user.id, sid);
  }
}
