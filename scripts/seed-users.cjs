const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    // const salt = await bcrypt.genSalt(10);
    // const hash = await bcrypt.hash('123456', salt);
    const hash = await bcrypt.hash('123456', 10);

    // Create Admin User
    const adminEmail = 'admin@mvpfood.com';
    const adminQuery = `
      INSERT INTO users (nombre, email, clave_hash, rol)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET clave_hash = $3
      RETURNING *;
    `;
    const adminRes = await pool.query(adminQuery, ['Admin User', adminEmail, hash, 'admin']);
    
    if (adminRes.rows.length > 0) {
      console.log(`User created/updated: ${adminEmail} / 123456`);
    }

    // Create Normal User
    const userEmail = 'test@mvpfood.com';
    const userQuery = `
      INSERT INTO users (nombre, email, clave_hash, rol)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET clave_hash = $3
      RETURNING *;
    `;
    const userRes = await pool.query(userQuery, ['Test User', userEmail, hash, 'usuario_final']);

    if (userRes.rows.length > 0) {
      console.log(`User created/updated: ${userEmail} / 123456`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding users:', err);
    process.exit(1);
  }
})();