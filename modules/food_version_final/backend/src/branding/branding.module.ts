import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { BrandingController } from './branding.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [BrandingController],
})
export class BrandingModule {}
