import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CoachService } from './coach.service';
import { JwtAuthGuard, Roles, RolesGuard, CurrentUser } from '../common/guards/auth.guard';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('coach')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COACH, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class CoachController {
  constructor(private coach: CoachService) {}

  @Get('overview')
  overview(@CurrentUser() user: User) {
    return this.coach.overview(user);
  }

  @Get('athletes')
  athletes(@CurrentUser() user: User) {
    return this.coach.listAthletes(user);
  }

  @Get('athletes/:id/progress')
  progress(@CurrentUser() user: User, @Param('id') id: string) {
    return this.coach.athleteProgress(user, id);
  }

  @Get('athletes/:id/notes')
  notes(@CurrentUser() user: User, @Param('id') id: string) {
    return this.coach.listNotes(user, id);
  }

  @Post('athletes/:id/notes')
  addNote(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('texto') texto: string,
  ) {
    return this.coach.addNote(user, id, texto || '');
  }
}
