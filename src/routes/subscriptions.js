const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

function addPeriod(date, periodicity) {
  const d = new Date(date);
  if (periodicity === 'mensal') d.setMonth(d.getMonth() + 1);
  else if (periodicity === 'trimestral') d.setMonth(d.getMonth() + 3);
  else if (periodicity === 'semestral') d.setMonth(d.getMonth() + 6);
  else if (periodicity === 'anual') d.setFullYear(d.getFullYear() + 1);
  return d;
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.subscription.findMany({
      where: { userId: req.user.id },
      include: { payments: { orderBy: { date: 'desc' }, take: 20 } },
      orderBy: { nextBillingDate: 'asc' },
    });
    res.json({ items });
  } catch (err) { next(err); }
});

router.post('/:id/renew', requireAuth, async (req, res, next) => {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!sub) return res.status(404).json({ error: 'Assinatura não encontrada.' });

    const newDue = addPeriod(sub.dueDate, sub.periodicity);
    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'ativa',
          dueDate: newDue,
          nextBillingDate: newDue,
          payments: { create: { value: sub.value, method: 'PIX', status: 'aprovado' } },
        },
      }),
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!sub) return res.status(404).json({ error: 'Assinatura não encontrada.' });
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'cancelada', autoRenew: false },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.patch('/:id/auto-renew', requireAuth, async (req, res, next) => {
  try {
    const { enabled } = req.body || {};
    const sub = await prisma.subscription.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!sub) return res.status(404).json({ error: 'Assinatura não encontrada.' });
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { autoRenew: !!enabled },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
