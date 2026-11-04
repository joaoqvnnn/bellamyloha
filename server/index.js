require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const OpenAI = require('openai');
const { SYSTEM_PROMPT } = require('./openai-prompts');

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ---------- Rate limit (por IP) ----------
const supportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.SUPPORT_RATE_PER_MIN || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas mensagens. Aguarde 1 minuto.' },
});

// ---------- OpenAI ----------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || '600', 10);

// ---------- Mercado Pago (módulo Carteira) ----------
const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const paymentClient = new Payment(mp);

// ---------- "Banco" em memória (trocar por Postgres/Supabase em produção) ----------
const db = {
  charges: {},
  wallets: {},
  transactions: {},
  conversations: {},  // conversationId -> { userId, messages, mode, transferAt }
  tickets: {},        // ticketCode -> { ... }
};

function ensureWallet(userId) {
  if (!db.wallets[userId]) {
    db.wallets[userId] = { balance: 0, pending: 0, totalCredits: 0, totalDebits: 0 };
    db.transactions[userId] = [];
  }
  return db.wallets[userId];
}

// ========================================================================
// ============================ SUPORTE ==================================
// ========================================================================

/**
 * POST /api/support/chat
 * Streaming (SSE) da resposta da OpenAI
 * Body: { messages: [{role, content}], contextOrder, conversationId }
 */
app.post('/api/support/chat', supportLimiter, async (req, res) => {
  const { messages = [], contextOrder, conversationId } = req.body;
  const userId = req.user?.id || 'demo-user';

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Mensagens vazias.' });
  }

  // Sanitiza histórico (não deixa o cliente injetar system prompt)
  const cleanMessages = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20) // últimas 20 mensagens
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

  // Contexto do pedido
  let contextBlock = '';
  if (contextOrder) {
    contextBlock = `\n\n[Contexto do pedido vinculado pelo cliente: ${contextOrder}]`;
  }

  // Cabeçalhos SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  let fullText = '';
  let transfer = false;

  try {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      max_tokens: MAX_TOKENS,
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + contextBlock },
        ...cleanMessages,
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;

        // Detecta marcador [TRANSFER] no começo
        if (!transfer && fullText.trimStart().startsWith('[TRANSFER]')) {
          transfer = true;
          send({ type: 'meta', transfer: true });
          // Remove o marcador do texto visível
          fullText = fullText.replace('[TRANSFER]', '');
        }

        const visibleText = transfer ? fullText.replace(/^\[TRANSFER\]\s*/, '') : fullText;
        send({ type: 'chunk', text: visibleText });
      }
    }

    // Registra conversa
    if (conversationId) {
      if (!db.conversations[conversationId]) {
        db.conversations[conversationId] = {
          userId,
          conversationId,
          mode: 'ai',
          messages: [],
          createdAt: new Date().toISOString(),
        };
      }
      const conv = db.conversations[conversationId];
      conv.messages = cleanMessages.map(m => ({
        from: m.role === 'user' ? 'user' : 'ai',
        text: m.content,
        ts: new Date().toISOString(),
      }));
      conv.messages.push({
        from: 'ai',
        text: fullText.replace(/^\[TRANSFER\]\s*/, ''),
        ts: new Date().toISOString(),
      });

      if (transfer) {
        conv.mode = 'waiting_human';
        conv.transferAt = new Date().toISOString();
      }
    }

    send({ type: 'meta', transfer });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[chat]', err);
    send({ type: 'error', message: 'Erro ao processar. Tente novamente.' });
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

/**
 * POST /api/support/transfer
 * Marca conversa como aguardando humano
 */
