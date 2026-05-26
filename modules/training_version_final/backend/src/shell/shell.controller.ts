import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { ShellProvisionDto } from '../auth/dto/shell-auth.dto';
import { Public } from '../common/guards/auth.guard';

@Controller('training')
export class ShellController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('shell-provision')
  shellProvision(@Body() dto: ShellProvisionDto, @Headers('x-shell-key') shellKey: string) {
    const expected = process.env.TRAINING_SHELL_API_KEY;
    if (!expected || shellKey !== expected) {
      throw new UnauthorizedException('Shell API key inválida');
    }
    return this.authService.provisionFromShell(dto);
  }
}
