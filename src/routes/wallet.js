const express = require('express');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const paymentClient = new Payment(mp);

const RECHARGE_MIN = 10;
const RECHARGE_MAX = 5000;
const EXPIRES_MS = 30 * 60 * 1000;

// Bônus por faixa (mesma lógica do frontend)
function calculateBonus(value) {
  const v = Number(value);
  if (v >= 300) return 20;
  if (v >= 200) return 12;
  if (v >= 150) return 8;
  if (v >= 100) return 5;
  if (v >= 50)  return 2;
  return 0;
}

// ---------- GET /api/wallet ----------
router.get('/', requireAuth, async (req, res, next) => {
  try {
    let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { userId: req.user.id } });
    }
    res.json({
      balance: Number(wallet.balance),
      pending: Number(wallet.pending),
      totalCredits: Number(wallet.totalCredits),
      totalDebits: Number(wallet.totalDebits),
    });
  } catch (err) { next(err); }
});

// ---------- GET /api/wallet/transactions ----------
router.get('/transactions', requireAuth, async (req, res, next) => {
  try {
    const { type, status, from, to, limit = 50, offset = 0 } = req.query;
    const where = { userId: req.user.id };
    if (type)   where.type = type;
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(limit), 100),
        skip: Number(offset),
      }),
      prisma.transaction.count({ where }),
    ]);
    res.json({
      total,
      items: items.map(t => ({
        id: t.id,
        type: t.type,
        category: t.category,
        description: t.description,
        value: Number(t.value),
        status: t.status,
        paymentMethod: t.paymentMethod,
        balanceAfter: t.balanceAfter != null ? Number(t.balanceAfter) : null,
        mpId: t.mpId,
        date: t.createdAt.toISOString(),
      })),
    });
  } catch (err) { next(err); }
});

// ---------- POST /api/wallet/charge ----------
router.post('/charge', requireAuth, async (req, res, next) => {
  try {
    const { amount } = req.body || {};
    const value = Number(amount);
    if (!value || value < RECHARGE_MIN || value > RECHARGE_MAX) {
      return res.status(400).json({ error: `Valor entre ${RECHARGE_MIN} e ${RECHARGE_MAX}.` });
    }
    const bonus = calculateBonus(value);
    const total = value + bonus;

    const result = await paymentClient.create({
      body: {
        transaction_amount: value,
        description: 'Recarga STREAMLY',
        payment_method_id: 'pix',
        payer: { email: req.user.email },
        external_reference: req.user.id,
        notification_url: `${process.env.BASE_URL}/api/wallet/webhook`,
      },
      requestOptions: { idempotencyKey: `wallet-${req.user.id}-${Date.now()}` },
    });

    const tx = result.point_of_interaction?.transaction_data || {};
    const expiresAt = result.date_of_expiration
      ? new Date(result.date_of_expiration)
      : new Date(Date.now() + EXPIRES_MS);

    await prisma.charge.create({
      data: {
        userId: req.user.id,
        kind: 'wallet_recharge',
        amount: value,
        bonus,
        total,
        status: 'pending',
        qrCode: tx.qr_code,
        qrCodeBase64: tx.qr_code_base64,
        mpId: String(result.id),
        expiresAt,
      },
    });

    // Soma no saldo pendente
    await prisma.wallet.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, pending: value },
      update: { pending: { increment: value } },
    });

    res.json({
      id: String(result.id),
      status: 'pending',
      amount: value,
      bonus,
      total,
      qr_code: tx.qr_code,
      qr_code_base64: tx.qr_code_base64,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('[charge]', err);
    next(err);
  }
});

// ---------- GET /api/wallet/charge/:id ----------
router.get('/charge/:id', requireAuth, async (req, res, next) => {
  try {
    const charge = await prisma.charge.findFirst({
      where: { mpId: req.params.id, userId: req.user.id },
    });
    if (!charge) return res.status(404).json({ error: 'Cobrança não encontrada.' });
    res.json({ id: charge.mpId, status: charge.status });
  } catch (err) { next(err); }
});

