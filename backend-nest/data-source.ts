import 'reflect-metadata'
import * as dotenv from 'dotenv'
import { DataSource } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config()

const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true'
let ssl: any = false
if (sslEnabled) {
  const caPath =
    process.env.DB_CA_PATH ||
    (fs.existsSync('./ca.pem') ? './ca.pem' : path.resolve(process.cwd(), '../ca.pem'))
  try {
    const ca = fs.readFileSync(caPath).toString()
    ssl = { ca, rejectUnauthorized: false }
  } catch {
    ssl = { rejectUnauthorized: false }
  }
}

const isTs = !!process.env.TS_NODE || __filename.endsWith('.ts')

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: isTs ? ['src/**/*.entity.ts'] : ['dist/**/*.entity.js'],
  migrations: isTs ? ['src/migrations/*.ts'] : ['dist/migrations/*.js'],
  synchronize: false,
  ssl
})

export default AppDataSource
