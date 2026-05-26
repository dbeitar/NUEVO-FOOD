const { hasRole } = require('../utils/accessControl');
const JsonStore = require('../utils/JsonStore');
const {
  DEFAULT_FRONTEND_CONFIG,
  normalizeConfig,
  deepMerge,
} = require('../config/defaultFrontendConfig');

let store;
function getStore() {
  if (!store) store = new JsonStore('frontend_config.json', DEFAULT_FRONTEND_CONFIG);
  return store;
}

function readConfig() {
  const raw = getStore().getAll();
  return normalizeConfig(raw && typeof raw === 'object' ? raw : {});
}

exports.getPublicConfig = async (_req, res) => {
  try {
    const config = readConfig();
    return res.json({ success: true, data: config });
  } catch (e) {
    return res.status(500).json({ error: 'Error leyendo configuración del front' });
  }
};

exports.getAdminConfig = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'Solo super_admin' });
    }
    return res.json({ success: true, data: readConfig() });
  } catch (e) {
    return res.status(500).json({ error: 'Error leyendo configuración' });
  }
};

exports.updateAdminConfig = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'Solo super_admin' });
    }
    const patch = req.body?.config || req.body || {};
    const theme = patch.theme_mode;
    if (theme && !['dark', 'light'].includes(theme)) {
      return res.status(400).json({ error: 'theme_mode debe ser dark o light' });
    }
    const current = readConfig();
    const next = normalizeConfig(deepMerge(current, patch));
    getStore().setAll(next);
    return res.json({ success: true, data: next });
  } catch (e) {
    return res.status(500).json({ error: 'Error guardando configuración' });
  }
};

exports.uploadAsset = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'Solo super_admin' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo de imagen requerido (campo: file)' });
    }
    const publicPath = `/uploads/frontend/${req.file.filename}`;
    return res.json({
      success: true,
      data: {
        path: publicPath,
        url: publicPath,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (e) {
    const msg = e?.message || 'Error subiendo archivo';
    return res.status(400).json({ error: msg });
  }
};

exports.resetAdminConfig = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'Solo super_admin' });
    }
    getStore().setAll(DEFAULT_FRONTEND_CONFIG);
    return res.json({ success: true, data: DEFAULT_FRONTEND_CONFIG });
  } catch (e) {
    return res.status(500).json({ error: 'Error restaurando configuración' });
  }
};
