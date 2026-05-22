import { Controller, Get, Post, Delete, Put, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NutritionService } from './nutrition.service';
import { UserRole } from '../users/entities/user.entity';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guard';

@ApiTags('Nutrition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('nutrition')
export class NutritionController {
  constructor(
    private nutritionService: NutritionService,
    private chatbotService: ChatbotService,
  ) {}

  @Get('foods/search')
  @ApiOperation({ summary: 'Buscar alimentos' })
  searchFoods(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.nutritionService.searchFoods(q, limit);
  }

  @Get('foods/all')
  @ApiOperation({ summary: 'Listar todos los alimentos' })
  getAllFoods(@Query('page') page?: string, @Query('search') search?: string, @Query('showInactive') showInactive?: string) {
    return this.nutritionService.getAllFoods(parseInt(page || '1'), search, showInactive === 'true');
  }

  @Get('foods/:id')
  @ApiOperation({ summary: 'Obtener alimento por ID' })
  getFood(@Param('id') id: string) {
    return this.nutritionService.getFoodById(id);
  }

  @Post('logs')
  @ApiOperation({ summary: 'Registrar alimento consumido' })
  addLog(@CurrentUser() user: any, @Body() dto: any, @Headers('x-timezone') tz?: string) {
    return this.nutritionService.addFoodLog(user.id, { ...dto, timezone: tz });
  }

  @Post('logs/recipe')
  @ApiOperation({ summary: 'Registrar receta como comida' })
  addRecipeLog(@CurrentUser() user: any, @Body() dto: any, @Headers('x-timezone') tz?: string) {
    return this.nutritionService.addRecipeLog(user.id, { ...dto, timezone: tz });
  }

  @Get('logs/today')
  @ApiOperation({ summary: 'Registros del día actual' })
  getTodayLogs(@CurrentUser() user: any, @Headers('x-timezone') tz?: string) {
    return this.nutritionService.getDayLogs(user.id, undefined, tz);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Registros de una fecha específica' })
  getLogs(@CurrentUser() user: any, @Query('date') date: string, @Headers('x-timezone') tz?: string) {
    return this.nutritionService.getDayLogs(user.id, date, tz);
  }

  @Delete('logs/:id')
  @ApiOperation({ summary: 'Eliminar registro de alimento' })
  deleteLog(@Param('id') id: string, @CurrentUser() user: any) {
    return this.nutritionService.deleteLog(id, user.id);
  }

  @Get('goals')
  @ApiOperation({ summary: 'Obtener metas nutricionales' })
  getGoals(@CurrentUser() user: any) {
    return this.nutritionService.getGoals(user.id);
  }

  @Post('goals')
  @ApiOperation({ summary: 'Crear o actualizar metas nutricionales' })
  updateGoals(@CurrentUser() user: any, @Body() dto: any) {
    return this.nutritionService.updateGoals(user.id, dto);
  }

  @Get('traffic-light')
  @ApiOperation({ summary: 'Estado del semáforo nutricional propio' })
  getMyTrafficLight(@CurrentUser() user: any) {
    return this.nutritionService.getTrafficLight(user.id);
  }

  @Get('traffic-light/:userId')
  @ApiOperation({ summary: 'Estado del semáforo de un usuario (entrenador/admin)' })
  getTrafficLight(@Param('userId') userId: string) {
    return this.nutritionService.getTrafficLight(userId);
  }

  @Get('equivalences/:foodId')
  @ApiOperation({ summary: 'Reemplazos equivalentes de un alimento' })
  getEquivalences(@Param('foodId') foodId: string) {
    return this.nutritionService.getEquivalences(foodId);
  }

  @Post('chatbot')
  @ApiOperation({ summary: 'Enviar mensaje al chatbot nutricional' })
  chatbot(
    @CurrentUser() user: any,
    @Body('message') message: string,
    @Body('history') history?: { role: 'user' | 'assistant'; content: string }[],
    @Body('context') context?: any,
  ) {
    return this.chatbotService.chat(message, history || [], context);
  }

  @Get('water/today')
  @ApiOperation({ summary: 'Agua de hoy' })
  getWaterToday(@CurrentUser() user: any, @Headers('x-timezone') tz?: string) {
    return this.nutritionService.getWaterToday(user.id, tz);
  }

  @Post('water/update')
  @ApiOperation({ summary: 'Actualizar vasos de agua' })
  updateWater(@CurrentUser() user: any, @Body('glasses') glasses: number, @Body('goal') goal?: number, @Headers('x-timezone') tz?: string) {
    return this.nutritionService.updateWater(user.id, glasses, goal, tz);
  }

  @Get('streak')
  @ApiOperation({ summary: 'Racha de días con registro' })
  getStreak(@CurrentUser() user: any) {
    return this.nutritionService.getStreak(user.id);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Calendario mensual de cumplimiento' })
  getCalendar(@CurrentUser() user: any, @Query('year') year: string, @Query('month') month: string) {
    return this.nutritionService.getCalendarMonth(user.id, parseInt(year), parseInt(month));
  }

  @Get('frequent-foods')
  @ApiOperation({ summary: 'Alimentos frecuentes del usuario' })
  getFrequentFoods(@CurrentUser() user: any) {
    return this.nutritionService.getFrequentFoods(user.id);
  }

  // ── Food management (Super Admin) ──
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('foods')
  @ApiOperation({ summary: 'Crear alimento' })
  createFood(@Body() dto: any) {
    return this.nutritionService.createFood(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Put('foods/:id')
  @ApiOperation({ summary: 'Actualizar alimento' })
  updateFood(@Param('id') id: string, @Body() dto: any) {
    return this.nutritionService.updateFood(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Delete('foods/:id')
  @ApiOperation({ summary: 'Eliminar alimento' })
  deleteFood(@Param('id') id: string) {
    return this.nutritionService.deleteFood(id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('foods/import')
  @ApiOperation({ summary: 'Importar alimentos desde JSON' })
  importFoods(@Body() dto: { foods: any[] }) {
    return this.nutritionService.importFoods(dto.foods);
  }

  @UseGuards(RolesGuard)


  // ── Usual meals ──
  @Get('usual-meals')
  @ApiOperation({ summary: 'Ver comidas habituales del usuario' })
  getUsualMeals(@CurrentUser() user: any) {
    return this.nutritionService.getUsualMeals(user.id);
  }

  @Post('usual-meals')
  @ApiOperation({ summary: 'Crear comida habitual' })
  createUsualMeal(@CurrentUser() user: any, @Body() dto: any) {
    return this.nutritionService.createUsualMeal(user.id, dto);
  }

  @Delete('usual-meals/:id')
  @ApiOperation({ summary: 'Eliminar comida habitual' })
  deleteUsualMeal(@CurrentUser() user: any, @Param('id') id: string) {
    return this.nutritionService.deleteUsualMeal(user.id, id);
  }


  // ── Daily steps ──
  @Get('steps/today')
  @ApiOperation({ summary: 'Pasos de hoy' })
  getTodaySteps(@CurrentUser() user: any, @Headers('x-timezone') tz?: string) {
    return this.nutritionService.getTodaySteps(user.id, tz);
  }

  @Post('steps/update')
  @ApiOperation({ summary: 'Actualizar pasos del día' })
  updateSteps(@CurrentUser() user: any, @Body('steps') steps: number, @Headers('x-timezone') tz?: string) {
    return this.nutritionService.updateSteps(user.id, steps, tz);
  }


  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas nutricionales del usuario' })
  getNutritionStats(@CurrentUser() user: any) {
    return this.nutritionService.getNutritionStats(user.id);
  }


  @Get('student/:studentId/logs')
  @ApiOperation({ summary: 'Ver logs de comida de un asesorado por fecha (entrenador)' })
  getStudentFoodLogs(
    @CurrentUser() user: any,
    @Param('studentId') studentId: string,
    @Query('date') date: string,
  ) {
    return this.nutritionService.getStudentDayLogs(studentId, date);
  }

  @Get('student/:studentId/log-days')
  @ApiOperation({ summary: 'Dias con registros de comida del asesorado' })
  getStudentLogDays(
    @Param('studentId') studentId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.nutritionService.getStudentLogDays(studentId, from, to);
  }
}