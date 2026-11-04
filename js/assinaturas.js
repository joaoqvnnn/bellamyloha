/* ============================================================
   ASSINATURAS — lógica
   ============================================================ */

(function () {
  // ============ ESTADO ============
  const state = {
    search: '',
    filter: 'todas',
    sort: 'nextBillingDate-asc',
    page: 1,
    perPage: 6,
  };

  const STATUS_LABELS = {
    ativa:     'Ativa',
    proxima:   'Próxima do vencimento',
    vencida:   'Vencida',
    cancelada: 'Cancelada',
    suspensa:  'Suspensa',
  };

  const PERIOD_LABELS = {
    mensal:     'Mensal',
    trimestral: 'Trimestral',
    semestral:  'Semestral',
    anual:      'Anual',
  };

  const PERIOD_SHORT = {
    mensal:     '/ mês',
    trimestral: '/ trimestre',
    semestral:  '/ semestre',
    anual:      '/ ano',
  };

  const PAYMENT_STATUS_LABELS = {
    aprovado:  'Aprovado',
    pendente:  'Pendente',
    recusado:  'Recusado',
    estornado: 'Estornado',
  };

  // ============ HELPERS ============
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function formatDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function formatDateLong(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function formatCurrency(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function initialOf(name) { return name.charAt(0).toUpperCase(); }

  function daysUntil(iso) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(iso + 'T00:00:00');
    return Math.round((target - today) / 86400000);
  }

  function addPeriod(dateStr, periodicity) {
    const d = new Date(dateStr + 'T00:00:00');
    if (periodicity === 'mensal')      d.setMonth(d.getMonth() + 1);
    else if (periodicity === 'trimestral') d.setMonth(d.getMonth() + 3);
    else if (periodicity === 'semestral')  d.setMonth(d.getMonth() + 6);
    else if (periodicity === 'anual')      d.setFullYear(d.getFullYear() + 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3800);
  }

  // ============ FILTROS / ORDENAÇÃO ============
  function getFiltered() {
    let list = [...SUBS_DATA];

    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      list = list.filter(s =>
        s.platform.toLowerCase().includes(q) ||
        s.plan.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    }

    if (state.filter !== 'todas') {
      list = list.filter(s => s.status === state.filter);
    }

    const [key, dir] = state.sort.split('-');
    const mult = dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let va = a[key], vb = b[key];
      if (key === 'platform') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (key === 'status')   { va = STATUS_LABELS[va] || va; vb = STATUS_LABELS[vb] || vb; }
      if (typeof va === 'string') return va.localeCompare(vb) * mult;
      return (va - vb) * mult;
    });

    return list;
  }

  // ============ RESUMO ============
  function renderSummary() {
    const counts = { ativa: 0, proxima: 0, vencida: 0, cancelada: 0, suspensa: 0 };
    SUBS_DATA.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });

    $('#sumTotal').textContent     = SUBS_DATA.length;
    $('#sumAtiva').textContent     = counts.ativa;
    $('#sumProxima').textContent   = counts.proxima;
    $('#sumVencida').textContent   = counts.vencida;
    $('#sumCancelada').textContent = counts.cancelada;
    $('#sumSuspensa').textContent  = counts.suspensa;
  }

  // ============ LISTA ============
  function renderList() {
    const grid  = $('#subsList');
    const empty = $('#emptyState');
    const pagin = $('#pagination');

    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.perPage));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.perPage;
    const pageItems = filtered.slice(start, start + state.perPage);

    if (filtered.length === 0) {
      grid.innerHTML = '';
      pagin.innerHTML = '';
      empty.hidden = false;
      const noData = SUBS_DATA.length === 0;
      const hasFilters = state.search || state.filter !== 'todas';
      $('#emptyTitle').textContent = noData ? 'Você ainda não tem assinaturas' : 'Nenhuma assinatura encontrada';
      $('#emptyText').textContent  = noData
        ? 'Quando você assinar um serviço, ele aparecerá aqui.'
        : 'Tente ajustar a busca ou os filtros.';
      $('#emptyAction').textContent = hasFilters ? 'Limpar filtros' : 'Ir para o catálogo';
      $('#emptyAction').onclick = (e) => {
        e.preventDefault();
        if (hasFilters) {
          state.search = '';
          state.filter = 'todas';
          state.page = 1;
          $('#searchInput').value = '';
          syncChips();
          renderList();
        } else {
          window.location.href = 'catalogo.html';
        }
      };
      return;
    }

    empty.hidden = true;
    grid.innerHTML = pageItems.map(renderSubCard).join('');
    renderPagination(totalPages);
  }

  function renderSubCard(s) {
    const days = daysUntil(s.nextBillingDate);

    // Classes condicionais
    const canRenew  = s.status === 'vencida' || s.status === 'proxima';
    const canChange = s.status === 'ativa' || s.status === 'proxima' || s.status === 'suspensa';
    const canReact  = s.status === 'suspensa';
    const canCancel = s.status !== 'cancelada';
    const showMore  = canReact || canCancel;

    // Texto da próxima cobrança
    let billText, billClass = '';
    if (s.status === 'cancelada') {
      billText = 'Cancelada';
    } else if (s.status === 'suspensa') {
      billText = 'Suspensa';
    } else if (days < 0) {
      billText = `Vencida há ${Math.abs(days)}d`;
      billClass = 'is-err';
    } else if (days <= 15) {
      billText = `Em ${days} dia${days === 1 ? '' : 's'}`;
      billClass = 'is-warn';
    } else {
      billText = formatDate(s.nextBillingDate);
    }

    return `
      <article class="sub-card" data-id="${s.id}">
        <header class="sub-card-head">
          <div class="sub-platform-icon" style="--c:${s.platformColor}">${initialOf(s.platform)}</div>
          <div class="sub-title">
            <h3>${s.platform}</h3>
            <div class="sub-meta">
              <span>${s.plan}</span>
              <span class="dot">·</span>
              <span class="pill">${PERIOD_LABELS[s.periodicity]}</span>
              ${s.autoRenew
                ? `<span class="pill pill-auto-on" title="Renovação automática ativa">
                     <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
                     Auto
                   </span>`
                : `<span class="pill pill-auto-off" title="Renovação manual">Manual</span>`}
            </div>
          </div>
          <span class="sub-status st-${s.status}">${STATUS_LABELS[s.status]}</span>
        </header>

        <div class="sub-body">
          <div class="sub-highlight ${billClass}">
            <span class="lbl">${s.status === 'cancelada' || s.status === 'suspensa' ? 'Situação' : 'Próxima cobrança'}</span>
            <span class="val">${billText}</span>
          </div>

          <div class="sub-info-grid">
            <div class="sub-info-item">
              <span class="lbl">Valor</span>
              <span class="val">${formatCurrency(s.value)} <span style="font-weight:500;color:var(--text-muted);font-size:11px">${PERIOD_SHORT[s.periodicity]}</span></span>
            </div>
            <div class="sub-info-item">
              <span class="lbl">Telas</span>
              <span class="val">${s.screens} ${s.screens === 1 ? 'tela' : 'telas'}</span>
            </div>
            <div class="sub-info-item">
              <span class="lbl">Contratada em</span>
              <span class="val">${formatDate(s.contractDate)}</span>
            </div>
            <div class="sub-info-item">
              <span class="lbl">Vencimento</span>
              <span class="val">${formatDate(s.dueDate)}</span>
            </div>
          </div>

          <div class="sub-auto ${s.autoRenew ? '' : 'is-off'}">
            ${s.autoRenew
              ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.7"/><path d="M21 4v5h-5"/></svg>
                 <span>Renovação automática <strong>ativada</strong></span>`
              : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16v.01"/></svg>
                 <span>Renovação manual</span>`}
          </div>
        </div>

        <footer class="sub-card-foot">
          <button class="btn btn-ghost" data-action="details">Detalhes</button>
          ${canRenew ? `<button class="btn btn-primary" data-action="renew">Renovar</button>` : ''}
          ${canChange ? `<button class="btn btn-ghost" data-action="plan">Alterar plano</button>` : ''}
          ${showMore ? `
            <div class="dropdown" style="flex:0 0 34px">
              <button class="btn btn-ghost" style="flex:0 0 34px;padding:0" data-action="more" aria-label="Mais ações">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5.5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="18.5" r="1.6"/></svg>
              </button>
              <div class="dropdown-menu" style="min-width:160px">
                ${canReact ? `<button data-sub-action="reactivate">Reativar</button>` : ''}
                ${canCancel ? `<button data-sub-action="cancel" class="danger">Cancelar</button>` : ''}
              </div>
            </div>
          ` : ''}
        </footer>
      </article>
    `;
  }

  // ============ PAGINAÇÃO ============
  function renderPagination(totalPages) {
    const pagin = $('#pagination');
    if (totalPages <= 1) { pagin.innerHTML = ''; return; }

    const pages = [`<button data-page="prev" ${state.page === 1 ? 'disabled' : ''}>Anterior</button>`];
    const maxVisible = 5;
    let start = Math.max(1, state.page - 2);
    let end   = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    if (start > 1) {
      pages.push(`<button data-page="1">1</button>`);
      if (start > 2) pages.push(`<span style="color:var(--text-dim);padding:0 4px">…</span>`);
    }
    for (let i = start; i <= end; i++) {
      pages.push(`<button data-page="${i}" class="${i === state.page ? 'is-active' : ''}">${i}</button>`);
    }
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(`<span style="color:var(--text-dim);padding:0 4px">…</span>`);
      pages.push(`<button data-page="${totalPages}">${totalPages}</button>`);
    }
    pages.push(`<button data-page="next" ${state.page === totalPages ? 'disabled' : ''}>Próxima</button>`);

    pagin.innerHTML = pages.join('');

    $$('#pagination button').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.page;
        if (p === 'prev') state.page = Math.max(1, state.page - 1);
        else if (p === 'next') state.page = Math.min(totalPages, state.page + 1);
        else state.page = parseInt(p, 10);
        renderList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function syncChips() {
    $$('#filterChips .chip').forEach(c => {
      c.classList.toggle('is-active', c.dataset.filter === state.filter);
    });
  }

  // ============ DETALHES ============
  let activeTab = 'overview';

  function openDetails(subId) {
    const s = SUBS_DATA.find(x => x.id === subId);
    if (!s) return;

    activeTab = 'overview';
    renderDetailsContent(s);

    $('#detailsModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function renderDetailsContent(s) {
    const body = $('#detailsBody');

    const canRenew  = s.status === 'vencida' || s.status === 'proxima';
    const canChange = s.status === 'ativa' || s.status === 'proxima' || s.status === 'suspensa';
    const canReact  = s.status === 'suspensa';
    const canCancel = s.status !== 'cancelada';

    body.innerHTML = `
      <div class="detail-head">
        <div class="sub-platform-icon" style="--c:${s.platformColor}">${initialOf(s.platform)}</div>
        <div>
          <h2>${s.platform}</h2>
          <div class="sub-meta">
            <span>${s.plan}</span>
            <span class="dot">·</span>
            <span class="pill">${PERIOD_LABELS[s.periodicity]}</span>
            <span class="dot">·</span>
            <span class="sub-status st-${s.status}" style="padding:2px 8px;font-size:10.5px">${STATUS_LABELS[s.status]}</span>
          </div>
        </div>
      </div>

      <nav class="detail-tabs" id="detailTabs">
        <button class="detail-tab ${activeTab === 'overview' ? 'is-active' : ''}" data-tab="overview">Visão geral</button>
        <button class="detail-tab ${activeTab === 'payments' ? 'is-active' : ''}" data-tab="payments">Pagamentos (${s.paymentHistory.length})</button>
        <button class="detail-tab ${activeTab === 'renewals' ? 'is-active' : ''}" data-tab="renewals">Renovações (${s.renewalHistory.length})</button>
        <button class="detail-tab ${activeTab === 'history' ? 'is-active' : ''}" data-tab="history">Histórico</button>
      </nav>

      <!-- OVERVIEW -->
      <div class="detail-panel ${activeTab === 'overview' ? 'is-active' : ''}" data-panel="overview">
        <div class="detail-grid">
          <div class="detail-item"><span class="lbl">Plano</span><span class="val">${s.plan}</span></div>
          <div class="detail-item"><span class="lbl">Telas</span><span class="val">${s.screens} ${s.screens === 1 ? 'tela' : 'telas'}</span></div>
          <div class="detail-item"><span class="lbl">Valor</span><span class="val">${formatCurrency(s.value)} ${PERIOD_SHORT[s.periodicity]}</span></div>
          <div class="detail-item"><span class="lbl">Periodicidade</span><span class="val">${PERIOD_LABELS[s.periodicity]}</span></div>
          <div class="detail-item"><span class="lbl">Contratada em</span><span class="val">${formatDate(s.contractDate)}</span></div>
          <div class="detail-item"><span class="lbl">Início</span><span class="val">${formatDate(s.startDate)}</span></div>
          <div class="detail-item"><span class="lbl">Vencimento</span><span class="val">${formatDate(s.dueDate)}</span></div>
          <div class="detail-item"><span class="lbl">Próxima cobrança</span><span class="val">${formatDate(s.nextBillingDate)}</span></div>
        </div>

        <div class="detail-config">
          <div class="config-body">
            <h4>Renovação automática</h4>
            <p>${s.autoRenew
              ? 'Sua assinatura será renovada automaticamente ao final de cada período. Você autorizou essa renovação.'
              : 'Sua assinatura <strong>não</strong> será renovada automaticamente. Você precisa renovar manualmente ao final de cada período.'}</p>
          </div>
          <div class="config-value">
            <label class="toggle">
              <input type="checkbox" id="autoRenewToggle" ${s.autoRenew ? 'checked' : ''} />
              <span class="toggle-track"></span>
            </label>
          </div>
        </div>

        <div class="detail-config">
          <div class="config-body">
            <h4>Aviso de vencimento</h4>
            <p>Com quanta antecedência você quer ser avisado antes do vencimento?</p>
          </div>
          <div class="config-value">
            <select id="notifDaysSelect">
              <option value="3"  ${s.notificationDays === 3  ? 'selected' : ''}>3 dias antes</option>
              <option value="7"  ${s.notificationDays === 7  ? 'selected' : ''}>7 dias antes</option>
              <option value="15" ${s.notificationDays === 15 ? 'selected' : ''}>15 dias antes</option>
              <option value="30" ${s.notificationDays === 30 ? 'selected' : ''}>30 dias antes</option>
            </select>
          </div>
        </div>
      </div>

      <!-- PAYMENTS -->
      <div class="detail-panel ${activeTab === 'payments' ? 'is-active' : ''}" data-panel="payments">
        ${s.paymentHistory.length === 0
          ? `<div class="mini-empty">Nenhum pagamento registrado ainda.</div>`
          : `<div class="mini-list">
               ${s.paymentHistory.map(p => `
                 <div class="mini-row">
                   <div class="mr-left">
                     <span class="mr-title">${formatDate(p.date)}</span>
                     <span class="mr-sub">${p.method}</span>
                   </div>
                   <div class="mr-right">
                     <span class="mini-tag ${p.status === 'aprovado' ? 'ok' : p.status === 'recusado' ? 'err' : 'warn'}">${PAYMENT_STATUS_LABELS[p.status]}</span>
                     <span class="mr-value">${formatCurrency(p.value)}</span>
                   </div>
                 </div>
               `).join('')}
             </div>`}
      </div>

      <!-- RENEWALS -->
      <div class="detail-panel ${activeTab === 'renewals' ? 'is-active' : ''}" data-panel="renewals">
        ${s.renewalHistory.length === 0
          ? `<div class="mini-empty">Nenhuma renovação registrada ainda.</div>`
          : `<div class="mini-list">
               ${s.renewalHistory.map(r => `
                 <div class="mini-row">
                   <div class="mr-left">
                     <span class="mr-title">${formatDate(r.date)}</span>
                     <span class="mr-sub">Período: ${r.period}</span>
                   </div>
                   <div class="mr-right">
                     <span class="mr-value">${formatCurrency(r.value)}</span>
                   </div>
                 </div>
               `).join('')}
             </div>`}
      </div>

      <!-- HISTORY -->
      <div class="detail-panel ${activeTab === 'history' ? 'is-active' : ''}" data-panel="history">
        <div class="timeline">
          ${s.history.slice().reverse().map((h, i) => `
            <div class="timeline-item ${i === 0 ? 'is-current' : ''}">
              <div class="t-date">${formatDate(h.date)}</div>
              <div class="t-action">${h.action}</div>
              <div class="t-detail">${h.detail}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Ações -->
      <div class="modal-actions" style="margin-top:22px">
        ${canRenew  ? `<button class="btn btn-primary" data-modal-action="renew">Renovar assinatura</button>` : ''}
        ${canChange ? `<button class="btn btn-ghost" data-modal-action="plan">Alterar plano</button>` : ''}
        ${canReact  ? `<button class="btn btn-ghost" data-modal-action="reactivate">Reativar</button>` : ''}
        ${canCancel ? `<button class="btn btn-ghost" data-modal-action="cancel" style="color:var(--err)">Cancelar assinatura</button>` : ''}
        <button class="btn btn-ghost" data-close>Fechar</button>
      </div>
    `;

    bindDetailEvents(s);
  }

  function bindDetailEvents(s) {
    // Tabs
    $$('#detailTabs .detail-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        $$('#detailTabs .detail-tab').forEach(t => t.classList.toggle('is-active', t === tab));
        $$('.detail-panel').forEach(p => p.classList.toggle('is-active', p.dataset.panel === activeTab));
      });
    });

    // Auto-renew toggle
    const toggle = $('#autoRenewToggle');
    if (toggle) {
      toggle.addEventListener('change', () => {
        if (toggle.checked) {
          // Confirmação ao ativar
          toggle.checked = false;
          openConfirm({
            icon: 'warn',
            title: 'Ativar renovação automática?',
            text: 'Ao ativar, a assinatura será renovada automaticamente ao final de cada período, gerando nova cobrança sem aviso prévio a cada ciclo. Você pode desativar quando quiser.',
            confirmLabel: 'Sim, ativar',
            confirmClass: 'btn-primary',
            onConfirm: () => {
              s.autoRenew = true;
              s.history.push({ date: todayISO(), action: 'Renovação automática ativada', detail: 'Autorizada pelo cliente' });
              toast('Renovação automática ativada.', 'success');
              renderDetailsContent(s);
            },
          });
        } else {
          s.autoRenew = false;
          s.history.push({ date: todayISO(), action: 'Renovação automática desativada', detail: 'Desativada pelo cliente' });
          toast('Renovação automática desativada. Você precisará renovar manualmente.', 'info');
          renderDetailsContent(s);
        }
      });
    }

    // Notification days
    const notifSel = $('#notifDaysSelect');
    if (notifSel) {
      notifSel.addEventListener('change', () => {
        s.notificationDays = parseInt(notifSel.value, 10);
        toast(`Aviso configurado para ${s.notificationDays} dias antes.`, 'success');
      });
    }

    // Ações
    $$('[data-modal-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.modalAction;
        closeAllModals();
        if (action === 'renew')       openRenew(s.id);
        else if (action === 'plan')   openPlanChange(s.id);
        else if (action === 'cancel') openCancel(s.id);
        else if (action === 'reactivate') openReactivate(s.id);
      });
    });
  }

  // ============ RENOVAÇÃO ============
  function openRenew(subId) {
    const s = SUBS_DATA.find(x => x.id === subId);
    if (!s) return;

    const newDue = addPeriod(s.nextBillingDate > s.dueDate ? s.nextBillingDate : s.dueDate, s.periodicity);

    $('#renewBody').innerHTML = `
      <div class="renew-hero">
        <div class="sub-platform-icon" style="--c:${s.platformColor}">${initialOf(s.platform)}</div>
        <h3>Renovar ${s.platform}</h3>
        <p>${s.plan}</p>
      </div>

      <div class="renew-summary">
        <div class="row"><span class="k">Período</span><span class="v">${PERIOD_LABELS[s.periodicity]}</span></div>
        <div class="row"><span class="k">Novo vencimento</span><span class="v">${formatDateLong(newDue)}</span></div>
        <div class="row"><span class="k">Forma de pagamento</span><span class="v">PIX</span></div>
        <div class="row is-total"><span class="k">Total</span><span class="v">${formatCurrency(s.value)}</span></div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="confirmRenew">Confirmar renovação</button>
      </div>
    `;

    $('#renewModal').hidden = false;
    document.body.style.overflow = 'hidden';

    $('#confirmRenew').addEventListener('click', () => {
      // Simula pagamento aprovado
      s.status = 'ativa';
      s.dueDate = newDue;
      s.nextBillingDate = newDue;
      s.paymentHistory.unshift({
        date: todayISO(),
        value: s.value,
        method: 'PIX',
        status: 'aprovado',
      });
      s.renewalHistory.unshift({
        date: todayISO(),
        value: s.value,
        period: PERIOD_LABELS[s.periodicity],
      });
      s.history.push({
        date: todayISO(),
        action: 'Assinatura renovada',
        detail: `Renovada até ${formatDate(newDue)} — pagamento via PIX`,
      });

      closeAllModals();
      renderSummary();
      renderList();
      renderNotifications();
      toast(`Assinatura renovada até ${formatDate(newDue)}.`, 'success');
    });
  }

  // ============ ALTERAR PLANO ============
  let selectedPlan = null;

  function openPlanChange(subId) {
    const s = SUBS_DATA.find(x => x.id === subId);
    if (!s) return;
    selectedPlan = null;

    const plans = s.availablePlans || [];

    $('#planBody').innerHTML = `
      <h2 class="modal-title">Alterar plano</h2>
      <p class="modal-text">Escolha um novo plano para <strong>${s.platform}</strong>. A alteração será aplicada no próximo ciclo.</p>

      <div class="plan-options" id="planOptions">
        ${plans.map(p => {
          const isCurrent = p.name === s.plan;
          return `
            <button class="plan-option ${isCurrent ? 'is-current' : ''}" data-plan='${JSON.stringify(p)}' ${isCurrent ? 'disabled' : ''}>
              <span class="po-radio"></span>
              <div class="po-body">
                <div class="po-title">${p.name} ${isCurrent ? '<span style="font-size:10px;color:var(--text-dim);font-weight:600">(atual)</span>' : ''}</div>
                <div class="po-sub">${p.screens} ${p.screens === 1 ? 'tela' : 'telas'} · ${PERIOD_LABELS[p.periodicity]}</div>
              </div>
              <div class="po-price">
                ${formatCurrency(p.value)}
                <small>${PERIOD_SHORT[p.periodicity]}</small>
              </div>
            </button>
          `;
        }).join('')}
      </div>

      <div class="plan-notice" id="planNotice" hidden></div>

      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="confirmPlan" disabled>Confirmar alteração</button>
      </div>
    `;

    $('#planModal').hidden = false;
    document.body.style.overflow = 'hidden';

    // Seleção
    $$('#planOptions .plan-option').forEach(btn => {
      if (btn.disabled) return;
      btn.addEventListener('click', () => {
        $$('#planOptions .plan-option').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        selectedPlan = JSON.parse(btn.dataset.plan);
        $('#confirmPlan').disabled = false;

        const diff = selectedPlan.value - s.value;
        const notice = $('#planNotice');
        notice.hidden = false;
        const diffLabel = diff > 0
          ? `<strong>Upgrade:</strong> +${formatCurrency(diff)} ${PERIOD_SHORT[selectedPlan.periodicity]}`
          : diff < 0
            ? `<strong>Downgrade:</strong> ${formatCurrency(Math.abs(diff))} ${PERIOD_SHORT[selectedPlan.periodicity]} a menos`
            : `<strong>Mesmo valor</strong>`;
        notice.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></svg>
          <span>${diffLabel}. A alteração será aplicada no próximo ciclo (${formatDate(s.nextBillingDate)}).</span>
        `;
      });
    });

    // Confirmar
    $('#confirmPlan').addEventListener('click', () => {
      if (!selectedPlan) return;
      const oldPlan = s.plan;
      s.plan = selectedPlan.name;
      s.screens = selectedPlan.screens;
      s.value = selectedPlan.value;
      s.periodicity = selectedPlan.periodicity;
      s.history.push({
        date: todayISO(),
        action: 'Plano alterado',
        detail: `De "${oldPlan}" para "${selectedPlan.name}" — aplicado em ${formatDate(s.nextBillingDate)}`,
      });

      closeAllModals();
      renderSummary();
      renderList();
      toast(`Plano alterado para ${selectedPlan.name}. Será aplicado em ${formatDate(s.nextBillingDate)}.`, 'success');
    });
  }

  // ============ CANCELAR ============
  function openCancel(subId) {
    const s = SUBS_DATA.find(x => x.id === subId);
    if (!s) return;

    openConfirm({
      icon: 'warn',
      title: 'Cancelar assinatura?',
      text: `Você vai cancelar a assinatura de <strong>${s.platform}</strong> (${s.plan}). O acesso continua ativo até o vencimento em <strong>${formatDate(s.dueDate)}</strong> e não será renovado depois disso.`,
      confirmLabel: 'Sim, cancelar',
      confirmClass: 'btn-primary',
      onConfirm: () => {
        s.status = 'cancelada';
        s.autoRenew = false;
        s.history.push({
          date: todayISO(),
          action: 'Assinatura cancelada',
          detail: 'Cancelamento solicitado pelo cliente',
        });
        renderSummary();
        renderList();
        renderNotifications();
        toast(`Assinatura de ${s.platform} cancelada.`, 'warn');
      },
    });
  }

  // ============ REATIVAR ============
  function openReactivate(subId) {
    const s = SUBS_DATA.find(x => x.id === subId);
    if (!s) return;

    openConfirm({
      icon: 'ok',
      title: 'Reativar assinatura?',
      text: `A assinatura de <strong>${s.platform}</strong> volta a ficar ativa imediatamente. A cobrança será retomada no próximo ciclo (${formatDate(s.nextBillingDate)}).`,
      confirmLabel: 'Sim, reativar',
      confirmClass: 'btn-primary',
      onConfirm: () => {
        s.status = 'ativa';
        s.history.push({
          date: todayISO(),
          action: 'Assinatura reativada',
          detail: 'Reativação solicitada pelo cliente',
        });
        renderSummary();
        renderList();
        toast(`Assinatura de ${s.platform} reativada.`, 'success');
      },
    });
  }

  // ============ CONFIRM GENÉRICO ============
  function openConfirm({ icon = 'warn', title, text, confirmLabel, confirmClass, onConfirm }) {
    const iconSvg = {
      warn: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17v.1"/></svg>',
      ok:   '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>',
      err:  '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
    }[icon] || '';

    $('#confirmBody').innerHTML = `
      <div class="confirm-icon confirm-icon-${icon}">${iconSvg}</div>
      <h2 class="modal-title">${title}</h2>
      <p class="modal-text">${text}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Voltar</button>
        <button class="btn ${confirmClass || 'btn-primary'}" id="confirmAction">${confirmLabel}</button>
      </div>
    `;

    $('#confirmModal').hidden = false;
    document.body.style.overflow = 'hidden';

    $('#confirmAction').addEventListener('click', () => {
      closeAllModals();
      onConfirm();
    });
  }

  // ============ EXPORTAÇÃO ============
  function buildRows() {
    return getFiltered().map(s => ({
      'Código':           s.id,
      'Plataforma':       s.platform,
      'Plano':            s.plan,
      'Telas':            s.screens,
      'Valor (R$)':       s.value.toFixed(2).replace('.', ','),
      'Periodicidade':    PERIOD_LABELS[s.periodicity],
      'Contratada em':    formatDate(s.contractDate),
      'Início':           formatDate(s.startDate),
      'Vencimento':       formatDate(s.dueDate),
      'Próxima cobrança': formatDate(s.nextBillingDate),
      'Renov. automática':s.autoRenew ? 'Ativada' : 'Desativada',
      'Status':           STATUS_LABELS[s.status],
    }));
  }

  function exportCSV() {
    const rows = buildRows();
    if (!rows.length) { toast('Nenhuma assinatura para exportar.', 'warn'); return; }
    const headers = Object.keys(rows[0]);
    const escape  = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escape).join(','),
      ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `assinaturas-${todayISO()}.csv`);
    toast('Arquivo CSV gerado com sucesso.', 'success');
  }

  function exportXLSX() {
    const rows = buildRows();
    if (!rows.length) { toast('Nenhuma assinatura para exportar.', 'warn'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 8 },
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assinaturas');
    XLSX.writeFile(wb, `assinaturas-${todayISO()}.xlsx`);
    toast('Planilha Excel gerada com sucesso.', 'success');
  }

  function openEmailModal() {
    $('#emailExport').value = '';
    $('#emailExportError').textContent = '';
    $('#emailExport').classList.remove('is-error');
    $('#emailModal').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#emailExport').focus(), 50);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ============ NOTIFICAÇÕES ============
  function renderNotifications() {
    const list = $('#notifList');

    list.innerHTML = SUB_NOTIFICATIONS.map((n, i) => {
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

    const unread = SUB_NOTIFICATIONS.filter(n => n.unread).length;
    const badge = $('#notifBadge');
    badge.textContent = unread;
    badge.style.display = unread > 0 ? '' : 'none';
  }

  // ============ EVENTOS ============
  function closeAllModals() {
    $$('.modal').forEach(m => m.hidden = true);
    document.body.style.overflow = '';
  }

  function bindEvents() {
    $('#searchInput').addEventListener('input', (e) => {
      state.search = e.target.value;
      state.page = 1;
      renderList();
    });

    $$('#filterChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.filter = chip.dataset.filter;
        state.page = 1;
        syncChips();
        renderList();
      });
    });

    $$('.summary-card').forEach(card => {
      card.addEventListener('click', () => {
        state.filter = card.dataset.filter;
        state.page = 1;
        syncChips();
        renderList();
      });
    });

    $('#sortSelect').addEventListener('change', (e) => {
      state.sort = e.target.value;
      state.page = 1;
      renderList();
    });

    // Delegação na lista
    $('#subsList').addEventListener('click', (e) => {
      const card = e.target.closest('.sub-card');
      if (!card) return;
      const id = card.dataset.id;

      // Ações por botão
      const mainBtn = e.target.closest('[data-action]');
      if (mainBtn) {
        const action = mainBtn.dataset.action;
        if (action === 'details') return openDetails(id);
        if (action === 'renew')   return openRenew(id);
        if (action === 'plan')    return openPlanChange(id);
        if (action === 'more') {
          const parent = mainBtn.closest('.dropdown');
          const isOpen = parent.classList.toggle('is-open');
          mainBtn.setAttribute('aria-expanded', String(isOpen));
          e.stopPropagation();
          return;
        }
      }

      // Ações do dropdown
      const subBtn = e.target.closest('[data-sub-action]');
      if (subBtn) {
        const a = subBtn.dataset.subAction;
        if (a === 'cancel')     return openCancel(id);
        if (a === 'reactivate') return openReactivate(id);
      }
    });

    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        $$('.dropdown.is-open').forEach(d => d.classList.remove('is-open'));
      }
    });

    // Fechar modais
    $$('[data-close]').forEach(el => {
      el.addEventListener('click', closeAllModals);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllModals();
    });

    // Exportar
    const exportBtn  = $('#exportBtn');
    const exportMenu = $('#exportMenu');
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = exportBtn.closest('.dropdown');
      const isOpen = parent.classList.toggle('is-open');
      exportBtn.setAttribute('aria-expanded', String(isOpen));
    });
    exportMenu.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-export]');
      if (!btn) return;
      exportBtn.closest('.dropdown').classList.remove('is-open');
      exportBtn.setAttribute('aria-expanded', 'false');
      const t = btn.dataset.export;
      if (t === 'csv')  exportCSV();
      else if (t === 'xlsx') exportXLSX();
      else if (t === 'email') openEmailModal();
    });

    // Form e-mail
    $('#emailForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('#emailExport');
      const err   = $('#emailExportError');
      const val   = input.value.trim();
      err.textContent = '';
      input.classList.remove('is-error');

      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(val)) {
        err.textContent = 'Informe um e-mail válido.';
        input.classList.add('is-error');
        input.focus();
        return;
      }

      $('#emailModal').hidden = true;
      document.body.style.overflow = '';
      toast(`Solicitação registrada. A planilha será enviada para ${val}.`, 'success');
      input.value = '';
    });

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
      const n = SUB_NOTIFICATIONS[idx];
      if (n) {
        n.unread = false;
        renderNotifications();
        if (n.ref) openDetails(n.ref);
      }
      notifBtn.closest('.dropdown').classList.remove('is-open');
      notifBtn.setAttribute('aria-expanded', 'false');
    });

    $('#notifMarkAll').addEventListener('click', (e) => {
      e.stopPropagation();
      SUB_NOTIFICATIONS.forEach(n => n.unread = false);
      renderNotifications();
    });
  }

  // ============ INIT ============
  function init() {
    renderSummary();
    renderList();
    renderNotifications();
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
