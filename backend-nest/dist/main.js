"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: ['https://plan-de-alimentacion-acero.vercel.app', 'http://localhost:5173'],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true
    });
    await app.listen(process.env.PORT ? parseInt(process.env.PORT) : 3000, '0.0.0.0');
}
bootstrap();
