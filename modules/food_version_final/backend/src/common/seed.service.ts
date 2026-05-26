import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    await this.createSuperAdmin();
  }

  private async createSuperAdmin() {
    const email = 'superadmin@Foodplan.com';
    const existing = await this.userRepo.findOne({ where: { email } });

    if (!existing) {
      const passwordHash = await bcrypt.hash('Admin123!', 12);
      const admin = this.userRepo.create({
        email,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        isProtected: true,
      });
      await this.userRepo.save(admin);
      this.logger.log('✅ Super Admin creado: superadmin@Foodplan.com / Admin123!');
    } else {
      // Reset password in case hash was wrong
      const passwordHash = await bcrypt.hash('Admin123!', 12);
      existing.passwordHash = passwordHash;
      existing.isProtected = true;
      existing.isActive = true;
      await this.userRepo.save(existing);
      this.logger.log('✅ Super Admin verificado y contraseña sincronizada');
    }
  }
}
