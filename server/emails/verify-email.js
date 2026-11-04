/* ============================================================
   TEMPLATE — e-mail de verificação de conta
   Dark, responsivo, CSS inline, compatível com Outlook/Gmail.
   ============================================================ */

function verifyEmailTemplate({ name, verifyUrl, expiresIn = '24 horas' }) {
  const firstName = (name || '').split(' ')[0] || 'Olá';
  const year = new Date().getFullYear();

  // CSS inline (obrigatório em e-mail)
  const styles = {
    body: 'margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
    wrapper: 'width:100%;background:#000000;padding:40px 16px;',
    card: 'max-width:520px;margin:0 auto;background:#0f0f13;border:1px solid #26262e;border-radius:18px;overflow:hidden;',
    header: 'padding:28px 32px 8px;text-align:center;',
    logo: 'display:inline-block;width:40px;height:40px;line-height:40px;border-radius:11px;background:#ffffff;color:#0a0a0c;font-size:19px;font-weight:900;letter-spacing:-1px;text-align:center;',
    brand: 'display:block;margin-top:10px;color:#f5f5f7;font-size:13px;font-weight:800;letter-spacing:4px;',
    body_pad: 'padding:8px 32px 32px;',
    h1: 'margin:16px 0 8px;color:#f5f5f7;font-size:22px;font-weight:800;letter-spacing:-0.4px;text-align:center;',
    p: 'margin:0 0 16px;color:#a9a9b4;font-size:14px;line-height:1.65;text-align:center;',
    p_left: 'margin:0 0 16px;color:#a9a9b4;font-size:14px;line-height:1.65;',
    button_wrap: 'text-align:center;margin:24px 0;',
    button: 'display:inline-block;padding:14px 32px;background:#ffffff;color:#0a0a0c;font-size:14px;font-weight:800;text-decoration:none;border-radius:11px;letter-spacing:0.2px;',
    link_fallback: 'margin:16px 0 0;color:#5c5c64;font-size:11.5px;line-height:1.5;text-align:center;word-break:break-all;',
    link: 'color:#a9a9b4;text-decoration:underline;',
    divider: 'height:1px;background:#26262e;margin:24px 0;',
    security: 'padding:14px 16px;background:#17171b;border:1px solid #26262e;border-radius:11px;',
    security_p: 'margin:0;color:#8a8a92;font-size:12px;line-height:1.55;',
    footer: 'padding:0 32px 28px;text-align:center;',
    footer_p: 'margin:0;color:#5c5c64;font-size:11px;line-height:1.6;',
  };

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Confirme seu e-mail — STREAMLY</title>
  <!--[if mso]>
  <style>table,td,a{font-family:Arial,sans-serif!important}</style>
  <![endif]-->
</head>
<body style="${styles.body}">
  <div style="${styles.wrapper}">

    <div style="${styles.card}">

      <!-- HEADER -->
      <div style="${styles.header}">
        <div style="${styles.logo}">S</div>
        <span style="${styles.brand}">STREAMLY</span>
      </div>

      <!-- BODY -->
      <div style="${styles.body_pad}">

        <h1 style="${styles.h1}">Confirme seu e-mail</h1>

        <p style="${styles.p}">
          Olá, <strong style="color:#f5f5f7">${firstName}</strong>.<br>
          Sua conta na STREAMLY foi criada com sucesso.<br>
          Falta só um passo para ativá-la.
        </p>

        <div style="${styles.button_wrap}">
          <a href="${verifyUrl}" style="${styles.button}" target="_blank" rel="noopener">
            Confirmar meu e-mail
          </a>
        </div>

        <p style="${styles.link_fallback}">
          Se o botão não funcionar, copie e cole este link no navegador:<br>
          <a href="${verifyUrl}" style="${styles.link}" target="_blank" rel="noopener">${verifyUrl}</a>
        </p>

        <div style="${styles.divider}"></div>

        <div style="${styles.security}">
          <p style="${styles.security_p}">
            <strong style="color:#f5f5f7">Este link expira em ${expiresIn}</strong> e só pode ser usado uma vez.
            Se você não criou esta conta, ignore este e-mail — nada será ativado.
            A STREAMLY nunca pede sua senha por e-mail.
          </p>
        </div>

      </div>

      <!-- FOOTER -->
      <div style="${styles.footer}">
        <p style="${styles.footer_p}">
          © ${year} STREAMLY · Todos os direitos reservados<br>
          Este é um e-mail automático, não responda.
        </p>
      </div>

    </div>

  </div>
</body>
</html>`;

  // Versão texto puro (importante para entregabilidade e acessibilidade)
  const text = `STREAMLY — Confirme seu e-mail

Olá, ${firstName}.

Sua conta na STREAMLY foi criada com sucesso. Para ativá-la, abra o link abaixo:

${verifyUrl}

Este link expira em ${expiresIn} e só pode ser usado uma vez.
Se você não criou esta conta, ignore este e-mail.

A STREAMLY nunca pede sua senha por e-mail.

© ${year} STREAMLY`;

  return { html, text };
}

module.exports = { verifyEmailTemplate };
