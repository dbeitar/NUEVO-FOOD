import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FoodItem, FoodLog, UserNutritionGoal,
  NutritionTrafficLight, FoodEquivalence, MealType,
} from './entities/nutrition.entity';
import { WaterLog } from './entities/water.entity';

@Injectable()
export class NutritionService {
  constructor(
    @InjectRepository(FoodItem) private foodRepo: Repository<FoodItem>,
    @InjectRepository(FoodLog) private logRepo: Repository<FoodLog>,
    @InjectRepository(UserNutritionGoal) private goalRepo: Repository<UserNutritionGoal>,
    @InjectRepository(NutritionTrafficLight) private tlRepo: Repository<NutritionTrafficLight>,
    @InjectRepository(FoodEquivalence) private eqRepo: Repository<FoodEquivalence>,
    @InjectRepository(WaterLog) private waterRepo: Repository<WaterLog>,
  ) {}

  // ─── FOOD SEARCH ─────────────────────────────────────────────
  async searchFoods(query: string, limit = 20) {
    if (!query?.trim()) {
      return this.foodRepo.find({ where: { isActive: true }, take: limit, order: { name: 'ASC' } });
    }
    return this.foodRepo
      .createQueryBuilder('f')
      .where('(f.name ILIKE :q OR f.category ILIKE :q) AND f.is_active = true', { q: `%${query}%` })
      .orderBy('f.name', 'ASC')
      .take(limit)
      .getMany();
  }

  async getFoodById(id: string) {
    const food = await this.foodRepo.findOne({ where: { id } });
    if (!food) throw new NotFoundException('Alimento no encontrado');
    return food;
  }

  // ─── FOOD LOGS ───────────────────────────────────────────────
  async addFoodLog(userId: string, dto: { foodItemId: string; quantityGrams: number; mealType: MealType; logDate?: string; customMealName?: string; timezone?: string }) {
    const food = await this.getFoodById(dto.foodItemId);

    // If food is measured in units, convert units → grams using gramsPerUnit
    const isUnit = food.unit === 'unidad' || food.unit === 'unidades';
    const gramsForCalc = isUnit && food.gramsPerUnit
      ? dto.quantityGrams * Number(food.gramsPerUnit)  // e.g. 2 eggs × 50g = 100g
      : dto.quantityGrams;

    const factor = gramsForCalc / 100;

    const log = this.logRepo.create({
      userId,
      foodItemId: dto.foodItemId,
      logDate: dto.logDate || this.getLocalDate(dto.timezone),
      mealType: dto.mealType,
      customMealName: dto.customMealName || null,
      quantityGrams: dto.quantityGrams, // store original (units or grams)
      calories: Math.round(food.caloriesPer100g * factor * 100) / 100,
      protein: Math.round(food.proteinPer100g * factor * 100) / 100,
      carbs: Math.round(food.carbsPer100g * factor * 100) / 100,
      fat: Math.round(food.fatPer100g * factor * 100) / 100,
    });
    return this.logRepo.save(log);
  }

