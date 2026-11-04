const express = require('express');
const OpenAI = require('openai');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimit');
const { SYSTEM_PROMPT } = require('../openai-prompt');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/support/chat (SSE streaming)
router.post('/chat', requireAuth, chatLimiter, async (req, res) => {
  const { messages = [], contextOrder, conversationId } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'Mensagens vazias.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const cleanMessages = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

  let contextBlock = '';
  if (contextOrder) contextBlock = `\n\n[Contexto do pedido: ${contextOrder}]`;

  try {
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      stream: true,
      max_tokens: Number(process.env.OPENAI_MAX_TOKENS || 600),
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + contextBlock },
        ...cleanMessages,
      ],
    });

    let fullText = '';
    let transfer = false;

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (!delta) continue;
      fullText += delta;

      if (!transfer && fullText.trimStart().startsWith('[TRANSFER]')) {
        transfer = true;
        send({ type: 'meta', transfer: true });
        fullText = fullText.replace('[TRANSFER]', '');
      }
      const visible = transfer ? fullText.replace(/^\[TRANSFER\]\s*/, '') : fullText;
      send({ type: 'chunk', text: visible });
    }

    // Persiste
    let conv = await prisma.supportConversation.findFirst({
      where: { code: conversationId, userId: req.user.id },
    });
    if (!conv) {
      conv = await prisma.supportConversation.create({
        data: {
          code: conversationId || ('SUP-' + crypto.randomBytes(3).toString('hex').toUpperCase()),
          userId: req.user.id,
          mode: transfer ? 'waiting_human' : 'ai',
          contextOrder: contextOrder || null,
          transferredAt: transfer ? new Date() : null,
        },
      });
    }
    await prisma.supportMessage.createMany({
      data: cleanMessages.map(m => ({
        conversationId: conv.id,
        from: m.role === 'user' ? 'user' : 'ai',
        text: m.content,
      })).concat([{
        conversationId: conv.id,
        from: 'ai',
        text: fullText.replace(/^\[TRANSFER\]\s*/, ''),
      }]),
    });

    send({ type: 'meta', transfer });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[chat]', err);
    send({ type: 'error', message: 'Erro ao processar.' });
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// POST /api/support/transfer
router.post('/transfer', requireAuth, async (req, res, next) => {
  try {
    const { conversationId, reason } = req.body || {};
    const conv = await prisma.supportConversation.findFirst({
      where: { code: conversationId, userId: req.user.id },
    });
    if (!conv) return res.status(404).json({ error: 'Conversa não encontrada.' });
    await prisma.supportConversation.update({
      where: { id: conv.id },
      data: { mode: 'waiting_human', transferredAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/support/tickets
router.post('/tickets', requireAuth, async (req, res, next) => {
  try {
    const { category, priority, subject, description, relatedId, attachments } = req.body || {};
    if (!category || !subject || !description) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    }
    const code = 'SUP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const ticket = await prisma.supportTicket.create({
      data: {
        code,
        userId: req.user.id,
        category,
        priority: priority || 'normal',
        subject: subject.slice(0, 120),
        description: description.slice(0, 2000),
        relatedId: relatedId || null,
        attachments: Array.isArray(attachments) ? attachments : [],
      },
    });
    res.json({ ok: true, code: ticket.code });
  } catch (err) { next(err); }
});

// GET /api/support/tickets
router.get('/tickets', requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  } catch (err) { next(err); }
});

module.exports = router;
