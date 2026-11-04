const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const jwtLib = require('../lib/jwt');
const { sendMail } = require('../lib/mailer');
const { requireAuth } = require('../middleware/auth');
const { registerLimiter, loginLimiter, forgotLimiter, resendLimiter } = require('../middleware/rateLimit');
const { verifyEmailTemplate } = require('../emails/verify-email');
const { welcomeTemplate } = require('../emails/welcome');
const { resetPasswordTemplate } = require('../emails/reset-password');
const { twoFactorTemplate } = require('../emails/two-factor');

const router = express.Router();

// ---------- Utilitários ----------
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(e).trim());
const isValidCPF = (cpf) => {
  const c = String(cpf).replace(/\D/g, '');
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += Number(c[i]) * (10 - i);
  let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0;
  if (d1 !== Number(c[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += Number(c[i]) * (11 - i);
  let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0;
  return d2 === Number(c[10]);
};

// ---------- POST /api/auth/register ----------
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const { name, cpf, phone, email, password } = req.body || {};
    if (!name || name.trim().length < 3 || !name.includes(' ')) {
      return res.status(400).json({ error: 'Informe nome e sobrenome.' });
    }
    if (!isValidCPF(cpf)) return res.status(400).json({ error: 'CPF inválido.' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'E-mail inválido.' });
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter ao menos 8 caracteres.' });
    }

    const normEmail = email.trim().toLowerCase();
    const normCpf = cpf.replace(/\D/g, '');

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: normEmail }, { cpf: normCpf }] },
      select: { email: true, cpf: true },
    });
    if (exists) {
      return res.status(409).json({
        error: exists.email === normEmail
          ? 'Já existe uma conta com este e-mail.'
          : 'Já existe uma conta com este CPF.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        cpf: normCpf,
        phone: (phone || '').replace(/\D/g, ''),
        email: normEmail,
        passwordHash,
        verifyToken,
        verifyExpiresAt,
        wallet: { create: {} },
        settings: { create: {} },
      },
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verificar-email.html?token=${verifyToken}`;
    const { html, text } = verifyEmailTemplate({ name: user.name, verifyUrl, expiresIn: '24 horas' });

    try {
      await sendMail({ to: user.email, subject: 'Confirme seu e-mail — STREAMLY', html, text });
    } catch (mailErr) {
      console.error('[register] mail fail:', mailErr);
      return res.status(201).json({
        ok: true,
        message: 'Conta criada, mas o e-mail pode ter falhado. Reenvie em instantes.',
        resendIn: 60,
        emailFailed: true,
      });
    }

    res.status(201).json({
      ok: true,
      message: 'Conta criada. Verifique seu e-mail.',
      resendIn: 60,
    });
  } catch (err) { next(err); }
});

// ---------- GET /api/auth/verify?token= ----------
router.get('/verify', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token ausente.' });

    const user = await prisma.user.findUnique({ where: { verifyToken: token } });
    if (!user) {
      return res.status(400).json({ error: 'Link inválido ou já utilizado.' });
    }
    if (user.verifyExpiresAt && user.verifyExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Este link expirou. Solicite um novo.', expired: true });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verifyToken: null,
        verifyExpiresAt: null,
      },
    });

    const sessionToken = jwtLib.sign({ sub: updated.id, email: updated.email }, '7d');
    await prisma.session.create({
      data: {
        userId: updated.id,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        current: true,
      },
    });

    // E-mail de boas-vindas (best effort)
    try {
      const { html, text } = welcomeTemplate({
        name: updated.name,
        catalogUrl: `${process.env.FRONTEND_URL}/catalogo.html`,
      });
      await sendMail({ to: updated.email, subject: 'Bem-vindo à STREAMLY', html, text });
    } catch (e) { console.error('[verify] welcome fail:', e); }

    res.json({
      ok: true,
      message: 'E-mail confirmado.',
      sessionToken,
      user: { id: updated.id, name: updated.name, email: updated.email },
    });
  } catch (err) { next(err); }
});

// ---------- POST /api/auth/resend ----------
router.post('/resend', resendLimiter, async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!isValidEmail(email)) return res.status(400).json({ error: 'E-mail inválido.' });

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) return res.json({ ok: true, message: 'Se existir, você receberá um novo link.' });
    if (user.emailVerified) return res.status(400).json({ error: 'E-mail já confirmado. Faça login.' });

    const newToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken: newToken, verifyExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verificar-email.html?token=${newToken}`;
    const { html, text } = verifyEmailTemplate({ name: user.name, verifyUrl, expiresIn: '24 horas' });
    await sendMail({ to: user.email, subject: 'Confirme seu e-mail — STREAMLY', html, text });

    res.json({ ok: true, message: 'Novo link enviado.', resendIn: 60 });
  } catch (err) { next(err); }
});

