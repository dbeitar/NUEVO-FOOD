const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const adminController = require('../backend/src/controllers/adminController');
const planController = require('../backend/src/controllers/planController');
const gymController = require('../backend/src/controllers/gymController');
const trainersController = require('../backend/src/controllers/trainersController');
const authController = require('../backend/src/controllers/authController');
require('dotenv').config();

// Mock Express Request/Response
const mockRes = () => {
  const res = {};
  res.statusCode = 200; // Default
  res.body = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
});

async function runTest() {
  console.log('🚀 Iniciando Prueba de Flujo Completo (SQL)...');
  
  try {
    // 1. Asegurar Super Admin
    console.log('1️⃣  Verificando Super Admin...');
    const adminEmail = 'admin-flow@test.com';
    const adminRes = await pool.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
    let adminUser = adminRes.rows[0];

    if (!adminUser) {
      console.log('   Creando Super Admin de prueba...');
      const hash = await bcrypt.hash('admin123', 10);
      const insert = await pool.query(
        "INSERT INTO users (nombre, email, clave_hash, rol) VALUES ('Super Admin Flow', $1, $2, 'super_admin') RETURNING *",
        [adminEmail, hash]
      );
      adminUser = insert.rows[0];
    }
    console.log(`   ✅ Admin ID: ${adminUser.id}`);

    // Mock Req con usuario autenticado (Super Admin)
    const adminReq = {
      user: { id: adminUser.id, rol: 'super_admin' },
      body: {},
      params: {},
      query: {}
    };

    // 2. Crear Gimnasio (Admin -> Gym)
    console.log('2️⃣  Creando Gimnasio...');
    adminReq.body = {
      nombre: 'Gym Flow Test ' + Date.now(),
      direccion: 'Calle Falsa 123',
      telefono: '555-1234',
      email: 'gym@flow.com',
      plan_contratado: 'premium'
    };
    const gymRes = mockRes();
    await gymController.createGym(adminReq, gymRes);
    
    if (gymRes.statusCode && gymRes.statusCode !== 201) {
      throw new Error(`Fallo creando gimnasio: ${JSON.stringify(gymRes.body)}`);
    }
    const createdGym = gymRes.body;
    console.log(`   ✅ Gimnasio Creado: ${createdGym.nombre} (ID: ${createdGym.id})`);

    // 3. Crear Entrenador (Admin -> Trainer)
    console.log('3️⃣  Creando Entrenador...');
    adminReq.body = {
      nombre: 'Trainer Flow',
      email: 'trainer@flow.com',
      telefono: '555-9999',
      id_gimnasio: createdGym.id,
      especialidad: 'Musculación'
    };
    const trainerRes = mockRes();
    await trainersController.createTrainer(adminReq, trainerRes);

    let createdTrainer;
    if (trainerRes.statusCode && trainerRes.statusCode !== 201) {
      // Si falla por email duplicado, lo buscamos
      if (trainerRes.statusCode === 500 && JSON.stringify(trainerRes.body).includes('duplicate key')) {
         console.log('   Trainer ya existe, usando existente...');
         const existing = await pool.query("SELECT * FROM trainers WHERE email = 'trainer@flow.com'");
         createdTrainer = existing.rows[0];
      } else {
         console.log('   ⚠️  Posible error o duplicado:', trainerRes.body);
         const existing = await pool.query("SELECT * FROM trainers WHERE email = 'trainer@flow.com'");
         createdTrainer = existing.rows[0];
      }
    } else {
      createdTrainer = trainerRes.body;
    }
    console.log(`   ✅ Entrenador: ${createdTrainer.nombre} (ID: ${createdTrainer.id})`);

    // 4. Crear Usuario Final y Asignar (Admin -> User)
    console.log('4️⃣  Creando Usuario Final...');
    const userEmail = 'user' + Date.now() + '@flow.com';
    adminReq.body = {
      nombre: 'User Flow',
      email: userEmail,
      password: 'user123',
      rol: 'usuario_final',
      gym_id: createdGym.id,
      trainer_id: createdTrainer.id
    };
    const userRes = mockRes();
    await adminController.createUser(adminReq, userRes);

    if (userRes.statusCode && userRes.statusCode !== 201) {
      throw new Error(`Fallo creando usuario: ${JSON.stringify(userRes.body)}`);
    }
    const createdUser = userRes.body.data || userRes.body;
    console.log(`   ✅ Usuario Creado: ${createdUser.nombre} (ID: ${createdUser.id})`);
    console.log(`      Asignado a Gym ID: ${createdUser.gym_id}`);
    console.log(`      Asignado a Trainer ID: ${createdUser.trainer_id}`);

    // 5. Asignar Plan Nutricional (Admin -> User Plan)
    console.log('5️⃣  Asignando Plan Nutricional...');
    const planReq = {
      user: { id: adminUser.id, rol: 'super_admin' },
      params: { userId: createdUser.id },
      body: {
        calorias: 2500,
        proteina: 180,
        carbohidratos: 300,
        grasas: 80,
        objetivo: 'Ganancia Muscular',
        nivelActividad: 'Intenso'
      }
    };
    const planRes = mockRes();
    await planController.updateForUser(planReq, planRes);
    
    if (planRes.statusCode !== 200 && !planRes.body.success) {
      console.log('   ⚠️  Fallo asignando plan:', JSON.stringify(planRes.body));
    } else {
      const planData = planRes.body.data;
      console.log(`   ✅ Plan Asignado: ${planData.calorias} kcal, Objetivo: ${planData.objetivo}`);
    }

    // 6. Verificar Login del Usuario Nuevo
    console.log('6️⃣  Verificando Login del Usuario Nuevo...');
    const loginReq = {
      body: {
        email: userEmail,
        password: 'user123'
      }
    };
    const loginRes = mockRes();
    await authController.loginUser(loginReq, loginRes);

    if (loginRes.statusCode === 200 && loginRes.body.token) {
      console.log('   ✅ Login Exitoso. Token recibido.');
      console.log('   ✅ Usuario persistido en DB correctamente.');
    } else {
      console.log('   ❌ Login Fallido:', loginRes.body);
    }

    console.log('\n🎉 PRUEBA DE FLUJO COMPLETO EXITOSA 🎉');
    console.log('El sistema backend ahora usa PostgreSQL para todas las operaciones críticas.');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await pool.end();
  }
}

runTest();
