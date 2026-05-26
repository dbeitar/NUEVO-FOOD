import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ShellController } from './shell.controller';

@Module({
  imports: [AuthModule],
  controllers: [ShellController],
})
export class ShellModule {}
