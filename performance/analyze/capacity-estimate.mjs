#!/usr/bin/env node
/**
 * ESCENARIO 12 — Capacity estimate from K6 summaries
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(__dirname, '../results');

function readSummary(file) {
  const p = path.join(RESULTS, file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function metricsFromSummary(s) {
  if (!s?.metrics) return null;
  const m = s.metrics;
  const dur = m.http_req_duration?.values || m.http_req_duration || {};
  const failedRaw = m.http_req_failed?.values?.rate ?? m.http_req_failed?.value ?? 0;
  const failed = Number(failedRaw) > 0
    ? Number(failedRaw)
    : (() => {
        const p = Number(m.http_req_failed?.passes ?? 0);
        const f2 = Number(m.http_req_failed?.fails ?? 0);
        const denom = p + f2;
        return denom > 0 ? f2 / denom : 0;
      })();
  const rps = m.http_reqs?.values?.rate ?? m.http_reqs?.rate ?? 0;
  return {
    p50: dur.med ?? dur['p(50)'],
    p95: dur['p(95)'],
    p99: dur['p(99)'],
    avg: dur.avg,
    error_rate: failed,
    throughput_rps: rps,
    vus_max:
      m.vus_max?.values?.max ??
      m.vus_max?.max ??
      m.vus_max?.value ??
      m.vus?.values?.max ??
      m.vus?.max,
  };
}

const summaries = fs.readdirSync(RESULTS)
  .filter((f) => f.endsWith('-summary.json'))
  .map((f) => ({ file: f, data: readSummary(f), metrics: metricsFromSummary(readSummary(f)) }));

const health = summaries.find((s) => s.file.includes('01-health'))?.metrics;
const login = summaries.find((s) => s.file.includes('02-login'))?.metrics;
const usuario = summaries.find((s) => s.file.includes('03-usuario'))?.metrics;
const stress = summaries.find((s) => s.file.includes('07-stress'))?.metrics;

const baselineRps = health?.throughput_rps || usuario?.throughput_rps || 50;
const baselineP95 = usuario?.p95 || health?.p95 || 500;
const baselineError = Math.max(...summaries.map((s) => s.metrics?.error_rate || 0));

const registeredUsers = [10000, 50000, 100000, 250000, 500000];
const concurrentUsers = [500, 1000, 5000, 10000, 50000];

function classifyConcurrent(vus) {
  if (!baselineP95) return { status: 'UNKNOWN', reason: 'missing metrics' };
  // Use the main user-flow scenario as baseline; login scenario is rate-limited by design.
  const baseVus = usuario?.vus_max || health?.vus_max || 100;
  const estP95 = baselineP95 * (vus / baseVus);
  const estErr = baselineError * (vus / baseVus) ** 1.5;
  if (estErr > 0.1 || estP95 > 10000) return { status: 'BLOCKER', est_p95_ms: Math.round(estP95), est_error_rate: estErr };
  if (estErr > 0.05 || estP95 > 3000) return { status: 'WARNING', est_p95_ms: Math.round(estP95), est_error_rate: estErr };
  return { status: 'READY', est_p95_ms: Math.round(estP95), est_error_rate: estErr };
}

const estimate = {
  generated_at: new Date().toISOString(),
  source_summaries: summaries.map((s) => s.file),
  baseline: { health, login, usuario, stress },
  registered_users_projection: registeredUsers.map((n) => ({
    registered: n,
    note: 'Storage/索引 scale with rows; measured load is request-path bound. Index maintenance required at 100k+ audit rows.',
    pg_growth_factor: (n / 10000).toFixed(1),
  })),
  concurrent_users_classification: Object.fromEntries(
    concurrentUsers.map((vus) => [vus, classifyConcurrent(vus)]),
  ),
  methodology: 'Linear extrapolation from measured P95/error at peak VUs in scenarios 01-07. Validate on staging hardware matching production.',
};

const out = path.join(RESULTS, 'capacity-estimate.json');
fs.writeFileSync(out, JSON.stringify(estimate, null, 2));
console.log(JSON.stringify(estimate.concurrent_users_classification, null, 2));
console.log(`\n→ ${out}`);
