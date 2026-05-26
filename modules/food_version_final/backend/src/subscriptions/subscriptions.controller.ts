import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard, RolesGuard, Roles, Public, CurrentUser } from '../common/guards/auth.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Obtener todos los planes disponibles' })
  getPlans() {
    return this.subService.getPlans();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @Put('plans/:id')
  @ApiOperation({ summary: 'Actualizar un plan (Super Admin)' })
  updatePlan(@Param('id') id: string, @Body() dto: any) {
    return this.subService.updatePlan(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('my')
  @ApiOperation({ summary: 'Obtener suscripción activa del usuario' })
  getMySub(@CurrentUser() user: any) {
    return this.subService.getUserSubscription(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('history')
  @ApiOperation({ summary: 'Historial de suscripciones' })
  getHistory(@CurrentUser() user: any) {
    return this.subService.getUserSubscriptionHistory(user.id);
  }


  @Get('features')
  @ApiOperation({ summary: 'Obtener todas las features disponibles (público)' })
  getAllFeatures() {
    return this.subService.getAllFeatures();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @Put('features/:key')
  @ApiOperation({ summary: 'Actualizar nombre/descripción de una feature' })
  updateFeature(@Param('key') key: string, @Body() dto: any) {
    return this.subService.updateFeature(key, dto);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Put('user/:userId/cancel')
  @ApiOperation({ summary: 'Cancelar suscripción de un usuario' })
  cancelSub(@Param('userId') userId: string) {
    return this.subService.cancelUserSubscription(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Put('user/:userId/extend')
  @ApiOperation({ summary: 'Extender suscripción de un usuario' })
  extendSub(@Param('userId') userId: string, @Body('days') days: number, @Body('planType') planType?: string) {
    return this.subService.extendUserSubscription(userId, days, planType);
  }
}