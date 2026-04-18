const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const useSSL = String(process.env.DB_SSL || '').toLowerCase() === 'true';
let sslConfig = false;
if (useSSL) {
  const caPath = process.env.DB_CA_PATH || './ca.pem';
  try {
    const ca = fs.readFileSync(caPath).toString();
    sslConfig = { ca, rejectUnauthorized: true };
  } catch (e) {
    sslConfig = { rejectUnauthorized: true };
  }
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: sslConfig,
});

pool.on('error', (err) => {
  console.error('Error en pool de PostgreSQL:', err);
});

module.exports = pool;
