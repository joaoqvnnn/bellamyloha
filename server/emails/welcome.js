/* ============================================================
   TEMPLATE — e-mail de boas-vindas (após confirmação)
   ============================================================ */

function welcomeTemplate({ name, catalogUrl }) {
  const firstName = (name || '').split(' ')[0] || 'Olá';
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>Bem-vindo à STREAMLY</title>
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
          Bem-vindo à STREAMLY, ${firstName}!
        </h1>
        <p style="margin:0 0 16px;color:#a9a9b4;font-size:14px;line-height:1.65;text-align:center;">
          Sua conta está ativa. Agora você pode comprar telas de streaming com entrega imediata.
        </p>

        <div style="text-align:center;margin:24px 0;">
          <a href="${catalogUrl}" style="display:inline-block;padding:14px 32px;background:#ffffff;color:#0a0a0c;font-size:14px;font-weight:800;text-decoration:none;border-radius:11px;" target="_blank" rel="noopener">
            Explorar o catálogo
          </a>
        </div>

        <div style="padding:14px 16px;background:#17171b;border:1px solid #26262e;border-radius:11px;">
          <p style="margin:0;color:#8a8a92;font-size:12px;line-height:1.55;">
            <strong style="color:#f5f5f7">Dica:</strong> adicione saldo na carteira via PIX para finalizar compras em segundos.
            A entrega da maioria dos produtos é automática, em até 5 minutos.
          </p>
        </div>
      </div>

      <div style="padding:0 32px 28px;text-align:center;">
        <p style="margin:0;color:#5c5c64;font-size:11px;line-height:1.6;">
          © ${year} STREAMLY · Todos os direitos reservados
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;

  const text = `STREAMLY — Bem-vindo, ${firstName}!

Sua conta está ativa. Acesse o catálogo:
${catalogUrl}

Dica: adicione saldo na carteira via PIX para finalizar compras em segundos.

© ${year} STREAMLY`;

  return { html, text };
}

module.exports = { welcomeTemplate };
