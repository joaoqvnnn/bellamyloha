require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma');
const { requireAuth } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/error');
const { generalLimiter } = require('./middleware/rateLimit');

const app = express();

app.set('trust proxy', 1); // Render usa proxy

// ==================== CORS ====================
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS bloqueado: ' + origin));
  },
  credentials: true,
}));

// ==================== BODY PARSER ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== RATE LIMIT GLOBAL ====================
app.use('/api', generalLimiter);

// ==================== HEALTHCHECK ====================
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'STREAMLY API', version: '1.0.0' });
});
app.get('/healthz', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(500).json({ status: 'error', db: 'down' });
  }
});

// ==================== ROTAS ====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/catalog', require('./routes/catalog'));
app.use('/api/screens', require('./routes/screens'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/history', require('./routes/history'));
app.use('/api/support', require('./routes/support'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/settings', require('./routes/settings'));

// ==================== NOTIFICAÇÕES ====================
app.get('/api/notifications', requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ items });
  } catch (err) { next(err); }
});

app.post('/api/notifications/mark-all-read', requireAuth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ==================== 404 + ERROR HANDLER ====================
app.use(notFoundHandler);
app.use(errorHandler);

// ==================== START ====================
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 STREAMLY API rodando na porta ${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Frontend: ${process.env.FRONTEND_URL || '(não configurado)'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido, encerrando...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
