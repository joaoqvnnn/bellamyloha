/* ============================================================
   MAILER — transporte SMTP via Nodemailer
   ============================================================ */

const nodemailer = require('nodemailer');

/**
 * Cria o transporter com base nas variáveis de ambiente.
 *
 * RECOMENDADO EM PRODUÇÃO: use um provedor transacional
 * (SendGrid, Resend, Amazon SES, Postmark, Mailgun)
 * em vez do Gmail. O Gmail limita a 500 e-mails/dia em conta
 * pessoal e 2.000/dia em Workspace, além de bloquear
 * conexões de servidores que ele considera "suspeitos".
 */
function createTransporter() {
  // Opção 1: Gmail (simples para testar)
  if (process.env.SMTP_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // App Password (16 caracteres)
      },
    });
  }

  // Opção 2: SMTP genérico (SendGrid, Resend, SES, seu domínio)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true', // true para 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Timeouts para evitar travamento
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

const transporter = createTransporter();

/**
 * Envia um e-mail HTML + texto plano.
 */
async function sendMail({ to, subject, html, text, replyTo }) {
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || 'STREAMLY <noreply@streamly.com.br>',
    to,
    subject,
    html,
    text, // fallback texto puro (importante para entregabilidade)
    replyTo: replyTo || process.env.MAIL_REPLY_TO,
  });
  console.log(`[mail] enviado para ${to} · id=${info.messageId}`);
  return info;
}

module.exports = { transporter, sendMail };
