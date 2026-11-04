const rateLimit = require('express-rate-limit');

const limiter = (max, windowMs = 60 * 1000, message = 'Muitas requisições. Aguarde.') =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });

module.exports = {
  registerLimiter: limiter(5, 60 * 60 * 1000, 'Muitas tentativas de cadastro. Tente em 1 hora.'),
  loginLimiter:    limiter(10, 15 * 60 * 1000, 'Muitas tentativas. Aguarde 15 minutos.'),
  forgotLimiter:   limiter(5, 60 * 60 * 1000, 'Muitas solicitações. Tente em 1 hora.'),
  resendLimiter:   limiter(2, 60 * 1000, 'Aguarde 1 minuto para reenviar.'),
  chatLimiter:     limiter(Number(process.env.SUPPORT_RATE_PER_MIN || 20), 60 * 1000, 'Muitas mensagens. Aguarde 1 minuto.'),
  generalLimiter:  limiter(120, 60 * 1000),
};
