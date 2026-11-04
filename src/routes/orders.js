const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: { include: { product: true } }, history: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { items: { include: { product: true } }, history: { orderBy: { createdAt: 'desc' } } },
    });
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
    res.json(order);
  } catch (err) { next(err); }
});

router.post('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
    if (!['pendente', 'aprovado'].includes(order.status)) {
      return res.status(400).json({ error: 'Este pedido não pode mais ser cancelado.' });
    }
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'cancelado',
        paymentStatus: order.paymentStatus === 'aprovado' ? 'estornado' : order.paymentStatus,
        history: { create: { action: 'Pedido cancelado', detail: 'Solicitado pelo cliente' } },
      },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
