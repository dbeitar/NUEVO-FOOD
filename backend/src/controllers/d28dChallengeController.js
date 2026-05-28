const challengeService = require('../services/d28dChallengeService');
const challengeStore = require('../models/D28dChallengeStore');

const ADMIN = ['super_admin', 'admin_d28d'];

function requireAdmin(req, res) {
  if (!challengeService.isAdmin(req.user)) {
    res.status(403).json({ error: 'Solo admin D28D' });
    return false;
  }
  return true;
}

exports.list = async (req, res) => {
  try {
    const data = await challengeService.listChallenges(req.user, req.query);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await challengeService.getChallenge(req.user, req.params.id);
    if (!data) return res.status(404).json({ error: 'Reto no encontrado' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.create = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const data = await challengeService.createChallenge(req.user, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.update = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const data = await challengeService.updateChallenge(req.user, req.params.id, req.body);
    if (!data) return res.status(404).json({ error: 'Reto no encontrado' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.duplicate = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const data = await challengeService.duplicateChallenge(req.user, req.params.id);
    if (!data) return res.status(404).json({ error: 'Reto no encontrado' });
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.activate = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const data = await challengeService.setChallengeState(req.user, req.params.id, 'active');
    if (!data) return res.status(404).json({ error: 'Reto no encontrado' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.close = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const data = await challengeService.setChallengeState(req.user, req.params.id, 'closed');
    if (!data) return res.status(404).json({ error: 'Reto no encontrado' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.publish = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const data = await challengeService.setChallengeState(req.user, req.params.id, 'published');
    if (!data) return res.status(404).json({ error: 'Reto no encontrado' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.cancel = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const data = await challengeService.setChallengeState(req.user, req.params.id, 'cancelled');
    if (!data) return res.status(404).json({ error: 'Reto no encontrado' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.enroll = async (req, res) => {
  try {
    const result = await challengeService.enroll(req.user, req.params.id);
    if (result?.error) return res.status(result.status || 400).json({ error: result.error });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const result = await challengeService.withdraw(req.user, req.params.id);
    if (result?.error) return res.status(result.status || 400).json({ error: result.error });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.addEvidence = async (req, res) => {
  try {
    const body = req.body || {};
    const file = req.file;
    const data = {
      tipo: body.tipo || (file ? 'image' : 'text'),
      url: file ? `/uploads/challenges/${file.filename}` : body.url || null,
      contenido: body.contenido || body.text || null,
      mime: file?.mimetype || body.mime || null,
      size_bytes: file?.size || null,
    };
    const result = await challengeService.submitEvidence(req.user, req.params.id, data);
    if (result?.error) return res.status(result.status || 400).json({ error: result.error });
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.updateEvidence = async (req, res) => {
  try {
    const result = await challengeService.updateEvidence(req.user, req.params.evidenceId, req.body);
    if (result?.error) return res.status(result.status || 403).json({ error: result.error });
    if (!result) return res.status(404).json({ error: 'Evidencia no encontrada' });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.score = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { entry_id, puntuacion, comentario } = req.body;
    const result = await challengeService.scoreEntry(req.user, req.params.id, entry_id, Number(puntuacion), comentario);
    if (!result) return res.status(404).json({ error: 'Participante no encontrado' });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.setPodium = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { first, second, third } = req.body;
    const podium = await challengeService.setPodium(req.user, req.params.id, { 1: first, 2: second, 3: third });
    res.json({ success: true, data: podium });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.ranking = async (req, res) => {
  try {
    const c = challengeStore.getById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Reto no encontrado' });
    const ranking = challengeStore.getRanking(req.params.id);
    res.json({ success: true, data: ranking });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