// ---------- DELETE /api/wallet/charge/:id ----------
router.delete('/charge/:id', requireAuth, async (req, res, next) => {
  try {
    const charge = await prisma.charge.findFirst({
      where: { mpId: req.params.id, userId: req.user.id },
    });
    if (!charge) return res.status(404).json({ error: 'Cobrança não encontrada.' });
    if (charge.status !== 'pending') {
      return res.status(400).json({ error: 'Só é possível cancelar cobranças pendentes.' });
    }

    try {
      await paymentClient.cancel({ id: charge.mpId });
    } catch (mpErr) {
      console.warn('[charge cancel] MP:', mpErr.message);
    }

    await prisma.$transaction([
      prisma.charge.update({ where: { id: charge.id }, data: { status: 'cancelled' } }),
      prisma.wallet.update({
        where: { userId: req.user.id },
        data: { pending: { decrement: Number(charge.amount) } },
      }),
    ]);

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---------- POST /api/wallet/webhook (Mercado Pago) ----------
router.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const paymentId = req.query['data.id'] || req.body?.data?.id;
    if (!paymentId) return;

    const payment = await paymentClient.get({ id: paymentId });
    const charge = await prisma.charge.findFirst({ where: { mpId: String(paymentId) } });
    if (!charge || charge.status === 'approved') return;

    if (payment.status === 'approved') {
      await prisma.$transaction(async (tx) => {
        await tx.charge.update({
          where: { id: charge.id },
          data: { status: 'approved', approvedAt: new Date() },
        });

        const wallet = await tx.wallet.findUnique({ where: { userId: charge.userId } });
        const newBalance = Number(wallet.balance) + Number(charge.total);

        await tx.wallet.update({
          where: { userId: charge.userId },
          data: {
            balance: { increment: charge.total },
            pending: { decrement: charge.amount },
            totalCredits: { increment: charge.total },
          },
        });

        await tx.transaction.create({
          data: {
            userId: charge.userId,
            type: 'entrada',
            category: 'recarga',
            description: `Recarga via PIX${Number(charge.bonus) > 0 ? ` (+R$ ${charge.bonus})` : ''}`,
            value: charge.total,
            status: 'aprovado',
            paymentMethod: 'PIX · Mercado Pago',
            balanceAfter: newBalance,
            mpId: charge.mpId,
          },
        });

        await tx.notification.create({
          data: {
            userId: charge.userId,
            type: 'ok',
            title: 'Recarga aprovada',
            sub: `${Number(charge.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} creditados`,
          },
        });
      });
    } else if (['rejected', 'cancelled', 'refunded'].includes(payment.status)) {
      await prisma.$transaction([
        prisma.charge.update({
          where: { id: charge.id },
          data: { status: payment.status === 'cancelled' ? 'cancelled' : 'rejected' },
        }),
        prisma.wallet.update({
          where: { userId: charge.userId },
          data: { pending: { decrement: charge.amount } },
        }),
      ]);
    }
  } catch (err) {
    console.error('[webhook wallet]', err);
  }
});

// ---------- POST /api/wallet/withdraw ----------
router.post('/withdraw', requireAuth, async (req, res, next) => {
  try {
    const { amount } = req.body || {};
    const value = Number(amount);
    if (!value || value < 20) {
      return res.status(400).json({ error: 'Valor mínimo para retirada: R$ 20,00.' });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
    if (Number(wallet.balance) < value) {
      return res.status(400).json({ error: 'Saldo insuficiente.' });
    }

    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: req.user.id },
        data: { balance: { decrement: value }, totalDebits: { increment: value } },
      }),
      prisma.transaction.create({
        data: {
          userId: req.user.id,
          type: 'saida',
          category: 'pagamento',
          description: 'Retirada para chave PIX',
          value,
          status: 'pendente',
          paymentMethod: 'PIX · Mercado Pago',
        },
      }),
    ]);

    res.json({ ok: true, id: 'WD-' + Date.now() });
  } catch (err) { next(err); }
});

module.exports = router;
