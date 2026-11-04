require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  credentials: true,
}));
app.use(express.json());

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const paymentClient = new Payment(mp);

// Em produção troque por um banco de verdade (Postgres/Supabase/MongoDB)
const memoryDb = {
  charges: {},       // chargeId -> { id, userId, amount, status }
  wallets: {},       // userId -> { balance, pending, totalCredits, totalDebits }
  transactions: {},  // userId -> [ ... ]
};

function ensureWallet(userId) {
  if (!memoryDb.wallets[userId]) {
    memoryDb.wallets[userId] = { balance: 0, pending: 0, totalCredits: 0, totalDebits: 0 };
    memoryDb.transactions[userId] = [];
  }
  return memoryDb.wallets[userId];
}

// === CRIAR COBRANÇA PIX ===
app.post('/api/wallet/charge', async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user?.id || 'demo-user'; // troque por auth real

    if (!amount || amount < 10 || amount > 5000) {
      return res.status(400).json({ error: 'Valor inválido.' });
    }

    const result = await paymentClient.create({
      body: {
        transaction_amount: Number(amount),
        description: 'Recarga STREAMLY',
        payment_method_id: 'pix',
        payer: { email: 'cliente@email.com' }, // troque pelo e-mail do usuário
        external_reference: userId,
        notification_url: `${process.env.BASE_URL}/api/wallet/webhook`,
      },
      requestOptions: { idempotencyKey: `${userId}-${Date.now()}` },
    });

    const txData = result.point_of_interaction?.transaction_data || {};

    memoryDb.charges[String(result.id)] = {
      id: String(result.id),
      userId,
      amount: Number(amount),
      status: 'pending',
    };
    ensureWallet(userId).pending += Number(amount);

    res.json({
      id: String(result.id),
      status: result.status,
      amount: Number(amount),
      qr_code_base64: txData.qr_code_base64,
      qr_code: txData.qr_code,
      expires_at: result.date_of_expiration || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    console.error('[charge]', err);
    res.status(500).json({ error: 'Falha ao criar cobrança.' });
  }
});

// === CONSULTAR STATUS ===
app.get('/api/wallet/charge/:id', (req, res) => {
  const charge = memoryDb.charges[req.params.id];
  if (!charge) return res.status(404).json({ error: 'Cobrança não encontrada.' });
  res.json({ id: charge.id, status: charge.status });
});

// === CANCELAR ===
app.delete('/api/wallet/charge/:id', async (req, res) => {
  try {
    const charge = memoryDb.charges[req.params.id];
    if (!charge) return res.status(404).json({ error: 'Não encontrada.' });
    await paymentClient.cancel({ id: charge.id });
    charge.status = 'cancelled';
    ensureWallet(charge.userId).pending -= charge.amount;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao cancelar.' });
  }
});

// === WEBHOOK DO MERCADO PAGO ===
app.post('/api/wallet/webhook', async (req, res) => {
  // Responde 200 imediatamente para o MP não reenviar
  res.sendStatus(200);

  try {
    const paymentId = req.query['data.id'] || req.body?.data?.id;
    if (!paymentId) return;

    const payment = await paymentClient.get({ id: paymentId });
    const userId = payment.external_reference;
    const chargeId = String(paymentId);
    const charge = memoryDb.charges[chargeId];

    if (!charge) return;

    if (payment.status === 'approved' && charge.status !== 'approved') {
      const wallet = ensureWallet(userId);
      wallet.pending = Math.max(0, wallet.pending - charge.amount);
      wallet.balance += charge.amount;
      wallet.totalCredits += charge.amount;

      memoryDb.transactions[userId].unshift({
        id: 'MOV-' + Date.now(),
        type: 'entrada',
        category: 'recarga',
        description: 'Recarga via PIX',
        value: charge.amount,
        date: new Date().toISOString(),
        paymentMethod: 'PIX · Mercado Pago',
        status: 'aprovado',
        balanceAfter: wallet.balance,
        mpId: chargeId,
      });

      charge.status = 'approved';
    } else if (['rejected', 'cancelled', 'refunded'].includes(payment.status)) {
      charge.status = payment.status === 'cancelled' ? 'cancelled' : 'rejected';
      const wallet = ensureWallet(userId);
      wallet.pending = Math.max(0, wallet.pending - charge.amount);
    }
  } catch (err) {
    console.error('[webhook]', err);
  }
});

// === CONSULTAR CARTEIRA ===
app.get('/api/wallet', (req, res) => {
  const userId = req.user?.id || 'demo-user';
  res.json(ensureWallet(userId));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
