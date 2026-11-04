/* ============================================================
   CONFIGURAÇÕES — lógica
   ============================================================ */

(function () {
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  // ============ ESTADO ============
  const state = {
    appearance: {},      // auto-save
    saved: {},           // saved non-appearance
    draft: {},           // draft non-appearance
    themeChoice: 'dark', // 'dark' | 'light' | 'system'
  };

  // ============ HELPERS ============
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function loadAll() {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch {}

    state.appearance = { ...SETTINGS_DEFAULTS.appearance, ...(stored.appearance || {}) };

    // Non-appearance settings
    const savedRest = {
      region:        { ...SETTINGS_DEFAULTS.region,        ...(stored.region        || {}) },
      notifications: deepMerge(SETTINGS_DEFAULTS.notifications, stored.notifications || {}),
      privacy:       { ...SETTINGS_DEFAULTS.privacy,       ...(stored.privacy       || {}) },
      security:      { ...SETTINGS_DEFAULTS.security,      ...(stored.security      || {}) },
      store:         deepMerge(SETTINGS_DEFAULTS.store,    stored.store             || {}),
    };
    state.saved = savedRest;
    state.draft = clone(savedRest);

    // Theme
    state.themeChoice = localStorage.getItem(THEME_KEY) || 'dark';
  }

  function deepMerge(defaults, custom) {
    const out = { ...defaults };
    for (const k in custom) {
      if (custom[k] && typeof custom[k] === 'object' && !Array.isArray(custom[k])) {
        out[k] = deepMerge(defaults[k] || {}, custom[k]);
      } else {
        out[k] = custom[k];
      }
    }
    return out;
  }

  function persistAll() {
    const all = { appearance: state.appearance, ...state.saved };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(all));
  }

  function persistAppearance() {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch {}
    stored.appearance = state.appearance;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(stored));
  }

  function setByPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
    cur[parts[parts.length - 1]] = value;
  }

  function getByPath(obj, path) {
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) cur = cur?.[p];
    return cur;
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
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3600);
  }

  // ============ APLICAR APARÊNCIA NO DOM ============
  function applyAppearance() {
    const a = state.appearance;
    const root = document.documentElement;
    root.setAttribute('data-primary', a.primary);
    root.setAttribute('data-card-style', a.cardStyle);
    root.setAttribute('data-font-size', a.fontSize);
    root.setAttribute('data-contrast', a.contrastHigh ? 'high' : 'normal');
    root.setAttribute('data-animations', a.reduceAnimations ? 'off' : 'on');
    root.setAttribute('data-readability', a.improveReadability ? 'enhanced' : 'normal');
  }

  function applyTheme(choice) {
    const root = document.documentElement;
    let applied;
    if (choice === 'system') {
      applied = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      applied = choice;
    }
    root.setAttribute('data-theme', applied);
    localStorage.setItem(THEME_KEY, choice);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', applied === 'dark' ? '#000000' : '#ffffff');
  }

  // ============ RENDER — Aparência ============
  function renderAparencia() {
    // Theme
    $$('#themeOptions .theme-option').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.themeOpt === state.themeChoice);
    });

    // Color
    $$('#swatchGrid .swatch').forEach(s => {
      s.classList.toggle('is-active', s.dataset.color === state.appearance.primary);
    });

    // Card style
    $$('#cardStyleOptions .card-style-option').forEach(b => {
      b.classList.toggle('is-active', b.dataset.style === state.appearance.cardStyle);
    });

    // Font size
    $$('#fontSizeOptions .font-size-option').forEach(b => {
      b.classList.toggle('is-active', b.dataset.fontSize === state.appearance.fontSize);
    });

    // Appearance toggles
    $$('[data-appearance-toggle]').forEach(inp => {
      inp.checked = !!state.appearance[inp.dataset.appearanceToggle];
    });
  }

  // ============ RENDER — Região ============
  function renderRegiao() {
    // Popula selects (uma única vez)
    const langSel = $('#langSelect');
    if (!langSel.options.length) {
      LANGUAGE_OPTIONS.forEach(o => langSel.add(new Option(o.label, o.value)));
      COUNTRY_OPTIONS.forEach(o => $('#countrySelect').add(new Option(o.label, o.value)));
      TIMEZONE_OPTIONS.forEach(o => $('#timezoneSelect').add(new Option(o.label, o.value)));
    }

    // Aplica valores do draft
    const r = state.draft.region;
    $('#langSelect').value       = r.language;
    $('#countrySelect').value    = r.country;
    $('#timezoneSelect').value   = r.timezone;
    $('#dateFormatSelect').value = r.dateFormat;
    $('#timeFormatSelect').value = r.timeFormat;
    $('#currencySelect').value   = r.currency;

    updateRegionPreview();
  }

  function updateRegionPreview() {
    const r = state.draft.region;
    const now = new Date();
    let dateStr;
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    if (r.dateFormat === 'DD/MM/YYYY')      dateStr = `${d}/${m}/${y}`;
    else if (r.dateFormat === 'MM/DD/YYYY') dateStr = `${m}/${d}/${y}`;
    else                                     dateStr = `${y}-${m}-${d}`;

    let valueStr;
    const val = 1234.56;
    if (r.currency === 'BRL') valueStr = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    else if (r.currency === 'USD') valueStr = val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    else valueStr = val.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

    $('#regionPreview').textContent = `${dateStr} · ${valueStr}`;
  }

  // ============ RENDER — Notificações ============
  function renderNotificacoes() {
    $$('[data-setting]').forEach(inp => {
      if (!inp.dataset.setting.startsWith('notifications.')) return;
      const val = getByPath(state.draft, inp.dataset.setting);
      if (inp.type === 'checkbox') inp.checked = !!val;
      else inp.value = val;
    });

    // Bloqueia WhatsApp children se master desligado
    const waMaster = state.draft.notifications.whatsapp.enabled;
    $$('[data-whatsapp-child]').forEach(inp => { inp.disabled = !waMaster; });

    // Bloqueia categorias se notifications.master desligado
    const master = state.draft.notifications.master;
    ['purchases', 'payments', 'expiration', 'renewal', 'news'].forEach(key => {
      const el = document.querySelector(`[data-setting="notifications.${key}"]`);
      if (el) el.disabled = !master;
    });
  }

  // ============ RENDER — Privacidade + Segurança ============
  function renderPrivacidadeSeguranca() {
    $$('[data-setting]').forEach(inp => {
      const path = inp.dataset.setting;
      if (!path.startsWith('privacy.') && !path.startsWith('security.')) return;
      const val = getByPath(state.draft, path);
      if (inp.type === 'checkbox') inp.checked = !!val;
    });
  }

  // ============ RENDER — Loja ============
  function renderLoja() {
    $$('[data-setting]').forEach(inp => {
      if (!inp.dataset.setting.startsWith('store.')) return;
      const val = getByPath(state.draft, inp.dataset.setting);
      if (inp.type === 'checkbox') inp.checked = !!val;
    });

    // Favoritos
    const chips = $('#favoritesChips');
    chips.innerHTML = STORE_CATEGORIES.map(cat => {
      const active = state.draft.store.favoriteCategories.includes(cat);
      return `
        <button type="button" class="favorite-chip ${active ? 'is-active' : ''}" data-category="${cat}">
          ${active
            ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
            : ''}
          ${cat}
        </button>
      `;
    }).join('');

    $$('#favoritesChips .favorite-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        const idx = state.draft.store.favoriteCategories.indexOf(cat);
        if (idx >= 0) state.draft.store.favoriteCategories.splice(idx, 1);
        else state.draft.store.favoriteCategories.push(cat);
        renderLoja();
      });
    });
  }

  // ============ RENDER — Conta ============
  function renderConta() {
    $('#versionLabel').textContent = SYSTEM_VERSION;
  }

  // ============ RENDER GERAL ============
  function renderAll() {
    renderAparencia();
    renderRegiao();
    renderNotificacoes();
    renderPrivacidadeSeguranca();
    renderLoja();
    renderConta();
  }

  // ============ EVENTOS — Tabs ============
  function bindTabs() {
    $$('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.settings-tab').forEach(t => t.classList.toggle('is-active', t === tab));
        $$('.settings-panel').forEach(p => p.classList.toggle('is-active', p.dataset.panel === tab.dataset.tab));
      });
    });
  }

  // ============ EVENTOS — Aparência ============
  function bindAparencia() {
    // Theme
    $$('#themeOptions .theme-option').forEach(btn => {
      btn.addEventListener('click', () => {
        state.themeChoice = btn.dataset.themeOpt;
        applyTheme(state.themeChoice);
        renderAparencia();
        toast(`Tema alterado para "${btn.querySelector('strong').textContent}".`, 'success');
      });
    });

    // Color
    $$('#swatchGrid .swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        state.appearance.primary = sw.dataset.color;
        applyAppearance();
        persistAppearance();
        renderAparencia();
        toast('Cor principal atualizada.', 'success');
      });
    });

    // Card style
    $$('#cardStyleOptions .card-style-option').forEach(btn => {
      btn.addEventListener('click', () => {
        state.appearance.cardStyle = btn.dataset.style;
        applyAppearance();
        persistAppearance();
        renderAparencia();
        toast('Estilo dos cards atualizado.', 'success');
      });
    });

    // Font size
    $$('#fontSizeOptions .font-size-option').forEach(btn => {
      btn.addEventListener('click', () => {
        state.appearance.fontSize = btn.dataset.fontSize;
        applyAppearance();
        persistAppearance();
        renderAparencia();
        toast('Tamanho da fonte atualizado.', 'success');
      });
    });

    // Appearance toggles
    $$('[data-appearance-toggle]').forEach(inp => {
      inp.addEventListener('change', () => {
        state.appearance[inp.dataset.appearanceToggle] = inp.checked;
        applyAppearance();
        persistAppearance();
      });
    });

    // Reset appearance only
    $('#resetAppearanceBtn').addEventListener('click', () => {
      openConfirm({
        title: 'Restaurar aparência padrão?',
        text: 'Tema, cor, estilo dos cards e ajustes de acessibilidade voltarão ao padrão.',
        confirmLabel: 'Restaurar',
        onConfirm: () => {
          state.appearance = clone(SETTINGS_DEFAULTS.appearance);
          state.themeChoice = 'dark';
          applyAppearance();
          applyTheme('dark');
          persistAppearance();
          renderAparencia();
          toast('Aparência restaurada ao padrão.', 'success');
        },
      });
    });
  }

  // ============ EVENTOS — Região ============
  function bindRegiao() {
    ['#langSelect', '#countrySelect', '#timezoneSelect', '#dateFormatSelect', '#timeFormatSelect', '#currencySelect'].forEach(sel => {
      $(sel).addEventListener('change', () => {
        state.draft.region.language   = $('#langSelect').value;
        state.draft.region.country    = $('#countrySelect').value;
        state.draft.region.timezone   = $('#timezoneSelect').value;
        state.draft.region.dateFormat = $('#dateFormatSelect').value;
        state.draft.region.timeFormat = $('#timeFormatSelect').value;
        state.draft.region.currency   = $('#currencySelect').value;
        updateRegionPreview();
      });
    });
  }

  // ============ EVENTOS — Notificações / Privacidade / Segurança / Loja ============
  function bindSettings() {
    $$('[data-setting]').forEach(inp => {
      inp.addEventListener('change', () => {
        const path = inp.dataset.setting;
        const value = inp.type === 'checkbox' ? inp.checked : inp.value;
        setByPath(state.draft, path, value);

        // Re-render dependências
        if (path === 'notifications.master') renderNotificacoes();
        if (path === 'notifications.whatsapp.enabled') renderNotificacoes();
      });
    });
  }

  // ============ SALVAR ============
  function saveAll() {
    // Aparência já é auto-salva
    state.saved = clone(state.draft);
    persistAll();
    toast('Configurações salvas com sucesso.', 'success');
  }

  // ============ RESTAURAR PADRÕES (tudo) ============
  function resetAll() {
    openConfirm({
      title: 'Restaurar todas as configurações?',
      text: 'Tema, aparência, idioma, notificações, privacidade, segurança, loja — tudo voltará ao padrão. Esta ação não pode ser desfeita.',
      confirmLabel: 'Restaurar tudo',
      onConfirm: () => {
        state.appearance = clone(SETTINGS_DEFAULTS.appearance);
        state.saved = {
          region:        clone(SETTINGS_DEFAULTS.region),
          notifications: clone(SETTINGS_DEFAULTS.notifications),
          privacy:       clone(SETTINGS_DEFAULTS.privacy),
          security:      clone(SETTINGS_DEFAULTS.security),
          store:         clone(SETTINGS_DEFAULTS.store),
        };
        state.draft = clone(state.saved);
        state.themeChoice = 'dark';

        applyAppearance();
        applyTheme('dark');
        persistAppearance();
        persistAll();
        renderAll();
        toast('Configurações restauradas ao padrão.', 'success');
      },
    });
  }

  // ============ AÇÕES ============
  function requestDataCopy() {
    openConfirm({
      title: 'Solicitar cópia dos dados',
      text: 'Você receberá em até 48h um arquivo com todos os dados pessoais vinculados à sua conta (exceto informações sensíveis por obrigação legal).',
      confirmLabel: 'Solicitar',
      onConfirm: () => {
        toast('Solicitação registrada. Verifique seu e-mail em até 48h.', 'success');
      },
    });
  }

  function disconnectAll() {
    openConfirm({
      title: 'Desconectar todos os dispositivos?',
      text: 'Sua sessão será encerrada em todos os aparelhos conectados, incluindo este. Você precisará entrar novamente.',
      confirmLabel: 'Desconectar',
      onConfirm: () => {
        toast('Solicitação registrada. Redirecionando...', 'warn');
        setTimeout(() => { window.location.href = 'index.html'; }, 1200);
      },
    });
  }

  function requestDelete() {
    openConfirm({
      title: 'Solicitar exclusão da conta?',
      text: 'Você receberá um e-mail com instruções para confirmar a exclusão. Após confirmação, sua conta e dados pessoais serão removidos, mas registros fiscais com CPF permanecerão por obrigação legal.',
      confirmLabel: 'Solicitar',
      onConfirm: () => {
        toast('Solicitação registrada. Verifique seu e-mail.', 'success');
      },
    });
  }

  // ============ CONFIRM GENÉRICO ============
  function openConfirm({ title, text, confirmLabel, onConfirm }) {
    const body = $('#confirmBody');
    body.innerHTML = `
      <div class="confirm-icon confirm-icon-warn">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17v.1"/></svg>
      </div>
      <h2 class="modal-title">${title}</h2>
      <p class="modal-text">${text}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="confirmOk">${confirmLabel}</button>
      </div>
    `;
    $('#confirmModal').hidden = false;
    document.body.style.overflow = 'hidden';

    body.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', closeAllModals);
    });
    $('#confirmOk').addEventListener('click', () => {
      closeAllModals();
      onConfirm();
    });
  }

  function closeAllModals() {
    $$('.modal').forEach(m => m.hidden = true);
    document.body.style.overflow = '';
  }

  // ============ NOTIFICAÇÕES DO SINO ============
  function renderNotifications() {
    const list = $('#notifList');
    list.innerHTML = `
      <div class="notif-item is-unread">
        <div class="notif-item-icon ok">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
        </div>
        <div class="notif-item-body">
          <div class="notif-item-title">Configurações sincronizadas</div>
          <div class="notif-item-sub">Suas preferências foram atualizadas</div>
        </div>
      </div>
    `;
    const badge = $('#notifBadge');
    badge.textContent = '1';
  }

  // ============ EVENTOS ============
  function bindEvents() {
    $('#saveSettingsBtn').addEventListener('click', saveAll);
    $('#resetAllBtn').addEventListener('click', resetAll);

    $('#requestDataBtn').addEventListener('click', requestDataCopy);
    $('#disconnectAllBtn').addEventListener('click', disconnectAll);
    $('#deleteAccountBtn').addEventListener('click', requestDelete);

    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) closeAllModals();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllModals(); });

    // Notificações (dropdown do sino)
    const notifBtn = $('#notifBtn');
    if (notifBtn) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parent = notifBtn.closest('.dropdown');
        const isOpen = parent.classList.toggle('is-open');
        notifBtn.setAttribute('aria-expanded', String(isOpen));
      });
    }
    const notifMark = $('#notifMarkAll');
    if (notifMark) {
      notifMark.addEventListener('click', (e) => {
        e.stopPropagation();
        $$('#notifList .notif-item').forEach(n => n.classList.remove('is-unread'));
        $('#notifBadge').style.display = 'none';
      });
    }
  }

  // ============ INIT ============
  function init() {
    loadAll();
    applyAppearance();      // garante consistência
    renderAll();
    renderNotifications();
    bindTabs();
    bindAparencia();
    bindRegiao();
    bindSettings();
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
