import { IsEmail, IsString, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShellExchangeDto {
  @ApiProperty() @IsString() token: string;
}

export class ShellLinkDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsNumber() shellUserId: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() foodUserId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() active?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() promoteTrainer?: boolean;
}

/** Sincroniza contraseña Food = puente D28D (requiere FOOD_SHELL_API_KEY). */
export class ShellSyncBridgeDto {
  @ApiProperty() @IsEmail() email: string;
}

export class ShellBrandingDto {
  @ApiProperty() @IsString() foodUserId: string;
  @ApiProperty() @IsObject() branding: Record<string, unknown>;
}
