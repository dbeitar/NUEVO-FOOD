import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NutritionPlanService } from './nutrition-plan.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Nutrition Plan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('nutrition-plan')
export class NutritionPlanController {
  constructor(private svc: NutritionPlanService) {}

  // User gets own profile
  @Get('my-profile')
  @ApiOperation({ summary: 'Obtener mi perfil nutricional' })
  getMyProfile(@CurrentUser() user: any) {
    return this.svc.getProfile(user.id);
  }

  // User saves own profile
  @Post('my-profile')
  @ApiOperation({ summary: 'Guardar mi perfil nutricional' })
  saveMyProfile(@CurrentUser() user: any, @Body() dto: any) {
    return this.svc.saveProfile(user.id, dto);
  }

  // Trainer gets student's plan
  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('student/:studentId')
  @ApiOperation({ summary: 'Ver plan nutricional de asesorado' })
  getStudentPlan(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.svc.getStudentPlan(user.id, studentId);
  }

  // Trainer overrides student macros
  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('student/:studentId/override')
  @ApiOperation({ summary: 'Entrenador ajusta macros del asesorado' })
  trainerOverride(
    @CurrentUser() user: any,
    @Param('studentId') studentId: string,
    @Body() dto: any,
  ) {
    return this.svc.trainerOverride(user.id, studentId, dto);
  }

  // Trainer resets to calculated
  @UseGuards(RolesGuard)
  @Roles(UserRole.TRAINER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('student/:studentId/reset')
  @ApiOperation({ summary: 'Restaurar cálculo automático' })
  resetToCalculated(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.svc.resetToCalculated(user.id, studentId);
  }
}