app.post('/api/support/transfer', (req, res) => {
  const { conversationId, reason } = req.body;
  const userId = req.user?.id || 'demo-user';

  if (!db.conversations[conversationId]) {
    db.conversations[conversationId] = {
      userId,
      conversationId,
      mode: 'waiting_human',
      messages: [],
      createdAt: new Date().toISOString(),
    };
  }
  db.conversations[conversationId].mode = 'waiting_human';
  db.conversations[conversationId].transferAt = new Date().toISOString();
  db.conversations[conversationId].transferReason = reason || 'solicitado';

  // TODO: notificar atendente via websocket/pusher.
  // Por enquanto, retorna OK.
  res.json({ ok: true, conversationId });
});

/**
 * POST /api/support/tickets
 * Abre um chamado formal
 */
app.post('/api/support/tickets', (req, res) => {
  const userId = req.user?.id || 'demo-user';
  const { category, priority, subject, description, relatedId, attachments } = req.body;

  if (!category || !subject || !description) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  const code = 'SUP-' + Math.random().toString(36).toUpperCase().slice(2, 8);

  db.tickets[code] = {
    code,
    userId,
    category,
    priority: priority || 'normal',
    subject: subject.slice(0, 120),
    description: description.slice(0, 2000),
    relatedId: relatedId || null,
    attachments: Array.isArray(attachments) ? attachments.slice(0, 3) : [],
    status: 'aguardando',
    createdAt: new Date().toISOString(),
  };

  // TODO: enviar e-mail de confirmação + notificar fila de atendentes

  res.json({ ok: true, code });
});

/**
 * GET /api/support/tickets
 * Lista os chamados do usuário
 */
app.get('/api/support/tickets', (req, res) => {
  const userId = req.user?.id || 'demo-user';
  const tickets = Object.values(db.tickets).filter(t => t.userId === userId);
  res.json({ tickets });
});

// ========================================================================
// ============================ CARTEIRA =================================
// ========================================================================

app.post('/api/wallet/charge', async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user?.id || 'demo-user';
    if (!amount || amount < 10 || amount > 5000) {
      return res.status(400).json({ error: 'Valor inválido.' });
    }
    const result = await paymentClient.create({
      body: {
        transaction_amount: Number(amount),
        description: 'Recarga STREAMLY',
        payment_method_id: 'pix',
        payer: { email: 'cliente@email.com' },
        external_reference: userId,
        notification_url: `${process.env.BASE_URL}/api/wallet/webhook`,
      },
      requestOptions: { idempotencyKey: `${userId}-${Date.now()}` },
    });
    const tx = result.point_of_interaction?.transaction_data || {};
    db.charges[String(result.id)] = { id: String(result.id), userId, amount: Number(amount), status: 'pending' };
    ensureWallet(userId).pending += Number(amount);
    res.json({
      id: String(result.id),
      status: result.status,
      amount: Number(amount),
      qr_code_base64: tx.qr_code_base64,
      qr_code: tx.qr_code,
      expires_at: result.date_of_expiration || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    console.error('[charge]', err);
    res.status(500).json({ error: 'Falha ao criar cobrança.' });
  }
});

app.get('/api/wallet/charge/:id', (req, res) => {
  const c = db.charges[req.params.id];
  if (!c) return res.status(404).json({ error: 'Não encontrada.' });
  res.json({ id: c.id, status: c.status });
});

app.post('/api/wallet/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const paymentId = req.query['data.id'] || req.body?.data?.id;
    if (!paymentId) return;
    const payment = await paymentClient.get({ id: paymentId });
    const userId = payment.external_reference;
    const chargeId = String(paymentId);
    const charge = db.charges[chargeId];
    if (!charge) return;

    if (payment.status === 'approved' && charge.status !== 'approved') {
      const wallet = ensureWallet(userId);
      wallet.pending = Math.max(0, wallet.pending - charge.amount);
      wallet.balance += charge.amount;
      wallet.totalCredits += charge.amount;
      db.transactions[userId].unshift({
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
    }
  } catch (err) {
    console.error('[webhook]', err);
  }
});

app.get('/api/wallet', (req, res) => {
  const userId = req.user?.id || 'demo-user';
  res.json(ensureWallet(userId));
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend STREAMLY na porta ${PORT}`));
