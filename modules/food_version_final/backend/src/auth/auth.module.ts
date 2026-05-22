import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../users/entities/user.entity';
import { Plan, Subscription } from '../subscriptions/entities/subscription.entity';
import { UserProfile } from '../nutrition-plan/user-profile.entity';
import { NutritionPlanService } from '../nutrition-plan/nutrition-plan.service';
import { MailService } from '../common/mail.service';
import { UserNutritionGoal } from '../nutrition/entities/nutrition.entity';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback_secret',
      signOptions: { expiresIn: '15m' },
    }),
    TypeOrmModule.forFeature([User, Plan, Subscription, UserProfile, UserNutritionGoal]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MailService, NutritionPlanService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
