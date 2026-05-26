const logger = require('../utils/logger');

function auditAuth(userId, event, message, meta = {}, level = 'info') {
  logger.log({
    level,
    message,
    event,
    user_id: userId ?? null,
    module: 'auth',
    ...meta,
  });
}

module.exports = { auditAuth };
