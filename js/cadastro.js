/* ============================================================
   CADASTRO — validação + envio real para o backend
   ============================================================ */

(function () {
  // ============ CONFIG ============
  // Troque para sua URL de backend no Render:
  const API_BASE = window.STREAMLY_API_BASE || '/api';

  // ============ HELPERS ============
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  function maskCPF(v) {
    v = v.replace(/\D/g, '').slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
  }
  function maskPhone(v) {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 10) {
      v = v.replace(/(\d{2})(\d)/, '($1) $2');
      v = v.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      v = v.replace(/(\d{2})(\d)/, '($1) $2');
      v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return v;
  }
  function cpfValido(valor) {
    const cpf = valor.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
    let d1 = (soma * 10) % 11;
    if (d1 === 10) d1 = 0;
    if (d1 !== Number(cpf[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
    let d2 = (soma * 10) % 11;
    if (d2 === 10) d2 = 0;
    return d2 === Number(cpf[10]);
  }
  function emailValido(v) {
    return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim());
  }
  function telValido(v) {
    const n = v.replace(/\D/g, '');
    return n.length === 10 || n.length === 11;
  }
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

  // ============ ESTADO DE CAMPO ============
  function setEstado(input, status, msg) {
    const field = input.closest('.field');
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
  const name     = $('#name');
  const cpf      = $('#cpf');
  const phone    = $('#phone');
  const email    = $('#email');
  const password = $('#password');
  const confirm  = $('#confirm');
  const terms    = $('#terms');
  const strength = $('#strength');
  const form     = $('#registerForm');
  const submitBtn = $('#submitBtn');

  // ============ MÁSCARAS ============
  cpf.addEventListener('input', e => { e.target.value = maskCPF(e.target.value); });
  phone.addEventListener('input', e => { e.target.value = maskPhone(e.target.value); });

  // olhinho
  $$('.eye').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = document.getElementById(btn.dataset.eye);
      el.type = el.type === 'password' ? 'text' : 'password';
    });
  });

  // ============ VALIDAÇÃO EM TEMPO REAL ============
  name.addEventListener('blur', () => {
    const v = name.value.trim();
    if (!v) setEstado(name, null, '');
    else if (v.length < 3) setEstado(name, 'error', 'Digite seu nome completo.');
    else if (!v.includes(' ')) setEstado(name, 'error', 'Informe nome e sobrenome.');
    else setEstado(name, 'ok', '');
  });

  cpf.addEventListener('blur', () => {
    const v = cpf.value.trim();
    if (!v) setEstado(cpf, null, '');
    else if (v.length < 14) setEstado(cpf, 'error', 'CPF incompleto.');
    else if (!cpfValido(v)) setEstado(cpf, 'error', 'CPF inválido. Confira os números.');
    else setEstado(cpf, 'ok', 'CPF válido.');
  });

  phone.addEventListener('blur', () => {
    const v = phone.value.trim();
    if (!v) setEstado(phone, null, '');
    else if (!telValido(v)) setEstado(phone, 'error', 'Telefone incompleto.');
    else setEstado(phone, 'ok', '');
  });

  email.addEventListener('blur', () => {
    const v = email.value.trim();
    if (!v) setEstado(email, null, '');
    else if (!emailValido(v)) setEstado(email, 'error', 'E-mail inválido.');
    else setEstado(email, 'ok', 'Enviaremos o link para este endereço.');
  });

  password.addEventListener('input', () => {
    const level = forcaSenha(password.value);
    strength.dataset.level = password.value ? level : 0;
    const msg = $('#passwordMsg');
    if (!password.value) {
      msg.textContent = '';
      msg.className = 'msg';
      password.closest('.field').classList.remove('ok', 'error');
      return;
    }
    msg.textContent = 'Força: ' + ['', 'Fraca', 'Média', 'Boa', 'Forte'][level];
    msg.className = 'msg ' + (level >= 3 ? 'ok' : level <= 1 ? 'error' : '');
    password.closest('.field').classList.toggle('ok', level >= 3);
    password.closest('.field').classList.toggle('error', level <= 1);
  });

  confirm.addEventListener('input', () => {
    if (!confirm.value) return setEstado(confirm, null, '');
    if (confirm.value === password.value) setEstado(confirm, 'ok', 'As senhas coincidem.');
    else setEstado(confirm, 'error', 'As senhas não coincidem.');
  });

  // ============ SUBMIT ============
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let primeiroErro = null;

    // Nome
    const vName = name.value.trim();
    if (vName.length < 3 || !vName.includes(' ')) {
      setEstado(name, 'error', 'Digite seu nome completo.');
      primeiroErro = primeiroErro || name;
    } else setEstado(name, 'ok', '');

    // CPF
    if (!cpfValido(cpf.value)) {
      setEstado(cpf, 'error', cpf.value ? 'CPF inválido.' : 'Informe seu CPF.');
      primeiroErro = primeiroErro || cpf;
    } else setEstado(cpf, 'ok', 'CPF válido.');

    // Telefone
    if (!telValido(phone.value)) {
      setEstado(phone, 'error', 'Informe um telefone válido.');
      primeiroErro = primeiroErro || phone;
    } else setEstado(phone, 'ok', '');

    // E-mail
    if (!emailValido(email.value)) {
      setEstado(email, 'error', 'Informe um e-mail válido.');
      primeiroErro = primeiroErro || email;
    } else setEstado(email, 'ok', '');

    // Senha
    if (password.value.length < 8) {
      setEstado(password, 'error', 'A senha precisa ter ao menos 8 caracteres.');
      primeiroErro = primeiroErro || password;
    } else if (forcaSenha(password.value) <= 1) {
      setEstado(password, 'error', 'Senha muito fraca.');
      primeiroErro = primeiroErro || password;
    } else setEstado(password, 'ok', '');

    // Confirmar
    if (confirm.value !== password.value || !confirm.value) {
      setEstado(confirm, 'error', 'As senhas não coincidem.');
      primeiroErro = primeiroErro || confirm;
    } else setEstado(confirm, 'ok', '');

    // Termos
    if (!terms.checked) {
      primeiroErro = primeiroErro || terms;
      terms.closest('.auth-check').style.color = '#e5484d';
      setTimeout(() => terms.closest('.auth-check').style.color = '', 1800);
    }

    if (primeiroErro) {
      if (primeiroErro.focus) primeiroErro.focus();
      return;
    }

    // ============ CHAMADA REAL AO BACKEND ============
    submitBtn.disabled = true;
    $('#submitText').textContent = 'Criando conta...';
    $('#submitIcon').innerHTML = '<circle cx="12" cy="12" r="9" stroke-dasharray="42 20" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/></circle>';

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: vName,
          cpf: cpf.value.replace(/\D/g, ''),
          phone: phone.value.replace(/\D/g, ''),
          email: email.value.trim().toLowerCase(),
          password: password.value,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível criar a conta.');
      }

      // Sucesso: mostra tela de "verifique seu e-mail"
      renderSuccessScreen(email.value.trim().toLowerCase(), data.resendIn || 60);

    } catch (err) {
      toast(err.message || 'Falha ao conectar. Tente novamente.', 'error');
      submitBtn.disabled = false;
      $('#submitText').textContent = 'Criar conta';
      $('#submitIcon').innerHTML = '<path d="M5 12h14M13 6l6 6-6 6"/>';
    }
  });

  // ============ TELA DE SUCESSO ============
  function renderSuccessScreen(userEmail, resendIn) {
    const card = document.querySelector('.auth-card');
    card.innerHTML = `
      <div class="auth-steps">
        <div class="auth-step is-active is-done">
          <span class="as-dot">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
          </span>
          <span class="as-label">Dados</span>
        </div>
        <span class="as-bar"></span>
        <div class="auth-step is-active">
          <span class="as-dot">2</span>
          <span class="as-label">E-mail</span>
        </div>
        <span class="as-bar"></span>
        <div class="auth-step">
          <span class="as-dot">3</span>
          <span class="as-label">Pronto</span>
        </div>
      </div>

      <div class="verify-hero">
        <div class="verify-icon">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2.5"/>
            <path d="m3.5 6.5 8.5 6 8.5-6"/>
          </svg>
        </div>
        <h1>Verifique seu e-mail</h1>
        <p class="auth-sub">Enviamos um link de confirmação para <strong>${userEmail}</strong>. Abra o e-mail e clique no botão para ativar sua conta.</p>

        <div class="verify-info">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></svg>
          <span>O link expira em <strong>24 horas</strong>. Verifique também a caixa de spam.</span>
        </div>

        <div class="verify-actions">
          <button class="btn btn-ghost" id="resendBtn" disabled>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.7"/><path d="M21 4v5h-5"/></svg>
            Reenviar e-mail (<span id="resendTimer">${resendIn}</span>s)
          </button>
          <a href="login.html" class="btn btn-primary">Ir para login</a>
        </div>

        <p class="verify-wrong-email">
          E-mail errado? <a href="cadastro.html">Cadastrar novamente</a>
        </p>
      </div>
    `;

    // Timer de reenvio
    let seconds = resendIn;
    const resendBtn = $('#resendBtn');
    const timerEl = $('#resendTimer');
    const interval = setInterval(() => {
      seconds--;
      if (timerEl) timerEl.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(interval);
        resendBtn.disabled = false;
        resendBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.7"/><path d="M21 4v5h-5"/></svg> Reenviar e-mail`;
      }
    }, 1000);

    resendBtn.addEventListener('click', async () => {
      resendBtn.disabled = true;
      resendBtn.textContent = 'Reenviando...';
      try {
        const res = await fetch(`${API_BASE}/auth/resend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail }),
        });
        if (!res.ok) throw new Error();
        toast('E-mail reenviado. Verifique sua caixa de entrada.', 'success');
        // Reinicia timer
        seconds = 60;
        resendBtn.innerHTML = `Reenviar e-mail (<span id="resendTimer">${seconds}</span>s)`;
        resendBtn.disabled = true;
        const newTimer = resendBtn.querySelector('#resendTimer');
        const newInt = setInterval(() => {
          seconds--;
          if (newTimer) newTimer.textContent = seconds;
          if (seconds <= 0) {
            clearInterval(newInt);
            resendBtn.disabled = false;
            resendBtn.textContent = 'Reenviar e-mail';
          }
        }, 1000);
      } catch {
        toast('Não foi possível reenviar agora. Tente em alguns minutos.', 'error');
        resendBtn.disabled = false;
        resendBtn.textContent = 'Reenviar e-mail';
      }
    });
  }
})();