  async getDayLogs(userId: string, date?: string, timezone?: string) {
    const logDate = date || this.getLocalDate(timezone);
    const logs = await this.logRepo.find({
      where: { userId, logDate },
      relations: ['foodItem'],
      order: { createdAt: 'ASC' },
    });

    const totals = logs.reduce((acc, l) => ({
      calories: acc.calories + Number(l.calories),
      protein: acc.protein + Number(l.protein),
      carbs: acc.carbs + Number(l.carbs),
      fat: acc.fat + Number(l.fat),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const byMeal: Record<string, any[]> = {
      BREAKFAST: logs.filter(l => l.mealType === MealType.BREAKFAST),
      LUNCH: logs.filter(l => l.mealType === MealType.LUNCH),
      DINNER: logs.filter(l => l.mealType === MealType.DINNER),
      SNACK: logs.filter(l => l.mealType === MealType.SNACK),
      CUSTOM: logs.filter(l => l.mealType === MealType.CUSTOM),
    };

    return { logs, totals, byMeal, date: logDate };
  }

  async deleteLog(id: string, userId: string) {
    const log = await this.logRepo.findOne({ where: { id } });
    if (!log) throw new NotFoundException();
    if (log.userId !== userId) throw new ForbiddenException();
    return this.logRepo.remove(log);
  }

  // ─── NUTRITION GOALS ─────────────────────────────────────────
  async getGoals(userId: string) {
    let goal = await this.goalRepo.findOne({ where: { userId } });
    if (!goal) {
      goal = this.goalRepo.create({ userId });
      await this.goalRepo.save(goal);
    }
    return goal;
  }

  async updateGoals(userId: string, dto: Partial<UserNutritionGoal>) {
    let goal = await this.goalRepo.findOne({ where: { userId } });
    if (!goal) {
      goal = this.goalRepo.create({ userId, ...dto });
    } else {
      Object.assign(goal, dto);
    }
    goal.updatedAt = new Date();
    return this.goalRepo.save(goal);
  }

  // ─── TRAFFIC LIGHT ───────────────────────────────────────────
  async getTrafficLight(userId: string): Promise<{ status: 'GREEN' | 'YELLOW' | 'RED'; compliance: number; daysComplied: number; windowDays: number; newUser?: boolean }> {
    const config = await this.tlRepo.findOne({ where: {} });
    if (!config) return { status: 'RED', compliance: 0, daysComplied: 0, windowDays: 7 };

    const goal = await this.getGoals(userId);
    const windowDays = config.evaluationWindowDays;
    const threshold = Number(config.complianceThresholdPct);

    let daysComplied = 0;
    let totalCompliance = 0;
    let daysWithData = 0;

    for (let i = 0; i < windowDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const { totals } = await this.getDayLogs(userId, dateStr);

      // Days without registration count as 0% compliance (not skipped)
      if (totals.calories === 0) {
        totalCompliance += 0; // 0% compliance for unregistered days
        // daysComplied stays 0 for this day
        continue;
      }

      daysWithData++;
      const pctCal   = Math.min(150, (totals.calories / Number(goal?.dailyCalories || 2000)) * 100);
      const pctProt  = Math.min(150, (totals.protein  / Number(goal?.dailyProteinG  || 150))  * 100);
      const pctCarbs = Math.min(150, (totals.carbs    / Number(goal?.dailyCarbsG    || 250))  * 100);
      const pctFat   = Math.min(150, (totals.fat      / Number(goal?.dailyFatG      || 65))   * 100);
      const avg = (pctCal + pctProt + pctCarbs + pctFat) / 4;

      totalCompliance += avg;
      if (avg >= threshold) daysComplied++;
    }

    // Only mark as GREEN if user registered less than 3 days ago
    if (daysWithData === 0) {
      const user = await this.foodRepo.manager.query(
        'SELECT created_at FROM users WHERE id = $1', [userId]
      );
      const daysSinceRegistration = user[0]
        ? Math.floor((Date.now() - new Date(user[0].created_at).getTime()) / 86400000)
        : 999;
      if (daysSinceRegistration <= 3) {
        return { status: 'GREEN', compliance: 100, daysComplied: 0, windowDays, newUser: true };
      }
      return { status: 'RED', compliance: 0, daysComplied: 0, windowDays, newUser: false };
    }

    // Average compliance includes unregistered days as 0%
    const avgCompliance = totalCompliance / windowDays;
    let status: 'GREEN' | 'YELLOW' | 'RED' = 'RED';
    if (daysComplied >= config.greenMinDays) status = 'GREEN';
    else if (daysComplied >= config.yellowMinDays) status = 'YELLOW';

    return { status, compliance: Math.round(avgCompliance * 10) / 10, daysComplied, windowDays, newUser: daysWithData < 3 };
  }

  // ─── EQUIVALENCES ────────────────────────────────────────────
  async getEquivalences(foodId: string) {
    return this.eqRepo.find({
      where: { originalFoodId: foodId },
      relations: ['replacementFood'],
    });
  }

  // ─── TRAFFIC LIGHT CONFIG ────────────────────────────────────
  async getConfig() {
    return this.tlRepo.findOne({ where: {} });
  }

  async updateConfig(dto: any, updatedBy: string) {
    let config = await this.tlRepo.findOne({ where: {} });
    if (!config) config = this.tlRepo.create();
    Object.assign(config, dto, { updatedBy, updatedAt: new Date() });
    return this.tlRepo.save(config);
  }

  async getWaterToday(userId: string, timezone?: string) {
    const today = this.getLocalDate(timezone);
    let log = await this.waterRepo.findOne({ where: { userId, logDate: today } });
    if (!log) log = { userId, logDate: today, glasses: 0, goal: 8 } as WaterLog;
    return log;
  }

  async updateWater(userId: string, glasses: number, goal?: number, timezone?: string) {
    const today = this.getLocalDate(timezone);
    let log = await this.waterRepo.findOne({ where: { userId, logDate: today } });
    if (!log) {
      log = this.waterRepo.create({ userId, logDate: today, glasses, goal: goal || 8 });
    } else {
      log.glasses = Math.max(0, glasses);
      if (goal) log.goal = goal;
    }
    return this.waterRepo.save(log);
  }

  async getStreak(userId: string) {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const { totals } = await this.getDayLogs(userId, dateStr);
      if (totals.calories > 0) streak++;
      else if (i > 0) break;
    }
    return { streak };
  }

  async getCalendarMonth(userId: string, year: number, month: number) {
    const days: Record<string, boolean> = {};
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const { totals } = await this.getDayLogs(userId, dateStr);
      days[dateStr] = totals.calories > 0;
    }
    return days;
  }

  async getFrequentFoods(userId: string, limit = 10) {
    return this.logRepo.createQueryBuilder('l')
      .select(['l.foodItemId', 'COUNT(l.id) as count'])
      .addSelect('f.name', 'name')
      .addSelect('f.caloriesPer100g', 'calories')
      .addSelect('f.proteinPer100g', 'protein')
      .addSelect('f.carbsPer100g', 'carbs')
      .addSelect('f.fatPer100g', 'fat')
      .leftJoin('l.foodItem', 'f')
      .where('l.userId = :userId', { userId })
      .groupBy('l.foodItemId, f.name, f.caloriesPer100g, f.proteinPer100g, f.carbsPer100g, f.fatPer100g')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  // ── Recipe log ──────────────────────────────────────────────
  async addRecipeLog(userId: string, dto: {
    recipeId: string;
    recipeName: string;
    servings: number;
    quantityGrams?: number;
    mealType: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    timezone?: string;
  }) {
    const logDate = this.getLocalDate(dto.timezone);
    const log = this.logRepo.create({
      userId,
      foodItemId: null,
      recipeId: dto.recipeId,
      recipeName: dto.recipeName,
      logDate,
      mealType: dto.mealType as MealType,
      customMealName: `🍽️ ${dto.recipeName}`,
      quantityGrams: dto.quantityGrams || dto.servings,
      calories: Math.round(dto.calories * dto.servings * 100) / 100,
      protein:  Math.round(dto.protein  * dto.servings * 100) / 100,
      carbs:    Math.round(dto.carbs    * dto.servings * 100) / 100,
      fat:      Math.round(dto.fat      * dto.servings * 100) / 100,
    });
    return this.logRepo.save(log);
  }

  // ── Timezone helper ──
  getLocalDate(timezone?: string): string {
    try {
      if (timezone) {
        return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
      }
    } catch {}
    // fallback: use server offset
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().split('T')[0];
  }

  // ── Food management ──────────────────────────────────────────
  async createFood(dto: any) {
    const food = this.foodRepo.create(dto);
    return this.foodRepo.save(food);
  }

  async updateFood(id: string, dto: any) {
    await this.foodRepo.update(id, dto);
    return this.foodRepo.findOne({ where: { id } });
  }

  async deleteFood(id: string) {
    const food = await this.foodRepo.findOne({ where: { id } });
    if (!food) throw new Error('Alimento no encontrado');
    food.isActive = false;
    await this.foodRepo.save(food);
    return { message: 'Alimento desactivado' };
  }

  async importFoods(foods: any[]) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };
    for (const f of foods) {
      try {
        if (!f.name || !f.caloriesPer100g) {
          results.skipped++;
          continue;
        }
        const exists = await this.foodRepo.findOne({ where: { name: f.name } });
        if (exists) { results.skipped++; continue; }
        await this.foodRepo.save(this.foodRepo.create({
          name: f.name,
          category: f.category || 'General',
          caloriesPer100g: parseFloat(f.caloriesPer100g) || 0,
          proteinPer100g:  parseFloat(f.proteinPer100g)  || 0,
          carbsPer100g:    parseFloat(f.carbsPer100g)    || 0,
          fatPer100g:      parseFloat(f.fatPer100g)      || 0,
          fiberPer100g:    parseFloat(f.fiberPer100g)    || 0,
          unit:            f.unit || 'g',
          gramsPerUnit:    f.gramsPerUnit ? parseFloat(f.gramsPerUnit) : null,
        }));
        results.created++;
      } catch (e) {
        results.errors.push(`${f.name}: ${e.message}`);
      }
    }
    return results;
  }

