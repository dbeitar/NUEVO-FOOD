import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PlanType } from '../../subscriptions/entities/subscription.entity';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  password: string;
}

export class RegisterDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(2) firstName: string;
  @ApiProperty() @IsString() @MinLength(2) lastName: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ enum: PlanType }) @IsEnum(PlanType) planType: PlanType;

  // Profile fields
  @ApiProperty({ required: false }) @IsOptional() weightKg?: number;
  @ApiProperty({ required: false }) @IsOptional() heightCm?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() birthDate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() gender?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() goalType?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() activityLevel?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() hasDietaryRestrictions?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsString() dietaryRestrictionsDetail?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() acceptedPrivacyPolicy?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() acceptedTerms?: boolean;
}

export class ForgotPasswordDto {
  @ApiProperty() @IsEmail() email: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsString() token: string;
  @ApiProperty() @IsString() @MinLength(6) newPassword: string;
}
