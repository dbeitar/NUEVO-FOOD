const jwt = require('jsonwebtoken');

function ssoSecret() {
  return process.env.TRAINING_SSO_SECRET || process.env.FOOD_SSO_SECRET || process.env.JWT_SECRET;
}

function createHandoffToken(payload) {
  const secret = ssoSecret();
  if (!secret) throw new Error('TRAINING_SSO_SECRET o JWT_SECRET requerido');
  const ttl = Number(process.env.TRAINING_SSO_TTL_SEC || process.env.FOOD_SSO_TTL_SEC || 120);
  return jwt.sign({ typ: 'training_shell_sso', ...payload }, secret, { expiresIn: ttl });
}

function verifyHandoffToken(token) {
  return jwt.verify(token, ssoSecret());
}

function buildExternalLaunchUrl(publicBase, token, returnUrl) {
  const base = String(publicBase || '').replace(/\/$/, '');
  const u = new URL(`${base}/shell-sso`);
  u.searchParams.set('token', token);
  if (returnUrl) u.searchParams.set('return', returnUrl);
  return u.toString();
}

function shellOriginFromReturnUrl(returnUrl) {
  const fallback = String(process.env.SHELL_PUBLIC_URL || 'http://localhost:5175').replace(/\/$/, '');
  if (!returnUrl) return fallback;
  try {
    return new URL(returnUrl).origin;
  } catch {
    return fallback;
  }
}

/** Módulo entrenadores embebido en el shell D28D (/training-module/shell-sso). */
function buildEmbeddedLaunchUrl(returnUrl, token) {
  const origin = shellOriginFromReturnUrl(returnUrl);
  const u = new URL(`${origin}/training-module/shell-sso`);
  u.searchParams.set('token', token);
  return u.toString();
}

function useEmbeddedTrainingLaunch() {
  return String(process.env.TRAINING_EMBEDDED || 'true').toLowerCase() !== 'false';
}

module.exports = {
  createHandoffToken,
  verifyHandoffToken,
  buildExternalLaunchUrl,
  buildEmbeddedLaunchUrl,
  useEmbeddedTrainingLaunch,
};
