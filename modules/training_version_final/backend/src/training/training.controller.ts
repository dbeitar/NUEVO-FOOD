import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TrainingService } from './training.service';
import { JwtAuthGuard, Roles, RolesGuard, CurrentUser } from '../common/guards/auth.guard';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('training')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainingController {
  constructor(private training: TrainingService) {}

  @Get('plan')
  getMyPlan(@CurrentUser() user: User) {
    return this.training.getMyPlan(user);
  }

  @Put('plan')
  updateMyPlan(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.training.updateMyPlan(user, body as never);
  }

  @Get('logs')
  listLogs(@CurrentUser() user: User) {
    return this.training.listMyLogs(user);
  }

  @Post('logs')
  createLog(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.training.createLog(user, body as never);
  }

  @Roles(UserRole.COACH, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('coach/plan/:athleteId')
  coachPlan(@CurrentUser() coach: User, @Param('athleteId') athleteId: string) {
    return this.training.getPlanForAthlete(coach, athleteId);
  }

  @Roles(UserRole.COACH, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('coach/plan/:athleteId')
  coachUpdatePlan(
    @CurrentUser() coach: User,
    @Param('athleteId') athleteId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.training.updatePlanForAthlete(coach, athleteId, body as never);
  }

  @Roles(UserRole.COACH, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('gallery')
  gallery(@CurrentUser() coach: User) {
    return this.training.listGallery(coach);
  }

  @Roles(UserRole.COACH, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('gallery')
  addGallery(@CurrentUser() coach: User, @Body() body: Record<string, unknown>) {
    return this.training.addGalleryItem(coach, body as never);
  }

  @Roles(UserRole.COACH, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete('gallery/:id')
  delGallery(@CurrentUser() coach: User, @Param('id') id: string) {
    return this.training.deleteGalleryItem(coach, Number(id));
  }
}
