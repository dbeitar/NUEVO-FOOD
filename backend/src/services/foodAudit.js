const logger = require('../utils/logger');

function auditFood(userId, event, message, meta = {}, level = 'info') {
  logger.log({
    level,
    message,
    event,
    user_id: userId || null,
    module: 'food',
    ...meta,
  });
}

module.exports = { auditFood };
