/* ============================================================
   REDEFINIR SENHA — página aberta pelo link do e-mail
   ============================================================ */

(function () {
  const API_BASE = window.STREAMLY_API_BASE || '/api';
  const card = document.getElementById('resetCard');
  const params = new URLSearchParams(location.search);
  const token = params.get('token');

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  // ============ TOAST ============
  const TOAST_ICONS = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>',
    error:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
    info:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></svg>',
    warn:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17v.1"/></svg>',
  };
  function toast(msg, type = 'info') {
    const stack = document.getElementById('toastStack');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span>${msg}</span>`;
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3800);
  }

  // ============ HELPERS ============
  function forcaSenha(p) {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  }
  function setEstado(input, status, msg) {
    const field = input.closest('.field');
    if (!field) return;
    field.classList.remove('ok', 'error');
    if (status) field.classList.add(status);
    const msgEl = field.querySelector('.msg');
    if (msgEl) {
      msgEl.textContent = msg || '';
      msgEl.className = 'msg' + (status ? ' ' + status : '');
    }
  }

  // ============ RENDER ============
  function renderLoading() {
    card.innerHTML = `
      <div class="verify-loading">
        <div class="verify-spinner">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="9" opacity=".2"/>
            <path d="M21 12a9 9 0 0 0-9-9"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/></path>
          </svg>
        </div>
        <h1>Verificando link...</h1>
      </div>
    `;
  }

  function renderError(message, { expired = false } = {}) {
    card.innerHTML = `
      <div class="verify-hero">
        <div class="verify-icon verify-icon-error">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>
        </div>
        <h1>${expired ? 'Link expirado' : 'Link inválido'}</h1>
        <p class="auth-sub">${message}</p>
        <div class="verify-actions" style="margin-top:24px">
          <a href="login.html" class="btn btn-primary" style="flex:1">Voltar ao login</a>
        </div>
        <p class="verify-wrong-email" style="margin-top:16px">
          Precisa de um novo link? <a href="login.html">Solicitar novamente</a>
        </p>
      </div>
    `;
  }

  function renderForm() {
    card.innerHTML = `
      <h1>Definir nova senha</h1>
      <p class="auth-sub">Escolha uma senha forte, com pelo menos 8 caracteres, misturando letras, números e símbolos.</p>

      <form id="resetForm" novalidate>
        <div class="field" data-field="newPassword">
          <label for="newPassword">Nova senha</label>
          <div class="input">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4.5" y="10" width="15" height="10.5" rx="2.6"/>
              <path d="M8.2 10V7.6a3.8 3.8 0 0 1 7.6 0V10"/>
            </svg>
            <input id="newPassword" type="password" autocomplete="new-password" placeholder="Mínimo de 8 caracteres" />
            <button type="button" class="eye" id="eyeNew">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2.5 12S6 5.6 12 5.6 21.5 12 21.5 12 18 18.4 12 18.4 2.5 12 2.5 12Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
          <div class="strength" id="pwdStrength" data-level="0"><i></i><i></i><i></i><i></i></div>
          <span class="msg" id="pwdMsg"></span>
        </div>

        <div class="field" data-field="confirmPassword">
          <label for="confirmPassword">Confirmar nova senha</label>
          <div class="input">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4.5" y="10" width="15" height="10.5" rx="2.6"/>
              <path d="M8.2 10V7.6a3.8 3.8 0 0 1 7.6 0V10"/>
              <path d="m10.4 15.4 1.2 1.2 2.2-2.3"/>
            </svg>
            <input id="confirmPassword" type="password" autocomplete="new-password" placeholder="Repita a nova senha" />
            <button type="button" class="eye" id="eyeConfirm">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2.5 12S6 5.6 12 5.6 21.5 12 21.5 12 18 18.4 12 18.4 2.5 12 2.5 12Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
          <span class="msg"></span>
        </div>

        <button type="submit" class="btn btn-primary auth-submit" id="submitBtn">
          <span id="submitText">Alterar senha</span>
          <svg id="submitIcon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
      </form>

      <div class="auth-footer" style="margin-top:22px">
        <a href="login.html">Voltar ao login</a>
      </div>
    `;

    bindForm();
  }

  function renderSuccess() {
    card.innerHTML = `
      <div class="verify-hero">
        <div class="verify-icon verify-icon-success">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
        </div>
        <h1>Senha alterada!</h1>
        <p class="auth-sub">Sua senha foi redefinida com sucesso. Você já pode entrar com a nova senha.</p>
        <div class="verify-actions" style="margin-top:24px">
          <a href="login.html?reset=1" class="btn btn-primary" style="flex:1">Ir para o login</a>
        </div>
      </div>
    `;
  }

  // ============ FORM ============
  function bindForm() {
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const strength = document.getElementById('pwdStrength');
    const pwdMsg = document.getElementById('pwdMsg');
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitIcon = document.getElementById('submitIcon');

    // Olhos
    document.getElementById('eyeNew').addEventListener('click', () => {
      newPassword.type = newPassword.type === 'password' ? 'text' : 'password';
    });
    document.getElementById('eyeConfirm').addEventListener('click', () => {
      confirmPassword.type = confirmPassword.type === 'password' ? 'text' : 'password';
    });

    newPassword.addEventListener('input', () => {
      const level = forcaSenha(newPassword.value);
      strength.dataset.level = newPassword.value ? level : 0;
      if (!newPassword.value) {
        pwdMsg.textContent = '';
        pwdMsg.className = 'msg';
        newPassword.closest('.field').classList.remove('ok', 'error');
        return;
      }
      pwdMsg.textContent = 'Força: ' + ['', 'Fraca', 'Média', 'Boa', 'Forte'][level];
      pwdMsg.className = 'msg ' + (level >= 3 ? 'ok' : level <= 1 ? 'error' : '');
      newPassword.closest('.field').classList.toggle('ok', level >= 3);
      newPassword.closest('.field').classList.toggle('error', level <= 1);
    });

    confirmPassword.addEventListener('input', () => {
      if (!confirmPassword.value) return setEstado(confirmPassword, null, '');
      if (confirmPassword.value === newPassword.value) setEstado(confirmPassword, 'ok', 'As senhas coincidem.');
      else setEstado(confirmPassword, 'error', 'As senhas não coincidem.');
    });

    document.getElementById('resetForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      let ok = true;

      if (newPassword.value.length < 8) {
        setEstado(newPassword, 'error', 'Mínimo de 8 caracteres.');
        ok = false;
      } else if (forcaSenha(newPassword.value) <= 1) {
        setEstado(newPassword, 'error', 'Senha muito fraca. Use letras, números e símbolos.');
        ok = false;
      } else setEstado(newPassword, 'ok', '');

      if (newPassword.value !== confirmPassword.value) {
        setEstado(confirmPassword, 'error', 'As senhas não coincidem.');
        ok = false;
      } else setEstado(confirmPassword, 'ok', '');

      if (!ok) return;

      submitBtn.disabled = true;
      submitText.textContent = 'Alterando...';
      submitIcon.innerHTML = '<circle cx="12" cy="12" r="9" stroke-dasharray="42 20" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/></circle>';

      try {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword: newPassword.value }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Não foi possível alterar a senha.');
        }

        renderSuccess();
      } catch (e) {
        submitBtn.disabled = false;
        submitText.textContent = 'Alterar senha';
        submitIcon.innerHTML = '<path d="M5 12h14M13 6l6 6-6 6"/>';
        toast(e.message || 'Erro ao alterar senha.', 'error');
      }
    });

    setTimeout(() => newPassword.focus(), 100);
  }

  // ============ INIT ============
  function init() {
    if (!token) {
      renderError('Nenhum token foi encontrado no link. Solicite um novo e-mail de redefinição.');
      return;
    }
    // Não validamos o token preventivamente — deixamos o backend responder
    // (evita 1 requisição extra e evita revelar se o token é válido antes do uso)
    renderForm();
  }

  init();
})();
