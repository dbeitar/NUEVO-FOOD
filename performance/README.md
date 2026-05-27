# K6 load testing — MVPFOOD / D28D Phase 10

Read-only load tests. **No business logic changes.**

## Prerequisites

- Backend running: `npm run dev:all` or staging URL
- Docker (for K6): `grafana/k6`
- PostgreSQL container: `mvpfood-postgres`

## Quick run (smoke — shorter durations, ~30 min)

```bash
K6_PROFILE=smoke ./performance/run-suite.sh
```

## Full audit (spec durations — several hours)

```bash
K6_PROFILE=full ./performance/run-suite.sh
```

## Single scenario

```bash
docker run --rm \
  -v "$(pwd)/performance/k6:/scripts:ro" \
  -v "$(pwd)/performance/results:/results" \
  -e BASE_URL=http://host.docker.internal:3002/api \
  grafana/k6:0.54.0 run \
  --summary-export=/results/01-health-summary.json \
  /scripts/scenarios/01-health.js
```

## Scenarios

| # | Script | Load |
|---|--------|------|
| 01 | `01-health.js` | 100 VU × 5m |
| 02 | `02-login.js` | 500 VU × 10m |
| 03 | `03-usuario-final.js` | 1000 VU × 15m |
| 04 | `04-d28d.js` | 1000 VU × 15m |
| 05 | `05-training.js` | 1000 VU × 15m |
| 06 | `06-communication.js` | 500 VU × 10m |
| 07 | `07-stress.js` | ramp → 10k VU |
| 08 | `08-spike.js` | 100 → 5k in 60s |
| 09 | `09-endurance.js` | 500 VU × 24h |
| 11 | `11-audit-writes.js` | 300 VU × 10m |

Scenario 10: `node performance/analyze/postgres-audit.mjs`  
Scenario 12: `node performance/analyze/capacity-estimate.mjs`

## Output

- `performance/results/*-summary.json` — K6 metrics
- `performance/results/k6-metrics-table.md`
- `performance/results/postgres-audit-*.json`
- `performance/results/capacity-estimate.json`
- `docs/PERFORMANCE_AUDIT_V1.md` — consolidated report

## Monitor during run

```bash
MONITOR_DURATION=600 MONITOR_INTERVAL=5 ./performance/monitor/collect-metrics.sh &
```
