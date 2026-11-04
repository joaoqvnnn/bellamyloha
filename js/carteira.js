/* ============================================================
   CARTEIRA — lógica da página
   ============================================================ */

(function () {
  // ============ CONFIG ============
  // Trocar para false quando o backend com Mercado Pago estiver no ar.
  const MOCK_MODE = true;
  const API_BASE  = window.STREAMLY_API_BASE || '/api';

  // Regras (em produção vêm do backend / config admin)
  const MIN_AMOUNT = 10;
  const MAX_AMOUNT = 5000;
  const PRESET_AMOUNTS = [
    { value: 20,  bonus: 0 },
    { value: 50,  bonus: 2  },
    { value: 100, bonus: 5  },
    { value: 150, bonus: 8  },
    { value: 200, bonus: 12 },
    { value: 300, bonus: 20 },
  ];

  // ============ ESTADO ============
  const state = {
    filter: 'todas',
    balanceHidden: false,
    pixFlow: {
      step: 'idle', // idle | amount | payment | success | expired | cancelled
      amount: 0,
      chargeId: null,
      qrCodeBase64: null,
      pixCode: null,
      expiresAt: null,
      timerId: null,
      pollingId: null,
    },
  };

  // ============ HELPERS ============
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function formatCurrency(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR');
  }
  function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function formatDateTime(iso) {
    if (!iso) return '—';
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
    // Digita "100" → "1,00" → "10,00" → "100,00"
    const digits = String(v).replace(/\D/g, '');
    if (!digits) return '';
    const n = parseInt(digits, 10) / 100;
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3800);
  }

  // ============ API (MOCK + real) ============
  /**
   * Cria cobrança PIX no backend (que chama Mercado Pago).
   * Backend deve retornar: { id, status, qr_code, qr_code_base64, expires_at, amount }
   */
  async function apiCreatePixCharge(amount) {
    if (MOCK_MODE) {
      await sleep(600);
      return {
        id: 'MOCK-CHG-' + Date.now(),
        status: 'pending',
        amount,
        // QR real vem do Mercado Pago como base64
        qr_code_base64: generateMockQRBase64(),
        qr_code: '00020126580014BR.GOV.BCB.PIX0136' + crypto.randomUUID().replace(/-/g, '') +
                 '5204000053039865802BR5913STREAMLY6009SAO PAULO62070503***6304ABCD',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
    }
    const res = await fetch(`${API_BASE}/wallet/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Não foi possível gerar a cobrança PIX.');
    return res.json();
  }

  /**
   * Consulta status da cobrança. Em produção, este endpoint consulta
   * o Mercado Pago ou lê do banco (que é atualizado via webhook).
   */
  async function apiCheckCharge(chargeId) {
    if (MOCK_MODE) {
      await sleep(300);
      // Simula: 25% de chance de aprovar a cada poll (a cada 3s)
      const approved = Math.random() < 0.25;
      return {
        id: chargeId,
        status: approved ? 'approved' : 'pending',
      };
    }
    const res = await fetch(`${API_BASE}/wallet/charge/${chargeId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Falha ao verificar pagamento.');
    return res.json();
  }

  async function apiCancelCharge(chargeId) {
    if (MOCK_MODE) { await sleep(200); return { ok: true }; }
    const res = await fetch(`${API_BASE}/wallet/charge/${chargeId}`, {
      method: 'DELETE', credentials: 'include',
    });
    return res.json();
  }

  async function apiWithdraw(amount) {
    if (MOCK_MODE) {
      await sleep(500);
      return { ok: true, id: 'MOCK-WD-' + Date.now() };
    }
    const res = await fetch(`${API_BASE}/wallet/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Não foi possível solicitar a retirada.');
    return res.json();
  }

  function generateMockQRBase64() {
    // Em produção, o Mercado Pago retorna um PNG base64. Aqui geramos
    // um SVG fake que só serve para visualização no modo mock.
    const size = 180, cell = 6, cells = size / cell;
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

  // ============ RENDER — HERO ============
  function renderHero() {
    const bv = $('#balanceValue');
    bv.textContent = state.balanceHidden ? 'R$ ••••,••' : formatCurrency(WALLET_DATA.balance);

    $('#pendingValue').textContent = formatCurrency(WALLET_DATA.pending);
    $('#creditsValue').textContent = formatCurrency(WALLET_DATA.totalCredits);
    $('#debitsValue').textContent  = formatCurrency(WALLET_DATA.totalDebits);

    const btn = $('#toggleBalance');
    const open = btn.querySelector('.eye-open');
    const closed = btn.querySelector('.eye-closed');
    open.style.display  = state.balanceHidden ? 'none' : 'block';
    closed.style.display = state.balanceHidden ? 'block' : 'none';
    btn.setAttribute('aria-label', state.balanceHidden ? 'Mostrar saldo' : 'Ocultar saldo');
  }

  // ============ RENDER — MOVIMENTAÇÕES ============
  function getFilteredTransactions() {
    if (state.filter === 'todas') return [...TRANSACTIONS];
    if (state.filter === 'entrada')   return TRANSACTIONS.filter(t => t.type === 'entrada');
    if (state.filter === 'saida')     return TRANSACTIONS.filter(t => t.type === 'saida');
    if (state.filter === 'pendente')  return TRANSACTIONS.filter(t => t.status === 'pendente');
    return [...TRANSACTIONS];
  }

  function renderMovements() {
    const list = $('#movementsList');
    const empty = $('#movementsEmpty');
    const filtered = getFilteredTransactions();

    $('#movementsCount').textContent = `${filtered.length} ${filtered.length === 1 ? 'movimentação' : 'movimentações'}`;

    if (filtered.length === 0) {
      list.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    list.innerHTML = filtered.map(t => {
      const isIn = t.type === 'entrada';
      const isPending = t.status === 'pendente';
      const isCancelled = t.status === 'cancelado' || t.status === 'recusado';
      const iconClass = isPending ? 'mv-pending-icon' : (isIn ? 'mv-in' : 'mv-out');
      const iconSvg = isPending
        ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>'
        : isIn
          ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>'
          : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';

      const valueClass = isPending ? 'pending' : (isCancelled ? '' : (isIn ? 'in' : 'out'));
      const valueLabel = (isIn && !isCancelled ? '+' : (isCancelled ? '' : '−')) + formatCurrency(t.value);
      const balanceLabel = t.balanceAfter != null ? `Saldo: ${formatCurrency(t.balanceAfter)}` : '—';

      return `
        <div class="mv-item" data-id="${t.id}" role="button" tabindex="0">
          <div class="mv-icon ${iconClass}">${iconSvg}</div>
          <div class="mv-body">
            <div class="mv-title">${t.description}</div>
            <div class="mv-meta">
              <span>${formatDate(t.date)} · ${formatTime(t.date)}</span>
              <span class="dot">·</span>
              <span>${t.paymentMethod}</span>
              <span class="dot">·</span>
              <span class="mv-status ${t.status}">${statusLabel(t.status)}</span>
            </div>
          </div>
          <div class="mv-value ${valueClass}">${valueLabel}</div>
          <div class="mv-balance">${balanceLabel}</div>
        </div>
      `;
    }).join('');
  }

  function statusLabel(s) {
    return { aprovado: 'Aprovado', pendente: 'Pendente', recusado: 'Recusado', cancelado: 'Cancelado' }[s] || s;
  }

  // ============ FLUXO ADICIONAR SALDO ============
  function openAddModal() {
    state.pixFlow = {
      step: 'amount', amount: 0, chargeId: null,
      qrCodeBase64: null, pixCode: null, expiresAt: null,
      timerId: null, pollingId: null,
    };
    renderAddStep();
    $('#addModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function renderAddStep() {
    const body = $('#addBody');
    const step = state.pixFlow.step;

    if (step === 'amount') {
      body.innerHTML = `
        <h2 class="step-title">Adicionar saldo</h2>
        <p class="step-sub">Escolha um valor para recarregar via PIX. O saldo cai na hora após a confirmação do Mercado Pago.</p>

        <div class="amount-grid" id="amountGrid">
          ${PRESET_AMOUNTS.map(p => `
            <button class="amount-chip" data-value="${p.value}">
              ${formatCurrency(p.value)}
              ${p.bonus ? `<small>+${formatCurrency(p.bonus)} bônus</small>` : ''}
            </button>
          `).join('')}
        </div>

        <div class="custom-amount">
          <label for="customAmount">Ou digite outro valor</label>
          <div class="input-money">
            <span class="prefix">R$</span>
            <input id="customAmount" type="text" inputmode="numeric" placeholder="0,00" autocomplete="off" />
          </div>
        </div>
        <div class="amount-error" id="amountError"></div>

        <div class="amount-info">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></svg>
          Valor mínimo ${formatCurrency(MIN_AMOUNT)} · máximo ${formatCurrency(MAX_AMOUNT)}
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" data-close>Cancelar</button>
          <button class="btn btn-primary" id="goToPayment" disabled>Continuar</button>
        </div>
      `;

      const custom = $('#customAmount');
      const continueBtn = $('#goToPayment');
      const err = $('#amountError');

      $$('.amount-chip', body).forEach(chip => {
        chip.addEventListener('click', () => {
          $$('.amount-chip', body).forEach(c => c.classList.remove('is-selected'));
          chip.classList.add('is-selected');
          const v = parseFloat(chip.dataset.value);
          state.pixFlow.amount = v;
          custom.value = v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          err.textContent = '';
          continueBtn.disabled = false;
        });
      });

      custom.addEventListener('input', () => {
        const masked = maskCurrency(custom.value);
        custom.value = masked;
        $$('.amount-chip', body).forEach(c => c.classList.remove('is-selected'));
        const v = parseCurrencyInput(masked);
        state.pixFlow.amount = v;
        if (!masked) { err.textContent = ''; continueBtn.disabled = true; return; }
        if (v < MIN_AMOUNT) {
          err.textContent = `Valor mínimo é ${formatCurrency(MIN_AMOUNT)}.`;
          continueBtn.disabled = true;
        } else if (v > MAX_AMOUNT) {
          err.textContent = `Valor máximo é ${formatCurrency(MAX_AMOUNT)}.`;
          continueBtn.disabled = true;
        } else {
          err.textContent = '';
          continueBtn.disabled = false;
        }
      });

      continueBtn.addEventListener('click', async () => {
        if (state.pixFlow.amount < MIN_AMOUNT || state.pixFlow.amount > MAX_AMOUNT) return;
        continueBtn.disabled = true;
        continueBtn.textContent = 'Gerando cobrança...';
        try {
          const charge = await apiCreatePixCharge(state.pixFlow.amount);
          state.pixFlow.chargeId = charge.id;
          state.pixFlow.qrCodeBase64 = charge.qr_code_base64;
          state.pixFlow.pixCode = charge.qr_code;
          state.pixFlow.expiresAt = new Date(charge.expires_at).getTime();
          state.pixFlow.step = 'payment';
          renderAddStep();
          startPolling();
          startTimer();
        } catch (e) {
          continueBtn.disabled = false;
          continueBtn.textContent = 'Continuar';
          err.textContent = e.message || 'Não foi possível gerar a cobrança.';
        }
      });
    }

    if (step === 'payment') {
      body.innerHTML = `
        <h2 class="step-title">Pague com PIX</h2>
        <p class="step-sub">Escaneie o QR Code ou copie o código abaixo no app do seu banco.</p>

        <div class="pix-wrap">
          <div class="pix-qr">
            <img src="${state.pixFlow.qrCodeBase64}" width="180" height="180" alt="QR Code PIX" />
          </div>
          <div class="pix-qr-caption">Valor a pagar</div>
          <div class="pix-amount">${formatCurrency(state.pixFlow.amount)}</div>
          <div class="pix-expire" id="pixExpire">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>
            Expira em <strong id="pixTimer">--:--</strong>
          </div>
        </div>

        <div class="pix-copy">
          <span class="code" id="pixCode">${state.pixFlow.pixCode}</span>
          <button class="btn btn-ghost" id="copyPix">Copiar</button>
        </div>

        <div class="pix-steps">
          <p><strong>Como pagar:</strong> abra o app do seu banco, escolha PIX → QR Code ou Copia e Cola, cole o código acima e confirme. O saldo cai automaticamente.</p>
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" id="cancelPix">Cancelar</button>
          <button class="btn btn-primary" id="checkPix">Já paguei</button>
        </div>
      `;

      $('#copyPix').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(state.pixFlow.pixCode);
          toast('Código PIX copiado.', 'success');
        } catch {
          toast('Não foi possível copiar. Selecione o código manualmente.', 'warn');
        }
      });

      $('#cancelPix').addEventListener('click', async () => {
        if (state.pixFlow.chargeId) {
          try { await apiCancelCharge(state.pixFlow.chargeId); } catch {}
        }
        stopTimers();
        state.pixFlow.step = 'cancelled';
        closeAllModals();
        toast('Cobrança cancelada.', 'info');
        await refreshWallet();
      });

      $('#checkPix').addEventListener('click', () => {
        toast('Verificando pagamento...', 'info');
        checkPaymentOnce();
      });
    }

    if (step === 'success') {
      body.innerHTML = `
        <div class="success-hero">
          <div class="success-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
          </div>
          <h2>Saldo adicionado</h2>
          <p>Pagamento confirmado pelo Mercado Pago</p>
          <div class="success-amount">+ ${formatCurrency(state.pixFlow.amount)}</div>
          <div class="success-balance">Saldo atual: <strong>${formatCurrency(WALLET_DATA.balance)}</strong></div>
        </div>

        <div class="modal-actions" style="margin-top:20px">
          <button class="btn btn-primary" data-close style="flex:1">Concluir</button>
        </div>
      `;
    }

    if (step === 'expired') {
      body.innerHTML = `
        <div class="expired-hero">
          <div class="expired-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.2v.1"/></svg>
          </div>
          <h2>Cobrança expirada</h2>
          <p>O prazo para pagamento terminou. Você pode gerar uma nova cobrança.</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-close>Fechar</button>
          <button class="btn btn-primary" id="tryAgain">Tentar novamente</button>
        </div>
      `;
      $('#tryAgain').addEventListener('click', () => {
        state.pixFlow.step = 'amount';
        state.pixFlow.amount = 0;
        renderAddStep();
      });
    }
  }

  // ============ TIMER + POLLING ============
  function startTimer() {
    stopTimers();
    const el = $('#pixTimer');
    if (!el) return;
    state.pixFlow.timerId = setInterval(() => {
      const remaining = state.pixFlow.expiresAt - Date.now();
      const timerEl = $('#pixTimer');
      if (!timerEl) { stopTimers(); return; }
      if (remaining <= 0) {
        stopTimers();
        state.pixFlow.step = 'expired';
        renderAddStep();
        return;
      }
      const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
      const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
      timerEl.textContent = `${mm}:${ss}`;
      const container = $('#pixExpire');
      if (container) container.classList.toggle('is-urgent', remaining < 5 * 60 * 1000);
    }, 1000);
  }

  function startPolling() {
    stopPolling();
    state.pixFlow.pollingId = setInterval(checkPaymentOnce, 3000);
  }

  async function checkPaymentOnce() {
    if (!state.pixFlow.chargeId) return;
    try {
      const result = await apiCheckCharge(state.pixFlow.chargeId);
      if (result.status === 'approved') {
        stopTimers();
        // Em produção o backend já atualizou o saldo via webhook.
        // Aqui no mock, atualizamos localmente.
        if (MOCK_MODE) {
          WALLET_DATA.balance     += state.pixFlow.amount;
          WALLET_DATA.totalCredits += state.pixFlow.amount;
          TRANSACTIONS.unshift({
            id: 'MOV-' + Date.now(),
            type: 'entrada',
            category: 'recarga',
            description: 'Recarga via PIX',
            value: state.pixFlow.amount,
            date: new Date().toISOString(),
            paymentMethod: 'PIX · Mercado Pago',
            status: 'aprovado',
            balanceAfter: WALLET_DATA.balance,
            receipt: true,
            mpId: state.pixFlow.chargeId,
          });
        }
        state.pixFlow.step = 'success';
        renderAddStep();
        renderHero();
        renderMovements();
        toast('Pagamento confirmado. Saldo atualizado.', 'success');
      } else if (result.status === 'expired' || result.status === 'cancelled') {
        stopTimers();
        state.pixFlow.step = 'expired';
        renderAddStep();
      }
    } catch (e) {
      // Silencioso — tenta de novo no próximo ciclo
    }
  }

  function stopTimers() {
    if (state.pixFlow.timerId)   clearInterval(state.pixFlow.timerId);
    if (state.pixFlow.pollingId) clearInterval(state.pixFlow.pollingId);
    state.pixFlow.timerId = null;
    state.pixFlow.pollingId = null;
  }
  function stopPolling() {
    if (state.pixFlow.pollingId) clearInterval(state.pixFlow.pollingId);
    state.pixFlow.pollingId = null;
  }

  // ============ RETIRAR SALDO ============
  function openWithdrawModal() {
    const body = $('#withdrawBody');
    body.innerHTML = `
      <h2 class="modal-title">Retirar saldo</h2>
      <p class="modal-text">Você pode solicitar a retirada do saldo disponível. O valor será transferido para a chave PIX cadastrada em até 1 dia útil.</p>

      <div class="withdraw-summary">
        <div class="row"><span class="k">Saldo disponível</span><span class="v">${formatCurrency(WALLET_DATA.balance)}</span></div>
        <div class="row"><span class="k">Saldo pendente</span><span class="v">${formatCurrency(WALLET_DATA.pending)}</span></div>
        <div class="row"><span class="k">Chave PIX</span><span class="v">cliente@email.com</span></div>
      </div>

      <div class="custom-amount">
        <label for="withdrawAmount">Valor da retirada</label>
        <div class="input-money">
          <span class="prefix">R$</span>
          <input id="withdrawAmount" type="text" inputmode="numeric" placeholder="0,00" autocomplete="off" />
        </div>
      </div>
      <div class="amount-error" id="withdrawError"></div>

      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="confirmWithdraw" disabled>Solicitar retirada</button>
      </div>
    `;

    const input = $('#withdrawAmount');
    const btn   = $('#confirmWithdraw');
    const err   = $('#withdrawError');

    input.addEventListener('input', () => {
      input.value = maskCurrency(input.value);
      const v = parseCurrencyInput(input.value);
      if (!input.value) { err.textContent = ''; btn.disabled = true; return; }
      if (v > WALLET_DATA.balance) {
        err.textContent = `Você não tem saldo suficiente. Disponível: ${formatCurrency(WALLET_DATA.balance)}.`;
        btn.disabled = true;
      } else if (v < 20) {
        err.textContent = 'Valor mínimo de retirada: R$ 20,00.';
        btn.disabled = true;
      } else {
        err.textContent = '';
        btn.disabled = false;
      }
    });

    btn.addEventListener('click', async () => {
      const v = parseCurrencyInput(input.value);
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      try {
        await apiWithdraw(v);
        // Mock: cria movimentação pendente
        WALLET_DATA.balance -= v;
        WALLET_DATA.totalDebits += v;
        TRANSACTIONS.unshift({
          id: 'MOV-' + Date.now(),
          type: 'saida',
          category: 'pagamento',
          description: 'Retirada para chave PIX',
          value: v,
          date: new Date().toISOString(),
          paymentMethod: 'PIX · Mercado Pago',
          status: 'pendente',
          balanceAfter: WALLET_DATA.balance,
          receipt: false,
        });
        closeAllModals();
        renderHero();
        renderMovements();
        toast('Retirada solicitada. O valor será transferido em até 1 dia útil.', 'success');
      } catch (e) {
        err.textContent = e.message || 'Falha ao solicitar retirada.';
        btn.disabled = false;
        btn.textContent = 'Solicitar retirada';
      }
    });

    $('#withdrawModal').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 100);
  }

  // ============ DETALHE DA MOVIMENTAÇÃO ============
  function openMovementDetail(txId) {
    const t = TRANSACTIONS.find(x => x.id === txId);
    if (!t) return;
    const isIn = t.type === 'entrada';
    const body = $('#detailBody');

    body.innerHTML = `
      <div class="detail-tx-head">
        <div class="mv-icon ${isIn ? 'mv-in' : 'mv-out'}">
          ${isIn
            ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>'
            : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'}
        </div>
        <div>
          <h2>${t.description}</h2>
          <div class="sub-meta">${t.id}</div>
        </div>
      </div>

      <div class="detail-amount-box">
        <span class="lbl">Valor</span>
        <span class="val ${isIn ? 'in' : 'out'}">
          ${isIn ? '+' : '−'} ${formatCurrency(t.value)}
        </span>
      </div>

      <div class="detail-grid" style="grid-template-columns:1fr">
        <div class="detail-item"><span class="lbl">Data e hora</span><span class="val">${formatDateTime(t.date)}</span></div>
        <div class="detail-item"><span class="lbl">Categoria</span><span class="val">${categoryLabel(t.category)}</span></div>
        <div class="detail-item"><span class="lbl">Forma de pagamento</span><span class="val">${t.paymentMethod}</span></div>
        <div class="detail-item"><span class="lbl">Status</span><span class="val">${statusLabel(t.status)}</span></div>
        ${t.balanceAfter != null ? `<div class="detail-item"><span class="lbl">Saldo após</span><span class="val">${formatCurrency(t.balanceAfter)}</span></div>` : ''}
        ${t.mpId ? `<div class="detail-item"><span class="lbl">ID Mercado Pago</span><span class="val" style="font-family:ui-monospace,monospace;font-size:12px">${t.mpId}</span></div>` : ''}
      </div>

      <div class="modal-actions">
        ${t.receipt ? `<button class="btn btn-ghost" id="downloadReceipt">Baixar comprovante</button>` : ''}
        <button class="btn btn-primary" data-close>Fechar</button>
      </div>
    `;

    $('#detailModal').hidden = false;
    document.body.style.overflow = 'hidden';

    const dl = $('#downloadReceipt');
    if (dl) dl.addEventListener('click', () => downloadReceipt(t));
  }

  function categoryLabel(c) {
    return {
      compra: 'Compra', pagamento: 'Pagamento', recarga: 'Recarga',
      renovacao: 'Renovação', estorno: 'Estorno', ajuste: 'Ajuste',
    }[c] || c;
  }

  function downloadReceipt(t) {
    const lines = [
      '========================================',
      '       STREAMLY — COMPROVANTE PIX       ',
      '========================================',
      `ID:                ${t.id}`,
      `Descrição:         ${t.description}`,
      `Categoria:         ${categoryLabel(t.category)}`,
      `Data:              ${formatDateTime(t.date)}`,
      `Forma de pagto:    ${t.paymentMethod}`,
      `Status:            ${statusLabel(t.status)}`,
      ...(t.mpId ? [`ID Mercado Pago:   ${t.mpId}`] : []),
      '----------------------------------------',
      `VALOR:             ${formatCurrency(t.value)}`,
      ...(t.balanceAfter != null ? [`SALDO APÓS:        ${formatCurrency(t.balanceAfter)}`] : []),
      '========================================',
      'Comprovante gerado automaticamente.',
      'Mercado Pago · Streamly',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `comprovante-${t.id}.txt`);
    toast('Comprovante baixado.', 'success');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ============ NOTIFICAÇÕES ============
  function renderNotifications() {
    const list = $('#notifList');
    list.innerHTML = WALLET_NOTIFICATIONS.map((n, i) => {
      const icon = n.type === 'ok'
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
        : n.type === 'err'
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 9 6 6M15 9l-6 6"/></svg>'
        : n.type === 'warn'
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.2v.1"/></svg>'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></svg>';
      return `
        <div class="notif-item ${n.unread ? 'is-unread' : ''}" data-notif-index="${i}">
          <div class="notif-item-icon ${n.type}">${icon}</div>
          <div class="notif-item-body">
            <div class="notif-item-title">${n.title}</div>
            <div class="notif-item-sub">${n.sub}</div>
          </div>
        </div>
      `;
    }).join('');
    const unread = WALLET_NOTIFICATIONS.filter(n => n.unread).length;
    const badge = $('#notifBadge');
    badge.textContent = unread;
    badge.style.display = unread > 0 ? '' : 'none';
  }

  // ============ REFRESH ============
  async function refreshWallet() {
    if (MOCK_MODE) return;
    try {
      const res = await fetch(`${API_BASE}/wallet`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      WALLET_DATA.balance     = data.balance;
      WALLET_DATA.pending     = data.pending;
      WALLET_DATA.totalCredits= data.totalCredits;
      WALLET_DATA.totalDebits = data.totalDebits;
      // Se o backend retornar transações:
      // TRANSACTIONS.splice(0, TRANSACTIONS.length, ...data.transactions);
      renderHero();
      renderMovements();
    } catch {}
  }

  // ============ EVENTOS ============
  function closeAllModals() {
    $$('.modal').forEach(m => m.hidden = true);
    document.body.style.overflow = '';
    stopTimers();
  }

  function bindEvents() {
    // Adicionar saldo
    $('#addBalanceBtn').addEventListener('click', openAddModal);
    const emptyAdd = $('#emptyAddBtn');
    if (emptyAdd) emptyAdd.addEventListener('click', openAddModal);

    // Retirar
    $('#withdrawBtn').addEventListener('click', openWithdrawModal);

    // Ocultar saldo
    $('#toggleBalance').addEventListener('click', () => {
      state.balanceHidden = !state.balanceHidden;
      renderHero();
    });

    // Filtros
    $$('#movementsFilters .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.filter = chip.dataset.filter;
        $$('#movementsFilters .chip').forEach(c => c.classList.toggle('is-active', c === chip));
        renderMovements();
      });
    });

    // Detalhes da movimentação
    $('#movementsList').addEventListener('click', (e) => {
      const item = e.target.closest('.mv-item');
      if (!item) return;
      openMovementDetail(item.dataset.id);
    });
    $('#movementsList').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const item = e.target.closest('.mv-item');
        if (item) { e.preventDefault(); openMovementDetail(item.dataset.id); }
      }
    });

    // Fechar modais
    $$('[data-close]').forEach(el => el.addEventListener('click', closeAllModals));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllModals(); });

    // Notificações
    const notifBtn = $('#notifBtn');
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = notifBtn.closest('.dropdown');
      const isOpen = parent.classList.toggle('is-open');
      notifBtn.setAttribute('aria-expanded', String(isOpen));
    });
    $('#notifList').addEventListener('click', (e) => {
      const item = e.target.closest('.notif-item');
      if (!item) return;
      const idx = parseInt(item.dataset.notifIndex, 10);
      const n = WALLET_NOTIFICATIONS[idx];
      if (n) {
        n.unread = false;
        renderNotifications();
        if (n.ref) openMovementDetail(n.ref);
      }
      notifBtn.closest('.dropdown').classList.remove('is-open');
    });
    $('#notifMarkAll').addEventListener('click', (e) => {
      e.stopPropagation();
      WALLET_NOTIFICATIONS.forEach(n => n.unread = false);
      renderNotifications();
    });

    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        $$('.dropdown.is-open').forEach(d => d.classList.remove('is-open'));
      }
    });
  }

  // ============ INIT ============
  function init() {
    renderHero();
    renderMovements();
    renderNotifications();
    bindEvents();
    // Em produção: refreshWallet() para puxar dados reais
  }

  document.addEventListener('DOMContentLoaded', init);
})();
