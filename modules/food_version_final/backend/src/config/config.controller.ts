import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NutritionService } from '../nutrition/nutrition.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('config')
export class ConfigController {
  constructor(private nutritionService: NutritionService) {}

  @Get('traffic-light')
  @ApiOperation({ summary: 'Obtener configuración del semáforo' })
  getTrafficLightConfig() {
    return this.nutritionService.getConfig();
  }

  @Put('traffic-light')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar configuración del semáforo (Super Admin)' })
  updateTrafficLightConfig(@Body() dto: any, @CurrentUser() user: any) {
    return this.nutritionService.updateConfig(dto, user.id);
  }


  @Get('nutrition-calc')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener config de cálculo nutricional' })
  getNutritionCalcConfig() {
    return this.nutritionService.getNutritionCalcConfig();
  }

  @Put('nutrition-calc')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar config de cálculo nutricional' })
  updateNutritionCalcConfig(@Body() dto: any) {
    return this.nutritionService.updateNutritionCalcConfig(dto);
  }
}