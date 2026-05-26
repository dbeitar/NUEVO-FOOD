import {
  Injectable, UnauthorizedException, NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto } from './dto/auth.dto';
import { ShellExchangeDto } from './dto/shell-auth.dto';
import { ShellProvisionDto } from './dto/shell-auth.dto';
import { TrainingService } from '../training/training.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private trainingService: TrainingService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  private shellSsoSecret() {
    return process.env.TRAINING_SHELL_SSO_SECRET || process.env.JWT_SECRET || 'training_secret';
  }

  private sanitize(user: User) {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  private async tokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }),
      refreshToken: this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase(), isActive: true } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    return { ...(await this.tokens(user)), user: this.sanitize(user) };
  }

  async shellExchange(dto: ShellExchangeDto) {
    let payload: { typ?: string; email?: string; sub?: number | string; branding?: object };
    try {
      payload = jwt.verify(dto.token, this.shellSsoSecret()) as typeof payload;
    } catch {
      throw new UnauthorizedException('Token shell inválido o expirado');
    }
    if (payload.typ !== 'training_shell_sso') {
      throw new UnauthorizedException('Token shell no válido');
    }
    const email = String(payload.email || '').toLowerCase();
    let user = email ? await this.userRepo.findOne({ where: { email } }) : null;
    if (!user && payload.sub) {
      user = await this.userRepo.findOne({ where: { shellUserId: Number(payload.sub) } });
    }
    if (!user) {
      throw new UnauthorizedException('Usuario no provisionado en Training. Contacte administrador D28D.');
    }
    if (!user.isActive) throw new UnauthorizedException('Cuenta suspendida');
    if (payload.branding) {
      user.shellBranding = payload.branding as Record<string, unknown>;
      user.shellUserId = Number(payload.sub) || user.shellUserId;
      await this.userRepo.save(user);
    }
    const roleHome = [UserRole.COACH, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)
      ? '/coach'
      : '/athlete';
    return {
      ...(await this.tokens(user)),
      user: this.sanitize(user),
      branding: user.shellBranding,
      shell: true,
      destinationView: roleHome,
    };
  }

  async provisionFromShell(dto: ShellProvisionDto) {
    const email = dto.email.toLowerCase();
    let user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      const [firstName, ...rest] = String(dto.nombre || 'Usuario D28D').trim().split(/\s+/);
      const pass = this.bridgePassword(email);
      user = this.userRepo.create({
        email,
        firstName: firstName || 'Usuario',
        lastName: rest.join(' ') || 'D28D',
        passwordHash: await bcrypt.hash(pass, 12),
        role: this.mapShellRole(dto),
        shellUserId: dto.shellUserId,
        shellTrainerId: dto.trainerId ?? null,
        shellBranding: dto.branding ?? null,
        isActive: dto.active !== false,
      });
      if (user.role === UserRole.COACH) {
        user.trainerCode = `T${dto.shellUserId}`.slice(0, 12);
      }
      await this.linkTrainer(user, dto.trainerId);
    } else {
      user.shellUserId = dto.shellUserId;
      user.shellTrainerId = dto.trainerId ?? user.shellTrainerId;
      if (dto.branding) user.shellBranding = dto.branding;
      if (dto.active === false) user.isActive = false;
      else if (dto.active === true || dto.active === undefined) user.isActive = true;
      user.role = this.mapShellRole(dto);
    }
    await this.linkTrainer(user, dto.trainerId);
    await this.userRepo.save(user);
    if (user.isActive && user.role === UserRole.ATHLETE) {
      await this.trainingService.ensureDefaultPlan(user, user.trainerId);
      await this.subscriptionsService.ensureForUser(user, 'pago_sede');
    }
    return { ok: true, trainingUserId: user.id, shellUserId: user.shellUserId, active: user.isActive };
  }

  private async linkTrainer(user: User, shellTrainerId?: number | null) {
    if (!shellTrainerId) return;
    const coach = await this.userRepo.findOne({
      where: { shellUserId: shellTrainerId, isActive: true },
    });
    if (coach && [UserRole.COACH, UserRole.ADMIN].includes(coach.role)) {
      user.trainerId = coach.id;
      user.shellTrainerId = shellTrainerId;
    }
  }

  mapShellRole(dto: ShellProvisionDto): UserRole {
    const roles = Array.isArray(dto.roles) ? dto.roles : [];
    if (roles.some((r) => ['entrenador', 'admin_training', 'admin_entrenador', 'nutricionista', 'super_admin'].includes(r))) {
      return UserRole.COACH;
    }
    if (roles.some((r) => ['admin_d28d', 'admin_marca', 'admin_gimnasio'].includes(r))) {
      return UserRole.ADMIN;
    }
    return UserRole.ATHLETE;
  }

  bridgePassword(email: string) {
    const secret = this.shellSsoSecret();
    const h = crypto.createHmac('sha256', secret).update(email.toLowerCase()).digest('hex');
    return `Tr8!${h.slice(0, 12)}`;
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    return this.sanitize(user);
  }
}
