#!/usr/bin/env bash
# Collect CPU/RAM/PostgreSQL samples during K6 runs
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/results/monitor-$(date +%Y%m%d-%H%M%S).csv}"
INTERVAL="${MONITOR_INTERVAL:-5}"
DURATION="${MONITOR_DURATION:-3600}"
PG_CONTAINER="${PG_CONTAINER:-mvpfood-postgres}"

mkdir -p "$(dirname "$OUT")"
echo "ts,node_cpu_pct,node_rss_mb,pg_cpu_pct,pg_mem_mb,pg_connections,pg_active" > "$OUT"

end=$((SECONDS + DURATION))
while [ $SECONDS -lt $end ]; do
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  node_line="$(ps aux 2>/dev/null | grep -E 'node.*server' | grep -v grep | head -1 || true)"
  node_cpu="$(echo "$node_line" | awk '{print $3}' || echo 0)"
  node_rss="$(echo "$node_line" | awk '{printf "%.0f", $6/1024}' || echo 0)"
  pg_stats="$(docker stats "$PG_CONTAINER" --no-stream --format '{{.CPUPerc}},{{.MemUsage}}' 2>/dev/null || echo '0,0')"
  pg_cpu="$(echo "$pg_stats" | cut -d, -f1 | tr -d '%')"
  pg_mem="$(echo "$pg_stats" | cut -d, -f2 | cut -d/ -f1 | sed 's/MiB//' | tr -d ' ')"
  pg_conn="$(docker exec "$PG_CONTAINER" psql -U mvpfood -d mvpfood -t -A -c "SELECT count(*) FROM pg_stat_activity WHERE datname='mvpfood';" 2>/dev/null | tr -d ' ' || echo 0)"
  pg_active="$(docker exec "$PG_CONTAINER" psql -U mvpfood -d mvpfood -t -A -c "SELECT count(*) FROM pg_stat_activity WHERE datname='mvpfood' AND state='active';" 2>/dev/null | tr -d ' ' || echo 0)"
  echo "$ts,$node_cpu,$node_rss,$pg_cpu,$pg_mem,$pg_conn,$pg_active" >> "$OUT"
  sleep "$INTERVAL"
done

echo "Monitor log → $OUT"
