"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const dotenv = require("dotenv");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./users/user.entity");
const fs = require("fs");
const path = require("path");
dotenv.config();
const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true';
let ssl = false;
if (sslEnabled) {
    const caPath = process.env.DB_CA_PATH || (fs.existsSync('./ca.pem') ? './ca.pem' : path.resolve(process.cwd(), '../ca.pem'));
    try {
        const ca = fs.readFileSync(caPath).toString();
        ssl = { ca, rejectUnauthorized: true };
    }
    catch {
        ssl = { rejectUnauthorized: true };
    }
}
const isTs = __filename.endsWith('.ts');
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [user_entity_1.User],
    migrations: isTs ? ['src/migrations/*.ts'] : ['dist/migrations/*.js'],
    synchronize: false,
    ssl
});
exports.default = exports.AppDataSource;
