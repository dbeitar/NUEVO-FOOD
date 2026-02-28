const { registerUser } = require('../backend/src/controllers/authController');
const pool = require('../backend/src/config/database');

// Mock Request and Response
const mockReq = (body) => ({
  body,
});

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

const runTest = async () => {
  try {
    const email = `test_fix_${Date.now()}@example.com`;
    console.log(`Testing registration with email: ${email}`);

    const req = mockReq({
      nombre: 'Test User Fix',
      email: email,
      password: 'password123',
      teléfono: '1234567890',
      fecha_nacimiento: '', // Empty string to test sanitation
      peso: '', // Empty string
      altura: '', // Empty string
      objetivo: 'maintain',
      gym_id: '1', // Assuming gym ID 1 exists
      trainer_id: '', // Empty string
    });

    const res = mockRes();

    // Call the controller function
    await registerUser(req, res);

    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Response Data:`, res.data);

    if (res.statusCode === 201) {
      console.log('Registration successful!');
      
      // Verify in DB
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];
      console.log('User in DB:', {
        id: user.id,
        email: user.email,
        fecha_nacimiento: user.fecha_nacimiento, // Should be null
        peso: user.peso, // Should be null
        id_gimnasio: user.id_gimnasio, // Should be 1
        id_entrenador: user.id_entrenador // Should be null
      });

      if (user.fecha_nacimiento === null && user.peso === null && user.id_gimnasio === 1) {
        console.log('Sanitization and foreign keys working correctly!');
      } else {
        console.error('Verification failed:', user);
      }
    } else {
      console.error('Registration failed:', res.data);
    }

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await pool.end();
  }
};

runTest();
