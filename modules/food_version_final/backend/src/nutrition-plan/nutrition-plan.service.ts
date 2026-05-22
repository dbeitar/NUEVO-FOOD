import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile, GoalType, GenderType } from './user-profile.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UserNutritionGoal } from '../nutrition/entities/nutrition.entity';

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function calculateNutrition(profile: Partial<UserProfile>, cfg?: any): {
  dailyCalories: number; dailyProteinG: number; dailyCarbsG: number; dailyFatG: number;
} {
  const weight = Number(profile.weightKg) || 70;
  const height = Number(profile.heightCm) || 170;
  const age = profile.birthDate ? calculateAge(profile.birthDate) : 30;
  const gender = profile.gender;

  // Use DB config or defaults
  const c = cfg || {};
  let bmr: number;
  if (gender === GenderType.FEMALE) {
    bmr = Number(c.bmr_female_base || 655.1)
        + (Number(c.bmr_female_weight || 9.563) * weight)
        + (Number(c.bmr_female_height || 1.850) * height)
        - (Number(c.bmr_female_age   || 4.676) * age);
  } else {
    bmr = Number(c.bmr_male_base || 66.47)
        + (Number(c.bmr_male_weight || 13.75) * weight)
        + (Number(c.bmr_male_height || 5.003) * height)
        - (Number(c.bmr_male_age   || 6.755) * age);
  }

  const activityFactors: Record<string, number> = {
    SEDENTARY:  Number(c.factor_sedentary  || 1.2),
    LIGHT:      Number(c.factor_light      || 1.375),
    MODERATE:   Number(c.factor_moderate   || 1.55),
    ACTIVE:     Number(c.factor_active     || 1.725),
    VERY_ACTIVE:Number(c.factor_very_active|| 1.9),
  };
  const factor = activityFactors[profile.activityLevel || 'MODERATE'] || 1.55;
  let tdee = bmr * factor;

  if (profile.goalType === GoalType.LOSE) tdee += Number(c.goal_lose || -500);
  else if (profile.goalType === GoalType.GAIN) tdee += Number(c.goal_gain || 300);
  else tdee += Number(c.goal_maintain || 0);

  const dailyCalories = Math.round(tdee);
  // Use goal-specific macro config
  let proteinPerKg: number;
  let fatPct: number;
  if (profile.goalType === GoalType.LOSE) {
    proteinPerKg = Number(c.protein_per_kg_lose || c.protein_per_kg || 2.2);
    fatPct       = Number(c.fat_pct_lose        || c.fat_pct_calories || 0.25);
  } else if (profile.goalType === GoalType.GAIN) {
    proteinPerKg = Number(c.protein_per_kg_gain || c.protein_per_kg || 2.0);
    fatPct       = Number(c.fat_pct_gain        || c.fat_pct_calories || 0.22);
  } else {
    proteinPerKg = Number(c.protein_per_kg_maintain || c.protein_per_kg || 1.8);
    fatPct       = Number(c.fat_pct_maintain        || c.fat_pct_calories || 0.28);
  }
  const dailyProteinG = Math.round(weight * proteinPerKg);
  const dailyFatG     = Math.round((dailyCalories * fatPct) / 9);
  const dailyCarbsG   = Math.round((dailyCalories - (dailyProteinG * 4) - (dailyFatG * 9)) / 4);

  return { dailyCalories, dailyProteinG, dailyCarbsG: Math.max(0, dailyCarbsG), dailyFatG };
}

