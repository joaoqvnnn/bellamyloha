const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, phone: true, cpf: true,
        avatarUrl: true, emailVerified: true, status: true,
        twoFactorEnabled: true, createdAt: true,
      },
    });
    res.json({ user });
  } catch (err) { next(err); }
});

router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const { name, phone, avatarUrl } = req.body || {};
    const data = {};
    if (name !== undefined) {
      if (name.trim().length < 3 || !name.includes(' ')) {
        return res.status(400).json({ error: 'Informe nome e sobrenome.' });
      }
      data.name = name.trim();
    }
    if (phone !== undefined) data.phone = String(phone).replace(/\D/g, '');
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
    });

    await prisma.profileHistory.create({
      data: {
        userId: req.user.id,
        action: 'Dados atualizados',
        detail: Object.keys(data).join(', '),
      },
    });

    res.json({ user: updated });
  } catch (err) { next(err); }
});

// POST /api/profile/cpf-request (alteração de CPF)
router.post('/cpf-request', requireAuth, async (req, res, next) => {
  try {
    const { reason, details } = req.body || {};
    if (!reason || !details) return res.status(400).json({ error: 'Informe motivo e detalhes.' });
    const code = 'SUP-' + Math.random().toString(36).toUpperCase().slice(2, 8);
    await prisma.cpfChangeRequest.create({
      data: { userId: req.user.id, code, reason, details },
    });
    await prisma.profileHistory.create({
      data: { userId: req.user.id, action: 'Solicitação de alteração de CPF', detail: `Ticket ${code}` },
    });
    res.json({ ok: true, code });
  } catch (err) { next(err); }
});

module.exports = router;
