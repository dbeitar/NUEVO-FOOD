import { login } from './auth.js';
import { USER_POOL, ADMIN_POOL } from './users.js';
import { USER_TOKEN, ADMIN_TOKEN } from './config.js';

/**
 * Shared-session strategy.
 *
 * Why: The backend enforces an auth rate-limit in dev environments.
 * For authenticated load scenarios we want to measure app + DB paths,
 * not saturate /auth/login. Scenario 02 is dedicated to login load.
 *
 * Therefore we reuse a small set of tokens across all VUs.
 */
let sharedUserToken = null;
let sharedAdminToken = null;

export function sessionUser(_vu) {
  if (USER_TOKEN) return USER_TOKEN;
  if (!sharedUserToken) sharedUserToken = login(USER_POOL[0]);
  return sharedUserToken;
}

export function sessionAdmin(_vu) {
  if (ADMIN_TOKEN) return ADMIN_TOKEN;
  if (!sharedAdminToken) sharedAdminToken = login(ADMIN_POOL[0]);
  return sharedAdminToken;
}

export function resetSessions() {
  sharedUserToken = null;
  sharedAdminToken = null;
}
