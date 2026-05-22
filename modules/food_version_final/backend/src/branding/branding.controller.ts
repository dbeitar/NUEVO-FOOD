import { Controller, Put, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ShellBrandingDto } from '../auth/dto/shell-auth.dto';

@ApiTags('Branding')
@Controller('branding')
export class BrandingController {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  private assertShellKey(key: string | undefined) {
    const expected = process.env.FOOD_SHELL_API_KEY;
    if (!expected || !key || key !== expected) {
      throw new UnauthorizedException('Shell API key inválida');
    }
  }

  @Put('shell')
  @ApiOperation({ summary: 'Sincronizar marca blanca desde D28D Shell (server-to-server)' })
  async applyShellBranding(
    @Headers('x-shell-key') shellKey: string,
    @Body() dto: ShellBrandingDto,
  ) {
    this.assertShellKey(shellKey);
    const user = await this.userRepo.findOne({ where: { id: dto.foodUserId, deletedAt: null } });
    if (!user) return { ok: false, error: 'Usuario Food no encontrado' };
    const meta = {
      ...(user as any).shellBranding,
      ...dto.branding,
      syncedAt: new Date().toISOString(),
    };
    user.avatarUrl = (dto.branding as any).logo_url || user.avatarUrl;
    user.shellBranding = meta;
    await this.userRepo.save(user);
    return { ok: true, branding: meta };
  }
}