@Injectable()
export class NutritionPlanService {
  constructor(
    @InjectRepository(UserProfile) private profileRepo: Repository<UserProfile>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserNutritionGoal) private goalRepo: Repository<UserNutritionGoal>,
  ) {}

  private async syncGoals(userId: string, calories: number, protein: number, carbs: number, fat: number) {
    let goal = await this.goalRepo.findOne({ where: { userId } });
    if (!goal) goal = this.goalRepo.create({ userId });
    goal.dailyCalories = calories;
    goal.dailyProteinG = protein;
    goal.dailyCarbsG = carbs;
    goal.dailyFatG = fat;
    await this.goalRepo.save(goal);
  }

  async getProfile(userId: string) {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    return profile || null;
  }

  async saveProfile(userId: string, dto: Partial<UserProfile>) {
    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profileRepo.create({ userId, ...dto });
    } else {
      Object.assign(profile, dto);
    }

    // Recalculate unless trainer has overridden
    if (!profile.trainerOverride) {
      const cfg = await this.getCalcConfig();
      const calc = calculateNutrition(profile, cfg);
      profile.dailyCalories = calc.dailyCalories;
      profile.dailyProteinG = calc.dailyProteinG;
      profile.dailyCarbsG = calc.dailyCarbsG;
      profile.dailyFatG = calc.dailyFatG;
    }

    const saved = await this.profileRepo.save(profile);
    // Sync to user_nutrition_goals so dashboard picks it up
    await this.syncGoals(userId, saved.dailyCalories, saved.dailyProteinG, saved.dailyCarbsG, saved.dailyFatG);
    return saved;
  }

  private async getCalcConfig() {
    try {
      const result = await this.profileRepo.manager.query(
        `SELECT * FROM nutrition_calc_config WHERE id = '00000000-0000-0000-0000-000000000001'`
      );
      return result[0] || null;
    } catch { return null; }
  }

  async trainerOverride(trainerId: string, studentId: string, macros: {
    dailyCalories?: number; dailyProteinG?: number; dailyCarbsG?: number; dailyFatG?: number;
    dailyWaterGlasses?: number; dailySteps?: number;
  }) {
    // Verify trainer-student relationship
    const student = await this.userRepo.findOne({ where: { id: studentId, trainerId } });
    if (!student) throw new NotFoundException('Asesorado no encontrado o no tienes acceso');

    let profile = await this.profileRepo.findOne({ where: { userId: studentId } });
    if (!profile) {
      profile = this.profileRepo.create({ userId: studentId });
    }

    Object.assign(profile, macros, { trainerOverride: true });
    const saved = await this.profileRepo.save(profile);
    await this.syncGoals(studentId, saved.dailyCalories, saved.dailyProteinG, saved.dailyCarbsG, saved.dailyFatG);
    return saved;
  }

  async getStudentPlan(trainerId: string, studentId: string) {
    const student = await this.userRepo.findOne({ where: { id: studentId, trainerId } });
    if (!student) throw new NotFoundException('Asesorado no encontrado o no tienes acceso');

    const profile = await this.profileRepo.findOne({ where: { userId: studentId } });

    // Get calculated goals from user_nutrition_goals
    const goals = await this.profileRepo.manager.query(
      `SELECT daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g
       FROM user_nutrition_goals WHERE user_id = $1 LIMIT 1`,
      [studentId]
    );
    const g = goals[0] || {};

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
      },
      profile: profile ? {
        ...profile,
        dailyCalories:     profile.dailyCalories     || g.daily_calories,
        dailyProteinG:     profile.dailyProteinG     || g.daily_protein_g,
        dailyCarbsG:       profile.dailyCarbsG       || g.daily_carbs_g,
        dailyFatG:         profile.dailyFatG         || g.daily_fat_g,
        dailyWaterGlasses: profile.dailyWaterGlasses,
        dailySteps:        profile.dailySteps,
      } : null,
    };
  }

  async resetToCalculated(trainerId: string, studentId: string) {
    const student = await this.userRepo.findOne({ where: { id: studentId, trainerId } });
    if (!student) throw new NotFoundException('Asesorado no encontrado');

    const profile = await this.profileRepo.findOne({ where: { userId: studentId } });
    if (!profile) throw new NotFoundException('El asesorado no tiene perfil nutricional');

    profile.trainerOverride = false;
    const cfg = await this.getCalcConfig();
    const calc = calculateNutrition(profile, cfg);
    Object.assign(profile, calc);
    const saved = await this.profileRepo.save(profile);
    await this.syncGoals(studentId, saved.dailyCalories, saved.dailyProteinG, saved.dailyCarbsG, saved.dailyFatG);
    return saved;
  }
}
