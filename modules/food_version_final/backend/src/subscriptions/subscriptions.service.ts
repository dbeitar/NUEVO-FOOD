// subscriptions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan, Subscription, SubscriptionStatus } from './entities/subscription.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
  ) {}

  async getPlans() {
    return this.planRepo.find({ where: { isActive: true }, order: { price: 'ASC' } });
  }

  async updatePlan(id: string, dto: Partial<Plan>) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  async getUserSubscription(userId: string) {
    return this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async getUserSubscriptionHistory(userId: string) {
    return this.subRepo.find({
      where: { userId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }


  async getAllFeatures() {
    try {
      return await this.planRepo.manager.query(
        `SELECT * FROM plan_features ORDER BY sort_order ASC`
      );
    } catch { return []; }
  }

  async updateFeature(key: string, dto: { label?: string; description?: string }) {
    await this.planRepo.manager.query(
      `UPDATE plan_features SET label = COALESCE($1, label), description = COALESCE($2, description) WHERE key = $3`,
      [dto.label, dto.description, key]
    );
    return { message: 'Feature actualizada' };
  }


  async cancelUserSubscription(userId: string) {
    const sub = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
    if (!sub) throw new Error('No se encontró suscripción activa');
    sub.endDate = new Date();
    sub.status = SubscriptionStatus.CANCELLED;
    await this.subRepo.save(sub);
    return { message: 'Suscripción cancelada' };
  }

  async extendUserSubscription(userId: string, days: number, planType?: string) {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    // Try to find existing active subscription
    let sub = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (sub) {
      // Extend existing subscription
      const currentEnd = new Date(sub.endDate);
      const base = currentEnd < now ? now : currentEnd;
      base.setDate(base.getDate() + days);
      sub.endDate = base;
      sub.status = SubscriptionStatus.ACTIVE;
      // Update plan if specified
      if (planType) {
        const plan = await this.planRepo.findOne({ where: { name: planType as any } });
        if (plan) { sub.planId = plan.id; sub.amountPaid = plan.price; }
      }
      await this.subRepo.save(sub);
      return { message: `Plan extendido ${days} días`, newEndDate: sub.endDate };
    } else {
      // Create new subscription
      const planName = planType || 'BASIC';
      const plan = await this.planRepo.findOne({ where: { name: planName as any } });
      if (!plan) throw new Error('Plan no encontrado');
      const newSub = this.subRepo.create({
        userId,
        planId: plan.id,
        startDate: now,
        endDate,
        status: SubscriptionStatus.ACTIVE,
        amountPaid: 0,
      });
      await this.subRepo.save(newSub);
      return { message: `Plan ${plan.displayName} asignado por ${days} días`, newEndDate: endDate };
    }
  }
}