const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const jwtLib = require('../lib/jwt');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// ============================================================
// LOGIN DO ADMIN (bypass de verificação de e-mail)
// ============================================================
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Esta conta não tem acesso administrativo.' });
    }
    if (user.status !== 'ativa') {
      return res.status(403).json({ error: 'Conta desativada.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const sessionToken = jwtLib.sign({ sub: user.id, email: user.email, role: 'admin' }, '12h');

    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        expiresAt: new Date(Date.now() + 12 * 3600 * 1000),
        current: true,
      },
    });

    res.json({
      ok: true,
      sessionToken,
      user: { id: user.id, name: user.name, email: user.email, role: 'admin' },
    });
  } catch (err) { next(err); }
});

// ============================================================
// A partir daqui, TODAS as rotas exigem admin
// ============================================================
router.use(requireAuth, requireAdmin);

// ---------- GET /api/admin/me ----------
router.get('/me', async (req, res) => {
  res.json({ user: req.user });
});

// ---------- GET /api/admin/stats ----------
router.get('/stats', async (req, res, next) => {
  try {
    const [
      usersTotal, usersActive, usersBanned,
      productsTotal, productsActive,
      ordersTotal, ordersPending,
      screensTotal, screensActive,
      subsTotal, subsActive,
      ticketsTotal, ticketsPending,
      cpfRequestsPending,
      revenueAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ativa' } }),
      prisma.user.count({ where: { status: 'banned' } }),
      prisma.product.count(),
      prisma.product.count({ where: { active: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'pendente' } }),
      prisma.screen.count(),
      prisma.screen.count({ where: { status: 'ativa' } }),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'ativa' } }),
      prisma.supportTicket.count(),
      prisma.supportTicket.count({ where: { status: 'aguardando' } }),
      prisma.cpfChangeRequest.count({ where: { status: 'pendente' } }),
      prisma.transaction.aggregate({
        where: { type: 'entrada', category: 'recarga', status: 'aprovado' },
        _sum: { value: true },
      }),
    ]);

    res.json({
      users: { total: usersTotal, active: usersActive, banned: usersBanned },
      products: { total: productsTotal, active: productsActive },
      orders: { total: ordersTotal, pending: ordersPending },
      screens: { total: screensTotal, active: screensActive },
      subscriptions: { total: subsTotal, active: subsActive },
      tickets: { total: ticketsTotal, pending: ticketsPending },
      cpfRequests: { pending: cpfRequestsPending },
      revenue: Number(revenueAgg._sum.value || 0),
    });
  } catch (err) { next(err); }
});

// ============================================================
// USUÁRIOS
// ============================================================
router.get('/users', async (req, res, next) => {
  try {
    const { search, status, page = 1, perPage = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search.replace(/\D/g, '') } },
      ];
    }
    const skip = (Number(page) - 1) * Number(perPage);
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, cpf: true, phone: true,
          role: true, status: true, emailVerified: true,
          createdAt: true, bannedAt: true, bannedReason: true,
          wallet: { select: { balance: true } },
          _count: { select: { orders: true, screens: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: Number(perPage),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      total,
      page: Number(page),
      perPage: Number(perPage),
      items: items.map(u => ({
        ...u,
        wallet: { balance: Number(u.wallet?.balance || 0) },
      })),
    });
  } catch (err) { next(err); }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        wallet: true,
        _count: { select: { orders: true, screens: true, subscriptions: true, transactions: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    delete user.passwordHash;
    res.json({ user });
  } catch (err) { next(err); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { name, email, phone, role } = req.body || {};
    const data = {};
    if (name !== undefined)   data.name = name;
    if (email !== undefined)  data.email = String(email).toLowerCase();
    if (phone !== undefined)  data.phone = phone;
    if (role !== undefined && ['user', 'admin'].includes(role)) data.role = role;

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, status: true },
    });
    res.json({ user: updated });
  } catch (err) { next(err); }
});

router.post('/users/:id/ban', async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode banir a si mesmo.' });
    }
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (target.role === 'admin') {
      return res.status(400).json({ error: 'Não é possível banir outro administrador.' });
    }
    await prisma.user.update({
      where: { id: req.params.id },
      data: {
        status: 'banned',
        bannedAt: new Date(),
        bannedReason: reason || 'Violação dos termos de uso',
      },
    });
    await prisma.session.deleteMany({ where: { userId: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/users/:id/unban', async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'ativa', bannedAt: null, bannedReason: null },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter ao menos 8 caracteres.' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash: hash },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ============================================================
// PRODUTOS
// ============================================================
router.get('/products', async (req, res, next) => {
  try {
    const { search, category, active, page = 1, perPage = 20 } = req.query;
    const where = {};
    if (category && category !== 'todas') where.category = category;
    if (active === 'true')  where.active = true;
    if (active === 'false') where.active = false;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { platform: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (Number(page) - 1) * Number(perPage);
    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(perPage) }),
      prisma.product.count({ where }),
    ]);
    res.json({
      total,
      items: items.map(p => ({
        ...p,
        price: Number(p.price),
        oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
      })),
    });
  } catch (err) { next(err); }
});

