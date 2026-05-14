const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const db = require('../config/dbClient');

// Directorio de logs
const LOG_DIR = path.join(__dirname, '../../logs');

// Formato de log
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Custom Transport para SQL.
// Implementa batching asíncrono: acumula registros y los inserta en un
// solo round-trip a la DB cada FLUSH_INTERVAL_MS o cuando se llena el
// buffer (MAX_BATCH). Si la DB falla, el lote se descarta tras imprimir
// el error en consola (los archivos rotativos siguen capturando todo).
class SqlTransport extends winston.Transport {
  constructor(opts = {}) {
    super(opts);
    this.batch = [];
    this.MAX_BATCH = opts.maxBatch || 100;
    this.FLUSH_INTERVAL_MS = opts.flushIntervalMs || 2000;
    this.flushing = false;
    this.timer = setInterval(() => this.flush(), this.FLUSH_INTERVAL_MS);
    this.timer.unref?.();
  }

  log(info, callback) {
    setImmediate(() => this.emit('logged', info));

    try {
      const { level, message, ...meta } = info;
      this.batch.push({
        user_id: meta.user_id || null,
        level: String(level || 'INFO').toUpperCase(),
        event: meta.event || 'general',
        trace_id: meta.trace_id || null,
        metadata: meta,
        message,
      });
      if (this.batch.length >= this.MAX_BATCH) {
        // Flush no bloqueante.
        this.flush().catch(() => {});
      }
    } catch (e) {
      console.error('SqlTransport.log queue error:', e.message);
    }

    if (callback) callback();
  }

  async flush() {
    if (this.flushing) return;
    if (!this.batch.length) return;
    this.flushing = true;
    const items = this.batch.splice(0, this.batch.length);
    try {
      // Insert múltiple en un solo statement.
      const values = [];
      const placeholders = items.map((it, idx) => {
        const base = idx * 6;
        values.push(it.user_id, it.level, it.event, it.trace_id, JSON.stringify(it.metadata || {}), it.message);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
      }).join(', ');
      await db.query(
        `INSERT INTO audit_logs (user_id, level, event, trace_id, metadata, message) VALUES ${placeholders}`,
        values,
      );
    } catch (e) {
      console.error('SqlTransport.flush DB error:', e.message);
    } finally {
      this.flushing = false;
    }
  }

  close() {
    if (this.timer) clearInterval(this.timer);
    return this.flush();
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 1. Consola (para desarrollo)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    }),
    // 2. Archivos rotativos para ERRORES críticos
    new winston.transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
      maxSize: '20m',
    }),
    // 3. Archivos rotativos para todo el tráfico (opcional)
    new winston.transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d',
      maxSize: '20m',
    }),
    // 4. Nuestra tabla SQL personalizada
    new SqlTransport()
  ]
});

module.exports = logger;
