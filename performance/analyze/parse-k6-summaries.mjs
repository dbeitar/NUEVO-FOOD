#!/usr/bin/env node
/** Parse K6 --summary-export JSON into compact markdown tables */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(__dirname, '../results');
const OUT = path.join(RESULTS, 'k6-metrics-table.md');

const files = fs.readdirSync(RESULTS).filter((f) => f.endsWith('-summary.json')).sort();

let md = '# K6 Metrics Summary\n\n| Scenario | VUs max | RPS | P50 ms | P95 ms | P99 ms | Error rate |\n|----------|---------|-----|--------|--------|--------|------------|\n';

for (const f of files) {
  const s = JSON.parse(fs.readFileSync(path.join(RESULTS, f), 'utf8'));
  const m = s.metrics || {};
  // K6 summary-export format differs by version:
  // - sometimes: metric.values.{avg,med,p(95)...}
  // - sometimes: metric.{avg,med,p(95)...} directly
  const dur = m.http_req_duration?.values || m.http_req_duration || {};
  const name = f.replace('-summary.json', '');
  const vusMax =
    m.vus_max?.values?.max ??
    m.vus_max?.max ??
    m.vus_max?.value ??
    m.vus?.values?.max ??
    m.vus?.max ??
    '-';
  const rps = m.http_reqs?.values?.rate ?? m.http_reqs?.rate ?? 0;
  const errRateRaw = m.http_req_failed?.values?.rate ?? m.http_req_failed?.value ?? 0;
  const errRate =
    Number(errRateRaw) > 0
      ? Number(errRateRaw)
      : (() => {
          const p = Number(m.http_req_failed?.passes ?? 0);
          const f2 = Number(m.http_req_failed?.fails ?? 0);
          const denom = p + f2;
          return denom > 0 ? f2 / denom : 0;
        })();
  md += `| ${name} | ${vusMax} | ${Number(rps).toFixed(1)} | ${Math.round(dur.med ?? dur['p(50)'] ?? dur['p(50.00)'] ?? 0)} | ${Math.round(dur['p(95)'] ?? 0)} | ${Math.round(dur['p(99)'] ?? 0)} | ${(Number(errRate) * 100).toFixed(2)}% |\n`;
}

fs.writeFileSync(OUT, md);
console.log(`Wrote ${OUT}`);
