import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { Plan } from './entities/plan.entity';
import { PaymentNotification } from './entities/payment-notification.entity';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
    @InjectRepository(PaymentNotification) private notifRepo: Repository<PaymentNotification>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async ensureForUser(user: User, metodoPago = 'pago_sede') {
    let sub = await this.subRepo.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      relations: ['plan'],
    });
    if (sub) return sub;

    const plan = await this.planRepo.findOne({ where: { name: 'TRAINING_BASIC' as never } })
      || await this.planRepo.findOne({ where: { isActive: true } });
    if (!plan) return null;

    const defer = metodoPago === 'wompi_online' || metodoPago === 'pago_sede';
    const end = new Date();
    end.setDate(end.getDate() + (defer ? 3 : plan.durationDays || 30));

    sub = this.subRepo.create({
      userId: user.id,
      planId: plan.id,
      startDate: new Date(),
      endDate: end,
      status: defer ? SubscriptionStatus.PENDING : SubscriptionStatus.ACTIVE,
      paymentReference: metodoPago,
      amountPaid: 0,
    });
    await this.subRepo.save(sub);

    if (defer && user.trainerId) {
      await this.notifRepo.save(this.notifRepo.create({
        coachId: user.trainerId,
        athleteId: user.id,
        tipo: 'pago_pendiente',
        mensaje: `${user.firstName} ${user.lastName} — pago ${metodoPago === 'wompi_online' ? 'Wompi' : 'en sede'} pendiente.`,
        meta: { subscription_id: sub.id, metodo_pago: metodoPago },
      }));
    }
    return sub;
  }

  private async athleteIdsForCoach(coach: User): Promise<string[]> {
    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.COACH].includes(coach.role)) {
      if (coach.role === UserRole.COACH) {
        const list = await this.userRepo.find({
          where: [
            { trainerId: coach.id, role: UserRole.ATHLETE },
            { shellTrainerId: coach.shellUserId ?? -1, role: UserRole.ATHLETE },
          ],
        });
        return list.map((a) => a.id);
      }
      const all = await this.userRepo.find({ where: { role: UserRole.ATHLETE, isActive: true } });
      return all.map((a) => a.id);
    }
    return [];
  }

  async overview(coach: User) {
    const athleteIds = await this.athleteIdsForCoach(coach);
    const where = athleteIds.length ? { userId: In(athleteIds) } : {};
    const subs = await this.subRepo.find({ where, relations: ['user', 'plan'], order: { createdAt: 'DESC' } });
    const pending = subs.filter((s) => s.status === SubscriptionStatus.PENDING);
    const expiring = subs.filter((s) => {
      if (s.status !== SubscriptionStatus.ACTIVE) return false;
      const days = (new Date(s.endDate).getTime() - Date.now()) / 86400000;
      return days >= 0 && days <= 14;
    });
    const notifications = await this.notifRepo.find({
      where: { coachId: coach.id, leida: false },
      order: { createdAt: 'DESC' },
      take: 40,
    });
    return { pending, expiring, notifications };
  }

  async confirm(coach: User, subscriptionId: string, days = 30) {
    const sub = await this.subRepo.findOne({ where: { id: subscriptionId }, relations: ['user'] });
    if (!sub) throw new ForbiddenException('Suscripción no encontrada');
    const allowed = await this.athleteIdsForCoach(coach);
    if (coach.role === UserRole.COACH && !allowed.includes(sub.userId)) {
      throw new ForbiddenException('Sin permiso');
    }
    const until = new Date();
    until.setDate(until.getDate() + days);
    sub.status = SubscriptionStatus.ACTIVE;
    sub.endDate = until;
    sub.paymentReference = 'confirmado_admin';
    await this.subRepo.save(sub);
    return sub;
  }

  async extend(coach: User, userId: string, days = 30) {
    const allowed = await this.athleteIdsForCoach(coach);
    if (coach.role === UserRole.COACH && !allowed.includes(userId)) {
      throw new ForbiddenException('Sin permiso');
    }
    let sub = await this.subRepo.findOne({ where: { userId }, order: { createdAt: 'DESC' } });
    if (!sub) {
      const plan = await this.planRepo.findOne({ where: { isActive: true } });
      if (!plan) throw new ForbiddenException('Sin plan base');
      sub = this.subRepo.create({
        userId,
        planId: plan.id,
        startDate: new Date(),
        endDate: new Date(),
        status: SubscriptionStatus.ACTIVE,
      });
    }
    const base = sub.endDate > new Date() ? sub.endDate : new Date();
    const until = new Date(base);
    until.setDate(until.getDate() + days);
    sub.endDate = until;
    sub.status = SubscriptionStatus.ACTIVE;
    await this.subRepo.save(sub);
    return sub;
  }
}
