import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard, Roles, RolesGuard, CurrentUser } from '../common/guards/auth.guard';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COACH, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class SubscriptionsController {
  constructor(private subs: SubscriptionsService) {}

  @Get('overview')
  overview(@CurrentUser() coach: User) {
    return this.subs.overview(coach);
  }

  @Post('confirm/:id')
  confirm(
    @CurrentUser() coach: User,
    @Param('id') id: string,
    @Body('days') days: number,
  ) {
    return this.subs.confirm(coach, id, Number(days) || 30);
  }

  @Post('extend/:userId')
  extend(
    @CurrentUser() coach: User,
    @Param('userId') userId: string,
    @Body('days') days: number,
  ) {
    return this.subs.extend(coach, userId, Number(days) || 30);
  }
}
