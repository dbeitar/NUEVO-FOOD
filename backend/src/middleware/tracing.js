const { v4: uuidv4 } = require('uuid');

const tracingMiddleware = (req, res, next) => {
  // 1. Capturar trace_id del header (enviado por el frontend) o generar uno nuevo
  const traceId = req.header('X-Trace-Id') || uuidv4();
  
  // 2. Adjuntar al objeto request para que esté disponible en los controladores
  req.traceId = traceId;
  
  // 3. Devolverlo en la respuesta para facilitar el debugging en el cliente
  res.setHeader('X-Trace-Id', traceId);
  
  next();
};

module.exports = tracingMiddleware;
