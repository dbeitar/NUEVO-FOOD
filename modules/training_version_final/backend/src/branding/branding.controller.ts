import { Controller, Get, Put, Body, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard, CurrentUser, Public } from '../common/guards/auth.guard';

@Controller('branding')
export class BrandingController {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: User) {
    return { branding: user.shellBranding || {} };
  }

  @Public()
  @Put('shell')
  async shellSync(
    @Headers('x-shell-key') shellKey: string,
    @Body() body: { trainingUserId?: string; shellUserId?: number; branding?: Record<string, unknown> },
  ) {
    const expected = process.env.TRAINING_SHELL_API_KEY;
    if (!expected || shellKey !== expected) {
      throw new UnauthorizedException('Shell API key inválida');
    }
    let user: User | null = null;
    if (body.trainingUserId) {
      user = await this.userRepo.findOne({ where: { id: body.trainingUserId } });
    }
    if (!user && body.shellUserId) {
      user = await this.userRepo.findOne({ where: { shellUserId: body.shellUserId } });
    }
    if (!user) return { ok: false, error: 'Usuario no encontrado' };
    user.shellBranding = { ...(user.shellBranding || {}), ...(body.branding || {}) };
    await this.userRepo.save(user);
    return { ok: true, branding: user.shellBranding };
  }
}
