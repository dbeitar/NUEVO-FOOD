const fs = require('fs');
const { Pool } = require('pg');
const mysql = require('mysql2/promise');

const client = (process.env.DB_CLIENT || '').toLowerCase() || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('mysql') ? 'mysql' : 'pg');
const useSSL = String(process.env.DB_SSL || '').toLowerCase() === 'true';
let sslConfig = false;
if (useSSL) {
  const caPath = process.env.DB_CA_PATH || './ca.pem';
  try {
    const ca = fs.readFileSync(caPath).toString();
    sslConfig = { ca, rejectUnauthorized: true };
  } catch {
    sslConfig = { rejectUnauthorized: true };
  }
}

let pgPool = null;
let mysqlPool = null;

async function init() {
  if (client === 'mysql') {
    if (!mysqlPool) {
      mysqlPool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: sslConfig || undefined,
        waitForConnections: true,
        connectionLimit: 10,
      });
    }
  } else {
    if (!pgPool) {
      if (process.env.DATABASE_URL) {
        pgPool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: sslConfig || (process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false),
        });
      } else {
        pgPool = new Pool({
          host: process.env.DB_HOST,
          port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          ssl: sslConfig,
        });
      }
    }
  }
}

function toMySQL(text) {
  return text.replace(/\$\d+/g, '?');
}

async function query(text, params = []) {
  await init();
  if (client === 'mysql') {
    const sql = toMySQL(text);
    const [rows, meta] = await mysqlPool.execute(sql, params);
    // For INSERT/UPDATE, mysql2 returns an OkPacket as first element
    if (rows && typeof rows.insertId !== 'undefined') {
      return { rows: [], insertId: rows.insertId, affectedRows: rows.affectedRows };
    }
    return { rows };
  }
  const res = await pgPool.query(text, params);
  return res;
}

// Helper para transacciones en PostgreSQL
async function getTransaction() {
  await init();
  if (client === 'mysql') {
    const connection = await mysqlPool.getConnection();
    await connection.beginTransaction();
    return {
      query: (text, params) => connection.execute(toMySQL(text), params).then(([rows]) => ({ rows })),
      commit: () => connection.commit().then(() => connection.release()),
      rollback: () => connection.rollback().then(() => connection.release()),
    };
  }
  const pgClient = await pgPool.connect();
  await pgClient.query('BEGIN');
  return {
    query: (text, params) => pgClient.query(text, params),
    commit: () => pgClient.query('COMMIT').then(() => pgClient.release()),
    rollback: () => pgClient.query('ROLLBACK').then(() => pgClient.release()),
  };
}

module.exports = { query, getTransaction };
