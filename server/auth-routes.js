/* ============================================================
   AUTH ROUTES — /register /verify /resend
                 + /login /login/verify-2fa /login/resend-2fa
                 + /forgot-password /reset-password
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
const { resetPasswordTemplate } = require('./emails/reset-password');
const { twoFactorTemplate } = require('./emails/two-factor');

const router = express.Router();

// ---------- "Banco" em memória (troque por Postgres/Supabase) ----------
// Estrutura de usuário:
// { id, name, cpf, phone, email, passwordHash,
//   emailVerified, verifyToken, verifyExpiresAt, createdAt,
//   twoFactorEnabled, twoFactorCode, twoFactorTempToken, twoFactorExpiresAt,
//   resetToken, resetExpiresAt, passwordChangedAt }
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

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Muitas solicitações. Tente novamente em 1 hora.' },
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
      twoFactorEnabled: false,  // ativado depois via Configurações
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

// ============================================================
// POST /api/auth/login
// Body: { email, password, remember }
// ============================================================
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, remember } = req.body || {};

    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = findUserByEmail(normalizedEmail);

    // Mensagem genérica (não revela se o e-mail existe)
    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    // Compara senha
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    // Verifica se o e-mail foi confirmado
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Confirme seu e-mail antes de entrar.',
        needsVerification: true,
        email: user.email,
      });
    }

    // 2FA
    if (user.twoFactorEnabled) {
      const code = String(crypto.randomInt(100000, 999999));
      const tempToken = crypto.randomBytes(32).toString('hex');

      user.twoFactorCode = code;
      user.twoFactorTempToken = tempToken;
      user.twoFactorExpiresAt = Date.now() + 10 * 60 * 1000; // 10 min

      // Envia o código por e-mail
      try {
        const { html, text } = twoFactorTemplate({
          name: user.name,
          code,
          expiresIn: '10 minutos',
        });
        await sendMail({
          to: user.email,
          subject: 'Seu código de verificação — STREAMLY',
          html,
          text,
        });
      } catch (e) {
        console.error('[login] falha ao enviar 2FA:', e);
        // Segue mesmo assim — usuário pode tentar reenviar
      }

      return res.json({
        ok: true,
        requires2FA: true,
        tempToken,
        email: user.email,
      });
    }

    // Emite JWT
    const expiresIn = remember ? '7d' : '4h';
    const sessionToken = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET || 'dev-secret-change-me',
      { expiresIn }
    );

    return res.json({
      ok: true,
      sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Erro ao entrar. Tente novamente.' });
  }
});

// ============================================================
// POST /api/auth/login/verify-2fa
// Body: { tempToken, code }
// ============================================================
router.post('/login/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body || {};

    if (!tempToken || !code) {
      return res.status(400).json({ error: 'Dados incompletos.' });
    }

    const user = db.users.find(u => u.twoFactorTempToken === tempToken);
    if (!user) {
      return res.status(400).json({ error: 'Sessão de verificação inválida ou expirada.' });
    }

    if (user.twoFactorExpiresAt < Date.now()) {
      user.twoFactorCode = null;
      user.twoFactorTempToken = null;
      user.twoFactorExpiresAt = null;
      return res.status(400).json({ error: 'Código expirado. Faça login novamente.' });
    }

    if (String(code) !== String(user.twoFactorCode)) {
      return res.status(401).json({ error: 'Código incorreto. Tente novamente.' });
    }

    // Consome o código
    user.twoFactorCode = null;
    user.twoFactorTempToken = null;
    user.twoFactorExpiresAt = null;

    const sessionToken = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET || 'dev-secret-change-me',
      { expiresIn: '7d' }
    );

    return res.json({
      ok: true,
      sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[verify-2fa]', err);
    return res.status(500).json({ error: 'Erro ao verificar. Tente novamente.' });
  }
});

// ============================================================
// POST /api/auth/login/resend-2fa
// Body: { tempToken }
// ============================================================
router.post('/login/resend-2fa', async (req, res) => {
  try {
    const { tempToken } = req.body || {};
    const user = db.users.find(u => u.twoFactorTempToken === tempToken);
    if (!user) {
      return res.status(400).json({ error: 'Sessão inválida ou expirada.' });
    }

    const newCode = String(crypto.randomInt(100000, 999999));
    user.twoFactorCode = newCode;
    user.twoFactorExpiresAt = Date.now() + 10 * 60 * 1000;

    try {
      const { html, text } = twoFactorTemplate({
        name: user.name,
        code: newCode,
        expiresIn: '10 minutos',
      });
      await sendMail({
        to: user.email,
        subject: 'Seu código de verificação — STREAMLY',
        html,
        text,
      });
    } catch (e) {
      console.error('[resend-2fa]', e);
      return res.status(500).json({ error: 'Não foi possível enviar o código.' });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao reenviar.' });
  }
});

// ============================================================
// POST /api/auth/forgot-password
// Body: { email }
// ============================================================
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }

    const user = findUserByEmail(String(email).trim().toLowerCase());

    // Sempre responde OK para não revelar se o e-mail existe
    const ok = () => res.json({ ok: true, message: 'Se existir uma conta, você receberá um e-mail.' });

    if (!user) return ok();

    // Gera token de reset (1h)
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetExpiresAt = Date.now() + 60 * 60 * 1000;

    // Envia o e-mail
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/redefinir-senha.html?token=${resetToken}`;

      const { html, text } = resetPasswordTemplate({
        name: user.name,
        resetUrl,
        expiresIn: '1 hora',
      });

      await sendMail({
        to: user.email,
        subject: 'Redefinir sua senha — STREAMLY',
        html,
        text,
      });
    } catch (e) {
      console.error('[forgot-password] falha no envio:', e);
      // Não revela falha — segue respondendo OK
    }

    return ok();
  } catch (err) {
    console.error('[forgot-password]', err);
    return res.status(500).json({ error: 'Erro ao processar solicitação.' });
  }
});

// ============================================================
// POST /api/auth/reset-password
// Body: { token, newPassword }
// ============================================================
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token) {
      return res.status(400).json({ error: 'Token ausente.' });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'A senha precisa ter ao menos 8 caracteres.' });
    }

    const user = db.users.find(u => u.resetToken === token);
    if (!user) {
      return res.status(400).json({ error: 'Link inválido ou já utilizado.' });
    }
    if (user.resetExpiresAt < Date.now()) {
      user.resetToken = null;
      user.resetExpiresAt = null;
      return res.status(400).json({ error: 'Este link expirou. Solicite um novo.', expired: true });
    }

    // Atualiza a senha
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordChangedAt = new Date().toISOString();

    // Invalida o token (uso único)
    user.resetToken = null;
    user.resetExpiresAt = null;

    // Invalida sessões 2FA pendentes (por segurança)
    user.twoFactorCode = null;
    user.twoFactorTempToken = null;
    user.twoFactorExpiresAt = null;

    return res.json({ ok: true, message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error('[reset-password]', err);
    return res.status(500).json({ error: 'Erro ao alterar senha. Tente novamente.' });
  }
});

module.exports = { router, db };
