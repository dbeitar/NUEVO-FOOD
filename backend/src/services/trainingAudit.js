const logger = require('../utils/logger');

function auditTraining(userId, event, message, meta = {}, level = 'info') {
  logger.log({
    level,
    message,
    event,
    user_id: userId || null,
    module: 'training',
    ...meta,
  });
}

module.exports = { auditTraining };
