const pool = require('../backend/src/config/database');

const ensurePlans = async () => {
  try {
    const res = await pool.query('SELECT count(*) FROM plans');
    const count = parseInt(res.rows[0].count, 10);
    console.log(`Current plans count: ${count}`);

    if (count === 0) {
      console.log('Inserting default plan...');
      // Insert a default plan created by admin (assuming admin exists or using null)
      // created_por references users(id). I need a valid user ID.
      // I'll fetch the first user.
      const userRes = await pool.query('SELECT id FROM users LIMIT 1');
      let userId = null;
      if (userRes.rows.length > 0) {
        userId = userRes.rows[0].id;
      } else {
        console.warn('No users found. Cannot link plan to creator. Using NULL if allowed.');
      }

      await pool.query(
        `INSERT INTO plans (nombre, descripcion, duracion, objetivos, creado_por)
         VALUES ($1, $2, $3, $4, $5)`,
        ['Plan Estándar', 'Plan nutricional equilibrado para mantenimiento.', 30, 'Mantenimiento', userId]
      );
      console.log('Default plan inserted.');
    } else {
      console.log('Plans already exist.');
    }
  } catch (err) {
    console.error('Error ensuring plans:', err);
  } finally {
    await pool.end();
  }
};

ensurePlans();