router.post('/products', async (req, res, next) => {
  try {
    const data = req.body || {};
    if (!data.name || !data.platform || !data.price) {
      return res.status(400).json({ error: 'Nome, plataforma e preço são obrigatórios.' });
    }
    const slug = data.slug || data.name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).slice(2, 6);

    const product = await prisma.product.create({
      data: {
        slug,
        name: data.name,
        platform: data.platform,
        platformColor: data.platformColor || '#333333',
        category: data.category || 'Filmes e séries',
        shortDesc: data.shortDesc || '',
        description: data.description || '',
        features: data.features || [],
        howItWorks: data.howItWorks || [],
        price: data.price,
        oldPrice: data.oldPrice || null,
        period: data.period || '/mês',
        delivery: data.delivery || 'auto',
        stock: Number(data.stock || 0),
        bonus: data.bonus || null,
        active: data.active !== false,
      },
    });
    res.json({ product: { ...product, price: Number(product.price) } });
  } catch (err) { next(err); }
});

router.patch('/products/:id', async (req, res, next) => {
  try {
    const data = req.body || {};
    const update = {};
    const fields = ['name', 'platform', 'platformColor', 'category', 'shortDesc',
                    'description', 'features', 'howItWorks', 'price', 'oldPrice',
                    'period', 'delivery', 'stock', 'bonus', 'active'];
    for (const f of fields) {
      if (data[f] !== undefined) update[f] = data[f];
    }
    if (update.oldPrice === '') update.oldPrice = null;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: update,
    });
    res.json({ product: { ...product, price: Number(product.price) } });
  } catch (err) { next(err); }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    await prisma.product.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ============================================================
// PEDIDOS
// ============================================================
router.get('/orders', async (req, res, next) => {
  try {
    const { search, status, page = 1, perPage = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { deliveryEmail: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (Number(page) - 1) * Number(perPage);
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: { include: { product: { select: { name: true, platform: true } } } }, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: Number(perPage),
      }),
      prisma.order.count({ where }),
    ]);
    res.json({
      total,
      items: items.map(o => ({ ...o, total: Number(o.total) })),
    });
  } catch (err) { next(err); }
});

router.patch('/orders/:id', async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.body || {};
    const data = {};
    if (status) data.status = status;
    if (paymentStatus) data.paymentStatus = paymentStatus;
    await prisma.order.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ============================================================
// TRANSAÇÕES
// ============================================================
router.get('/transactions', async (req, res, next) => {
  try {
    const { type, status, category, from, to, page = 1, perPage = 30 } = req.query;
    const where = {};
    if (type)     where.type = type;
    if (status)   where.status = status;
    if (category) where.category = category;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }
    const skip = (Number(page) - 1) * Number(perPage);
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: Number(perPage),
      }),
      prisma.transaction.count({ where }),
    ]);
    res.json({
      total,
      items: items.map(t => ({ ...t, value: Number(t.value) })),
    });
  } catch (err) { next(err); }
});

// ============================================================
// TELAS E ASSINATURAS
// ============================================================
router.get('/screens', async (req, res, next) => {
  try {
    const { status, search, page = 1, perPage = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { platform: { contains: search, mode: 'insensitive' } },
    ];
    const skip = (Number(page) - 1) * Number(perPage);
    const [items, total] = await Promise.all([
      prisma.screen.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: Number(perPage),
      }),
      prisma.screen.count({ where }),
    ]);
    res.json({ total, items: items.map(s => ({ ...s, value: Number(s.value) })) });
  } catch (err) { next(err); }
});

router.get('/subscriptions', async (req, res, next) => {
  try {
    const { status, search, page = 1, perPage = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) where.platform = { contains: search, mode: 'insensitive' };
    const skip = (Number(page) - 1) * Number(perPage);
    const [items, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: Number(perPage),
      }),
      prisma.subscription.count({ where }),
    ]);
    res.json({ total, items: items.map(s => ({ ...s, value: Number(s.value) })) });
  } catch (err) { next(err); }
});

