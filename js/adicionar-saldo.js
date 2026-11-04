/* ============================================================
   ADICIONAR SALDO — lógica completa
   ============================================================ */

(function () {
  // ============ CONFIG ============
  // Trocar para false quando o backend real (com Mercado Pago) estiver no ar
  const MOCK_MODE = true;
  const API_BASE  = window.STREAMLY_API_BASE || '/api';

  // ============ ESTADO ============
  const state = {
    view: 'amount', // 'amount' | 'pix' | 'success'
    selectedAmount: 0,
    selectedBonus: 0,
    charge: null,
    timerId: null,
    pollingId: null,
    expiresAt: null,
    checkingNow: false,
  };

  // ============ HELPERS ============
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  function formatCurrency(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR');
  }
  function formatDateTime(iso) {
    const d = new Date(iso);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  function parseCurrencyInput(str) {
    if (!str) return 0;
    const clean = String(str).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : Math.round(n * 100) / 100;
  }
  function maskCurrency(v) {
    const digits = String(v).replace(/\D/g, '');
    if (!digits) return '';
    const n = parseInt(digits, 10) / 100;
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ============ CÁLCULO DE BÔNUS ============
  function calculateBonus(value) {
    if (!value || value < RECHARGE_CONFIG.minAmount) return 0;

    // 1. Verifica se é um pacote exato
    const pkg = RECHARGE_CONFIG.packages.find(p => Math.abs(p.value - value) < 0.01);
    if (pkg) return pkg.bonus;

    // 2. Verifica as faixas de bônus para valores personalizados
    for (const tier of RECHARGE_CONFIG.customBonusTiers) {
      if (value >= tier.min && value <= tier.max) return tier.bonus;
    }
    return 0;
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
    if (!stack) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span>${msg}</span>`;
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3800);
  }

  // ============ RENDER: HERO ============
  function renderHero() {
    $('#currentBalance').textContent = formatCurrency(WALLET_STATE.balance);
    $('#pendingBalance').textContent = formatCurrency(WALLET_STATE.pending);
    $('#totalCredits').textContent = formatCurrency(WALLET_STATE.totalCredits);
  }

  // ============ RENDER: PACKAGES ============
  function renderPackages() {
    const grid = $('#packagesGrid');
    grid.innerHTML = RECHARGE_CONFIG.packages.map(pkg => `
      <button class="package-card" data-amount="${pkg.value}" data-bonus="${pkg.bonus}">
        ${pkg.bonus > 0 ? `
          <span class="pkg-bonus-badge">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5 3 11h5v10h8V11h5L12 2.5Z"/></svg>
            +${formatCurrency(pkg.bonus).replace('R$', '').trim()}
          </span>
        ` : ''}
        <div class="pkg-value">
          <small>R$</small>${pkg.value}
        </div>
        <span class="pkg-bonus-text ${pkg.bonus === 0 ? 'is-empty' : ''}">
          ${pkg.bonus > 0 ? `+ ${formatCurrency(pkg.bonus)} bônus` : 'Sem bônus'}
        </span>
      </button>
    `).join('');

    $$('.package-card', grid).forEach(btn => {
      btn.addEventListener('click', () => {
        const value = parseFloat(btn.dataset.amount);
        const bonus = parseFloat(btn.dataset.bonus);

        // Se já estava selecionado, desmarca
        if (state.selectedAmount === value && $('#customAmount').value === value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })) {
          state.selectedAmount = 0;
          state.selectedBonus = 0;
          $('#customAmount').value = '';
          $$('.package-card').forEach(b => b.classList.remove('is-selected'));
        } else {
          state.selectedAmount = value;
          state.selectedBonus = bonus;
          $('#customAmount').value = value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          $$('.package-card').forEach(b => b.classList.toggle('is-selected', b === btn));
          $('#amountError').textContent = '';
        }
        updateSummary();
      });
    });
  }

  // ============ EVENTO: VALOR PERSONALIZADO ============
  function bindCustomAmount() {
    const input = $('#customAmount');

    input.addEventListener('input', () => {
      const masked = maskCurrency(input.value);
      input.value = masked;

      // Desmarca pacote se o valor não for exato
      const currentValue = parseCurrencyInput(masked);
      let matchedPkg = null;
      $$('.package-card').forEach(b => {
        const btnValue = parseFloat(b.dataset.amount);
        if (Math.abs(btnValue - currentValue) < 0.01) {
          matchedPkg = b;
        } else {
          b.classList.remove('is-selected');
        }
      });
      if (matchedPkg) matchedPkg.classList.add('is-selected');

      // Recalcula
      state.selectedAmount = currentValue;
      state.selectedBonus = calculateBonus(currentValue);

      updateSummary();
      validateAmount();
    });

    input.addEventListener('blur', () => {
      const v = parseCurrencyInput(input.value);
      if (v > 0) {
        input.value = v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      }
    });

    input.addEventListener('focus', () => {
      // Se estava vazio, não faz nada. Se tinha valor de pacote, mantém.
    });
  }

  // ============ VALIDAÇÃO ============
  function validateAmount() {
    const v = state.selectedAmount;
    const err = $('#amountError');

    if (!v || v === 0) {
      err.textContent = '';
      return false;
    }
    if (v < RECHARGE_CONFIG.minAmount) {
      err.textContent = `Valor mínimo: ${formatCurrency(RECHARGE_CONFIG.minAmount)}.`;
      return false;
    }
    if (v > RECHARGE_CONFIG.maxAmount) {
      err.textContent = `Valor máximo: ${formatCurrency(RECHARGE_CONFIG.maxAmount)}.`;
      return false;
    }
    err.textContent = '';
    return true;
  }

  // ============ RESUMO ============
  function updateSummary() {
    const base = state.selectedAmount || 0;
    const bonus = state.selectedBonus || 0;
    const total = base + bonus;

    $('#sumBase').textContent = formatCurrency(base);
    $('#sumTotal').textContent = formatCurrency(total);

    if (bonus > 0) {
      $('#sumBonusRow').hidden = false;
      $('#sumBonus').textContent = `+ ${formatCurrency(bonus)}`;
    } else {
      $('#sumBonusRow').hidden = true;
    }

    // Bonus preview abaixo do input
    const preview = $('#bonusPreview');
    if (bonus > 0) {
      preview.hidden = false;
      $('#bonusPreviewText').textContent = `Você ganha + ${formatCurrency(bonus)} de bônus`;
    } else {
      preview.hidden = true;
    }

    // Botão
    const btn = $('#generateBtn');
    btn.disabled = !(base >= RECHARGE_CONFIG.minAmount && base <= RECHARGE_CONFIG.maxAmount);
  }

  // ============ RENDER: HISTÓRICO ============
  const STATUS_LABEL = {
    aprovado: 'Aprovado',
    pendente: 'Pendente',
    recusado: 'Recusado',
    expirado: 'Expirado',
  };

  function renderRecent() {
    const list = $('#recentList');
    if (RECENT_RECHARGES.length === 0) {
      list.innerHTML = `<div class="recharge-item" style="display:block;text-align:center;padding:30px;color:var(--text-muted)">Nenhuma recarga ainda.</div>`;
      return;
    }

    list.innerHTML = RECENT_RECHARGES.map(r => {
      const iconSvg = r.status === 'aprovado'
        ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
        : r.status === 'pendente'
        ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>'
        : r.status === 'recusado'
        ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 9 6 6M15 9l-6 6"/><circle cx="12" cy="12" r="9"/></svg>'
        : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.2v.1"/></svg>';

      return `
        <div class="recharge-item">
          <div class="recharge-item-icon ${r.status}">${iconSvg}</div>
          <div class="recharge-item-body">
            <div class="recharge-item-title">Recarga ${r.status === 'aprovado' ? 'confirmada' : r.status === 'pendente' ? 'aguardando pagamento' : 'de ' + formatCurrency(r.value)}</div>
            <div class="recharge-item-meta">
              <span class="recharge-id">${r.id}</span>
              <span class="dot">·</span>
              <span>${formatDateTime(r.date)}</span>
            </div>
          </div>
          <span class="recharge-item-status ris-${r.status}">${STATUS_LABEL[r.status]}</span>
          <span class="recharge-item-value">+ ${formatCurrency(r.total)}</span>
        </div>
      `;
    }).join('');
  }

  // ============ MUDANÇA DE VIEW ============
  function switchView(view) {
    state.view = view;
    $('#viewAmount').hidden = view !== 'amount';
    $('#viewPix').hidden = view !== 'pix';
    $('#viewSuccess').hidden = view !== 'success';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ============ GERAR PIX ============
  async function generatePix() {
    if (!validateAmount()) return;

    const btn = $('#generateBtn');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" stroke-dasharray="42 20"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/></circle></svg> Gerando...`;

    try {
      const charge = await apiCreateCharge(state.selectedAmount);

      state.charge = charge;
      state.expiresAt = new Date(charge.expires_at).getTime();

      // Preenche view PIX
      $('#pixQr').innerHTML = `<img src="${charge.qr_code_base64}" alt="QR Code PIX" width="200" height="200" />`;
      $('#pixAmount').textContent = formatCurrency(state.selectedAmount + state.selectedBonus);
      $('#pixCode').textContent = charge.qr_code;
      $('#pixChargeId').textContent = charge.id;

      // Resumo lateral
      $('#pixSumBase').textContent = formatCurrency(state.selectedAmount);
      $('#pixSumTotal').textContent = formatCurrency(state.selectedAmount + state.selectedBonus);
      if (state.selectedBonus > 0) {
        $('#pixSumBonusRow').hidden = false;
        $('#pixSumBonus').textContent = `+ ${formatCurrency(state.selectedBonus)}`;
      } else {
        $('#pixSumBonusRow').hidden = true;
      }

      switchView('pix');
      startTimer();
      startPolling();

    } catch (err) {
      toast(err.message || 'Não foi possível gerar o PIX. Tente novamente.', 'error');
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  }

  // ============ TIMER ============
  function startTimer() {
    stopTimer();
    const totalDuration = RECHARGE_CONFIG.chargeExpiresIn;

    const tick = () => {
      const remaining = state.expiresAt - Date.now();
      const timerEl = $('#pixTimerText');
      const progressFill = $('#pixProgressFill');
      const timerBadge = $('#pixTimerBadge');

      if (!timerEl) { stopTimer(); return; }

      if (remaining <= 0) {
        stopTimer();
        stopPolling();
        renderExpired();
        return;
      }

      const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
      const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
      timerEl.textContent = `${mm}:${ss}`;

      // Progress bar
      const pct = (remaining / totalDuration) * 100;
      if (progressFill) progressFill.style.width = `${pct}%`;

      // Urgência
      const isUrgent = remaining < 5 * 60 * 1000;
      if (timerBadge) timerBadge.classList.toggle('is-urgent', isUrgent);
      if (progressFill) progressFill.classList.toggle('is-urgent', isUrgent);
    };

    tick();
    state.timerId = setInterval(tick, 1000);
  }

  function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  // ============ POLLING ============
  function startPolling() {
    stopPolling();
    state.pollingId = setInterval(checkPayment, RECHARGE_CONFIG.pollingInterval);
  }

  function stopPolling() {
    if (state.pollingId) clearInterval(state.pollingId);
    state.pollingId = null;
  }

  async function checkPayment(manual = false) {
    if (!state.charge || state.checkingNow) return;
    state.checkingNow = true;

    try {
      const result = await apiCheckCharge(state.charge.id);

      if (result.status === 'approved') {
        stopTimer();
        stopPolling();
        handleApproved();
      } else if (result.status === 'expired' || result.status === 'cancelled') {
        stopTimer();
        stopPolling();
        renderExpired();
      } else if (manual) {
        toast('Ainda não identificamos o pagamento. Aguarde mais alguns instantes.', 'info');
      }
    } catch (e) {
      // Silencioso — tenta no próximo ciclo
    } finally {
      state.checkingNow = false;
    }
  }

  // ============ ESTADOS DE PAGAMENTO ============
  function handleApproved() {
    const baseAmount = state.selectedAmount;
    const bonus = state.selectedBonus;
    const total = baseAmount + bonus;
    const prevBalance = WALLET_STATE.balance;

    // Atualiza saldo local (no real, o backend já atualizou via webhook)
    WALLET_STATE.balance += total;
    WALLET_STATE.pending = Math.max(0, WALLET_STATE.pending - baseAmount);
    WALLET_STATE.totalCredits += total;

    // Preenche view success
    $('#successAmount').textContent = formatCurrency(total);
    $('#successPrevBalance').textContent = formatCurrency(prevBalance);
    $('#successNewBalance').textContent = formatCurrency(WALLET_STATE.balance);
    $('#successTxId').textContent = state.charge.id;
    $('#successDate').textContent = formatDateTime(new Date().toISOString());

    if (bonus > 0) {
      $('#successBonus').hidden = false;
      $('#successBonusText').textContent = `Inclui ${formatCurrency(bonus)} de bônus`;
    } else {
      $('#successBonus').hidden = true;
    }

    switchView('success');
    renderHero();
    renderRecent();
    toast('Pagamento confirmado. Saldo atualizado!', 'success');
  }

  function renderExpired() {
    stopTimer();
    stopPolling();

    // Modal simples inline: usa o toast + volta pra view amount
    toast('Cobrança expirada. Gere uma nova recarga.', 'warn');

    // Reseta estado
    state.charge = null;
    state.selectedAmount = 0;
    state.selectedBonus = 0;
    $('#customAmount').value = '';
    $$('.package-card').forEach(b => b.classList.remove('is-selected'));

    updateSummary();
    switchView('amount');
  }

  // ============ API (MOCK + REAL) ============
  async function apiCreateCharge(amount) {
    if (MOCK_MODE) {
      await sleep(700);
      return {
        id: 'MOCK-REC-' + Date.now(),
        status: 'pending',
        amount,
        qr_code_base64: generateMockQR(),
        qr_code: '00020126580014BR.GOV.BCB.PIX0136' + crypto.randomUUID().replace(/-/g, '') + '5204000053039865802BR5913STREAMLY6009SAO PAULO62070503***6304ABCD',
        expires_at: new Date(Date.now() + RECHARGE_CONFIG.chargeExpiresIn).toISOString(),
      };
    }

    const res = await fetch(`${API_BASE}/wallet/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        bonus: state.selectedBonus,
        total: amount + state.selectedBonus,
      }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Falha ao gerar cobrança PIX.');
    return res.json();
  }

  async function apiCheckCharge(chargeId) {
    if (MOCK_MODE) {
      await sleep(300);
      // 30% de chance de aprovar a cada 3s
      return {
        id: chargeId,
        status: Math.random() < 0.3 ? 'approved' : 'pending',
      };
    }
    const res = await fetch(`${API_BASE}/wallet/charge/${chargeId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Falha ao verificar pagamento.');
    return res.json();
  }

  async function apiCancelCharge(chargeId) {
    if (MOCK_MODE) { await sleep(200); return { ok: true }; }
    const res = await fetch(`${API_BASE}/wallet/charge/${chargeId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.json();
  }

  function generateMockQR() {
    const size = 200, cell = 6, cells = size / cell;
    let rects = '';
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        if ((x * 7 + y * 13 + x * y * 3) % 5 < 2) {
          rects += `<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}" fill="#000"/>`;
        }
      }
    }
    const corner = (cx, cy) => `
      <rect x="${cx}" y="${cy}" width="${cell*7}" height="${cell*7}" fill="#000"/>
      <rect x="${cx+cell}" y="${cy+cell}" width="${cell*5}" height="${cell*5}" fill="#fff"/>
      <rect x="${cx+cell*2}" y="${cy+cell*2}" width="${cell*3}" height="${cell*3}" fill="#000"/>
    `;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#fff"/>${rects}
      ${corner(0,0)}${corner(size-cell*7,0)}${corner(0,size-cell*7)}
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  // ============ EVENTOS PIX ============
  function bindPixEvents() {
    // Copiar código
    $('#copyPix').addEventListener('click', async () => {
      if (!state.charge) return;
      try {
        await navigator.clipboard.writeText(state.charge.qr_code);
        toast('Código PIX copiado.', 'success');
        const btn = $('#copyPix');
        const original = btn.innerHTML;
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg> Copiado';
        setTimeout(() => { btn.innerHTML = original; }, 2000);
      } catch {
        toast('Não foi possível copiar. Selecione manualmente.', 'warn');
      }
    });

    // Cancelar
    $('#cancelPix').addEventListener('click', async () => {
      if (state.charge) {
        try { await apiCancelCharge(state.charge.id); } catch {}
      }
      stopTimer();
      stopPolling();
      state.charge = null;
      state.selectedAmount = 0;
      state.selectedBonus = 0;
      $('#customAmount').value = '';
      $$('.package-card').forEach(b => b.classList.remove('is-selected'));
      updateSummary();
      switchView('amount');
      toast('Cobrança cancelada.', 'info');
    });

    // Já paguei
    $('#checkPix').addEventListener('click', () => {
      toast('Verificando pagamento...', 'info');
      checkPayment(true);
    });

    // Voltar para a tela de valor
    $('#backToAmount').addEventListener('click', async (e) => {
      e.preventDefault();
      if (state.charge) {
        try { await apiCancelCharge(state.charge.id); } catch {}
      }
      stopTimer();
      stopPolling();
      state.charge = null;
      switchView('amount');
    });
  }

  // ============ EVENTOS SUCESSO ============
  function bindSuccessEvents() {
    $('#newRechargeBtn').addEventListener('click', () => {
      state.charge = null;
      state.selectedAmount = 0;
      state.selectedBonus = 0;
      $('#customAmount').value = '';
      $$('.package-card').forEach(b => b.classList.remove('is-selected'));
      updateSummary();
      switchView('amount');
    });
  }

  // ============ NOTIFICAÇÕES ============
  function renderNotifications() {
    const list = $('#notifList');
    if (!list) return;

    list.innerHTML = SALDO_NOTIFICATIONS.map((n, i) => {
      const icon = n.type === 'ok'
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></svg>';

      return `
        <div class="notif-item ${n.unread ? 'is-unread' : ''}">
          <div class="notif-item-icon ${n.type}">${icon}</div>
          <div class="notif-item-body">
            <div class="notif-item-title">${n.title}</div>
            <div class="notif-item-sub">${n.sub}</div>
          </div>
        </div>
      `;
    }).join('');

    const unread = SALDO_NOTIFICATIONS.filter(n => n.unread).length;
    const badge = $('#notifBadge');
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? '' : 'none';
    }
  }

  // ============ EVENTOS GLOBAIS ============
  function bindEvents() {
    // Gerar PIX
    $('#generateBtn').addEventListener('click', generatePix);

    // Fecha dropdowns
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        $$('.dropdown.is-open').forEach(d => d.classList.remove('is-open'));
      }
    });

    // Notificações
    const notifBtn = $('#notifBtn');
    if (notifBtn) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifBtn.closest('.dropdown').classList.toggle('is-open');
      });
    }
    const markAll = $('#notifMarkAll');
    if (markAll) {
      markAll.addEventListener('click', (e) => {
        e.stopPropagation();
        $$('#notifList .notif-item').forEach(n => n.classList.remove('is-unread'));
        $('#notifBadge').style.display = 'none';
      });
    }

    // Menu
    const menuBtn = $('#menuBtn');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuBtn.closest('.dropdown').classList.toggle('is-open');
      });
    }
  }

  // ============ INIT ============
  function init() {
    renderHero();
    renderPackages();
    renderRecent();
    renderNotifications();
    updateSummary();
    bindCustomAmount();
    bindPixEvents();
    bindSuccessEvents();
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