  async getAllFoods(page = 1, search?: string, showInactive = false) {
    const limit = 50;
    const qb = this.foodRepo.createQueryBuilder('f')
      .orderBy('f.is_active', 'DESC')
      .addOrderBy('f.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    const conditions = [];
    const params: any = {};
    if (!showInactive) { conditions.push('f.is_active = true'); }
    if (search) { conditions.push('LOWER(f.name) LIKE :s'); params.s = `%${search.toLowerCase()}%`; }
    if (conditions.length) qb.where(conditions.join(' AND '), params);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getLastLogDate(userId: string): Promise<string | null> {
    const log = await this.logRepo.findOne({
      where: { userId },
      order: { logDate: 'DESC' },
    });
    return log?.logDate || null;
  }

  async getAdherence(userId: string, days: number): Promise<number> {
    let daysWithLogs = 0;
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const { totals } = await this.getDayLogs(userId, dateStr);
      if (totals.calories > 0) daysWithLogs++;
    }
    return Math.round((daysWithLogs / days) * 100);
  }

  async getWeightHistory(userId: string): Promise<{ date: string; weight: number }[]> {
    const logs = await this.logRepo
      .createQueryBuilder('l')
      .select(['l.log_date as date'])
      .addSelect('SUM(l.calories)', 'totalCals')
      .where('l.user_id = :userId', { userId })
      .groupBy('l.log_date')
      .orderBy('l.log_date', 'ASC')
      .limit(60)
      .getRawMany();

    // Get from daily reports if available
    const { data: reports } = await this.getWeightFromReports(userId);
    return reports;
  }

  private async getWeightFromReports(userId: string): Promise<{ data: { date: string; weight: number }[] }> {
    try {
      const result = await this.logRepo.manager.query(
        `SELECT report_date as date, weight_kg as weight FROM daily_reports WHERE user_id = $1 AND weight_kg IS NOT NULL ORDER BY report_date ASC LIMIT 60`,
        [userId]
      );
      return { data: result.map((r: any) => ({ date: typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0], weight: parseFloat(r.weight) })) };
    } catch {
      return { data: [] };
    }
  }