// ---------- POST /api/auth/login ----------
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password, remember } = req.body || {};
    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Confirme seu e-mail antes de entrar.',
        needsVerification: true,
        email: user.email,
      });
    }

    if (user.twoFactorEnabled) {
      const code = String(crypto.randomInt(100000, 999999));
      const tempToken = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorCode: code,
          twoFactorTempToken: tempToken,
          twoFactorExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      try {
        const { html, text } = twoFactorTemplate({ name: user.name, code, expiresIn: '10 minutos' });
        await sendMail({ to: user.email, subject: 'Seu código de verificação — STREAMLY', html, text });
      } catch (e) { console.error('[login] 2fa mail fail:', e); }

      return res.json({ ok: true, requires2FA: true, tempToken, email: user.email });
    }

    const expiresIn = remember ? '7d' : '4h';
    const sessionToken = jwtLib.sign({ sub: user.id, email: user.email }, expiresIn);
    const expiresMs = remember ? 7 * 24 * 3600 * 1000 : 4 * 3600 * 1000;

    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        expiresAt: new Date(Date.now() + expiresMs),
        current: true,
      },
    });

    res.json({
      ok: true,
      sessionToken,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) { next(err); }
});

// ---------- POST /api/auth/login/verify-2fa ----------
router.post('/login/verify-2fa', async (req, res, next) => {
  try {
    const { tempToken, code } = req.body || {};
    if (!tempToken || !code) return res.status(400).json({ error: 'Dados incompletos.' });

    const user = await prisma.user.findFirst({ where: { twoFactorTempToken: tempToken } });
    if (!user) return res.status(400).json({ error: 'Sessão de verificação inválida ou expirada.' });
    if (user.twoFactorExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Código expirado. Faça login novamente.' });
    }
    if (String(code) !== String(user.twoFactorCode)) {
      return res.status(401).json({ error: 'Código incorreto.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorCode: null, twoFactorTempToken: null, twoFactorExpiresAt: null },
    });

    const sessionToken = jwtLib.sign({ sub: user.id, email: user.email }, '7d');
    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        current: true,
      },
    });

    res.json({
      ok: true,
      sessionToken,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) { next(err); }
});

// ---------- POST /api/auth/login/resend-2fa ----------
router.post('/login/resend-2fa', async (req, res, next) => {
  try {
    const { tempToken } = req.body || {};
    const user = await prisma.user.findFirst({ where: { twoFactorTempToken: tempToken } });
    if (!user) return res.status(400).json({ error: 'Sessão inválida.' });

    const newCode = String(crypto.randomInt(100000, 999999));
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorCode: newCode, twoFactorExpiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });

    const { html, text } = twoFactorTemplate({ name: user.name, code: newCode, expiresIn: '10 minutos' });
    await sendMail({ to: user.email, subject: 'Seu código de verificação — STREAMLY', html, text });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---------- POST /api/auth/forgot-password ----------
router.post('/forgot-password', forgotLimiter, async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!isValidEmail(email)) return res.status(400).json({ error: 'E-mail inválido.' });

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    const ok = () => res.json({ ok: true, message: 'Se existir uma conta, você receberá um e-mail.' });
    if (!user) return ok();

    const resetToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    try {
      const resetUrl = `${process.env.FRONTEND_URL}/redefinir-senha.html?token=${resetToken}`;
      const { html, text } = resetPasswordTemplate({ name: user.name, resetUrl, expiresIn: '1 hora' });
      await sendMail({ to: user.email, subject: 'Redefinir sua senha — STREAMLY', html, text });
    } catch (e) { console.error('[forgot] mail fail:', e); }

    ok();
  } catch (err) { next(err); }
});

// ---------- POST /api/auth/reset-password ----------
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Token ausente.' });
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Senha precisa ter ao menos 8 caracteres.' });
    }

    const user = await prisma.user.findUnique({ where: { resetToken: token } });
    if (!user) return res.status(400).json({ error: 'Link inválido ou já utilizado.' });
    if (user.resetExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Este link expirou.', expired: true });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetExpiresAt: null,
        twoFactorCode: null,
        twoFactorTempToken: null,
        twoFactorExpiresAt: null,
      },
    });

    res.json({ ok: true, message: 'Senha alterada com sucesso.' });
  } catch (err) { next(err); }
});

// ---------- POST /api/auth/logout ----------
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token) {
      await prisma.session.deleteMany({ where: { token } });
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---------- GET /api/auth/me ----------
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, phone: true, cpf: true,
        avatarUrl: true, emailVerified: true, status: true,
        twoFactorEnabled: true, createdAt: true,
      },
    });
    res.json({ user });
  } catch (err) { next(err); }
});

module.exports = router;
