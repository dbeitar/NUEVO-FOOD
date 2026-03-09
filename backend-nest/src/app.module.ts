import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UsersModule } from './users/users.module'
import { HealthController } from './health.controller'
import { User } from './users/user.entity'
import * as fs from 'fs'
import * as path from 'path'

function typeOrmFactory() {
  const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true'
  let ssl: any = false
  if (sslEnabled) {
    const caPath = process.env.DB_CA_PATH || (fs.existsSync('./ca.pem') ? './ca.pem' : path.resolve(process.cwd(), '../ca.pem'))
    try {
      const ca = fs.readFileSync(caPath).toString()
      ssl = { ca, rejectUnauthorized: false }
    } catch {
      ssl = { rejectUnauthorized: false }
    }
  }
  return {
    type: 'mysql' as const,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [User],
    synchronize: false,
    ssl
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: typeOrmFactory }),
    UsersModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
