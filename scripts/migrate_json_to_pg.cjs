require('dotenv').config({ path: './backend/.env' });
const fs = require('fs');
const path = require('path');
const { query } = require('../backend/src/config/dbClient');

const DATA_DIR = path.join(__dirname, '../backend/data');

async function migrate() {
  console.log('🚀 Iniciando migración de JSON a PostgreSQL...');

  try {
    // 1. Migrar Usuarios
    console.log('👥 Migrando usuarios...');
    const users = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf-8'));
    for (const u of users) {
      await query(`
        INSERT INTO users (
          id, nombre, email, telefono, fecha_nacimiento, peso, altura, objetivo, 
          clave_hash, rol, roles, permissions, module_access, nivel_actividad, 
          tiene_restricciones, restricciones_detalles, genero, id_entrenador, 
          id_gimnasio, fecha_registro
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (email) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          rol = EXCLUDED.rol,
          roles = EXCLUDED.roles,
          permissions = EXCLUDED.permissions
      `, [
        u.id, u.nombre, u.email, u.telefono, u.fecha_nacimiento, u.peso, u.altura, u.objetivo,
        u.clave_hash, u.rol, JSON.stringify(u.roles || []), JSON.stringify(u.permissions || []), 
        JSON.stringify(u.module_access || {}), u.nivel_actividad, u.tiene_restricciones || false, 
        u.restricciones_detalles || '', u.genero, u.trainer_id, u.gym_id, u.fecha_registro || new Date()
      ]);
    }
    console.log(`✅ ${users.length} usuarios procesados.`);

    // 2. Migrar Alimentos
    console.log('🍎 Migrando alimentos...');
    const foods = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'foods.json'), 'utf-8'));
    for (const f of foods) {
      await query(`
        INSERT INTO food_items (
          id, nombre, barcode, categoria, marca, cantidad, unidad, 
          calorias, proteina, carbohidratos, grasas, activo, creado_en
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (barcode) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          categoria = EXCLUDED.categoria,
          calorias = EXCLUDED.calorias
      `, [
        f.id, f.nombre, f.barcode, f.categoria, f.marca, f.cantidad, f.unidad,
        f.calorias, f.proteina, f.carbohidratos, f.grasas, f.activo ?? true, f.createdAt || new Date()
      ]);
    }
    console.log(`✅ ${foods.length} alimentos procesados.`);

    // 3. Migrar Gimnasios
    console.log('🏢 Migrando gimnasios...');
    if (fs.existsSync(path.join(DATA_DIR, 'gyms.json'))) {
      const gyms = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'gyms.json'), 'utf-8'));
      for (const g of gyms) {
        await query(`
          INSERT INTO gyms (id, nombre, direccion, telefono, email, plan_contratado)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [g.id, g.nombre, g.direccion, g.telefono, g.email, g.plan_contratado]);
      }
    }

    console.log('🎉 Migración completada con éxito.');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    process.exit();
  }
}

migrate();
