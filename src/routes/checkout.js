const express = require('express');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const paymentClient = new Payment(mp);

// POST /api/checkout
// Body: { items: [{ productId, quantity }], deliveryEmail, paymentMethod }
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { items = [], deliveryEmail, paymentMethod = 'pix' } = req.body || {};
    if (!items.length) return res.status(400).json({ error: 'Carrinho vazio.' });
    if (!deliveryEmail) return res.status(400).json({ error: 'Informe o e-mail de entrega.' });

    // Valida produtos
    const products = await prisma.product.findMany({
      where: { slug: { in: items.map(i => i.productId) }, active: true },
    });
    if (products.length !== items.length) {
      return res.status(400).json({ error: 'Produto indisponível.' });
    }

    let total = 0;
    const orderItems = items.map(i => {
      const p = products.find(x => x.slug === i.productId);
      const qty = Math.max(1, Math.min(i.quantity || 1, 10));
      total += Number(p.price) * qty;
      return { productId: p.id, quantity: qty, unitPrice: p.price };
    });

    // Cria pedido
    const order = await prisma.order.create({
      data: {
        number: 'PED-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6),
        userId: req.user.id,
        total,
        deliveryEmail,
        paymentMethod,
        items: { create: orderItems },
        history: { create: { action: 'Pedido criado', detail: `Aguardando pagamento via ${paymentMethod}` } },
      },
    });

    // PIX
    if (paymentMethod === 'pix') {
      const result = await paymentClient.create({
        body: {
          transaction_amount: total,
          description: `Pedido ${order.number}`,
          payment_method_id: 'pix',
          payer: { email: deliveryEmail },
          external_reference: order.id,
          notification_url: `${process.env.BASE_URL}/api/checkout/webhook`,
        },
        requestOptions: { idempotencyKey: `order-${order.id}` },
      });
      const tx = result.point_of_interaction?.transaction_data || {};
      await prisma.order.update({
        where: { id: order.id },
        data: { chargeId: String(result.id) },
      });
      return res.json({
        orderId: order.id,
        orderNumber: order.number,
        payment: {
          id: String(result.id),
          qr_code: tx.qr_code,
          qr_code_base64: tx.qr_code_base64,
          expires_at: result.date_of_expiration || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      });
    }

    // Cartão / saldo → trata conforme necessidade (aqui simula aprovação para o saldo)
    if (paymentMethod === 'wallet') {
      const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
      if (Number(wallet.balance) < total) {
        return res.status(400).json({ error: 'Saldo insuficiente.' });
      }
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: req.user.id },
          data: { balance: { decrement: total }, totalDebits: { increment: total } },
        }),
        prisma.transaction.create({
          data: {
            userId: req.user.id,
            type: 'saida',
            category: 'compra',
            description: `Pedido ${order.number}`,
            value: total,
            status: 'aprovado',
            paymentMethod: 'Saldo da carteira',
          },
        }),
      ]);
      await approveOrder(order.id);
      return res.json({ orderId: order.id, orderNumber: order.number, payment: null });
    }

    res.status(400).json({ error: 'Método de pagamento não suportado.' });
  } catch (err) {
    console.error('[checkout]', err);
    next(err);
  }
});

async function approveOrder(orderId) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order || order.status === 'concluido') return;

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'concluido',
        paymentStatus: 'aprovado',
        deliveredAt: new Date(),
        history: { create: { action: 'Pagamento aprovado', detail: 'Pedido concluído' } },
      },
    });

    // Cria as telas
    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) {
        await tx.screen.create({
          data: {
            code: 'TL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
            userId: order.userId,
            productId: item.productId,
            platform: item.product.platform,
            platformColor: item.product.platformColor,
            plan: item.product.name,
            login: `user${Math.floor(Math.random() * 99999)}@streamly.vip`,
            password: 'sn' + Math.random().toString(36).slice(2, 10),
            contractDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
            value: item.unitPrice,
            status: 'ativa',
          },
        });
      }
    }

    await tx.notification.create({
      data: {
        userId: order.userId,
        type: 'ok',
        title: `Pedido ${order.number} concluído`,
        sub: 'Produto entregue e disponível em Minhas telas',
      },
    });

    // TODO: enviar e-mail de entrega com credenciais
  });
}

// POST /api/checkout/webhook
router.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const paymentId = req.query['data.id'] || req.body?.data?.id;
    if (!paymentId) return;

    const payment = await paymentClient.get({ id: paymentId });
    const order = await prisma.order.findFirst({ where: { chargeId: String(paymentId) } });
    if (!order) return;

    if (payment.status === 'approved' && order.status !== 'concluido') {
      await approveOrder(order.id);
    } else if (['rejected', 'cancelled', 'refunded'].includes(payment.status)) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'cancelado',
          paymentStatus: payment.status === 'refunded' ? 'estornado' : 'recusado',
          history: { create: { action: 'Pagamento recusado', detail: `MP: ${payment.status}` } },
        },
      });
    }
  } catch (err) {
    console.error('[webhook checkout]', err);
  }
});

module.exports = router;
