/* ============================================================
   VERIFICAR E-MAIL — confirma o token e ativa a conta
   ============================================================ */

// ⚠️ Deve vir ANTES do IIFE (ele lê essa variável na inicialização)
window.STREAMLY_API_BASE = 'https://streamly-backend.onrender.com/api';

(function () {
  const API_BASE = window.STREAMLY_API_BASE || '/api';
  const card = document.getElementById('verifyCard');
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  function renderLoading() {
    card.innerHTML = `
      <div class="verify-loading">
        <div class="verify-spinner">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="9" opacity=".2"/>
            <path d="M21 12a9 9 0 0 0-9-9">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/>
            </path>
          </svg>
        </div>
        <h1>Confirmando seu e-mail...</h1>
        <p class="auth-sub">Aguarde um instante.</p>
      </div>
    `;
  }

  function renderSuccess(user) {
    card.innerHTML = `
      <div class="verify-hero">
        <div class="verify-icon verify-icon-success">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5"/>
          </svg>
        </div>
        <h1>E-mail confirmado!</h1>
        <p class="auth-sub">Sua conta está ativa${user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Agora você pode comprar telas de streaming com entrega imediata.</p>

        <div class="verify-actions" style="margin-top:24px">
          <a href="catalogo.html" class="btn btn-primary" style="flex:1">
            Explorar o catálogo
          </a>
        </div>

        <p class="verify-wrong-email" style="margin-top:18px">
          <a href="login.html">Ir para o login</a>
        </p>
      </div>
    `;
  }

  function renderError(message, options = {}) {
    const { expired = false, email = null } = options;
    card.innerHTML = `
      <div class="verify-hero">
        <div class="verify-icon verify-icon-error">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="m9 9 6 6M15 9l-6 6"/>
          </svg>
        </div>
        <h1>${expired ? 'Link expirado' : 'Link inválido'}</h1>
        <p class="auth-sub">${message}</p>

        ${expired && email ? `
          <div class="verify-actions" style="margin-top:24px">
            <button class="btn btn-primary" id="resendBtn" style="flex:1">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.7"/><path d="M21 4v5h-5"/></svg>
              Reenviar e-mail
            </button>
          </div>
        ` : ''}

        <p class="verify-wrong-email" style="margin-top:18px">
          <a href="cadastro.html">Cadastrar novamente</a>
          <span style="color:var(--text-dim);margin:0 6px">·</span>
          <a href="login.html">Ir para login</a>
        </p>
      </div>
    `;

    const resendBtn = document.getElementById('resendBtn');
    if (resendBtn && email) {
      resendBtn.addEventListener('click', async () => {
        resendBtn.disabled = true;
        resendBtn.textContent = 'Reenviando...';
        try {
          const res = await fetch(`${API_BASE}/auth/resend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          if (!res.ok) throw new Error();
          resendBtn.textContent = 'E-mail reenviado. Verifique sua caixa.';
          resendBtn.style.background = 'var(--ok)';
          resendBtn.style.color = '#fff';
        } catch {
          resendBtn.disabled = false;
          resendBtn.textContent = 'Reenviar e-mail';
          alert('Não foi possível reenviar agora. Tente em alguns minutos.');
        }
      });
    }
  }

  async function verify() {
    if (!token) {
      renderError('Nenhum token foi informado no link. Verifique o e-mail e tente novamente.');
      return;
    }

    renderLoading();

    try {
      const res = await fetch(`${API_BASE}/auth/verify?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (res.ok && data.ok) {
        // Guarda o token de sessão (se o backend retornou)
        if (data.sessionToken) {
          localStorage.setItem('streamly-session', data.sessionToken);
          localStorage.setItem('streamly-user', JSON.stringify(data.user || {}));
        }
        renderSuccess(data.user);
      } else {
        // Tenta extrair o e-mail do usuário para permitir reenvio
        let email = null;
        try { email = params.get('email'); } catch {}
        renderError(data.error || 'Não foi possível confirmar seu e-mail.', {
          expired: !!data.expired,
          email,
        });
      }
    } catch (err) {
      renderError('Erro de conexão. Verifique sua internet e tente novamente.');
    }
  }

  verify();
})();
