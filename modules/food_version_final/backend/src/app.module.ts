import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GymsModule } from './gyms/gyms.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { TrainerModule } from './trainer/trainer.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { NutritionPlanModule } from './nutrition-plan/nutrition-plan.module';
import { MeasurementsModule } from './measurements/measurements.module';
import { ConfigAppModule } from './config/config.module';
import { DailyReportModule } from './daily-report/daily-report.module';
import { RecipesModule } from './recipes/recipes.module';
import { BrandingModule } from './branding/branding.module';
import { BootstrapService } from './common/bootstrap.service';
import { User } from './users/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forFeature([User]),
    AuthModule,
    UsersModule,
    GymsModule,
    NutritionModule,
    TrainerModule,
    SubscriptionsModule,
    ConfigAppModule,
    NutritionPlanModule,
    MeasurementsModule,
    DailyReportModule,
    RecipesModule,
    BrandingModule,
  ],
  providers: [BootstrapService],
})
export class AppModule {}