  // ── Usual meals ──────────────────────────────────────────────
  async getUsualMeals(userId: string) {
    return this.logRepo.manager.query(
      `SELECT id, user_id, name, meal_type, items, total_calories as "totalCalories", total_protein as "totalProtein", total_carbs as "totalCarbs", total_fat as "totalFat", created_at FROM usual_meals WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
  }

  async createUsualMeal(userId: string, dto: {
    name: string;
    mealType: string;
    items: any[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  }) {
    const result = await this.logRepo.manager.query(
      `INSERT INTO usual_meals (user_id, name, meal_type, items, total_calories, total_protein, total_carbs, total_fat)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, dto.name, dto.mealType, JSON.stringify(dto.items), dto.totalCalories, dto.totalProtein, dto.totalCarbs, dto.totalFat]
    );
    return result[0];
  }

  async deleteUsualMeal(userId: string, mealId: string) {
    await this.logRepo.manager.query(
      `DELETE FROM usual_meals WHERE id = $1 AND user_id = $2`,
      [mealId, userId]
    );
    return { message: 'Comida habitual eliminada' };
  }


  // ── Daily steps ──────────────────────────────────────────────
  async getTodaySteps(userId: string, timezone?: string) {
    const today = this.getLocalDate(timezone);
    try {
      const result = await this.logRepo.manager.query(
        `SELECT steps FROM daily_steps WHERE user_id = $1 AND step_date = $2`,
        [userId, today]
      );
      return { steps: result[0]?.steps || 0, date: today };
    } catch {
      return { steps: 0, date: today };
    }
  }

  async updateSteps(userId: string, steps: number, timezone?: string) {
    const today = this.getLocalDate(timezone);
    try {
      await this.logRepo.manager.query(
        `INSERT INTO daily_steps (user_id, steps, step_date)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, step_date) DO UPDATE SET steps = $2`,
        [userId, steps, today]
      );
      return { steps, date: today };
    } catch {
      return { steps, date: today };
    }
  }


  // ── Nutrition calc config ─────────────────────────────────────
  async getNutritionCalcConfig() {
    try {
      const result = await this.logRepo.manager.query(
        `SELECT * FROM nutrition_calc_config WHERE id = '00000000-0000-0000-0000-000000000001'`
      );
      return result[0] || null;
    } catch { return null; }
  }

  async updateNutritionCalcConfig(dto: any) {
    try {
      await this.logRepo.manager.query(
        `UPDATE nutrition_calc_config SET
          bmr_male_base = $1, bmr_male_weight = $2, bmr_male_height = $3, bmr_male_age = $4,
          bmr_female_base = $5, bmr_female_weight = $6, bmr_female_height = $7, bmr_female_age = $8,
          factor_sedentary = $9, factor_light = $10, factor_moderate = $11, factor_active = $12, factor_very_active = $13,
          goal_lose = $14, goal_maintain = $15, goal_gain = $16,
          protein_per_kg = $17, fat_pct_calories = $18,
          protein_per_kg_lose = $19, fat_pct_lose = $20,
          protein_per_kg_maintain = $21, fat_pct_maintain = $22,
          protein_per_kg_gain = $23, fat_pct_gain = $24,
          updated_at = NOW()
        WHERE id = '00000000-0000-0000-0000-000000000001'`,
        [
          dto.bmrMaleBase, dto.bmrMaleWeight, dto.bmrMaleHeight, dto.bmrMaleAge,
          dto.bmrFemaleBase, dto.bmrFemaleWeight, dto.bmrFemaleHeight, dto.bmrFemaleAge,
          dto.factorSedentary, dto.factorLight, dto.factorModerate, dto.factorActive, dto.factorVeryActive,
          dto.goalLose, dto.goalMaintain, dto.goalGain,
          dto.proteinPerKg, dto.fatPctCalories,
          dto.proteinPerKgLose, dto.fatPctLose,
          dto.proteinPerKgMaintain, dto.fatPctMaintain,
          dto.proteinPerKgGain, dto.fatPctGain,
        ]
      );
      return { message: 'Configuración actualizada correctamente' };
    } catch (e) { throw new Error(`Error updating config: ${e.message}`); }
  }


  async getNutritionStats(userId: string) {
    const goal = await this.getGoals(userId);
    if (!goal) return null;

    // Calculate last 30 days macro compliance per macro
    const days = 30;
    let totalCal = 0, totalProt = 0, totalCarbs = 0, totalFat = 0;
    let daysWithData = 0;
    let consecutiveStreak = 0;
    let streakBroken = false;

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const { totals } = await this.getDayLogs(userId, dateStr);

      if (totals.calories > 0) {
        if (!streakBroken) consecutiveStreak++;

        const pctCal   = Math.min(100, (totals.calories / Number(goal.dailyCalories)) * 100);
        const pctProt  = Math.min(100, (totals.protein  / Number(goal.dailyProteinG))  * 100);
        const pctCarbs = Math.min(100, (totals.carbs    / Number(goal.dailyCarbsG))    * 100);
        const pctFat   = Math.min(100, (totals.fat      / Number(goal.dailyFatG))      * 100);

        totalCal   += pctCal;
        totalProt  += pctProt;
        totalCarbs += pctCarbs;
        totalFat   += pctFat;
        daysWithData++;
      } else {
        if (i < 3) streakBroken = true; // only break streak for recent days
      }
    }

    if (daysWithData === 0) {
      return { streak: consecutiveStreak, calories: 0, protein: 0, carbs: 0, fat: 0, overall: 0 };
    }

    return {
      streak: consecutiveStreak,
      calories: Math.round(totalCal   / daysWithData),
      protein:  Math.round(totalProt  / daysWithData),
      carbs:    Math.round(totalCarbs / daysWithData),
      fat:      Math.round(totalFat   / daysWithData),
      overall:  Math.round((totalCal + totalProt + totalCarbs + totalFat) / (daysWithData * 4)),
    };
  }


  async getStudentDayLogs(studentId: string, date?: string) {
    const { logs } = await this.getDayLogs(studentId, date);
    return logs;
  }

  async getStudentLogDays(studentId: string, from?: string, to?: string) {
    let query = `
      SELECT 
        log_date::text as date,
        COUNT(*) as count,
        SUM(calories) as "totalCalories",
        SUM(protein) as "totalProtein",
        SUM(carbs) as "totalCarbs",
        SUM(fat) as "totalFat"
      FROM food_logs
      WHERE user_id = $1
    `;
    const params: any[] = [studentId];
    if (from) { params.push(from); query += ` AND log_date >= $${params.length}`; }
    if (to)   { params.push(to);   query += ` AND log_date <= $${params.length}`; }
    query += ` GROUP BY log_date ORDER BY log_date DESC LIMIT 60`;

    const rows = await this.foodRepo.manager.query(query, params);
    return rows.map((r: any) => ({
      date:          r.date,
      count:         parseInt(r.count),
      totalCalories: parseFloat(r.totalCalories) || 0,
      totalProtein:  parseFloat(r.totalProtein)  || 0,
      totalCarbs:    parseFloat(r.totalCarbs)    || 0,
      totalFat:      parseFloat(r.totalFat)      || 0,
    }));
  }
}