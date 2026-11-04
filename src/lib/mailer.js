const nodemailer = require('nodemailer');

function createTransporter() {
  if (process.env.SMTP_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

const transporter = createTransporter();

async function sendMail({ to, subject, html, text, replyTo }) {
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || 'STREAMLY <noreply@streamly.com.br>',
    to, subject, html, text,
    replyTo: replyTo || process.env.MAIL_REPLY_TO,
  });
  console.log(`[mail] ${to} · ${info.messageId}`);
  return info;
}

module.exports = { sendMail };
