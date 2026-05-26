const FitnessTestDatabase = require('../models/FitnessTestDatabase');
const userDB = require('../models/UserDatabase');

const summarize = (item, userId) => ({
  ...item,
  enrolled_count: Array.isArray(item.enrolled_user_ids) ? item.enrolled_user_ids.length : 0,
  is_enrolled: Array.isArray(item.enrolled_user_ids) ? item.enrolled_user_ids.includes(userId) : false,
  my_result: Array.isArray(item.results) ? item.results.find((result) => result.user_id === userId) || null : null,
  leaderboard: Array.isArray(item.results)
    ? [...item.results].sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 10)
    : [],
});

const listTests = (req, res) => {
  try {
    const tests = FitnessTestDatabase.getAll().map((item) => summarize(item, req.user.id));
    return res.json({ success: true, data: tests });
  } catch (error) {
    console.error('Error obteniendo pruebas D28D:', error);
    return res.status(500).json({ error: 'Error obteniendo pruebas D28D' });
  }
};

const enrollTest = (req, res) => {
  try {
    const item = FitnessTestDatabase.enroll(parseInt(req.params.id, 10), req.user.id);
    if (!item) return res.status(404).json({ error: 'Prueba no encontrada' });
    return res.json({ success: true, data: summarize(item, req.user.id) });
  } catch (error) {
    console.error('Error inscribiendo prueba D28D:', error);
    return res.status(500).json({ error: 'Error inscribiendo prueba D28D' });
  }
};

const recordResult = (req, res) => {
  try {
    const user = userDB.getById(req.user.id) || req.user;
    const item = FitnessTestDatabase.recordResult(parseInt(req.params.id, 10), user, req.body?.scores || req.body || {});
    if (!item) return res.status(404).json({ error: 'Prueba no encontrada' });
    return res.json({ success: true, data: summarize(item, req.user.id) });
  } catch (error) {
    console.error('Error registrando resultado D28D:', error);
    return res.status(500).json({ error: 'Error registrando resultado D28D' });
  }
};

module.exports = {
  listTests,
  enrollTest,
  recordResult,
};
