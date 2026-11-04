/* ============================================================
   MEUS PEDIDOS — lógica da página
   ============================================================ */

(function () {
  // ============ ESTADO ============
  const state = {
    search: '',
    filter: 'todos',
    sort: 'purchaseDate-desc',
    page: 1,
    perPage: 6,
    dateFrom: null,   // 'YYYY-MM-DD'
    dateTo: null,     // 'YYYY-MM-DD'
    dateQuick: null,  // 'today' | '7' | '30' | '90' | 'all' | null
  };

  const STATUS_LABELS = {
    pendente:         'Pendente',
    aprovado:         'Aprovado',
    em_processamento: 'Em processamento',
    concluido:        'Concluído',
    cancelado:        'Cancelado',
    reembolsado:      'Reembolsado',
  };

  const PAYMENT_LABELS = {
    aprovado:  'Pago',
    pendente:  'Aguardando pagto',
    recusado:  'Recusado',
    estornado: 'Estornado',
  };

  // ============ HELPERS ============
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('pt-BR');
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  function formatShortDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  function formatCurrency(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function initialOf(name) {
    return name.charAt(0).toUpperCase();
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
    const stack = document.getElementById('toastStack');
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

  // ============ FILTRAGEM / ORDENAÇÃO ============
  function getFiltered() {
    let list = [...ORDERS_DATA];

    // Busca
    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      list = list.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.product.toLowerCase().includes(q) ||
        o.platform.toLowerCase().includes(q)
      );
    }

    // Filtro de status do pedido
    if (state.filter !== 'todos') {
      list = list.filter(o => o.orderStatus === state.filter);
    }

    // Filtro de data
    if (state.dateFrom || state.dateTo) {
      list = list.filter(o => {
        const day = o.purchaseDate.slice(0, 10); // YYYY-MM-DD
        if (state.dateFrom && day < state.dateFrom) return false;
        if (state.dateTo   && day > state.dateTo)   return false;
        return true;
      });
    }

    // Ordenação
    const [key, dir] = state.sort.split('-');
    const mult = dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let va = a[key], vb = b[key];
      if (key === 'orderStatus') { va = STATUS_LABELS[va] || va; vb = STATUS_LABELS[vb] || vb; }
      if (typeof va === 'string') return va.localeCompare(vb) * mult;
      return (va - vb) * mult;
    });

    return list;
  }

  // ============ RENDER — RESUMO ============
  function renderSummary() {
    const counts = { aprovado: 0, pendente: 0, em_processamento: 0, concluido: 0, cancelado: 0, reembolsado: 0 };
    ORDERS_DATA.forEach(o => { counts[o.orderStatus] = (counts[o.orderStatus] || 0) + 1; });

    $('#sumTotal').textContent         = ORDERS_DATA.length;
    $('#sumAprovado').textContent      = counts.aprovado;
    $('#sumPendente').textContent      = counts.pendente;
    $('#sumProcessando').textContent   = counts.em_processamento;
    $('#sumConcluido').textContent     = counts.concluido;
    $('#sumCancelado').textContent     = counts.cancelado;
  }

  // ============ RENDER — LISTA ============
  function renderList() {
    const grid  = $('#ordersList');
    const empty = $('#emptyState');
    const pagin = $('#pagination');

    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.perPage));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.perPage;
    const pageItems = filtered.slice(start, start + state.perPage);

    // Estado vazio
    if (filtered.length === 0) {
      grid.innerHTML = '';
      pagin.innerHTML = '';
      empty.hidden = false;

      const noData = ORDERS_DATA.length === 0;
      const hasFilters = state.search || state.filter !== 'todos' || state.dateFrom || state.dateTo;

      $('#emptyTitle').textContent = noData ? 'Você ainda não fez nenhum pedido' : 'Nenhum pedido encontrado';
      $('#emptyText').textContent  = noData
        ? 'Quando você fizer uma compra, ela aparecerá aqui.'
        : 'Tente ajustar a busca, os filtros ou o período.';
      $('#emptyAction').textContent = hasFilters ? 'Limpar filtros' : 'Ir para o catálogo';

      $('#emptyAction').onclick = (e) => {
        e.preventDefault();
        if (hasFilters) {
          state.search = '';
          state.filter = 'todos';
          state.dateFrom = null;
          state.dateTo = null;
          state.dateQuick = null;
          state.page = 1;
          $('#searchInput').value = '';
          syncChips();
          updateDateTag();
          renderList();
        } else {
          window.location.href = 'catalogo.html';
        }
      };
      return;
    }

    empty.hidden = true;

    // Renderiza cards
    grid.innerHTML = pageItems.map(order => renderOrderCard(order)).join('');

    renderPagination(totalPages);
  }

  function renderOrderCard(o) {
    // Ações condicionais
    const canPay   = o.paymentStatus === 'pendente' && o.orderStatus === 'pendente';
    const canCancel = o.orderStatus === 'pendente' || o.orderStatus === 'aprovado';
    const canRebuy = ['concluido', 'cancelado', 'reembolsado'].includes(o.orderStatus);
    const hasReceipt = o.paymentStatus === 'aprovado' || o.paymentStatus === 'estornado';

    const payClass = `pay-${o.paymentStatus}`;
    const ordClass = `ord-${o.orderStatus}`;

    return `
      <article class="order-card" data-id="${o.id}">
        <header class="order-card-head">
          <div class="order-platform-icon" style="--c:${o.platformColor}">${initialOf(o.platform)}</div>
          <div class="order-title">
            <h3>${o.product}</h3>
            <div class="order-meta">
              <span>${o.id}</span>
              <span class="sep">·</span>
              <span class="date">${formatShortDate(o.purchaseDate)}</span>
            </div>
          </div>
        </header>

        <div class="order-body">
          <div class="status-row">
            <span class="badge-status ${payClass}">${PAYMENT_LABELS[o.paymentStatus]}</span>
            <span class="badge-status ${ordClass}">${STATUS_LABELS[o.orderStatus]}</span>
          </div>

          <div class="order-info-grid">
            <div class="order-info-item">
              <span class="lbl">Telas</span>
              <span class="val">${o.screens} ${o.screens === 1 ? 'tela' : 'telas'}</span>
            </div>
            <div class="order-info-item">
              <span class="lbl">Pagamento</span>
              <span class="val">${o.paymentMethod}</span>
            </div>
            <div class="order-info-item is-highlight">
              <span class="lbl">Total</span>
              <span class="val">${formatCurrency(o.value)}</span>
            </div>
          </div>
        </div>

        <footer class="order-card-foot">
          <button class="btn btn-ghost" data-action="details">Detalhes</button>
          ${hasReceipt ? `<button class="btn btn-ghost" data-action="receipt">Comprovante</button>` : ''}
          ${canPay   ? `<button class="btn btn-primary" data-action="pay">Pagar</button>` : ''}
          ${canCancel && !canPay ? `<button class="btn btn-ghost" data-action="cancel">Cancelar</button>` : ''}
          ${canRebuy ? `<button class="btn btn-primary" data-action="rebuy">Comprar novamente</button>` : ''}
        </footer>
      </article>
    `;
  }

  // ============ PAGINAÇÃO ============
  function renderPagination(totalPages) {
    const pagin = $('#pagination');
    if (totalPages <= 1) { pagin.innerHTML = ''; return; }

    const pages = [];
    pages.push(`<button data-page="prev" ${state.page === 1 ? 'disabled' : ''}>Anterior</button>`);

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
  function openDetails(orderId) {
    const o = ORDERS_DATA.find(x => x.id === orderId);
    if (!o) return;

    const body = $('#detailsBody');
    const canPay = o.paymentStatus === 'pendente' && o.orderStatus === 'pendente';
    const canRebuy = ['concluido', 'cancelado', 'reembolsado'].includes(o.orderStatus);

    body.innerHTML = `
      <div class="detail-head">
        <div class="order-platform-icon" style="--c:${o.platformColor}">${initialOf(o.platform)}</div>
        <div>
          <h2>${o.product}</h2>
          <div class="order-meta">
            <span>${o.id}</span>
            <span class="sep">·</span>
            <span class="date">${formatDateTime(o.purchaseDate)}</span>
          </div>
        </div>
      </div>

      <div class="detail-status-pair">
        <div class="detail-status-box">
          <span class="lbl">Pagamento</span>
          <span class="badge-status pay-${o.paymentStatus}">${PAYMENT_LABELS[o.paymentStatus]}</span>
        </div>
        <div class="detail-status-box">
          <span class="lbl">Pedido</span>
          <span class="badge-status ord-${o.orderStatus}">${STATUS_LABELS[o.orderStatus]}</span>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-item"><span class="lbl">Plataforma</span><span class="val">${o.platform}</span></div>
        <div class="detail-item"><span class="lbl">Telas</span><span class="val">${o.screens} ${o.screens === 1 ? 'tela' : 'telas'}</span></div>
        <div class="detail-item"><span class="lbl">Forma de pagamento</span><span class="val">${o.paymentMethod}</span></div>
        <div class="detail-item"><span class="lbl">Valor total</span><span class="val">${formatCurrency(o.value)}</span></div>
        <div class="detail-item" style="grid-column: 1 / -1"><span class="lbl">E-mail de entrega</span><span class="val">${o.deliveryEmail}</span></div>
        ${o.deliveredAt ? `<div class="detail-item" style="grid-column: 1 / -1"><span class="lbl">Entregue em</span><span class="val">${formatDateTime(o.deliveredAt)}</span></div>` : ''}
      </div>

      <p class="detail-section-title">Histórico do pedido</p>
      <div class="timeline">
        ${o.history.slice().reverse().map((h, i) => `
          <div class="timeline-item ${i === 0 ? 'is-current' : ''}">
            <div class="t-date">${formatDateTime(h.date)}</div>
            <div class="t-action">${h.action}</div>
            <div class="t-detail">${h.detail}</div>
          </div>
        `).join('')}
      </div>

      <div class="modal-actions">
        ${canPay   ? `<button class="btn btn-primary" data-modal-action="pay" data-id="${o.id}">Continuar pagamento</button>` : ''}
        ${canRebuy ? `<button class="btn btn-primary" data-modal-action="rebuy" data-id="${o.id}">Comprar novamente</button>` : ''}
        <button class="btn btn-ghost" data-close>Fechar</button>
      </div>
    `;

    $('#detailsModal').hidden = false;
    document.body.style.overflow = 'hidden';

    // Ações dentro do modal
    body.querySelectorAll('[data-modal-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.modalAction;
        const id = btn.dataset.id;
        closeAllModals();
        if (action === 'pay') openPayment(id);
        else if (action === 'rebuy') rebuy(id);
      });
    });
  }

  // ============ COMPROVANTE ============
  function openReceipt(orderId) {
    const o = ORDERS_DATA.find(x => x.id === orderId);
    if (!o) return;

    $('#receiptBody').innerHTML = `
      <div class="receipt">
        <div class="receipt-head">
          <div class="brand-mark">S</div>
          <h3>Comprovante de compra</h3>
          <p>STREAMLY · ${o.id}</p>
        </div>

        <div class="receipt-row"><span class="k">Produto</span><span class="v">${o.product}</span></div>
        <div class="receipt-row"><span class="k">Plataforma</span><span class="v">${o.platform}</span></div>
        <div class="receipt-row"><span class="k">Quantidade de telas</span><span class="v">${o.screens}</span></div>
        <div class="receipt-row"><span class="k">Data da compra</span><span class="v">${formatDateTime(o.purchaseDate)}</span></div>
        <div class="receipt-row"><span class="k">Forma de pagamento</span><span class="v">${o.paymentMethod}</span></div>
        <div class="receipt-row"><span class="k">Status do pagamento</span><span class="v">${PAYMENT_LABELS[o.paymentStatus]}</span></div>
        <div class="receipt-row"><span class="k">E-mail de entrega</span><span class="v">${o.deliveryEmail}</span></div>

        <div class="receipt-total">
          <span class="k">VALOR TOTAL</span>
          <span class="v">${formatCurrency(o.value)}</span>
        </div>

        <div class="receipt-actions">
          <button class="btn btn-ghost" data-close>Fechar</button>
          <button class="btn btn-primary" id="downloadReceipt">Baixar comprovante</button>
        </div>
      </div>
    `;

    $('#receiptModal').hidden = false;
    document.body.style.overflow = 'hidden';

    $('#downloadReceipt').addEventListener('click', () => {
      downloadReceiptTxt(o);
      toast('Comprovante baixado com sucesso.', 'success');
    });
  }

  function downloadReceiptTxt(o) {
    const lines = [
      '========================================',
      '         STREAMLY — COMPROVANTE         ',
      '========================================',
      `Pedido:            ${o.id}`,
      `Produto:           ${o.product}`,
      `Plataforma:        ${o.platform}`,
      `Telas:             ${o.screens}`,
      `Data da compra:    ${formatDateTime(o.purchaseDate)}`,
      `Pagamento:         ${o.paymentMethod}`,
      `Status pagamento:  ${PAYMENT_LABELS[o.paymentStatus]}`,
      `Status do pedido:  ${STATUS_LABELS[o.orderStatus]}`,
      `E-mail de entrega: ${o.deliveryEmail}`,
      '----------------------------------------',
      `VALOR TOTAL:       ${formatCurrency(o.value)}`,
      '========================================',
      `Emitido em ${formatDateTime(new Date().toISOString())}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `comprovante-${o.id}.txt`);
  }

  // ============ PAGAMENTO PENDENTE ============
  let payTimerInterval = null;

  function openPayment(orderId) {
    const o = ORDERS_DATA.find(x => x.id === orderId);
    if (!o) return;

    const pixCode = `00020126580014BR.GOV.BCB.PIX0136${o.id}-${Date.now()}5204000053039865802BR5913STREAMLY PIX6009SAO PAULO62070503***6304ABCD`;

    $('#paymentBody').innerHTML = `
      <div class="pay-header">
        <div class="pay-header-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>
        </div>
        <div>
          <h3>Aguardando pagamento</h3>
          <p>Pague via PIX para liberar o produto</p>
        </div>
      </div>

      <div class="qr-wrap">
        ${generateQRPlaceholder()}
      </div>

      <div class="pix-code">
        <span class="code" id="pixCode">${pixCode}</span>
        <button class="btn btn-ghost" id="copyPix">Copiar</button>
      </div>

      <div class="pay-timer">
        Expira em <strong id="payTimer">15:00</strong>
      </div>

      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="simulatePay">Já paguei</button>
      </div>
    `;

    $('#paymentModal').hidden = false;
    document.body.style.overflow = 'hidden';

    // Copiar PIX
    $('#copyPix').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pixCode);
        toast('Código PIX copiado.', 'success');
      } catch {
        toast('Não foi possível copiar. Selecione manualmente.', 'warn');
      }
    });

    // Timer
    let seconds = 15 * 60;
    const tick = () => {
      seconds--;
      if (seconds < 0) seconds = 0;
      const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
      const ss = String(seconds % 60).padStart(2, '0');
      const el = $('#payTimer');
      if (el) el.textContent = `${mm}:${ss}`;
      if (seconds === 0) clearInterval(payTimerInterval);
    };
    clearInterval(payTimerInterval);
    payTimerInterval = setInterval(tick, 1000);

    // Simular pagamento
    $('#simulatePay').addEventListener('click', () => {
      clearInterval(payTimerInterval);
      // Atualiza o estado do pedido (mock)
      o.paymentStatus = 'aprovado';
      o.orderStatus = 'aprovado';
      o.history.push({
        date: new Date().toISOString().slice(0, 16),
        action: 'Pagamento aprovado',
        detail: 'PIX confirmado pela instituição financeira',
      });

      closeAllModals();
      renderSummary();
      renderList();
      toast(`Pagamento aprovado! Pedido ${o.id} liberado.`, 'success');
      addNotification({
        type: 'ok',
        title: `Pedido ${o.id} aprovado`,
        sub: `${o.platform} — pagamento confirmado`,
      });
    });
  }

  function generateQRPlaceholder() {
    // QR ilustrativo (padrão visual) — em produção, gerar via backend
    const size = 168;
    const cell = 6;
    const cells = size / cell;
    let rects = '';
    // padrão pseudo-aleatório determinístico
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const v = (x * 7 + y * 13 + x * y * 3) % 5;
        if (v < 2) rects += `<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}" fill="#000"/>`;
      }
    }
    // marcadores de canto
    const corner = (cx, cy) => `
      <rect x="${cx}" y="${cy}" width="${cell*7}" height="${cell*7}" fill="#000"/>
      <rect x="${cx+cell}" y="${cy+cell}" width="${cell*5}" height="${cell*5}" fill="#fff"/>
      <rect x="${cx+cell*2}" y="${cy+cell*2}" width="${cell*3}" height="${cell*3}" fill="#000"/>
    `;
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <rect width="${size}" height="${size}" fill="#fff"/>
        ${rects}
        ${corner(0, 0)}
        ${corner(size - cell*7, 0)}
        ${corner(0, size - cell*7)}
      </svg>
    `;
  }

  // ============ CANCELAR PEDIDO ============
  function openCancelConfirm(orderId) {
    const o = ORDERS_DATA.find(x => x.id === orderId);
    if (!o) return;

    $('#cancelTitle').textContent = `Cancelar pedido ${o.id}?`;
    $('#cancelText').textContent  = o.paymentStatus === 'aprovado'
      ? 'O pagamento já foi aprovado. Se o produto ainda não tiver sido entregue, o valor será estornado conforme as regras da loja.'
      : 'Esta ação não pode ser desfeita.';

    $('#confirmCancel').onclick = () => {
      o.orderStatus = 'cancelado';
      if (o.paymentStatus === 'aprovado') o.paymentStatus = 'estornado';
      o.history.push({
        date: new Date().toISOString().slice(0, 16),
        action: 'Pedido cancelado',
        detail: 'Cancelamento solicitado pelo cliente',
      });

      closeAllModals();
      renderSummary();
      renderList();
      toast(`Pedido ${o.id} cancelado.`, 'warn');
      addNotification({
        type: 'err',
        title: `Pedido ${o.id} cancelado`,
        sub: `${o.platform} — cancelamento confirmado`,
      });
    };

    $('#cancelModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  // ============ COMPRAR NOVAMENTE ============
  function rebuy(orderId) {
    const o = ORDERS_DATA.find(x => x.id === orderId);
    if (!o) return;
    // Em produção: redireciona para a página do produto com o carrinho preenchido
    toast(`Adicionando "${o.product}" ao carrinho...`, 'info');
    setTimeout(() => {
      window.location.href = `catalogo.html?add=${encodeURIComponent(o.id)}`;
    }, 700);
  }

  // ============ FILTRO DE PERÍODO ============
  function updateDateTag() {
    const tag = $('#dateFilterTag');
    const text = $('#dateFilterText');

    if (!state.dateFrom && !state.dateTo) {
      tag.hidden = true;
      $('#calendarLabel').textContent = 'Período';
      return;
    }
    tag.hidden = false;

    if (state.dateQuick) {
      const map = { today: 'Hoje', '7': 'Últimos 7 dias', '30': 'Últimos 30 dias', '90': 'Últimos 90 dias', all: 'Todo o período' };
      text.textContent = map[state.dateQuick] || 'Período personalizado';
      $('#calendarLabel').textContent = map[state.dateQuick] || 'Período';
    } else {
      const fmt = d => { const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; };
      const from = state.dateFrom ? fmt(state.dateFrom) : 'início';
      const to   = state.dateTo   ? fmt(state.dateTo)   : 'hoje';
      text.textContent = `${from} → ${to}`;
      $('#calendarLabel').textContent = 'Período personalizado';
    }
  }

  function openCalendar() {
    const modal = $('#calendarModal');

    // Reset visual
    $('#rangeError').textContent = '';
    $('#dateFrom').value = state.dateFrom || '';
    $('#dateTo').value   = state.dateTo   || '';

    $$('#quickDates .quick-date').forEach(b => {
      b.classList.toggle('is-active', b.dataset.quick === state.dateQuick);
    });

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function applyQuickDate(quick) {
    const today = new Date();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    state.dateQuick = quick;
    if (quick === 'all') {
      state.dateFrom = null;
      state.dateTo = null;
    } else if (quick === 'today') {
      state.dateFrom = iso(today);
      state.dateTo = iso(today);
    } else {
      const days = parseInt(quick, 10);
      const from = new Date(today);
      from.setDate(from.getDate() - days + 1);
      state.dateFrom = iso(from);
      state.dateTo = iso(today);
    }

    $$('#quickDates .quick-date').forEach(b => {
      b.classList.toggle('is-active', b.dataset.quick === quick);
    });

    $('#dateFrom').value = state.dateFrom || '';
    $('#dateTo').value   = state.dateTo   || '';
    $('#rangeError').textContent = '';
  }

  function applyCustomRange() {
    const from = $('#dateFrom').value;
    const to   = $('#dateTo').value;
    const err  = $('#rangeError');
    err.textContent = '';

    if (!from && !to) {
      err.textContent = 'Informe ao menos uma data.';
      return;
    }
    if (from && to && from > to) {
      err.textContent = 'A data inicial não pode ser maior que a final.';
      return;
    }

    state.dateFrom = from || null;
    state.dateTo   = to || null;
    state.dateQuick = null;
    $('#calendarModal').hidden = true;
    document.body.style.overflow = '';
    state.page = 1;
    updateDateTag();
    renderList();
    toast('Filtro de período aplicado.', 'info');
  }

  // ============ EXPORTAÇÃO ============
  function buildRows() {
    const filtered = getFiltered();
    return filtered.map(o => ({
      'Nº do pedido':     o.id,
      'Produto':          o.product,
      'Plataforma':       o.platform,
      'Telas':            o.screens,
      'Valor (R$)':       o.value.toFixed(2).replace('.', ','),
      'Forma de pagto':   o.paymentMethod,
      'Data da compra':   formatDateTime(o.purchaseDate),
      'Status pagamento': PAYMENT_LABELS[o.paymentStatus],
      'Status do pedido': STATUS_LABELS[o.orderStatus],
      'E-mail de entrega':o.deliveryEmail,
    }));
  }

  function exportCSV() {
    const rows = buildRows();
    if (!rows.length) { toast('Nenhum pedido para exportar.', 'warn'); return; }
    const headers = Object.keys(rows[0]);
    const escape  = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escape).join(','),
      ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `meus-pedidos-${todayISO()}.csv`);
    toast('Arquivo CSV gerado com sucesso.', 'success');
  }

  function exportXLSX() {
    const rows = buildRows();
    if (!rows.length) { toast('Nenhum pedido para exportar.', 'warn'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 8 },
      { wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 24 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Meus pedidos');
    XLSX.writeFile(wb, `meus-pedidos-${todayISO()}.xlsx`);
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
    const notifs = ORDER_NOTIFICATIONS.slice(0, 6);

    list.innerHTML = notifs.map((n, i) => `
      <div class="notif-item ${n.unread ? 'is-unread' : ''}" data-notif-index="${i}">
        <div class="notif-item-icon ${n.type}">
          ${n.type === 'ok'
            ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
            : n.type === 'err'
            ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 9 6 6M15 9l-6 6"/></svg>'
            : n.type === 'warn'
            ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5M12 16.2v.1"/><circle cx="12" cy="12" r="9"/></svg>'
            : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></svg>'
          }
        </div>
        <div class="notif-item-body">
          <div class="notif-item-title">${n.title}</div>
          <div class="notif-item-sub">${n.sub}</div>
        </div>
      </div>
    `).join('');

    const unreadCount = ORDER_NOTIFICATIONS.filter(n => n.unread).length;
    const badge = $('#notifBadge');
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? '' : 'none';
  }

  function addNotification(n) {
    ORDER_NOTIFICATIONS.unshift({ ...n, unread: true, ts: new Date().toISOString() });
    renderNotifications();
  }

  // ============ EVENTOS ============
  function closeAllModals() {
    $$('.modal').forEach(m => m.hidden = true);
    document.body.style.overflow = '';
    if (payTimerInterval) { clearInterval(payTimerInterval); payTimerInterval = null; }
  }

  function bindEvents() {
    // Busca
    $('#searchInput').addEventListener('input', (e) => {
      state.search = e.target.value;
      state.page = 1;
      renderList();
    });

    // Chips
    $$('#filterChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.filter = chip.dataset.filter;
        state.page = 1;
        syncChips();
        renderList();
      });
    });

    // Summary cards
    $$('.summary-card').forEach(card => {
      card.addEventListener('click', () => {
        state.filter = card.dataset.filter;
        state.page = 1;
        syncChips();
        renderList();
      });
    });

    // Ordenação
    $('#sortSelect').addEventListener('change', (e) => {
      state.sort = e.target.value;
      state.page = 1;
      renderList();
    });

    // Ações dos cards (delegação)
    $('#ordersList').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.closest('.order-card')?.dataset.id;
      if (!id) return;
      const action = btn.dataset.action;

      if (action === 'details') openDetails(id);
      else if (action === 'receipt') openReceipt(id);
      else if (action === 'pay') openPayment(id);
      else if (action === 'cancel') openCancelConfirm(id);
      else if (action === 'rebuy') rebuy(id);
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
      const type = btn.dataset.export;
      if (type === 'csv')  exportCSV();
      else if (type === 'xlsx') exportXLSX();
      else if (type === 'email') openEmailModal();
    });

    // Form de e-mail
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

    // Período
    $('#calendarBtn').addEventListener('click', openCalendar);
    $('#dateFilterClear').addEventListener('click', () => {
      state.dateFrom = null;
      state.dateTo = null;
      state.dateQuick = null;
      state.page = 1;
      updateDateTag();
      renderList();
    });

    $$('#quickDates .quick-date').forEach(b => {
      b.addEventListener('click', () => applyQuickDate(b.dataset.quick));
    });

    $('#applyRange').addEventListener('click', applyCustomRange);

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
      const n = ORDER_NOTIFICATIONS[idx];
      if (n) {
        n.unread = false;
        renderNotifications();
        if (n.title.includes('PED-')) {
          const idMatch = n.title.match(/PED-\d{4}-\d+/);
          if (idMatch) openDetails(idMatch[0]);
        }
      }
      notifBtn.closest('.dropdown').classList.remove('is-open');
      notifBtn.setAttribute('aria-expanded', 'false');
    });

    $('#notifMarkAll').addEventListener('click', (e) => {
      e.stopPropagation();
      ORDER_NOTIFICATIONS.forEach(n => n.unread = false);
      renderNotifications();
    });
  }

  // ============ INIT ============
  function init() {
    renderSummary();
    renderList();
    renderNotifications();
    updateDateTag();
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
