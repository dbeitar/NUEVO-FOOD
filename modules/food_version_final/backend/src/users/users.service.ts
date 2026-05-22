// users.service.ts
import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { User, UserRole } from './entities/user.entity';
import { MailService } from '../common/mail.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private mailService: MailService,
  ) {}

  async findAll(filters: { role?: string; gymId?: string; trainerId?: string; search?: string; page?: any; limit?: any }) {
    const { role, gymId, trainerId, search } = filters;
    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, parseInt(filters.limit) || 20);
    const qb = this.userRepo.createQueryBuilder('u')
      .leftJoinAndSelect('u.gym', 'gym')
      .where('u.deleted_at IS NULL');

    if (role) qb.andWhere('u.role = :role', { role });
    if (gymId) qb.andWhere('u.gym_id = :gymId', { gymId });
    if (trainerId) qb.andWhere('u.trainer_id = :trainerId', { trainerId });
    if (search) qb.andWhere('(u.first_name ILIKE :s OR u.last_name ILIKE :s OR u.email ILIKE :s)', { s: `%${search}%` });

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Enrich with subscription data
    const enriched = await Promise.all(data.map(async (u) => {
      try {
        const sub = await this.userRepo.manager.query(
          `SELECT s.status, s.end_date, p.display_name as plan_name, p.name as plan_type
           FROM subscriptions s
           JOIN plans p ON p.id = s.plan_id
           WHERE s.user_id = $1 AND s.status = 'ACTIVE'
           ORDER BY s.created_at DESC LIMIT 1`,
          [u.id]
        );
        const subscription = sub[0] || null;
        let daysLeft = null;
        if (subscription?.end_date) {
          const end = new Date(subscription.end_date);
          const today = new Date();
          daysLeft = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        }
        // Get trainer and gym info
        const trainerGym = await this.userRepo.manager.query(
          `SELECT t.first_name as "trainerFirstName", t.last_name as "trainerLastName",
                  g.name as "gymName"
           FROM users u
           LEFT JOIN users t ON t.id = u.trainer_id
           LEFT JOIN gyms g ON g.id = u.gym_id
           WHERE u.id = $1`, [u.id]
        );
        const tg = trainerGym[0] || {};
        return { ...u, subscription: subscription ? { ...subscription, daysLeft } : null,
          trainerFirstName: tg.trainerFirstName, trainerLastName: tg.trainerLastName,
          gymName: tg.gymName };
      } catch {
        return { ...u, subscription: null };
      }
    }));

    return { data: enriched, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id, deletedAt: null },
      relations: ['gym', 'trainer', 'trainer.gym'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(dto: any, createdBy: User) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El correo ya está registrado');

    const tempPassword = dto.password || Math.random().toString(36).slice(-8) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Generate trainer code if role is TRAINER
    let trainerCode = undefined;
    if (dto.role === UserRole.TRAINER) {
      trainerCode = await this.generateUniqueTrainerCode();
    }

    const userEntity = this.userRepo.create({ ...dto, passwordHash, trainerCode });
    const user = await this.userRepo.save(userEntity) as unknown as User;

    this.mailService.sendCredentialsEmail(user.email, user.firstName, tempPassword).catch(console.error);
    return user;
  }

  async update(id: string, dto: any, requestingUser: User) {
    const user = await this.findOne(id);

    if (requestingUser.role === UserRole.USER && requestingUser.id !== id) {
      throw new ForbiddenException();
    }
    if (requestingUser.role === UserRole.ADMIN && user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException();
    }

    // Generate trainer code if role is being changed to TRAINER
    if (dto.role === UserRole.TRAINER && !user.trainerCode) {
      dto.trainerCode = await this.generateUniqueTrainerCode();
    }

    // Hash password if provided
    if (dto.password) {
      const bcrypt = require('bcrypt');
      user.passwordHash = await bcrypt.hash(dto.password, 12);
      delete dto.password;
    }

    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  private async generateUniqueTrainerCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      code = 'TRN-' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (await this.userRepo.findOne({ where: { trainerCode: code } }));
    return code;
  }

  async remove(id: string, requestingUser: User) {
    const user = await this.findOne(id);
    if (user.isProtected) throw new ForbiddenException('Este usuario no puede ser eliminado');
    if (user.id === requestingUser.id) throw new ForbiddenException('No puedes eliminarte a ti mismo');

    user.deletedAt = new Date();
    user.isActive = false;
    return this.userRepo.save(user);
  }

  async assignTrainer(userId: string, trainerId: string) {
    const user = await this.findOne(userId);
    const trainer = await this.findOne(trainerId);
    if (trainer.role !== UserRole.TRAINER) throw new ForbiddenException('El usuario no es un entrenador');
    user.trainerId = trainerId;
    return this.userRepo.save(user);
  }

  async joinGym(userId: string, gymCode: string) {
    const user = await this.findOne(userId);
    const { Gym } = require('../gyms/entities/gym.entity');
    // Handled in gym service
    return user;
  }

  async exportToExcel(filters: any): Promise<Buffer> {
    const { data } = await this.findAll({ ...filters, limit: 10000 });
    const rows = data.map(u => ({
      'ID': u.id,
      'Nombre': u.firstName,
      'Apellido': u.lastName,
      'Email': u.email,
      'Teléfono': u.phone || '',
      'Cédula': u.idNumber || '',
      'Rol': u.role,
      'Gimnasio': u.gym?.name || '',
      'Activo': u.isActive ? 'Sí' : 'No',
      'Creado': u.createdAt?.toLocaleDateString('es-CO') || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }


  async exportByTrainer() {
    const trainers = await this.userRepo.find({ where: { role: UserRole.TRAINER, deletedAt: null } });
    const rows: any[] = [];
    for (const trainer of trainers) {
      const students = await this.userRepo.manager.query(`
        SELECT u.first_name, u.last_name, u.email, u.phone, u.is_active,
               s.end_date, p.display_name as plan_name
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'ACTIVE'
        LEFT JOIN plans p ON p.id = s.plan_id
        WHERE u.trainer_id = $1 AND u.deleted_at IS NULL
      `, [trainer.id]);
      for (const s of students) {
        const daysLeft = s.end_date ? Math.max(0, Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86400000)) : null;
        rows.push({
          'Entrenador': `${trainer.firstName} ${trainer.lastName}`,
          'Email Entrenador': trainer.email,
          'Asesorado': `${s.first_name} ${s.last_name}`,
          'Email Asesorado': s.email,
          'Teléfono': s.phone || '',
          'Plan': s.plan_name || 'Sin plan',
          'Días restantes': daysLeft ?? '',
          'Estado': s.is_active ? 'Activo' : 'Inactivo',
        });
      }
      if (students.length === 0) {
        rows.push({ 'Entrenador': `${trainer.firstName} ${trainer.lastName}`, 'Email Entrenador': trainer.email, 'Asesorado': 'Sin asesorados', 'Email Asesorado': '', 'Teléfono': '', 'Plan': '', 'Días restantes': '', 'Estado': '' });
      }
    }
    return rows;
  }

  async exportByGym() {
    const gyms = await this.userRepo.manager.query(`SELECT id, name, city, country FROM gyms WHERE is_active = true`);
    const rows: any[] = [];
    for (const gym of gyms) {
      const users = await this.userRepo.manager.query(`
        SELECT u.first_name, u.last_name, u.email, u.phone, u.role, u.is_active,
               p.display_name as plan_name
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'ACTIVE'
        LEFT JOIN plans p ON p.id = s.plan_id
        WHERE u.gym_id = $1 AND u.deleted_at IS NULL
      `, [gym.id]);
      for (const u of users) {
        rows.push({
          'Gimnasio': gym.name,
          'Ciudad': gym.city,
          'Nombre': `${u.first_name} ${u.last_name}`,
          'Email': u.email,
          'Teléfono': u.phone || '',
          'Rol': u.role,
          'Plan': u.plan_name || 'Sin plan',
          'Estado': u.is_active ? 'Activo' : 'Inactivo',
        });
      }
    }
    return rows;
  }
}