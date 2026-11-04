const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.screen.findMany({
      where: { userId: req.user.id },
      orderBy: { dueDate: 'asc' },
    });
    res.json({ items });
  } catch (err) { next(err); }
});

router.post('/:id/renew', requireAuth, async (req, res, next) => {
  try {
    const screen = await prisma.screen.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!screen) return res.status(404).json({ error: 'Tela não encontrada.' });

    const newDue = new Date(screen.dueDate);
    newDue.setMonth(newDue.getMonth() + 1);

    const updated = await prisma.screen.update({
      where: { id: screen.id },
      data: { dueDate: newDue, status: 'ativa' },
    });

    res.json({ ok: true, screen: updated });
  } catch (err) { next(err); }
});

module.exports = router;
