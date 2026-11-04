/* ============================================================
   LOGIN — lógica com backend real + 2FA + esqueci minha senha
   ============================================================ */

(function () {
  // ============ CONFIG ============
  const API_BASE = window.STREAMLY_API_BASE || '/api';

  // ============ ESTADO ============
  const state = {
    twoFaTempToken: null,
    twoFaEmail: null,
    twoFaExpiresAt: null,
    twoFaTimerId: null,
    twoFaResendCooldown: 0,
    twoFaResendInterval: null,
  };

  // ============ HELPERS ============
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  function emailValido(v) {
    return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim());
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

  // ============ TOASTS ============
  const TOAST_ICONS = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>',
    error:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
    info:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></svg>',
    warn:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17v.1"/></svg>',
  };
  function toast(msg, type = 'info') {
    const stack = $('#toastStack');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span>${msg}</span>`;
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3800);
  }

  // ============ ELEMENTOS ============
  const emailInput    = $('#email');
  const passwordInput = $('#password');
  const form          = $('#loginForm');
  const submitBtn     = $('#submitBtn');
  const submitText    = $('#submitText');
  const submitIcon    = $('#submitIcon');

  // ============ OLHO ============
  $('#eyeBtn').addEventListener('click', () => {
    passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
  });

  // ============ VALIDAÇÃO EM TEMPO REAL ============
  emailInput.addEventListener('blur', () => {
    const v = emailInput.value.trim();
    if (!v) setEstado(emailInput, null, '');
    else if (!emailValido(v)) setEstado(emailInput, 'error', 'E-mail inválido.');
    else setEstado(emailInput, 'ok', '');
  });

  passwordInput.addEventListener('blur', () => {
    const v = passwordInput.value;
    if (!v) setEstado(passwordInput, null, '');
    else if (v.length < 8) setEstado(passwordInput, 'error', 'Senha muito curta.');
    else setEstado(passwordInput, 'ok', '');
  });

  // ============ SUBMIT LOGIN ============
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const remember = $('#remember').checked;

    // Validar
    let firstError = null;
    if (!emailValido(email)) {
      setEstado(emailInput, 'error', 'Informe um e-mail válido.');
      firstError = firstError || emailInput;
    }
    if (!password) {
      setEstado(passwordInput, 'error', 'Informe sua senha.');
      firstError = firstError || passwordInput;
    }
    if (firstError) { firstError.focus(); return; }

    setLoading(submitBtn, submitText, submitIcon, true, 'Entrando...');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember }),
      });

      const data = await res.json();

      // 2FA
      if (res.ok && data.requires2FA) {
        // Salva estado e mostra tela
        state.twoFaTempToken = data.tempToken;
        state.twoFaEmail = data.email || email;
        state.twoFaExpiresAt = Date.now() + 10 * 60 * 1000;
        state.twoFaResendCooldown = 60;
        showTwoFactorView();
        resetLoading(submitBtn, submitText, submitIcon, 'Entrar');
        return;
      }

      // E-mail não confirmado
      if (!res.ok && data.needsVerification) {
        resetLoading(submitBtn, submitText, submitIcon, 'Entrar');
        toast('Confirme seu e-mail antes de entrar.', 'warn');
        // Oferece reenvio
        if (confirm('Sua conta ainda não foi confirmada. Deseja que reenviemos o e-mail de confirmação?')) {
          await resendVerification(data.email || email);
        }
        return;
      }

      // Erro
      if (!res.ok) {
        throw new Error(data.error || 'E-mail ou senha incorretos.');
      }

      // Sucesso
      handleLoginSuccess(data, remember);

    } catch (err) {
      resetLoading(submitBtn, submitText, submitIcon, 'Entrar');
      const msg = err.message || 'Não foi possível entrar. Tente novamente.';
      // Erro genérico para não revelar se é e-mail ou senha
      setEstado(passwordInput, 'error', msg);
      toast(msg, 'error');
    }
  });

  async function resendVerification(email) {
    try {
      const res = await fetch(`${API_BASE}/auth/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      toast('E-mail de confirmação reenviado. Verifique sua caixa.', 'success');
    } catch {
      toast('Não foi possível reenviar. Tente em alguns minutos.', 'error');
    }
  }

  function handleLoginSuccess(data, remember) {
    // Salva sessão
    if (data.sessionToken) {
      if (remember) {
        localStorage.setItem('streamly-session', data.sessionToken);
        sessionStorage.removeItem('streamly-session');
      } else {
        sessionStorage.setItem('streamly-session', data.sessionToken);
        localStorage.removeItem('streamly-session');
      }
    }
    if (data.user) {
      localStorage.setItem('streamly-user', JSON.stringify(data.user));
    }

    resetLoading(submitBtn, submitText, submitIcon, 'Entrar');
    submitBtn.disabled = true;
    submitText.textContent = 'Login efetuado';

    // Redireciona
    const params = new URLSearchParams(location.search);
    const next = params.get('next') || 'catalogo.html';
    const safeNext = /^\/?[\w\-./]+$/.test(next) ? next : 'catalogo.html';

    toast('Login efetuado. Redirecionando...', 'success');
    setTimeout(() => { window.location.href = safeNext; }, 900);
  }

  // ============ HELPERS DE LOADING ============
  function setLoading(btn, textEl, iconEl, loading, label) {
    btn.disabled = true;
    if (loading) {
      textEl.textContent = label || 'Aguarde...';
      iconEl.innerHTML = '<circle cx="12" cy="12" r="9" stroke-dasharray="42 20" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/></circle>';
    }
  }
  function resetLoading(btn, textEl, iconEl, label) {
    btn.disabled = false;
    textEl.textContent = label || 'Entrar';
    iconEl.innerHTML = '<path d="M5 12h14M13 6l6 6-6 6"/>';
  }

  // ============ 2FA VIEW ============
  function showTwoFactorView() {
    $('#loginView').hidden = true;
    $('#twoFactorView').hidden = false;
    $('#twoFaEmail').textContent = state.twoFaEmail;

    // Limpa dígitos
    $$('.otp-digit').forEach(i => { i.value = ''; i.classList.remove('is-filled', 'has-error'); });
    setTimeout(() => $('.otp-digit').focus(), 80);

    // Bind se ainda não foi feito
    if (!state.twoFaBound) {
      bindOtpInputs();
      bind2FAForm();
      state.twoFaBound = true;
    }

    start2FATimer();
    start2FAResendCooldown(60);
  }

  function backToLoginView() {
    if (state.twoFaTimerId) clearInterval(state.twoFaTimerId);
    if (state.twoFaResendInterval) clearInterval(state.twoFaResendInterval);
    state.twoFaTempToken = null;
    state.twoFaEmail = null;
    state.twoFaExpiresAt = null;
    $('#twoFactorView').hidden = true;
    $('#loginView').hidden = false;
    setTimeout(() => passwordInput.focus(), 80);
  }

  function start2FATimer() {
    if (state.twoFaTimerId) clearInterval(state.twoFaTimerId);
    const tick = () => {
      const remaining = state.twoFaExpiresAt - Date.now();
      const el = $('#twoFaTimerValue');
      if (!el) return;
      if (remaining <= 0) {
        el.textContent = '00:00';
        el.style.color = 'var(--err)';
        clearInterval(state.twoFaTimerId);
        return;
      }
      const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
      const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
      el.textContent = `${mm}:${ss}`;
      el.style.color = remaining < 60000 ? 'var(--err)' : 'var(--warn)';
    };
    tick();
    state.twoFaTimerId = setInterval(tick, 1000);
  }

  function start2FAResendCooldown(seconds) {
    if (state.twoFaResendInterval) clearInterval(state.twoFaResendInterval);
    const btn = $('#twoFaResend');
    let remaining = seconds;
    btn.disabled = true;
    btn.textContent = `Reenviar código (${remaining}s)`;
    state.twoFaResendInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(state.twoFaResendInterval);
        btn.disabled = false;
        btn.textContent = 'Reenviar código';
      } else {
        btn.textContent = `Reenviar código (${remaining}s)`;
      }
    }, 1000);
  }

  function bindOtpInputs() {
    const inputs = $$('.otp-digit');
    inputs.forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 1);
        e.target.value = val;
        e.target.classList.toggle('is-filled', !!val);
        e.target.classList.remove('has-error');

        if (val && idx < inputs.length - 1) {
          inputs[idx + 1].focus();
        }
        checkOtpComplete();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && idx > 0) {
          inputs[idx - 1].focus();
          inputs[idx - 1].value = '';
          inputs[idx - 1].classList.remove('is-filled');
          checkOtpComplete();
        }
        if (e.key === 'ArrowLeft' && idx > 0) inputs[idx - 1].focus();
        if (e.key === 'ArrowRight' && idx < inputs.length - 1) inputs[idx + 1].focus();
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
        paste.split('').forEach((ch, i) => {
          if (inputs[i]) {
            inputs[i].value = ch;
            inputs[i].classList.add('is-filled');
          }
        });
        const lastIdx = Math.min(paste.length, inputs.length) - 1;
        if (lastIdx >= 0) inputs[lastIdx].focus();
        checkOtpComplete();
      });
    });
  }

  function getOtpCode() {
    return $$('.otp-digit').map(i => i.value).join('');
  }

  function checkOtpComplete() {
    const code = getOtpCode();
    $('#twoFaSubmit').disabled = code.length !== 6;
  }

  function bind2FAForm() {
    $('#twoFaForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = getOtpCode();
      if (code.length !== 6) return;
      await submit2FA(code);
    });

    $('#twoFaBack').addEventListener('click', backToLoginView);

    $('#twoFaResend').addEventListener('click', async () => {
      const btn = $('#twoFaResend');
      btn.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/auth/login/resend-2fa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempToken: state.twoFaTempToken }),
        });
        if (!res.ok) throw new Error();
        state.twoFaExpiresAt = Date.now() + 10 * 60 * 1000;
        start2FATimer();
        start2FAResendCooldown(60);
        toast('Novo código enviado.', 'success');
      } catch {
        btn.disabled = false;
        btn.textContent = 'Reenviar código';
        toast('Não foi possível reenviar agora.', 'error');
      }
    });
  }

  async function submit2FA(code) {
    const btn = $('#twoFaSubmit');
    const txt = $('#twoFaSubmitText');
    const err = $('#errTwoFa');
    err.textContent = '';

    btn.disabled = true;
    txt.textContent = 'Verificando...';

    try {
      const res = await fetch(`${API_BASE}/auth/login/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: state.twoFaTempToken,
          code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Código inválido.');
      }

      // Sucesso — limpa timers
      if (state.twoFaTimerId) clearInterval(state.twoFaTimerId);
      if (state.twoFaResendInterval) clearInterval(state.twoFaResendInterval);

      handleLoginSuccess(data, true);

    } catch (e) {
      err.textContent = e.message || 'Código inválido. Tente novamente.';
      $$('.otp-digit').forEach(i => i.classList.add('has-error'));
      btn.disabled = false;
      txt.textContent = 'Verificar código';
      setTimeout(() => $$('.otp-digit').forEach(i => i.classList.remove('has-error')), 1500);
    }
  }

  // ============ FORGOT PASSWORD ============
  function openForgotModal() {
    renderForgotStep1();
    $('#forgotModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeForgotModal() {
    $('#forgotModal').hidden = true;
    document.body.style.overflow = '';
  }

  function renderForgotStep1() {
    const body = $('#forgotBody');
    body.innerHTML = `
      <div class="forgot-hero">
        <div class="forgot-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2 11 13M21 2l-7 20-4-9-9-4 20-7Z"/>
          </svg>
        </div>
        <h2>Esqueceu sua senha?</h2>
        <p>Informe o e-mail da sua conta. Enviaremos um link para redefinir sua senha.</p>
      </div>

      <form id="forgotForm" novalidate>
        <div class="field" data-field="forgotEmail">
          <label for="forgotEmail">E-mail</label>
          <div class="input">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2.6" y="5" width="18.8" height="14" rx="2.6"/>
              <path d="m3.6 7.2 8.4 5.8 8.4-5.8"/>
            </svg>
            <input id="forgotEmail" type="email" autocomplete="email" placeholder="voce@email.com" />
          </div>
          <span class="msg"></span>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
          <button type="submit" class="btn btn-primary" id="forgotSubmit">Enviar link</button>
        </div>
      </form>
    `;

    const forgotEmail = $('#forgotEmail');
    const forgotForm = $('#forgotForm');

    forgotEmail.addEventListener('blur', () => {
      const v = forgotEmail.value.trim();
      if (!v) setEstado(forgotEmail, null, '');
      else if (!emailValido(v)) setEstado(forgotEmail, 'error', 'E-mail inválido.');
      else setEstado(forgotEmail, 'ok', '');
    });

    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = forgotEmail.value.trim();
      if (!emailValido(email)) {
        setEstado(forgotEmail, 'error', 'Informe um e-mail válido.');
        return;
      }

      const btn = $('#forgotSubmit');
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      try {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        // Sempre "sucesso" (não revela se o e-mail existe)
        renderForgotSuccess(email);
      } catch {
        btn.disabled = false;
        btn.textContent = 'Enviar link';
        setEstado(forgotEmail, 'error', 'Erro de conexão. Tente novamente.');
      }
    });
  }

  function renderForgotSuccess(email) {
    const body = $('#forgotBody');
    body.innerHTML = `
      <div class="forgot-success">
        <div class="fs-icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
        </div>
        <h2>Verifique seu e-mail</h2>
        <p>
          Se existir uma conta com o endereço <strong>${escapeHTML(email)}</strong>, você receberá um link para redefinir sua senha em alguns minutos.
        </p>
        <p style="font-size:11.5px;color:var(--text-dim)">
          O link expira em 1 hora. Não recebeu? Verifique a caixa de spam.
        </p>
        <div class="modal-actions" style="margin-top:18px">
          <button class="btn btn-primary" data-close style="flex:1">Entendi</button>
        </div>
      </div>
    `;
  }

  // ============ EVENTOS GLOBAIS ============
  $('#forgotLink').addEventListener('click', openForgotModal);

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) {
      if (!$('#forgotModal').hidden) closeForgotModal();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#forgotModal').hidden) closeForgotModal();
  });

  // ============ INIT ============
  function init() {
    // Mensagens de contexto vindas por URL
    const params = new URLSearchParams(location.search);
    if (params.get('verified') === '1') {
      setTimeout(() => toast('E-mail confirmado! Faça login para continuar.', 'success'), 300);
    }
    if (params.get('reset') === '1') {
      setTimeout(() => toast('Senha alterada com sucesso. Faça login com a nova senha.', 'success'), 300);
    }
    if (params.get('expired') === '1') {
      setTimeout(() => toast('Sua sessão expirou. Faça login novamente.', 'info'), 300);
    }

    // Se veio de um link com e-mail pré-preenchido
    const prefill = params.get('email');
    if (prefill && emailValido(prefill)) {
      emailInput.value = prefill;
      setTimeout(() => passwordInput.focus(), 200);
    } else {
      setTimeout(() => emailInput.focus(), 200);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
