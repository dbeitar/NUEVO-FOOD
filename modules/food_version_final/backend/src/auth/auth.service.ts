import {
  Injectable, UnauthorizedException, ConflictException,
  NotFoundException, BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { Plan, Subscription, SubscriptionStatus } from '../subscriptions/entities/subscription.entity';
import * as jwt from 'jsonwebtoken';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { ShellExchangeDto, ShellLinkDto } from './dto/shell-auth.dto';
import { MailService } from '../common/mail.service';
import { NutritionPlanService } from '../nutrition-plan/nutrition-plan.service';
import { UserProfile } from '../nutrition-plan/user-profile.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    private jwtService: JwtService,
    private mailService: MailService,
    private nutritionPlanService: NutritionPlanService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, isActive: true, deletedAt: null },
    });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    const subscription = await this.subRepo.findOne({
      where: { userId: user.id, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    // Check if subscription is expired
    if (subscription && new Date() > new Date(subscription.endDate)) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.subRepo.save(subscription);
    }

    // Block access if USER role and no active subscription or expired
    if (user.role === 'USER') {
      const hasActive = subscription && subscription.status === SubscriptionStatus.ACTIVE && new Date() <= new Date(subscription.endDate);
      if (!hasActive) {
        throw new UnauthorizedException('Tu plan ha vencido. Por favor renueva tu suscripción para continuar.');
      }
    }

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: this.sanitizeUser(user),
      subscription,
    };
  }

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El correo ya está registrado');

    const plan = await this.planRepo.findOne({ where: { name: dto.planType, isActive: true } });
    if (!plan) throw new BadRequestException('Plan no válido');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      passwordHash,
      role: UserRole.USER,
    });
    await this.userRepo.save(user);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);
    const subscription = this.subRepo.create({
      userId: (user as any).id,
      planId: plan.id,
      startDate: new Date(),
      endDate,
      status: SubscriptionStatus.ACTIVE,
      amountPaid: plan.price,
    });
    await this.subRepo.save(subscription);

    // Save user profile and calculate nutrition plan
    if (dto.weightKg || dto.heightCm || dto.birthDate) {
      await this.nutritionPlanService.saveProfile((user as any).id, {
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        birthDate: dto.birthDate,
        gender: dto.gender as any,
        goalType: dto.goalType as any,
        activityLevel: dto.activityLevel || 'MODERATE',
        hasDietaryRestrictions: dto.hasDietaryRestrictions || false,
        dietaryRestrictionsDetail: dto.dietaryRestrictionsDetail,
        acceptedPrivacyPolicy: dto.acceptedPrivacyPolicy || false,
        acceptedTerms: dto.acceptedTerms || false,
      });
    }

    // Create starter usual meals based on user's nutrition goals
    try {
      const profile = await this.nutritionPlanService.getProfile((user as any).id);
      if (profile?.dailyCalories) {
        await this.createStarterMeals((user as any).id, profile);
      }
    } catch (e) { console.error('Error creating starter meals:', e.message); }

    this.mailService.sendWelcomeEmail((user as any).email, (user as any).firstName, plan.displayName).catch(console.error);

    const tokens = await this.generateTokens(user as any);
    return { ...tokens, user: this.sanitizeUser(user as any), subscription };
  }

  async refreshToken(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId, isActive: true } });
    if (!user) throw new UnauthorizedException();
    return this.generateTokens(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('La contraseña actual es incorrecta');

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepo.save(user);
    return { message: 'Contraseña actualizada exitosamente' };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepo.findOne({ where: { email, isActive: true } });
    // Always return success to avoid email enumeration
    if (!user) return { message: 'Si el correo existe, recibirás una nueva contraseña.' };

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    user.passwordHash = await bcrypt.hash(tempPassword, 12);
    await this.userRepo.save(user);

    await this.mailService.sendPasswordResetEmail(user.email, user.firstName, tempPassword);
    return { message: 'Si el correo existe, recibirás una nueva contraseña.' };
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User) {
    const { passwordHash, ...safe } = user as any;
    return safe;
  }


  async requestRenewal(email: string) {
    const user = await this.userRepo.findOne({ where: { email, deletedAt: null } });
    if (!user) return { message: 'Solicitud enviada' }; // Don't reveal if user exists

    // Get last subscription
    const sub = await this.subRepo.findOne({
      where: { userId: user.id },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    // Find admin email
    const admin = await this.userRepo.findOne({
      where: { role: 'SUPER_ADMIN' as any, isActive: true },
    });

    if (admin) {
      await this.mailService.sendRenewalRequest(
        admin.email,
        `${user.firstName} ${user.lastName}`,
        user.email,
        sub?.plan?.displayName || 'Sin plan',
      ).catch(() => {});
    }

    return { message: 'Solicitud enviada. El administrador se pondrá en contacto contigo.' };
  }


  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId, deletedAt: null } });
    if (!user) return null;

    const subscription = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    // Check expiry
    if (subscription && new Date() > new Date(subscription.endDate)) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.subRepo.save(subscription);
    }

    return {
      ...this.sanitizeUser(user as any),
      subscription: subscription?.status === SubscriptionStatus.ACTIVE ? subscription : null,
    };
  }


  private shellSsoSecret() {
    return process.env.FOOD_SHELL_SSO_SECRET || process.env.JWT_SECRET || 'fallback_secret';
  }

  private assertShellApiKey(key?: string) {
    const expected = process.env.FOOD_SHELL_API_KEY;
    if (!expected || !key || key !== expected) {
      throw new UnauthorizedException('Shell API key inválida');
    }
  }

  /** SSO: intercambio token corto del Shell D28D → tokens Food */
  async shellExchange(dto: ShellExchangeDto) {
    let payload: any;
    try {
      payload = jwt.verify(dto.token, this.shellSsoSecret());
    } catch {
      throw new UnauthorizedException('Token shell inválido o expirado');
    }
    if (payload.typ !== 'food_shell_sso') {
      throw new UnauthorizedException('Token shell no válido');
    }
    const email = String(payload.email || '').toLowerCase();
    let user = email
      ? await this.userRepo.findOne({ where: { email, deletedAt: null } })
      : null;
    if (!user && payload.sub) {
      user = await this.userRepo.findOne({
        where: { shellUserId: Number(payload.sub), deletedAt: null },
      });
    }
    if (!user) {
      throw new UnauthorizedException('Usuario no provisionado en Food. Contacte al administrador D28D.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Cuenta Food suspendida');
    }
    if (payload.coach === true && user.role === UserRole.USER) {
      user.role = UserRole.TRAINER;
      if (!user.trainerCode) {
        const code = `T${String(payload.sub || user.shellUserId || '').padStart(4, '0')}`.slice(0, 12);
        user.trainerCode = code.toUpperCase();
      }
      await this.userRepo.save(user);
    }
    if (payload.branding && typeof payload.branding === 'object') {
      user.shellBranding = payload.branding;
      user.shellUserId = Number(payload.sub) || user.shellUserId;
      await this.userRepo.save(user);
    }
    const subscription = await this.subRepo.findOne({
      where: { userId: user.id, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
    if (user.role === UserRole.USER) {
      const hasActive = subscription && new Date() <= new Date(subscription.endDate);
      if (!hasActive) {
        throw new UnauthorizedException('Tu plan Food ha vencido. Renueva desde D28D.');
      }
    }
    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: this.sanitizeUser(user),
      subscription,
      branding: user.shellBranding || payload.branding || null,
      shell: true,
    };
  }

  /** Vincular / activar / suspender usuario desde Shell */
  async shellLink(dto: ShellLinkDto, shellKey?: string) {
    this.assertShellApiKey(shellKey);
    let user = await this.userRepo.findOne({ where: { email: dto.email, deletedAt: null } });
    if (!user && dto.foodUserId) {
      user = await this.userRepo.findOne({ where: { id: dto.foodUserId, deletedAt: null } });
    }
    if (!user) {
      return { ok: false, foodUserId: null, message: 'Usuario no encontrado en Food' };
    }
    user.shellUserId = dto.shellUserId;
    if (dto.promoteTrainer === true && user.role === UserRole.USER) {
      user.role = UserRole.TRAINER;
      if (!user.trainerCode) {
        const code = `T${String(dto.shellUserId || user.shellUserId || '').padStart(4, '0')}`.slice(0, 12);
        user.trainerCode = code.toUpperCase();
      }
    }
    if (dto.active === false) {
      user.isActive = false;
      const subs = await this.subRepo.find({ where: { userId: user.id, status: SubscriptionStatus.ACTIVE } });
      for (const s of subs) {
        s.status = SubscriptionStatus.EXPIRED;
        await this.subRepo.save(s);
      }
    } else if (dto.active !== false) {
      user.isActive = true;
      const plan = await this.planRepo.findOne({ where: { name: 'ADVANCED' as any, isActive: true } });
      if (plan) {
        const existing = await this.subRepo.findOne({
          where: { userId: user.id, status: SubscriptionStatus.ACTIVE },
        });
        if (!existing) {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + plan.durationDays);
          await this.subRepo.save(this.subRepo.create({
            userId: user.id,
            planId: plan.id,
            startDate: new Date(),
            endDate,
            status: SubscriptionStatus.ACTIVE,
            amountPaid: plan.price,
          }));
        }
      }
    }
    await this.userRepo.save(user);
    return { ok: true, foodUserId: user.id, shellUserId: user.shellUserId, active: user.isActive };
  }

  private async createStarterMeals(userId: string, profile: any) {
    const totalCal   = Math.round(Number(profile.dailyCalories) || 2000);
    const totalProt  = Math.round(Number(profile.dailyProteinG) || 150);
    const totalCarbs = Math.round(Number(profile.dailyCarbsG)   || 250);
    const totalFat   = Math.round(Number(profile.dailyFatG)     || 65);

    // Distribute macros per meal: Breakfast 25%, Lunch 35%, Dinner 30%, Snack 10%
    const dist = [
      { name: 'Desayuno Base', mealType: 'BREAKFAST', pct: 0.25 },
      { name: 'Almuerzo Base', mealType: 'LUNCH',     pct: 0.35 },
      { name: 'Cena Base',     mealType: 'DINNER',    pct: 0.30 },
      { name: 'Snack Base',    mealType: 'SNACK',     pct: 0.10 },
    ];

    const mealItems: Record<string, string[]> = {
      BREAKFAST: ['2 huevos enteros (al gusto)', 'Piña / Papaya / Sandía', 'Arepa de peto (casera o comprada)'],
      LUNCH:     ['Pechuga de pollo (crudo, al gusto)', 'Arroz (cocido, cualquier tipo)', 'Mix ensalada (lechuga, tomate, cebolla, pepino)'],
      DINNER:    ['Carne de res o cerdo magra (crudo, al gusto)', 'Papa o batata (cocida)', 'Mix ensalada (lechuga, tomate, cebolla, pepino)'],
      SNACK:     ['Yogurt griego light', 'Piña / Papaya / Sandía', 'Frutos secos'],
    };

    for (const meal of dist) {
      const mCal   = Math.round(totalCal   * meal.pct);
      const mProt  = Math.round(totalProt  * meal.pct);
      const mCarbs = Math.round(totalCarbs * meal.pct);
      const mFat   = Math.round(totalFat   * meal.pct);

      const names = mealItems[meal.mealType];
      // Distribute evenly among items
      const items = names.map((name, i) => {
        const isLast = i === names.length - 1;
        const frac = isLast ? 1 - (i / names.length) : 1 / names.length;
        return {
          name,
          quantityGrams: Math.round(100 * frac),
          calories: Math.round(mCal   * frac),
          protein:  Math.round(mProt  * frac * 10) / 10,
          carbs:    Math.round(mCarbs * frac * 10) / 10,
          fat:      Math.round(mFat   * frac * 10) / 10,
        };
      });

      await this.userRepo.manager.query(
        `INSERT INTO usual_meals (user_id, name, meal_type, items, total_calories, total_protein, total_carbs, total_fat)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, meal.name, meal.mealType, JSON.stringify(items), mCal, mProt, mCarbs, mFat]
      );
    }
  }
}