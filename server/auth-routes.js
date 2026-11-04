/* ============================================================
   AUTH ROUTES — /register /verify /resend
   Cadastro real com token de uso único e expiração de 24h.
   ============================================================ */

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { sendMail } = require('./mailer');
const { verifyEmailTemplate } = require('./emails/verify-email');
const { welcomeTemplate } = require('./emails/welcome');

const router = express.Router();

// ---------- "Banco" em memória (troque por Postgres/Supabase) ----------
// Estrutura de usuário:
// { id, name, cpf, phone, email, passwordHash,
//   emailVerified, verifyToken, verifyExpiresAt, createdAt }
const db = {
  users: [], // array
};

function findUserByEmail(email) {
  return db.users.find(u => u.email === email);
}

// ---------- Rate limits ----------
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: { error: 'Muitas tentativas de cadastro. Tente novamente em 1 hora.' },
});

const resendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 2,
  message: { error: 'Aguarde 1 minuto para reenviar.' },
});

// ---------- Helpers ----------
function isValidCPF(cpf) {
  const c = String(cpf).replace(/\D/g, '');
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(c[i]) * (10 - i);
  let d1 = (soma * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(c[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(c[i]) * (11 - i);
  let d2 = (soma * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(c[10]);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(email).trim());
}

// ============================================================
// POST /api/auth/register
// Body: { name, cpf, phone, email, password }
// ============================================================
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, cpf, phone, email, password } = req.body || {};

    // Validações básicas
    if (!name || name.trim().length < 3 || !name.includes(' ')) {
      return res.status(400).json({ error: 'Informe nome e sobrenome.' });
    }
    if (!isValidCPF(cpf)) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'A senha precisa ter ao menos 8 caracteres.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCpf = String(cpf).replace(/\D/g, '');

    // Unicidade
    if (findUserByEmail(normalizedEmail)) {
      return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
    }
    if (db.users.some(u => u.cpf === normalizedCpf)) {
      return res.status(409).json({ error: 'Já existe uma conta com este CPF.' });
    }

    // Hash da senha (bcrypt, 12 rounds)
    const passwordHash = await bcrypt.hash(password, 12);

    // Token de verificação: 32 bytes aleatórios = 64 chars hex
    // (não usamos JWT aqui porque queremos um token opaco de uso único)
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24h

    const user = {
      id: 'CLI-' + Date.now().toString(36).toUpperCase(),
      name: name.trim(),
      cpf: normalizedCpf,
      phone: String(phone || '').replace(/\D/g, ''),
      email: normalizedEmail,
      passwordHash,
      emailVerified: false,
      verifyToken,
      verifyExpiresAt,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);

    // URL de verificação (aponta para a página do frontend)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/verificar-email.html?token=${verifyToken}`;

    // Envia o e-mail
    const { html, text } = verifyEmailTemplate({
      name: user.name,
      verifyUrl,
      expiresIn: '24 horas',
    });

    try {
      await sendMail({
        to: user.email,
        subject: 'Confirme seu e-mail — STREAMLY',
        html,
        text,
      });
    } catch (mailErr) {
      console.error('[register] falha ao enviar e-mail:', mailErr);
      // Não remove o usuário — ele pode pedir reenvio.
      // Mas retorna aviso para o frontend.
      return res.status(201).json({
        ok: true,
        message: 'Conta criada, mas o e-mail de confirmação pode ter falhado. Tente reenviar em instantes.',
        resendIn: 60,
        emailFailed: true,
      });
    }

    return res.status(201).json({
      ok: true,
      message: 'Conta criada. Verifique seu e-mail para confirmar.',
      resendIn: 60,
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'Erro ao criar conta. Tente novamente.' });
  }
});

// ============================================================
// GET /api/auth/verify?token=...
// (Chamado pela página verificar-email.html)
// ============================================================
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Token ausente.' });
    }

    const user = db.users.find(u => u.verifyToken === token);

    if (!user) {
      // Pode ser token inválido OU já usado (limpamos o token após uso)
      return res.status(400).json({
        error: 'Link inválido ou já utilizado. Se sua conta já estiver ativa, faça login.',
      });
    }

    if (user.verifyExpiresAt < Date.now()) {
      // Token expirado — permite reenvio
      return res.status(400).json({
        error: 'Este link expirou. Solicite um novo e-mail de confirmação.',
        expired: true,
      });
    }

    // Ativa a conta + invalida o token (uso único)
    user.emailVerified = true;
    user.verifyToken = null;
    user.verifyExpiresAt = null;
    user.verifiedAt = new Date().toISOString();

    // Envia e-mail de boas-vindas (best effort)
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const { html, text } = welcomeTemplate({
        name: user.name,
        catalogUrl: `${frontendUrl}/catalogo.html`,
      });
      await sendMail({
        to: user.email,
        subject: 'Bem-vindo à STREAMLY',
        html,
        text,
      });
    } catch (e) {
      console.error('[verify] falha no welcome:', e);
    }

    // (Opcional) Emite JWT de sessão para login automático
    const sessionToken = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET || 'dev-secret-change-me',
      { expiresIn: '7d' }
    );

    return res.json({
      ok: true,
      message: 'E-mail confirmado com sucesso.',
      sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[verify]', err);
    return res.status(500).json({ error: 'Erro ao verificar. Tente novamente.' });
  }
});

// ============================================================
// POST /api/auth/resend
// Body: { email }
// ============================================================
router.post('/resend', resendLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }

    const user = findUserByEmail(String(email).trim().toLowerCase());
    if (!user) {
      // Por segurança, não revelamos se o e-mail existe ou não
      return res.json({ ok: true, message: 'Se o e-mail estiver cadastrado, você receberá um novo link.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Este e-mail já foi confirmado. Faça login.' });
    }

    // Novo token (invalida o anterior)
    const newToken = crypto.randomBytes(32).toString('hex');
    user.verifyToken = newToken;
    user.verifyExpiresAt = Date.now() + 24 * 60 * 60 * 1000;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/verificar-email.html?token=${newToken}`;

    const { html, text } = verifyEmailTemplate({
      name: user.name,
      verifyUrl,
      expiresIn: '24 horas',
    });

    await sendMail({
      to: user.email,
      subject: 'Confirme seu e-mail — STREAMLY',
      html,
      text,
    });

    return res.json({
      ok: true,
      message: 'Novo link enviado.',
      resendIn: 60,
    });
  } catch (err) {
    console.error('[resend]', err);
    return res.status(500).json({ error: 'Erro ao reenviar. Tente novamente.' });
  }
});

module.exports = { router, db };
