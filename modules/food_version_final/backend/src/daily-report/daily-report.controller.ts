import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { DailyReportService } from './daily-report.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Daily Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('daily-reports')
export class DailyReportController {
  constructor(private readonly service: DailyReportService) {}

  // ── USER: create / update report ──
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crear o actualizar reporte diario del usuario' })
  upsert(@CurrentUser() user: any, @Body() dto: any) {
    return this.service.upsertReport(user.id, dto);
  }

  // ── USER: get own reports ──
  @Get()
  @ApiOperation({ summary: 'Obtener mis reportes diarios' })
  getMyReports(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getMyReports(user.id, from, to);
  }

  // ── USER: get report for a specific date ──
  @Get('date/:date')
  @ApiOperation({ summary: 'Obtener reporte de una fecha específica' })
  getByDate(@CurrentUser() user: any, @Param('date') date: string) {
    return this.service.getReportByDate(user.id, date);
  }

  // ── USER: delete a report ──
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un reporte diario' })
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteReport(user.id, id);
  }

  // ── TRAINER: get student reports ──
  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('student/:studentId')
  @ApiOperation({ summary: 'Ver reportes diarios de un asesorado' })
  getStudentReports(
    @CurrentUser() user: any,
    @Param('studentId') studentId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getStudentReports(user.id, studentId, from, to);
  }

  // ── TRAINER: export student reports to Excel ──
  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('student/:studentId/export')
  @ApiOperation({ summary: 'Exportar reportes diarios de un asesorado a Excel' })
  async exportStudentReports(
    @CurrentUser() user: any,
    @Param('studentId') studentId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.exportStudentReports(user.id, studentId, from, to);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reportes_diarios_${studentId}.xlsx"`);
    res.send(buffer);
  }
}
