import { Controller, Post, Body, Get, Patch, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { ShellExchangeDto, ShellLinkDto } from './dto/shell-auth.dto';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { Public, CurrentUser } from '../common/guards/auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('shell-exchange')
  @ApiOperation({ summary: 'SSO desde D28D Platform Shell (token corto)' })
  shellExchange(@Body() dto: ShellExchangeDto) {
    return this.authService.shellExchange(dto);
  }

  @Public()
  @Post('shell-link')
  @ApiOperation({ summary: 'Vincular/suspender usuario Food desde Shell (API key)' })
  shellLink(@Body() dto: ShellLinkDto, @Headers('x-shell-key') shellKey: string) {
    return this.authService.shellLink(dto, shellKey);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Recuperar contraseña - envía nueva contraseña al correo' })
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('change-password')
  @ApiOperation({ summary: 'Cambiar contraseña' })
  changePassword(
    @CurrentUser() user: any,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changePassword(user.id, currentPassword, newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access token' })
  refresh(@CurrentUser() user: any) {
    return this.authService.refreshToken(user.id);
  }


  @Post('request-renewal')
  @ApiOperation({ summary: 'Solicitar renovación de plan' })
  requestRenewal(@Body('email') email: string) {
    return this.authService.requestRenewal(email);
  }
}