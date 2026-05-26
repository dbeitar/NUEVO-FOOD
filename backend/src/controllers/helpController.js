const helpService = require('../services/helpAssistantService');

exports.ask = async (req, res) => {
  try {
    const { modulo, query } = req.body || {};
    if (!modulo || !query) return res.status(400).json({ error: 'modulo y query requeridos' });
    const data = await helpService.ask(req.user?.id, modulo, query);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.suggestions = async (req, res) => {
  try {
    const faqService = require('../services/faqService');
    const items = faqService.listItems({ modulo: req.params.modulo }).slice(0, 5);
    res.json({ success: true, data: items.map((i) => ({ id: i.id, pregunta: i.pregunta })) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.escalate = async (req, res) => {
  try {
    const { modulo, query } = req.body || {};
    await helpService.logWhatsappEscalation(req.user?.id, modulo, query);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
