/**
 * requireAdmin: exige que req.user.role === 'admin'.
 * Deve ser usado DEPOIS de requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  next();
}

module.exports = { requireAdmin };
