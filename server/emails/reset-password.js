/* ============================================================
   TEMPLATE — e-mail de redefinição de senha
   ============================================================ */

function resetPasswordTemplate({ name, resetUrl, expiresIn = '1 hora' }) {
  const firstName = (name || '').split(' ')[0] || 'Olá';
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>Redefinir senha — STREAMLY</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="width:100%;background:#000000;padding:40px 16px;">
    <div style="max-width:520px;margin:0 auto;background:#0f0f13;border:1px solid #26262e;border-radius:18px;overflow:hidden;">

      <div style="padding:28px 32px 8px;text-align:center;">
        <div style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:11px;background:#ffffff;color:#0a0a0c;font-size:19px;font-weight:900;letter-spacing:-1px;text-align:center;">S</div>
        <span style="display:block;margin-top:10px;color:#f5f5f7;font-size:13px;font-weight:800;letter-spacing:4px;">STREAMLY</span>
      </div>

      <div style="padding:8px 32px 32px;">
        <h1 style="margin:16px 0 8px;color:#f5f5f7;font-size:22px;font-weight:800;letter-spacing:-0.4px;text-align:center;">
          Redefinir sua senha
        </h1>
        <p style="margin:0 0 16px;color:#a9a9b4;font-size:14px;line-height:1.65;text-align:center;">
          Olá, <strong style="color:#f5f5f7">${firstName}</strong>.<br>
          Recebemos um pedido para redefinir a senha da sua conta STREAMLY.
        </p>

        <div style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#ffffff;color:#0a0a0c;font-size:14px;font-weight:800;text-decoration:none;border-radius:11px;" target="_blank" rel="noopener">
            Criar nova senha
          </a>
        </div>

        <p style="margin:16px 0 0;color:#5c5c64;font-size:11.5px;line-height:1.5;text-align:center;word-break:break-all;">
          Se o botão não funcionar, copie e cole este link:<br>
          <a href="${resetUrl}" style="color:#a9a9b4;text-decoration:underline;" target="_blank" rel="noopener">${resetUrl}</a>
        </p>

        <div style="height:1px;background:#26262e;margin:24px 0;"></div>

        <div style="padding:14px 16px;background:#17171b;border:1px solid #26262e;border-radius:11px;">
          <p style="margin:0;color:#8a8a92;font-size:12px;line-height:1.55;">
            <strong style="color:#f5f5f7">Este link expira em ${expiresIn}</strong> e só pode ser usado uma vez.
            Se você não solicitou a redefinição, ignore este e-mail — sua senha permanecerá a mesma.
            Ninguém da STREAMLY vai te pedir essa senha por telefone, WhatsApp ou chat.
          </p>
        </div>
      </div>

      <div style="padding:0 32px 28px;text-align:center;">
        <p style="margin:0;color:#5c5c64;font-size:11px;line-height:1.6;">
          © ${year} STREAMLY · Todos os direitos reservados<br>
          Este é um e-mail automático, não responda.
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;

  const text = `STREAMLY — Redefinir senha

Olá, ${firstName}.

Recebemos um pedido para redefinir a senha da sua conta. Abra o link abaixo:

${resetUrl}

Este link expira em ${expiresIn} e só pode ser usado uma vez.
Se você não solicitou, ignore este e-mail — sua senha permanecerá a mesma.

© ${year} STREAMLY`;

  return { html, text };
}

module.exports = { resetPasswordTemplate };
