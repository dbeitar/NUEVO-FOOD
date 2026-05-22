import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import * as XLSX from 'xlsx';
import { DailyReport } from './daily-report.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DailyReportService {
  constructor(
    @InjectRepository(DailyReport) private reportRepo: Repository<DailyReport>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  // ── User: create or update today's report ──
  async upsertReport(userId: string, dto: Partial<DailyReport>) {
    const reportDate = dto.reportDate || new Date().toISOString().split('T')[0];
    let report = await this.reportRepo.findOne({ where: { userId, reportDate } });

    if (report) {
      Object.assign(report, dto);
      return this.reportRepo.save(report);
    }

    report = this.reportRepo.create({ ...dto, userId, reportDate });
    return this.reportRepo.save(report);
  }

  // ── User: get own reports ──
  async getMyReports(userId: string, from?: string, to?: string) {
    const where: any = { userId };
    if (from && to) {
      where.reportDate = Between(from, to);
    }
    return this.reportRepo.find({
      where,
      order: { reportDate: 'DESC' },
    });
  }

  // ── User: get report by date ──
  async getReportByDate(userId: string, date: string) {
    return this.reportRepo.findOne({ where: { userId, reportDate: date } });
  }

  // ── User: delete a report ──
  async deleteReport(userId: string, id: string) {
    const report = await this.reportRepo.findOne({ where: { id, userId } });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    await this.reportRepo.remove(report);
    return { message: 'Reporte eliminado correctamente' };
  }

  // ── Trainer: get student reports ──
  async getStudentReports(trainerId: string, studentId: string, from?: string, to?: string) {
    const student = await this.userRepo.findOne({ where: { id: studentId, trainerId } });
    if (!student) throw new NotFoundException('Asesorado no encontrado o sin acceso');

    const where: any = { userId: studentId };
    if (from && to) {
      where.reportDate = Between(from, to);
    }
    return this.reportRepo.find({ where, order: { reportDate: 'DESC' } });
  }

  // ── Trainer: export student reports to Excel ──
  async exportStudentReports(trainerId: string, studentId: string, from?: string, to?: string): Promise<Buffer> {
    const student = await this.userRepo.findOne({ where: { id: studentId, trainerId } });
    if (!student) throw new NotFoundException('Asesorado no encontrado o sin acceso');

    const where: any = { userId: studentId };
    if (from && to) {
      where.reportDate = Between(from, to);
    }
    const reports = await this.reportRepo.find({ where, order: { reportDate: 'ASC' } });

    const SCALE_LABELS: Record<string, string> = {
      // Rendimiento
      MUY_MALO: 'Muy malo', MALO: 'Malo', NORMAL: 'Normal', BUENO: 'Bueno', MUY_BUENO: 'Muy bueno',
      // Motivación
      BAJA: 'Baja', ALTA: 'Alta',
      // Hambre
      AUSENTE: 'Ausente', SOPORTABLE: 'Soportable', FUERTE: 'Fuerte', INSOPORTABLE: 'Insoportable',
      // Cansancio
      NADA: 'Nada', POCO: 'Poco', MUCHO: 'Mucho', MUCHISIMO: 'Muchísimo',
      // Estrés
      BAJO: 'Bajo', ALTO: 'Alto', MUY_ALTO: 'Muy alto',
      // Sueño
      MUY_BAJA: 'Muy baja', MUY_ALTA: 'Muy alta',
      // Período
      SI: 'Sí', NO: 'No', RETRASO: 'Retraso', OVULACION: 'Ovulación',
    };

    const translate = (v: string) => (v ? (SCALE_LABELS[v] || v) : '—');

    const rows = reports.map(r => ({
      'Fecha': r.reportDate,
      'Peso (kg)': r.weightKg ?? '—',
      'Rendimiento': translate(r.performance),
      'Motivación': translate(r.motivation),
      'Hambre': translate(r.hunger),
      'Cansancio': translate(r.fatigue),
      'Estrés': translate(r.stress),
      'Horas de sueño': r.sleepHours ?? '—',
      'Calidad del sueño': translate(r.sleepQuality),
      'Regla': r.period ? translate(r.period) : '—',
      'Estado de ánimo': r.mood ? translate(r.mood) : '—',
      'Síntomas': r.symptoms?.length ? r.symptoms.join(', ') : '—',
      'Notas': r.otherNotes || '—',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reportes Diarios');

    // Column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 10 },
      { wch: 16 }, { wch: 30 }, { wch: 40 },
    ];

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }
}
