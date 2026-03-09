import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: ['https://plan-de-alimentacion-acero.vercel.app', 'http://localhost:5173'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
  })
  await app.listen(process.env.PORT ? parseInt(process.env.PORT) : 3000, '0.0.0.0')
}
bootstrap()
