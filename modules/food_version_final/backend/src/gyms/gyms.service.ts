// gyms.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gym } from './entities/gym.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class GymsService {
  constructor(
    @InjectRepository(Gym) private gymRepo: Repository<Gym>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code = 'GYM-' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return code;
  }

  private async uniqueCode(): Promise<string> {
    let code = this.generateCode();
    while (await this.gymRepo.findOne({ where: { uniqueCode: code } })) {
      code = this.generateCode();
    }
    return code;
  }

  async create(dto: any, createdBy: string) {
    const uniqueCode = await this.uniqueCode();
    const gym = this.gymRepo.create({ ...dto, uniqueCode, createdBy });
    return this.gymRepo.save(gym);
  }

  async findAll(page: any = 1, limit: any = 20) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(100, parseInt(limit) || 20);
    const [data, total] = await this.gymRepo.findAndCount({
      where: { deletedAt: null, isActive: true },
      skip: (p - 1) * l,
      take: l,
      order: { createdAt: 'DESC' },
    });
    return { data, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  async findOne(id: string) {
    const gym = await this.gymRepo.findOne({ where: { id, deletedAt: null } });
    if (!gym) throw new NotFoundException('Gimnasio no encontrado');
    return gym;
  }

  async update(id: string, dto: any) {
    const gym = await this.findOne(id);
    Object.assign(gym, dto);
    return this.gymRepo.save(gym);
  }

  async remove(id: string) {
    const gym = await this.findOne(id);
    gym.deletedAt = new Date();
    gym.isActive = false;
    return this.gymRepo.save(gym);
  }

  async join(userId: string, gymCode: string) {
    const gym = await this.gymRepo.findOne({ where: { uniqueCode: gymCode, isActive: true } });
    if (!gym) throw new NotFoundException('Código de gimnasio no válido');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.gymId = gym.id;
    await this.userRepo.save(user);
    return { message: 'Te has unido al gimnasio exitosamente', gym };
  }

  async getTrainers(gymId: string) {
    return this.userRepo.find({
      where: { gymId, role: 'TRAINER' as any, isActive: true, deletedAt: null },
      select: ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'idNumber', 'trainerCode'],
    });
  }
}
