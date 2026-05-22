import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';

function generateTrainerCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'TRN-' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.createSuperAdmin();
    await this.generateMissingTrainerCodes();
  }

  private async createSuperAdmin() {
    try {
      const email = 'superadmin@food-plan.com';
      const existing = await this.userRepo.findOne({ where: { email } });
      const passwordHash = await bcrypt.hash('Admin123!', 12);

      if (existing) {
        existing.passwordHash = passwordHash;
        existing.isProtected = true;
        existing.isActive = true;
        await this.userRepo.save(existing);
        this.logger.log('✅ Super Admin password synced');
        return;
      }

      const superAdmin = this.userRepo.create({
        email,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        isProtected: true,
      });
      await this.userRepo.save(superAdmin);
      this.logger.log('✅ Super Admin created');
    } catch (err) {
      this.logger.error('Failed to create super admin:', err.message);
    }
  }

  private async generateMissingTrainerCodes() {
    try {
      const trainers = await this.userRepo.find({
        where: { role: UserRole.TRAINER },
      });
      for (const trainer of trainers) {
        if (!trainer.trainerCode) {
          let code = generateTrainerCode();
          // Ensure unique
          while (await this.userRepo.findOne({ where: { trainerCode: code } })) {
            code = generateTrainerCode();
          }
          trainer.trainerCode = code;
          await this.userRepo.save(trainer);
        }
      }
      if (trainers.length > 0) {
        this.logger.log(`✅ Trainer codes generated for ${trainers.length} trainers`);
      }
    } catch (err) {
      this.logger.error('Failed to generate trainer codes:', err.message);
    }
  }
}

export { generateTrainerCode };
