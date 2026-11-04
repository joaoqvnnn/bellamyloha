const prisma = require('../lib/prisma');
const { verify } = require('../lib/jwt');

/**
 * requireAuth: exige um Bearer token válido e um usuário ativo.
 * Popula req.user com { id, email, name, role }.
 */
async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }
    const payload = verify(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, status: true },
    });
    if (!user) return res.status(401).json({ error: 'Sessão inválida.' });
    if (user.status !== 'ativa') {
      return res.status(403).json({ error: 'Conta suspensa ou bloqueada.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }
}

/**
 * optionalAuth: tenta autenticar mas não falha se não houver token.
 */
async function optionalAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token) {
      const payload = verify(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, status: true },
      });
      if (user && user.status === 'ativa') req.user = user;
    }
  } catch {}
  next();
}

module.exports = { requireAuth, optionalAuth };