// ============================================================
// SUPORTE (tickets)
// ============================================================
router.get('/tickets', async (req, res, next) => {
  try {
    const { status, page = 1, perPage = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    const skip = (Number(page) - 1) * Number(perPage);
    const [items, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: Number(perPage),
      }),
      prisma.supportTicket.count({ where }),
    ]);
    res.json({ total, items });
  } catch (err) { next(err); }
});

router.patch('/tickets/:id', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ============================================================
// SOLICITAÇÕES DE CPF
// ============================================================
router.get('/cpf-requests', async (req, res, next) => {
  try {
    const { status, page = 1, perPage = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    const skip = (Number(page) - 1) * Number(perPage);
    const [items, total] = await Promise.all([
      prisma.cpfChangeRequest.findMany({
        where,
        include: { user: { select: { name: true, email: true, cpf: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: Number(perPage),
      }),
      prisma.cpfChangeRequest.count({ where }),
    ]);
    res.json({ total, items });
  } catch (err) { next(err); }
});

router.patch('/cpf-requests/:id', async (req, res, next) => {
  try {
    const { status, newCpf } = req.body || {};
    if (!['aprovado', 'recusado'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const request = await prisma.cpfChangeRequest.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
      },
    });

    // Se aprovado, aplica o novo CPF
    if (status === 'aprovado' && newCpf) {
      const clean = String(newCpf).replace(/\D/g, '');
      if (clean.length !== 11) {
        return res.status(400).json({ error: 'CPF inválido.' });
      }
      await prisma.user.update({
        where: { id: request.userId },
        data: { cpf: clean },
      });
      await prisma.profileHistory.create({
        data: {
          userId: request.userId,
          action: 'CPF alterado',
          detail: `Solicitação ${request.code} aprovada pelo administrador`,
        },
      });
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ============================================================
// CONFIGURAÇÃO DE RECARGA
// ============================================================
router.get('/recharge-config', async (req, res, next) => {
  try {
    let config = await prisma.rechargeConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.rechargeConfig.create({
        data: { id: 'default', minAmount: 10, maxAmount: 5000, packages: [], bonusTiers: [] },
      });
    }
    res.json({
      minAmount: Number(config.minAmount),
      maxAmount: Number(config.maxAmount),
      packages: config.packages,
      bonusTiers: config.bonusTiers,
    });
  } catch (err) { next(err); }
});

router.put('/recharge-config', async (req, res, next) => {
  try {
    const { minAmount, maxAmount, packages, bonusTiers } = req.body || {};
    const config = await prisma.rechargeConfig.update({
      where: { id: 'default' },
      data: {
        minAmount: Number(minAmount),
        maxAmount: Number(maxAmount),
        packages: packages || [],
        bonusTiers: bonusTiers || [],
      },
    });
    res.json({
      minAmount: Number(config.minAmount),
      maxAmount: Number(config.maxAmount),
      packages: config.packages,
      bonusTiers: config.bonusTiers,
    });
  } catch (err) { next(err); }
});

// ============================================================
// CONTEÚDO DO SITE (sobre, privacidade, endereço, footer)
// ============================================================
router.get('/site-content', async (req, res, next) => {
  try {
    const items = await prisma.siteContent.findMany();
    const map = {};
    items.forEach(item => { map[item.key] = item.value; });
    res.json({ content: map });
  } catch (err) { next(err); }
});

router.put('/site-content', async (req, res, next) => {
  try {
    const content = req.body?.content || {};
    const operations = Object.entries(content).map(([key, value]) =>
      prisma.siteContent.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );
    await prisma.$transaction(operations);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ============================================================
// NOTIFICAÇÕES BROADCAST
// ============================================================
router.post('/notifications/broadcast', async (req, res, next) => {
  try {
    const { type = 'info', title, sub, target = 'all' } = req.body || {};
    if (!title || !sub) {
      return res.status(400).json({ error: 'Título e mensagem são obrigatórios.' });
    }

    let userIds = [];
    if (target === 'all') {
      const users = await prisma.user.findMany({ where: { status: 'ativa' }, select: { id: true } });
      userIds = users.map(u => u.id);
    } else if (Array.isArray(target)) {
      userIds = target;
    }

    if (userIds.length === 0) {
      return res.status(400).json({ error: 'Nenhum destinatário.' });
    }

    await prisma.notification.createMany({
      data: userIds.map(userId => ({ userId, type, title, sub })),
    });

    res.json({ ok: true, sent: userIds.length });
  } catch (err) { next(err); }
});

module.exports = router;
