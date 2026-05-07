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

// Custom Transport para SQL
class SqlTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
  }

  async log(info, callback) {
    setImmediate(() => this.emit('logged', info));

    try {
      const { level, message, timestamp, ...meta } = info;
      const userId = meta.user_id || null;
      const event = meta.event || 'general';
      const traceId = meta.trace_id || null;
      
      // Solo guardar en DB si no estamos en un entorno saturado o si es INFO+
      await db.query(
        'INSERT INTO audit_logs (user_id, level, event, trace_id, metadata, message) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, level.toUpperCase(), event, traceId, JSON.stringify(meta), message]
      );
    } catch (e) {
      // Si falla la DB, no podemos hacer mucho más que imprimirlo en consola
      console.error('Error saving log to SQL:', e.message);
    }

    if (callback) callback();
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
