/* ============================================================
   PERFIL — lógica da página
   ============================================================ */

(function () {
  // ============ ESTADO ============
  const state = {
    tab: 'pessoal',
    draft: null,           // cópia editável
    dirty: false,
    revealed: { email: false, phone: false, whatsapp: false, cpf: false },
    selectedCpfReason: null,
    cpfRequestTicket: null,
  };

  // ============ HELPERS ============
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('pt-BR');
  }
  function formatDateLong(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  function daysSince(iso) {
    if (!iso) return 0;
    const d = new Date(iso);
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }

  /* -------- MASCARAMENTO -------- */
  function maskCPF(cpf) {
    if (!cpf) return '***.***.***-**';
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return '***.***.***-**';
    return `***.***.***-${digits.slice(9)}`;
  }
  function revealCPF(cpf) {
    return cpf; // mostra completo quando revelado pelo próprio dono
  }
  function maskPhone(phone) {
    if (!phone) return '(**) *****-****';
    const d = phone.replace(/\D/g, '');
    if (d.length < 10) return '(**) *****-****';
    const ddd = d.slice(0, 2);
    const last = d.slice(-4);
    return `(${ddd}) *****-${last}`;
  }
  function revealPhone(phone) {
    const d = phone.replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return phone;
  }
  function maskEmail(email) {
    if (!email || !email.includes('@')) return '***@***';
    const [local, domain] = email.split('@');
    const [domName, domExt] = domain.split('.');
    const localMasked = local.length <= 2
      ? local[0] + '*'.repeat(Math.max(local.length - 1, 1))
      : local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
    const domMasked = domName.length <= 2
      ? domName[0] + '*'
      : domName[0] + '*'.repeat(Math.max(domName.length - 2, 1)) + domName[domName.length - 1];
    return `${localMasked}@${domMasked}.${domExt}`;
  }
  function maskPhoneInput(phone) {
    if (!phone) return '';
    const d = phone.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  // ============ TOASTS ============
  const TOAST_ICONS = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>',
    error:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
    info:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></svg>',
    warn:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17v.1"/></svg>',
  };
  function toast(message, type = 'info') {
    const stack = $('#toastStack');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span>${message}</span>`;
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3800);
  }

  // ============ RENDER — HEADER ============
  function renderHeader() {
    const p = PROFILE_DATA;
    $('#profileName').textContent = p.fullName;
    $('#profileUsername').textContent = `@${p.username}`;
    $('#profileAccountId').textContent = p.id;
    $('#profileSince').textContent = formatDateLong(p.account.createdAt);

    const status = $('#profileStatus');
    const map = { ativa: 'Conta ativa', suspensa: 'Conta suspensa', banida: 'Conta bloqueada' };
    status.textContent = map[p.account.status] || p.account.status;
    status.classList.toggle('is-suspensa', p.account.status !== 'ativa');

    // Avatar
    const initials = p.fullName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    $('#profileAvatarInitials').textContent = initials;

    const img = $('#profileAvatarImg');
    const initialsEl = $('#profileAvatarInitials');
    if (p.avatarUrl) {
      img.src = p.avatarUrl;
      img.hidden = false;
      initialsEl.hidden = true;
      $('#avatarRemoveBtn').hidden = false;
    } else {
      img.hidden = true;
      initialsEl.hidden = false;
      $('#avatarRemoveBtn').hidden = true;
    }
  }

  // ============ RENDER — CAMPOS ============
  function fillForm() {
    const d = state.draft;
    $('#fullName').value = d.fullName;
    $('#username').value = d.username;
    $('#birthDate').value = d.birthDate;

    $('#cep').value = d.address.cep;
    $('#state').value = d.address.state;
    $('#city').value = d.address.city;
    $('#neighborhood').value = d.address.neighborhood;
    $('#street').value = d.address.street;
    $('#number').value = d.address.number;
    $('#complement').value = d.address.complement;

    renderMaskedValues();
    renderPreferences();
    renderPrivacy();
    renderSecurity();
    renderHistory();
  }

  function renderMaskedValues() {
    const p = PROFILE_DATA;

    // CPF — sempre mascarado, jamais exibe completo (imutável)
    $('#cpfMasked').textContent = maskCPF(p.cpf);

    // Contatos
    $('#emailMasked').textContent = state.revealed.email
      ? p.email
      : maskEmail(p.email);
    $('#phoneMasked').textContent = state.revealed.phone
      ? revealPhone(p.phone)
      : maskPhone(p.phone);
    $('#whatsappMasked').textContent = state.revealed.whatsapp
      ? revealPhone(p.whatsapp)
      : maskPhone(p.whatsapp);

    // Eye icons
    ['email', 'phone', 'whatsapp'].forEach(key => {
      const btn = $(`[data-toggle-mask="${key}"]`);
      if (!btn) return;
      const open = btn.querySelector('.eye-open');
      const closed = btn.querySelector('.eye-closed');
      const show = !state.revealed[key];
      open.style.display = show ? 'block' : 'none';
      closed.style.display = show ? 'none' : 'block';
    });
  }

  // ============ RENDER — PREFERÊNCIAS ============
  const EMAIL_PREFS = [
    { key: 'receipts',      label: 'Comprovantes de pagamento', desc: 'Recibo sempre que um pagamento for aprovado.' },
    { key: 'statements',    label: 'Extratos', desc: 'Envios de extratos e relatórios solicitados.' },
    { key: 'orders',        label: 'Atualizações de pedidos', desc: 'Confirmações, cancelamentos e entregas.' },
    { key: 'subscriptions', label: 'Avisos de assinatura', desc: 'Renovações próximas e vencimentos.' },
    { key: 'offers',        label: 'Ofertas e promoções', desc: 'Novidades, cupons e descontos.' },
  ];
  const WHATSAPP_PREFS = [
    { key: 'orders',    label: 'Atualizações de pedidos' },
    { key: 'dueDate',   label: 'Avisos de vencimento' },
    { key: 'payments',  label: 'Informações sobre pagamentos' },
  ];
  const PRIVACY_PREFS = [
    { key: 'dataConsent',    label: 'Consentimento de uso de dados',   desc: 'Permitir uso dos seus dados para operar os serviços contratados. Obrigatório para uso da conta.' },
    { key: 'cookiesConsent', label: 'Cookies de análise',              desc: 'Ajudar a melhorar a plataforma com dados agregados e anônimos.' },
    { key: 'marketing',      label: 'Comunicações de marketing',       desc: 'Receber ofertas personalizadas com base no seu perfil de uso.' },
  ];

  function renderPreferences() {
    const prefs = PROFILE_DATA.preferences;

    // E-mail
    const emailList = $('#emailPrefs');
    emailList.innerHTML = EMAIL_PREFS.map(p => `
      <div class="pref-item">
        <div class="pref-body">
          <h4>${p.label}</h4>
          <p>${p.desc}</p>
        </div>
        <label class="toggle">
          <input type="checkbox" data-pref="email.${p.key}" ${prefs.email[p.key] ? 'checked' : ''} />
          <span class="toggle-track"></span>
        </label>
      </div>
    `).join('');

    // WhatsApp
    const waList = $('#whatsappPrefs');
    waList.innerHTML = WHATSAPP_PREFS.map(p => `
      <div class="pref-item">
        <div class="pref-body">
          <h4>${p.label}</h4>
        </div>
        <label class="toggle">
          <input type="checkbox" data-pref="whatsapp.${p.key}" ${prefs.whatsapp[p.key] ? 'checked' : ''} ${!prefs.whatsapp.enabled ? 'disabled' : ''} />
          <span class="toggle-track"></span>
        </label>
      </div>
    `).join('');
    $('#whatsappMaster').checked = prefs.whatsapp.enabled;

    // Bind toggles
    $$('[data-pref]').forEach(inp => {
      inp.addEventListener('change', () => {
        const [parent, key] = inp.dataset.pref.split('.');
        PROFILE_DATA.preferences[parent][key] = inp.checked;
        if (parent === 'whatsapp' && key === 'enabled') {
          renderPreferences();
        }
        markDirty(true);
      });
    });
  }

  function renderPrivacy() {
    const p = PROFILE_DATA.privacy;
    const list = $('#privacyPrefs');
    list.innerHTML = PRIVACY_PREFS.map(item => `
      <div class="pref-item">
        <div class="pref-body">
          <h4>${item.label}</h4>
          <p>${item.desc}</p>
        </div>
        <label class="toggle">
          <input type="checkbox" data-priv="${item.key}" ${p[item.key] ? 'checked' : ''} ${item.key === 'dataConsent' ? 'disabled' : ''} />
          <span class="toggle-track"></span>
        </label>
      </div>
    `).join('');

    $$('[data-priv]').forEach(inp => {
      inp.addEventListener('change', () => {
        PROFILE_DATA.privacy[inp.dataset.priv] = inp.checked;
        markDirty(true);
      });
    });
  }

  // ============ RENDER — SEGURANÇA ============
  function renderSecurity() {
    const p = PROFILE_DATA;

    const days = daysSince(p.account.passwordChangedAt);
    $('#pwdAge').textContent = days === 0 ? 'hoje' : days === 1 ? '1 dia' : `${days} dias`;

    // Sessions
    const list = $('#sessionsList');
    list.innerHTML = p.sessions.map(s => {
      const isMobile = s.type === 'mobile';
      const icon = isMobile
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18h2"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';

      const last = new Date(s.lastActive);
      const now = new Date();
      const diffMs = now - last;
      const diffMin = Math.round(diffMs / 60000);
      let lastText;
      if (diffMin < 1) lastText = 'agora mesmo';
      else if (diffMin < 60) lastText = `há ${diffMin} min`;
      else if (diffMin < 1440) lastText = `há ${Math.floor(diffMin / 60)}h`;
      else lastText = `há ${Math.floor(diffMin / 1440)} dia(s)`;

      return `
        <div class="session-item ${s.current ? 'is-current' : ''}">
          <div class="session-icon">${icon}</div>
          <div class="session-body">
            <div class="session-title">
              ${s.device} · ${s.os}
              ${s.current ? '<span class="session-current-tag">Sessão atual</span>' : ''}
            </div>
            <div class="session-meta">
              <span>${s.location}</span>
              <span class="dot">·</span>
              <span>IP ${s.ip}</span>
              <span class="dot">·</span>
              <span>Ativo ${lastText}</span>
            </div>
          </div>
          ${!s.current ? `<button class="session-end" data-session-end="${s.id}">Encerrar</button>` : ''}
        </div>
      `;
    }).join('');

    // Two factor
    $('#twoFaToggle').checked = p.account.twoFactorEnabled;

    // Bind session end
    $$('[data-session-end]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.sessionEnd;
        openConfirm({
          icon: 'warn',
          title: 'Encerrar esta sessão?',
          text: 'O dispositivo será desconectado imediatamente. Você precisará fazer login novamente nele.',
          confirmLabel: 'Sim, encerrar',
          onConfirm: () => {
            PROFILE_DATA.sessions = PROFILE_DATA.sessions.filter(s => s.id !== id);
            PROFILE_DATA.history.unshift({
              date: new Date().toISOString().slice(0, 16),
              action: 'Sessão encerrada',
              detail: 'Encerrada manualmente a partir do perfil',
            });
            renderSecurity();
            renderHistory();
            toast('Sessão encerrada.', 'success');
          },
        });
      });
    });
  }

  // ============ RENDER — HISTÓRICO ============
  function renderHistory() {
    const container = $('#profileHistory');
    container.innerHTML = PROFILE_DATA.history.slice().reverse().map((h, i) => `
      <div class="timeline-item ${i === 0 ? 'is-current' : ''}">
        <div class="t-date">${formatDateTime(h.date)}</div>
        <div class="t-action">${h.action}</div>
        <div class="t-detail">${h.detail}</div>
      </div>
    `).join('');
  }

  // ============ DIRTY / SAVE ============
  function markDirty(dirty) {
    state.dirty = dirty;
    $('#saveBar').hidden = !dirty;
  }

  function collectDraft() {
    const d = state.draft;
    d.fullName = $('#fullName').value.trim();
    d.username = $('#username').value.trim();
    d.birthDate = $('#birthDate').value;
    d.address.cep = $('#cep').value;
    d.address.state = $('#state').value;
    d.address.city = $('#city').value.trim();
    d.address.neighborhood = $('#neighborhood').value.trim();
    d.address.street = $('#street').value.trim();
    d.address.number = $('#number').value.trim();
    d.address.complement = $('#complement').value.trim();
  }

  function validate() {
    let ok = true;
    const d = state.draft;

    // fullName
    if (!d.fullName || d.fullName.length < 3 || !d.fullName.includes(' ')) {
      $('#errFullName').textContent = 'Informe nome e sobrenome.';
      ok = false;
    } else $('#errFullName').textContent = '';

    // username
    if (!/^[a-zA-Z0-9._]{3,20}$/.test(d.username)) {
      $('#errUsername').textContent = 'Use 3 a 20 caracteres (letras, números, . ou _).';
      ok = false;
    } else $('#errUsername').textContent = '';

    // birthDate
    if (d.birthDate) {
      const y = new Date(d.birthDate).getFullYear();
      if (y < 1900 || new Date(d.birthDate) > new Date()) {
        $('#errBirthDate').textContent = 'Data inválida.';
        ok = false;
      } else $('#errBirthDate').textContent = '';
    } else $('#errBirthDate').textContent = '';

    // CEP
    if (d.address.cep) {
      const cep = d.address.cep.replace(/\D/g, '');
      if (cep.length !== 8) {
        $('#errCep').textContent = 'CEP inválido.';
        ok = false;
      } else $('#errCep').textContent = '';
    } else $('#errCep').textContent = '';

    return ok;
  }

  function saveChanges() {
    collectDraft();
    if (!validate()) {
      toast('Verifique os campos destacados.', 'warn');
      return;
    }

    // Detecta mudanças relevantes para o histórico
    const changes = [];
    if (state.draft.fullName !== PROFILE_DATA.fullName) changes.push(`Nome alterado para "${state.draft.fullName}"`);
    if (state.draft.username !== PROFILE_DATA.username) changes.push(`Nome de usuário alterado para @${state.draft.username}`);
    if (state.draft.birthDate !== PROFILE_DATA.birthDate) changes.push('Data de nascimento alterada');
    if (state.draft.address.cep !== PROFILE_DATA.address.cep ||
        state.draft.address.street !== PROFILE_DATA.address.street) {
      changes.push('Endereço atualizado');
    }

    PROFILE_DATA.fullName = state.draft.fullName;
    PROFILE_DATA.username = state.draft.username;
    PROFILE_DATA.birthDate = state.draft.birthDate;
    PROFILE_DATA.address = clone(state.draft.address);

    changes.forEach(c => {
      PROFILE_DATA.history.unshift({
        date: new Date().toISOString().slice(0, 16),
        action: 'Dados atualizados',
        detail: c,
      });
    });

    renderHeader();
    renderHistory();
    markDirty(false);
    toast('Alterações salvas com sucesso.', 'success');
  }

  function cancelChanges() {
    state.draft = clone({
      fullName: PROFILE_DATA.fullName,
      username: PROFILE_DATA.username,
      birthDate: PROFILE_DATA.birthDate,
      address: PROFILE_DATA.address,
    });
    fillForm();
    markDirty(false);
    toast('Alterações descartadas.', 'info');
  }

  // ============ CPF — SOLICITAÇÃO ============
  function openCpfModal() {
    state.selectedCpfReason = null;
    const body = $('#cpfModalBody');
    body.innerHTML = `
      <h2 class="modal-title">Solicitar alteração de CPF</h2>
      <p class="modal-text">Esta solicitação será analisada pela equipe de suporte. Você será notificado por e-mail sobre o resultado.</p>

      <div class="cpf-req-explanation">
        <strong>Por que o CPF não pode ser alterado diretamente?</strong>
        Por questões legais e de segurança, o CPF é vinculado permanentemente à conta. Ele é usado para fins de prevenção a fraudes, cumprimento de obrigações fiscais e rastreabilidade — o que torna a alteração direta inviável. Toda alteração autorizada é registrada com auditoria completa.
      </div>

      <label style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);display:block;margin-bottom:10px">Motivo da solicitação</label>

      <div class="cpf-req-reasons" id="cpfReasons">
        ${CPF_CHANGE_REASONS.map(r => `
          <button type="button" class="cpf-req-reason" data-reason="${r.id}">
            <span class="radio"></span>
            <span>${r.label}</span>
          </button>
        `).join('')}
      </div>

      <div class="textarea-field">
        <label for="cpfReasonText">Detalhes adicionais</label>
        <textarea id="cpfReasonText" placeholder="Descreva com detalhes o motivo da solicitação. Anexos podem ser enviados posteriormente pelo atendimento."></textarea>
      </div>

      <label class="check-ack">
        <input type="checkbox" id="cpfAck" />
        <span class="box">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
        </span>
        <span>Declaro que as informações acima são verdadeiras e estou ciente de que declarações falsas podem ter implicações legais.</span>
      </label>

      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
        <button type="button" class="btn btn-primary" id="submitCpfRequest" disabled>Abrir solicitação</button>
      </div>
    `;

    $('#cpfModal').hidden = false;
    document.body.style.overflow = 'hidden';

    const ack = $('#cpfAck');
    const submit = $('#submitCpfRequest');
    const reasonText = $('#cpfReasonText');

    const updateSubmit = () => {
      submit.disabled = !(state.selectedCpfReason && ack.checked);
    };

    $$('#cpfReasons .cpf-req-reason').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#cpfReasons .cpf-req-reason').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        state.selectedCpfReason = btn.dataset.reason;
        updateSubmit();
      });
    });
    ack.addEventListener('change', updateSubmit);

    submit.addEventListener('click', () => {
      if (!state.selectedCpfReason) return;
      // Gera ticket
      const ticketId = 'SUP-' + Date.now().toString(36).toUpperCase().slice(-6);
      state.cpfRequestTicket = ticketId;

      PROFILE_DATA.history.unshift({
        date: new Date().toISOString().slice(0, 16),
        action: 'Solicitação de alteração de CPF',
        detail: `Ticket ${ticketId} aberto no suporte — aguardando análise`,
      });
      renderHistory();

      // Tela de sucesso
      body.innerHTML = `
        <div class="ticket-success">
          <div class="ts-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
          </div>
          <h2>Solicitação registrada</h2>
          <p>Sua solicitação foi enviada ao suporte. Você receberá atualizações por e-mail. O prazo médio de análise é de <strong style="color:var(--text)">até 5 dias úteis</strong>.</p>
          <div class="ticket-code">${ticketId}</div>
          <div class="modal-actions" style="justify-content:center">
            <button type="button" class="btn btn-primary" data-close style="flex:1;max-width:200px">Concluir</button>
          </div>
        </div>
      `;

      toast(`Solicitação registrada. Ticket ${ticketId}.`, 'success');
    });
  }

  // ============ CONTATO — ALTERAÇÃO ============
  const CONTACT_META = {
    email:    { label: 'E-mail',      type: 'email',  placeholder: 'novo@email.com',      mask: v => v.trim(),                              validate: v => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()), field: 'email',    verifyTarget: 'e-mail atual' },
    phone:    { label: 'Telefone',    type: 'tel',    placeholder: '(00) 00000-0000',     mask: v => maskPhoneInput(v),                    validate: v => v.replace(/\D/g, '').length >= 10, field: 'phone',    verifyTarget: 'telefone atual' },
    whatsapp: { label: 'WhatsApp',    type: 'tel',    placeholder: '(00) 00000-0000',     mask: v => maskPhoneInput(v),                    validate: v => v.replace(/\D/g, '').length >= 10, field: 'whatsapp', verifyTarget: 'WhatsApp atual' },
  };

  function openContactModal(kind) {
    const meta = CONTACT_META[kind];
    if (!meta) return;
    const currentValue = PROFILE_DATA[meta.field];
    const body = $('#contactModalBody');
    let step = 1;

    const render = () => {
      if (step === 1) {
        body.innerHTML = `
          <h2 class="modal-title">Alterar ${meta.label.toLowerCase()}</h2>
          <p class="modal-text">Vamos enviar um código de verificação para o <strong>${meta.verifyTarget}</strong> para confirmar que é você.</p>
          <form id="contactForm1" novalidate>
            <div class="field-inline">
              <label for="contactNew">Novo ${meta.label.toLowerCase()}</label>
              <input id="contactNew" type="${meta.type}" placeholder="${meta.placeholder}" autocomplete="off" />
              <span class="field-error" id="errContactNew"></span>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
              <button
