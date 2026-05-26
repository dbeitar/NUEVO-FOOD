import { IsBoolean, IsEmail, IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class ShellExchangeDto {
  @IsString()
  token: string;
}

export class ShellProvisionDto {
  @IsInt()
  shellUserId: number;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsInt()
  @IsOptional()
  trainerId?: number;

  @IsInt()
  @IsOptional()
  gymId?: number;

  @IsObject()
  @IsOptional()
  branding?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  roles?: string[];
}

export class ShellLinkDto extends ShellProvisionDto {
  @IsString()
  @IsOptional()
  trainingUserId?: string;
}
