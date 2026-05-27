#!/usr/bin/env node
/**
 * ESCENARIO 10 — PostgreSQL audit (read-only diagnostics)
 * Usage: node performance/analyze/postgres-audit.mjs [output.json]
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || path.join(__dirname, '../results/postgres-audit.json');
const CONTAINER = process.env.PG_CONTAINER || 'mvpfood-postgres';
const PGUSER = process.env.PGUSER || 'mvpfood';
const PGDB = process.env.PGDB || 'mvpfood';

function psql(sql) {
  const cmd = `docker exec ${CONTAINER} psql -U ${PGUSER} -d ${PGDB} -t -A -F'|' -c ${JSON.stringify(sql)}`;
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).trim();
  } catch (e) {
    return { error: e.message };
  }
}

function rows(raw) {
  if (typeof raw !== 'string' || !raw) return [];
  return raw.split('\n').filter(Boolean).map((line) => line.split('|'));
}

const report = {
  generated_at: new Date().toISOString(),
  container: CONTAINER,
  database: PGDB,
  connections: {},
  database_size: {},
  table_sizes: [],
  index_usage: [],
  locks: [],
  slow_candidates: [],
  audit_tables: {},
  prisma_pool_hint: {
    note: 'Prisma default pool ~ num_cpus*2+1; verify DATABASE_URL connection_limit in production',
  },
};

// Connections
const conn = rows(psql(`
  SELECT state, count(*)::text
  FROM pg_stat_activity
  WHERE datname = current_database()
  GROUP BY state
  ORDER BY count(*) DESC;
`));
report.connections.by_state = Object.fromEntries(conn.map(([s, c]) => [s || 'null', Number(c)]));
report.connections.total = conn.reduce((a, [, c]) => a + Number(c), 0);
report.connections.max = Number(rows(psql('SHOW max_connections;'))[0]?.[0] || 0);

// DB size
report.database_size.bytes = Number(rows(psql(`SELECT pg_database_size(current_database());`))[0]?.[0] || 0);
report.database_size.pretty = rows(psql(`SELECT pg_size_pretty(pg_database_size(current_database()));`))[0]?.[0];

// Top tables by size
report.table_sizes = rows(psql(`
  SELECT relname, pg_total_relation_size(relid)::text, n_live_tup::text, n_dead_tup::text, seq_scan::text, idx_scan::text
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(relid) DESC
  LIMIT 25;
`)).map(([table, total_bytes, live, dead, seq_scan, idx_scan]) => ({
  table,
  total_bytes: Number(total_bytes),
  live_tuples: Number(live),
  dead_tuples: Number(dead),
  seq_scan: Number(seq_scan),
  idx_scan: Number(idx_scan),
}));

// Index usage (unused / low)
report.index_usage = rows(psql(`
  SELECT schemaname, relname, indexrelname, idx_scan::text, pg_relation_size(indexrelid)::text
  FROM pg_stat_user_indexes
  WHERE idx_scan < 50
  ORDER BY pg_relation_size(indexrelid) DESC
  LIMIT 20;
`)).map(([schema, table, index, scans, size]) => ({
  schema, table, index, idx_scan: Number(scans), size_bytes: Number(size),
}));

// Locks
report.locks = rows(psql(`
  SELECT mode, count(*)::text FROM pg_locks GROUP BY mode ORDER BY count(*) DESC;
`)).map(([mode, count]) => ({ mode, count: Number(count) }));

// Audit / comm tables row counts
const auditTables = [
  'communication_event_logs',
  'audit_logs',
  'platform_audit_events',
  'users',
  'module_licenses',
  'user_accounts',
];
for (const t of auditTables) {
  const r = rows(psql(`SELECT count(*)::text FROM "${t}";`));
  report.audit_tables[t] = Number(r[0]?.[0] || 0);
}

// Tables with high seq_scan vs idx_scan (missing index candidates)
report.slow_candidates = report.table_sizes
  .filter((t) => t.seq_scan > 100 && t.idx_scan < t.seq_scan)
  .slice(0, 10)
  .map((t) => ({
    table: t.table,
    seq_scan: t.seq_scan,
    idx_scan: t.idx_scan,
    recommendation: 'Review indexes — sequential scans dominate',
  }));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`PostgreSQL audit → ${OUT}`);
console.log(JSON.stringify({
  connections_total: report.connections.total,
  db_size: report.database_size.pretty,
  audit_tables: report.audit_tables,
  slow_candidates: report.slow_candidates.length,
}, null, 2));
