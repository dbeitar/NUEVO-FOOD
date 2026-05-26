import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Recipe } from './recipe.entity';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe) private recipeRepo: Repository<Recipe>,
  ) {}

  // ── Public: list all active recipes ──
  async findAll(filters: { category?: string; objective?: string; search?: string }) {
    const where: any = { isActive: true };
    if (filters.category) where.category = filters.category;
    if (filters.objective) where.objective = filters.objective;
    if (filters.search) where.name = ILike(`%${filters.search}%`);

    return this.recipeRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // ── Public: get one recipe ──
  async findOne(id: string) {
    const recipe = await this.recipeRepo.findOne({ where: { id, isActive: true } });
    if (!recipe) throw new NotFoundException('Receta no encontrada');
    return recipe;
  }

  // ── SuperAdmin: create recipe ──
  async create(dto: Partial<Recipe>, userId: string) {
    const recipe = this.recipeRepo.create({ ...dto, createdBy: userId });
    return this.recipeRepo.save(recipe);
  }

  // ── SuperAdmin: update recipe ──
  async update(id: string, dto: Partial<Recipe>) {
    const recipe = await this.recipeRepo.findOne({ where: { id } });
    if (!recipe) throw new NotFoundException('Receta no encontrada');
    Object.assign(recipe, dto);
    return this.recipeRepo.save(recipe);
  }

  // ── SuperAdmin: delete recipe (soft) ──
  async remove(id: string) {
    const recipe = await this.recipeRepo.findOne({ where: { id } });
    if (!recipe) throw new NotFoundException('Receta no encontrada');
    recipe.isActive = false;
    await this.recipeRepo.save(recipe);
    return { message: 'Receta eliminada correctamente' };
  }


  async importFromExcel(filePath: string, createdBy: string) {
    const XLSX = require('xlsx');
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { range: 2, defval: '', raw: false });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const name = (row['Nombre de la Receta *'] || '').trim();
      if (!name) continue;

      try {
        // Check duplicate
        const exists = await this.recipeRepo.findOne({ where: { name } });
        if (exists) { skipped++; continue; }

        const ingredientsRaw = (row['Ingredientes (separados por |)'] || '').toString();
        const stepsRaw = (row['Pasos (separados por |)'] || '').toString();

        const ingredients = ingredientsRaw.split('|').filter(Boolean).map((s: string) => ({ name: s.trim() }));
        const steps = stepsRaw.split('|').filter(Boolean).map((s: string) => s.trim());

        await this.recipeRepo.save(this.recipeRepo.create({
          name,
          description: (row['Descripción'] || '').toString().trim() || null,
          category: (row['Categoría *'] || '').toString().trim() || null,
          objective: (row['Objetivo'] || '').toString().trim() || null,
          prepTimeMin: parseInt(row['Tiempo Prep (min)']) || null,
          servings: parseInt(row['Porciones']) || 1,
          calories: parseFloat(row['Calorías']) || null,
          protein: parseFloat(row['Proteína (g)']) || null,
          carbs: parseFloat(row['Carbos (g)']) || null,
          fat: parseFloat(row['Grasas (g)']) || null,
          ingredients: JSON.stringify(ingredients),
          steps: JSON.stringify(steps),
          createdBy,
          isActive: true,
        }));
        imported++;
      } catch (e) {
        errors.push(`Fila "${name}": ${e.message}`);
      }
    }

    // Clean up temp file
    require('fs').unlink(filePath, () => {});

    return {
      message: `Importación completada: ${imported} recetas importadas, ${skipped} omitidas (duplicadas)`,
      imported,
      skipped,
      errors: errors.slice(0, 10),
    };
  }
}