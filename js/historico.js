/* ============================================================
   HISTÓRICO — lógica
   ============================================================ */

(function () {
  // ============ ESTADO ============
  const state = {
    search: '',
    category: 'todas',
    status: 'todos',
    sort: 'date-desc',
    page: 1,
    perPage: 8,
    dateFrom: null,
    dateTo: null,
    dateQuick: null,
  };

  const CATEGORY_LABELS = {
    compra: 'Compra',
    pagamento: 'Pagamento',
    recarga: 'Recarga',
    renovacao: 'Renovação',
    estorno: 'Estorno',
    ajuste: 'Ajuste',
  };
  const STATUS_LABELS = {
    aprovado: 'Aprovado',
    pendente: 'Pendente',
    recusado: 'Recusado',
    cancelado: 'Cancelado',
  };

  // ============ HELPERS ============
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

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
    return `${formatDate(iso)} às ${formatTime(iso)}`;
  }
  function formatCurrency(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  // ============ FILTROS ============
  function getFiltered() {
    let list = [...HISTORY_DATA];

    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      list = list.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.paymentMethod || '').toLowerCase().includes(q)
      );
    }
    if (state.category !== 'todas') list = list.filter(t => t.category === state.category);
    if (state.status !== 'todos')   list = list.filter(t => t.status === state.status);

    if (state.dateFrom || state.dateTo) {
      list = list.filter(t => {
        const day = t.date.slice(0, 10);
        if (state.dateFrom && day < state.dateFrom) return false;
        if (state.dateTo   && day > state.dateTo)   return false;
        return true;
      });
    }

    const [key, dir] = state.sort.split('-');
    const mult = dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let va = a[key], vb = b[key];
      if (key === 'category') { va = CATEGORY_LABELS[va] || va; vb = CATEGORY_LABELS[vb] || vb; }
      if (typeof va === 'string') return va.localeCompare(vb) * mult;
      return (va - vb) * mult;
    });
    return list;
  }

  // ============ RESUMO ============
  function renderSummary() {
    const all = HISTORY_DATA;
    const entradas = all.filter(t => t.type === 'entrada');
    const saidas   = all.filter(t => t.type === 'saida');
    const sumEntradas = entradas.reduce((s, t) => s + t.value, 0);
    const sumSaidas   = saidas.reduce((s, t) => s + t.value, 0);

    $('#sumTotal').textContent = all.length;
    $('#sumEntradas').textContent = entradas.length;
    $('#sumEntradasValue').textContent = formatCurrency(sumEntradas);
    $('#sumSaidas').textContent = saidas.length;
    $('#sumSaidasValue').textContent = formatCurrency(sumSaidas);
    $('#sumValue').textContent = formatCurrency(sumEntradas + sumSaidas);
  }

  // ============ LISTA ============
  function renderList() {
    const list = $('#historicoList');
    const empty = $('#emptyState');
    const pagin = $('#pagination');
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.perPage));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.perPage;
    const pageItems = filtered.slice(start, start + state.perPage);

    if (filtered.length === 0) {
      list.innerHTML = '';
      pagin.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    list.innerHTML = pageItems.map(renderItem).join('');
    renderPagination(totalPages);
  }

  function renderItem(t) {
    const isIn = t.type === 'entrada';
    const isPending = t.status === 'pendente';
    const isRejected = t.status === 'recusado' || t.status === 'cancelado';

    let iconClass = 'hist-in';
    if (isPending) iconClass = 'hist-pending';
    else if (isRejected) iconClass = 'hist-neutral';
    else iconClass = isIn ? 'hist-in' : 'hist-out';

    const iconSvg = isPending
      ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>'
      : isIn
        ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>'
        : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';

    const valueClass = isPending ? 'pending' : (isRejected ? 'out' : (isIn ? 'in' : 'out'));
    const valueText = (isIn && !isRejected ? '+' : (isRejected ? '' : '−')) + ' ' + formatCurrency(t.value);
    const balanceText = t.balanceAfter != null ? `Saldo: ${formatCurrency(t.balanceAfter)}` : '—';

    return `
      <div class="hist-item" data-id="${t.id}" tabindex="0" role="button">
        <div class="hist-icon ${iconClass}">${iconSvg}</div>
        <div class="hist-body">
          <div class="hist-title">${t.description}</div>
          <div class="hist-meta">
            <span class="hist-id">${t.id}</span>
            <span class="dot">·</span>
            <span>${formatDate(t.date)} ${formatTime(t.date)}</span>
            <span class="dot">·</span>
            <span class="hist-cat">${CATEGORY_LABELS[t.category] || t.category}</span>
            <span class="dot">·</span>
            <span class="hist-status ${t.status}">${STATUS_LABELS[t.status] || t.status}</span>
          </div>
        </div>
        <div class="hist-value ${valueClass}">${valueText}</div>
        <div class="hist-balance"><strong>${balanceText}</strong></div>
        <div class="hist-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>
        </div>
      </div>
    `;
  }

  // ============ PAGINAÇÃO ============
  function renderPagination(totalPages) {
    const pagin = $('#pagination');
    if (totalPages <= 1) { pagin.innerHTML = ''; return; }
    const pages = [`<button data-page="prev" ${state.page === 1 ? 'disabled' : ''}>Anterior</button>`];
    const maxVisible = 5;
    let start = Math.max(1, state.page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
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

    $$('#pagination button').forEach(b => {
      b.addEventListener('click', () => {
        const p = b.dataset.page;
        if (p === 'prev') state.page = Math.max(1, state.page - 1);
        else if (p === 'next') state.page = Math.min(totalPages, state.page + 1);
        else state.page = parseInt(p, 10);
        renderList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // ============ DETALHES ============
  function openDetail(id) {
    const t = HISTORY_DATA.find(x => x.id === id);
    if (!t) return;
    const isIn = t.type === 'entrada';
    const isPending = t.status === 'pendente';
    const isRejected = t.status === 'recusado' || t.status === 'cancelado';

    let iconClass = 'hist-in';
    if (isPending) iconClass = 'hist-pending';
    else if (isRejected) iconClass = 'hist-neutral';
    else iconClass = isIn ? 'hist-in' : 'hist-out';

    const body = $('#detailBody');
    body.innerHTML = `
      <div class="detail-tx-head">
        <div class="hist-icon ${iconClass}">
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
        <span class="lbl">${isIn ? 'Entrada' : 'Saída'}</span>
        <span class="val ${isIn ? 'in' : 'out'}">
          ${isIn ? '+' : '−'} ${formatCurrency(t.value)}
        </span>
      </div>

      <div class="detail-grid" style="grid-template-columns:1fr">
        <div class="detail-item"><span class="lbl">Data e hora</span><span class="val">${formatDateTime(t.date)}</span></div>
        <div class="detail-item"><span class="lbl">Categoria</span><span class="val">${CATEGORY_LABELS[t.category] || t.category}</span></div>
        <div class="detail-item"><span class="lbl">Forma de pagamento</span><span class="val">${t.paymentMethod}</span></div>
        <div class="detail-item"><span class="lbl">Status</span><span class="val">${STATUS_LABELS[t.status] || t.status}</span></div>
        ${t.balanceAfter != null ? `<div class="detail-item"><span class="lbl">Saldo após</span><span class="val">${formatCurrency(t.balanceAfter)}</span></div>` : ''}
        <div class="detail-item"><span class="lbl">Identificação</span><span class="val" style="font-family:ui-monospace,monospace;font-size:12px">${t.id}</span></div>
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

  function downloadReceipt(t) {
    const lines = [
      '========================================',
      '       STREAMLY — COMPROVANTE           ',
      '========================================',
      `ID:            ${t.id}`,
      `Descrição:     ${t.description}`,
      `Categoria:     ${CATEGORY_LABELS[t.category] || t.category}`,
      `Data:          ${formatDateTime(t.date)}`,
      `Forma pagto:   ${t.paymentMethod}`,
      `Status:        ${STATUS_LABELS[t.status] || t.status}`,
      '----------------------------------------',
      `VALOR:         ${formatCurrency(t.value)}`,
      ...(t.balanceAfter != null ? [`SALDO APÓS:    ${formatCurrency(t.balanceAfter)}`] : []),
      '========================================',
    ];
    downloadBlob(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }), `comprovante-${t.id}.txt`);
    toast('Comprovante baixado.', 'success');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ============ PERÍODO ============
  function updatePeriodTag() {
    const tag = $('#dateFilterTag');
    const text = $('#dateFilterText');
    if (!state.dateFrom && !state.dateTo) {
      tag.hidden = true;
      $('#periodLabel').textContent = 'Período';
      return;
    }
    tag.hidden = false;
    if (state.dateQuick) {
      const map = { today: 'Hoje', '7': 'Últimos 7 dias', '30': 'Últimos 30 dias', '90': 'Últimos 90 dias', all: 'Todo o período' };
      text.textContent = map[state.dateQuick] || 'Período personalizado';
      $('#periodLabel').textContent = map[state.dateQuick] || 'Período';
    } else {
      const fmt = d => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
      const from = state.dateFrom ? fmt(state.dateFrom) : 'início';
      const to   = state.dateTo   ? fmt(state.dateTo)   : 'hoje';
      text.textContent = `${from} → ${to}`;
      $('#periodLabel').textContent = 'Período';
    }
  }

  function openPeriodModal() {
    $('#rangeError').textContent = '';
    $('#dateFrom').value = state.dateFrom || '';
    $('#dateTo').value   = state.dateTo   || '';
    $$('#quickDates .quick-date').forEach(b => b.classList.toggle('is-active', b.dataset.quick === state.dateQuick));
    $('#periodModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function applyQuickDate(quick) {
    const today = new Date();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    state.dateQuick = quick;
    if (quick === 'all') { state.dateFrom = null; state.dateTo = null; }
    else if (quick === 'today') { state.dateFrom = iso(today); state.dateTo = iso(today); }
    else {
      const days = parseInt(quick, 10);
      const from = new Date(today); from.setDate(from.getDate() - days + 1);
      state.dateFrom = iso(from); state.dateTo = iso(today);
    }
    $$('#quickDates .quick-date').forEach(b => b.classList.toggle('is-active', b.dataset.quick === quick));
    $('#dateFrom').value = state.dateFrom || '';
    $('#dateTo').value   = state.dateTo || '';
    $('#rangeError').textContent = '';
  }

  function applyCustomRange() {
    const from = $('#dateFrom').value;
    const to   = $('#dateTo').value;
    const err  = $('#rangeError');
    err.textContent = '';
    if (!from && !to) { err.textContent = 'Informe ao menos uma data.'; return; }
    if (from && to && from > to) { err.textContent = 'A data inicial não pode ser maior que a final.'; return; }
    state.dateFrom = from || null;
    state.dateTo   = to || null;
    state.dateQuick = null;
    state.page = 1;
    closeAllModals();
    updatePeriodTag();
    renderList();
    toast('Filtro de período aplicado.', 'info');
  }

  // ============ STATEMENT (preview) ============
  function buildStatementHTML(items, options = {}) {
    const sumEntradas = items.filter(t => t.type === 'entrada').reduce((s, t) => s + t.value, 0);
    const sumSaidas   = items.filter(t => t.type === 'saida').reduce((s, t) => s + t.value, 0);
    const saldoPeriodo = sumEntradas - sumSaidas;
    const periodText = options.periodText || 'Todo o período';
    const catText = state.category === 'todas' ? 'Todas as categorias' : (CATEGORY_LABELS[state.category] || state.category);
    const statusText = state.status === 'todos' ? 'Todos os status' : (STATUS_LABELS[state.status] || state.status);

    const rows = items.map(t => {
      const isIn = t.type === 'entrada';
      const sign = isIn ? '+' : '−';
      const valClass = isIn ? 'in' : 'out';
      return `
        <tr>
          <td>${formatDate(t.date)}<br><span class="small">${formatTime(t.date)}</span></td>
          <td class="stmt-desc">
            ${t.description}
            <small>${t.id}</small>
          </td>
          <td>${CATEGORY_LABELS[t.category] || t.category}</td>
          <td>${t.paymentMethod}</td>
          <td><span class="stmt-status-tag ${t.status}">${STATUS_LABELS[t.status] || t.status}</span></td>
          <td class="right ${valClass}">${sign} ${formatCurrency(t.value)}</td>
          <td class="right">${t.balanceAfter != null ? formatCurrency(t.balanceAfter) : '—'}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="statement">
        <div class="statement-header">
          <div class="statement-brand">
            <div class="statement-logo">S</div>
            <div>
              <strong>STREAMLY</strong>
              <span>Extrato de movimentações</span>
            </div>
          </div>
          <div class="statement-meta">
            <div><strong>Período:</strong> ${periodText}</div>
            <div><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</div>
            <div><strong>Filtros:</strong> ${catText} · ${statusText}</div>
            <div><strong>Total:</strong> ${items.length} movimentações</div>
          </div>
        </div>

        <div class="statement-table-wrap">
          <table class="statement-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th class="right">Valor</th>
                <th class="right">Saldo após</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="statement-totals">
          <div>
            <span>Total de entradas</span>
            <strong class="in">${formatCurrency(sumEntradas)}</strong>
          </div>
          <div>
            <span>Total de saídas</span>
            <strong class="out">${formatCurrency(sumSaidas)}</strong>
          </div>
          <div>
            <span>Saldo do período</span>
            <strong>${formatCurrency(saldoPeriodo)}</strong>
          </div>
        </div>

        <p class="statement-note">
          Documento gerado automaticamente. Sujeito a conferência. Em caso de divergência, contate o suporte.
        </p>
      </div>
    `;
  }

  function getPeriodText() {
    if (state.dateQuick) {
      const map = { today: 'Hoje', '7': 'Últimos 7 dias', '30': 'Últimos 30 dias', '90': 'Últimos 90 dias', all: 'Todo o período' };
      return map[state.dateQuick] || 'Todo o período';
    }
    if (state.dateFrom || state.dateTo) {
      const fmt = d => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
      const from = state.dateFrom ? fmt(state.dateFrom) : 'início';
      const to   = state.dateTo   ? fmt(state.dateTo)   : 'hoje';
      return `${from} a ${to}`;
    }
    return 'Todo o período';
  }

  function openStatementModal() {
    const filtered = getFiltered();
    if (filtered.length === 0) {
      toast('Nenhuma movimentação para gerar extrato.', 'warn');
      return;
    }
    $('#statementPreview').innerHTML = buildStatementHTML(filtered, { periodText: getPeriodText() });
    $('#statementModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  // ============ EXPORTAÇÕES ============
  function buildRows(items) {
    return items.map(t => ({
      'Data':             formatDate(t.date),
      'Hora':             formatTime(t.date),
      'Descrição':        t.description,
      'Identificação':    t.id,
      'Categoria':        CATEGORY_LABELS[t.category] || t.category,
      'Forma pagto':      t.paymentMethod,
      'Status':           STATUS_LABELS[t.status] || t.status,
      'Tipo':             t.type === 'entrada' ? 'Entrada' : 'Saída',
      'Valor (R$)':       t.value.toFixed(2).replace('.', ','),
      'Saldo após (R$)':  t.balanceAfter != null ? t.balanceAfter.toFixed(2).replace('.', ',') : '—',
    }));
  }

  function exportCSV() {
    const filtered = getFiltered();
    if (!filtered.length) { toast('Nenhuma movimentação para exportar.', 'warn'); return; }
    const rows = buildRows(filtered);
    const headers = Object.keys(rows[0]);
    const esc = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(esc).join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
    downloadBlob(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }), `historico-${todayISO()}.csv`);
    toast('CSV gerado com sucesso.', 'success');
  }

  function exportXLSX() {
    const filtered = getFiltered();
    if (!filtered.length) { toast('Nenhuma movimentação para exportar.', 'warn'); return; }
    const rows = buildRows(filtered);
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 11 }, { wch: 7 }, { wch: 32 }, { wch: 16 }, { wch: 13 },
      { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
    XLSX.writeFile(wb, `historico-${todayISO()}.xlsx`);
    toast('Planilha Excel gerada com sucesso.', 'success');
  }

  function exportPDF() {
    const filtered = getFiltered();
    if (!filtered.length) { toast('Nenhuma movimentação para exportar.', 'warn'); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      toast('Biblioteca de PDF não carregada.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

    const sumEntradas = filtered.filter(t => t.type === 'entrada').reduce((s, t) => s + t.value, 0);
    const sumSaidas   = filtered.filter(t => t.type === 'saida').reduce((s, t) => s + t.value, 0);

    // Cabeçalho
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 297, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('STREAMLY', 14, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Extrato de movimentações', 14, 17);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Período: ${getPeriodText()}`, 14, 30);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 35);
    doc.text(`Total: ${filtered.length} movimentações`, 14, 40);

    // Cabeçalho da tabela
    let y = 48;
    doc.setFillColor(240, 240, 245);
    doc.rect(14, y - 5, 269, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('DATA', 16, y);
    doc.text('DESCRIÇÃO', 40, y);
    doc.text('CATEGORIA', 120, y);
    doc.text('PAGAMENTO', 150, y);
    doc.text('STATUS', 195, y);
    doc.text('VALOR', 235, y);
    doc.text('SALDO APÓS', 275, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'normal');

    // Linhas
    filtered.forEach(t => {
      if (y > 195) { doc.addPage(); y = 20; }
      const dateStr = `${formatDate(t.date)} ${formatTime(t.date)}`;
      const desc = t.description.length > 38 ? t.description.slice(0, 35) + '...' : t.description;
      doc.setFontSize(8);
      doc.text(dateStr, 16, y);
      doc.text(desc, 40, y);
      doc.text(CATEGORY_LABELS[t.category] || t.category, 120, y);
      doc.text(t.paymentMethod.length > 22 ? t.paymentMethod.slice(0, 20) + '...' : t.paymentMethod, 150, y);
      doc.text(STATUS_LABELS[t.status] || t.status, 195, y);
      doc.text((t.type === 'entrada' ? '+' : '−') + ' ' + formatCurrency(t.value), 235, y);
      doc.text(t.balanceAfter != null ? formatCurrency(t.balanceAfter) : '—', 275, y, { align: 'right' });
      y += 5;
    });

    // Totais
    y += 4;
    if (y > 185) { doc.addPage(); y = 20; }
    doc.setDrawColor(200);
    doc.line(14, y, 283, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Entradas: ${formatCurrency(sumEntradas)}`, 14, y);
    doc.text(`Saídas: ${formatCurrency(sumSaidas)}`, 80, y);
    doc.text(`Saldo do período: ${formatCurrency(sumEntradas - sumSaidas)}`, 150, y);

    // Rodapé
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.setFont('helvetica', 'normal');
    doc.text('Documento gerado automaticamente por Streamly. Sujeito a conferência.', 14, 200);

    doc.save(`historico-${todayISO()}.pdf`);
    toast('PDF gerado com sucesso.', 'success');
  }

  // ============ IMPRESSÃO ============
  function printStatement() {
    const filtered = getFiltered();
    if (!filtered.length) { toast('Nenhuma movimentação para imprimir.', 'warn'); return; }

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { toast('Bloqueador de pop-up impediu a impressão.', 'warn'); return; }

    const html = buildStatementHTML(filtered, { periodText: getPeriodText() });

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Extrato STREAMLY</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 32px;
            background: #fff; color: #111;
            font-size: 12px;
            line-height: 1.5;
          }
          .statement-header {
            display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;
            padding-bottom: 18px; border-bottom: 2px solid #111; margin-bottom: 18px;
          }
          .statement-brand { display: flex; align-items: center; gap: 12px; }
          .statement-logo {
            width: 42px; height: 42px; border-radius: 10px;
            background: #111; color: #fff; display: grid; place-items: center;
            font-size: 20px; font-weight: 900;
          }
          .statement-brand strong {
            display: block; font-size: 14px; font-weight: 800; letter-spacing: .16em;
          }
          .statement-brand span { display: block; font-size: 11px; color: #555; }
          .statement-meta { text-align: right; font-size: 11px; color: #555; line-height: 1.7; }
          .statement-meta strong { color: #111; }

          .statement-table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 16px; }
          .statement-table th {
            text-align: left; padding: 8px 10px; border-bottom: 1px solid #999;
            font-size: 10px; font-weight: 700; text-transform: uppercase;
            letter-spacing: .05em; color: #555; background: #f4f4f6;
          }
          .statement-table td {
            padding: 9px 10px; border-bottom: 1px solid #e5e5e5;
          }
          .statement-table td.small { font-size: 10px; color: #777; }
          .statement-table td.right { text-align: right; }
          .statement-table td.in { color: #1e8e3e; font-weight: 700; }
          .statement-table td.out { color: #111; font-weight: 700; }
          .statement-table .stmt-desc { font-weight: 600; }
          .statement-table .stmt-desc small {
            display: block; font-size: 10px; color: #999; font-family: monospace;
            font-weight: 400; margin-top: 2px;
          }
          .stmt-status-tag {
            display: inline-block; padding: 1px 7px; border-radius: 99px;
            font-size: 9.5px; font-weight: 700; background: #f0f0f4; color: #555;
          }
          .stmt-status-tag.aprovado  { background: #e6f7ee; color: #1e8e3e; }
          .stmt-status-tag.pendente  { background: #fff4e0; color: #c77700; }
          .stmt-status-tag.recusado  { background: #fde8e8; color: #c00; }
          .stmt-status-tag.cancelado { background: #eee; color: #666; }

          .statement-totals {
            display: flex; justify-content: space-between; gap: 16px;
            padding: 14px; background: #f7f7f9; border: 1px solid #e0e0e4;
            border-radius: 8px; margin-bottom: 12px;
          }
          .statement-totals > div { display: flex; flex-direction: column; gap: 3px; }
          .statement-totals span {
            font-size: 10px; font-weight: 700; text-transform: uppercase;
            letter-spacing: .05em; color: #666;
          }
          .statement-totals strong {
            font-size: 15px; font-weight: 800;
          }
          .statement-totals strong.in { color: #1e8e3e; }
          .statement-totals strong.out { color: #c00; }

          .statement-note {
            font-size: 10px; color: #888; text-align: center;
            padding-top: 10px; border-top: 1px dashed #ddd;
          }

          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 350);
  }

  // ============ E-MAIL ============
  function openEmailModal() {
    $('#emailExport').value = '';
    $('#emailExportError').textContent = '';
    $('#emailExport').classList.remove('is-error');
    $('#emailModal').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#emailExport').focus(), 60);
  }

  // ============ NOTIFICAÇÕES ============
  function renderNotifications() {
    const list = $('#notifList');
    list.innerHTML = HISTORY_NOTIFICATIONS.map((n, i) => {
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
    const unread = HISTORY_NOTIFICATIONS.filter(n => n.unread).length;
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
    // Busca
    $('#searchInput').addEventListener('input', e => {
      state.search = e.target.value;
      state.page = 1;
      renderList();
    });

    // Categoria
    $$('#categoryChips .chip').forEach(c => {
      c.addEventListener('click', () => {
        state.category = c.dataset.cat;
        state.page = 1;
        $$('#categoryChips .chip').forEach(x => x.classList.toggle('is-active', x === c));
        renderList();
      });
    });

    // Status
    $$('#statusChips .chip').forEach(c => {
      c.addEventListener('click', () => {
        state.status = c.dataset.status;
        state.page = 1;
        $$('#statusChips .chip').forEach(x => x.classList.toggle('is-active', x === c));
        renderList();
      });
    });

    // Ordenação
    $('#sortSelect').addEventListener('change', e => {
      state.sort = e.target.value;
      state.page = 1;
      renderList();
    });

    // Detalhes
    $('#historicoList').addEventListener('click', e => {
      const item = e.target.closest('.hist-item');
      if (item) openDetail(item.dataset.id);
    });
    $('#historicoList').addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const item = e.target.closest('.hist-item');
        if (item) { e.preventDefault(); openDetail(item.dataset.id); }
      }
    });

    // Resumo → reset filtros
    $$('.summary-card').forEach(card => {
      if (card.hasAttribute('data-filter-reset')) {
        card.addEventListener('click', () => {
          state.search = '';
          state.category = 'todas';
          state.status = 'todos';
          state.dateFrom = null;
          state.dateTo = null;
          state.dateQuick = null;
          state.page = 1;
          $('#searchInput').value = '';
          $$('#categoryChips .chip').forEach(x => x.classList.toggle('is-active', x.dataset.cat === 'todas'));
          $$('#statusChips .chip').forEach(x => x.classList.toggle('is-active', x.dataset.status === 'todos'));
          updatePeriodTag();
          renderList();
        });
      }
    });

    // Período
    $('#periodBtn').addEventListener('click', openPeriodModal);
    $('#dateFilterClear').addEventListener('click', () => {
      state.dateFrom = null;
      state.dateTo = null;
      state.dateQuick = null;
      state.page = 1;
      updatePeriodTag();
      renderList();
    });
    $$('#quickDates .quick-date').forEach(b => b.addEventListener('click', () => applyQuickDate(b.dataset.quick)));
    $('#applyRange').addEventListener('click', applyCustomRange);

    // Extrato
    $('#statementBtn').addEventListener('click', openStatementModal);
    $('#printStatement').addEventListener('click', printStatement);
    $('#downloadPdf').addEventListener('click', exportPDF);
    $('#downloadXlsx').addEventListener('click', exportXLSX);
    $('#downloadCsv').addEventListener('click', exportCSV);
    $('#emailStatement').addEventListener('click', () => {
      $('#statementModal').hidden = true;
      document.body.style.overflow = '';
      openEmailModal();
    });

    // Email form
    $('#emailForm').addEventListener('submit', e => {
      e.preventDefault();
      const input = $('#emailExport');
      const err = $('#emailExportError');
      const val = input.value.trim();
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
      toast(`Extrato enviado para ${val}.`, 'success');
      input.value = '';
    });

    // Fechar modais
    $$('[data-close]').forEach(el => el.addEventListener('click', closeAllModals));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });

    // Notificações
    const notifBtn = $('#notifBtn');
    notifBtn.addEventListener('click', e => {
      e.stopPropagation();
      const parent = notifBtn.closest('.dropdown');
      const isOpen = parent.classList.toggle('is-open');
      notifBtn.setAttribute('aria-expanded', String(isOpen));
    });
    $('#notifList').addEventListener('click', e => {
      const item = e.target.closest('.notif-item');
      if (!item) return;
      const idx = parseInt(item.dataset.notifIndex, 10);
      const n = HISTORY_NOTIFICATIONS[idx];
      if (n) {
        n.unread = false;
        renderNotifications();
        if (n.ref) openDetail(n.ref);
      }
      notifBtn.closest('.dropdown').classList.remove('is-open');
    });
    $('#notifMarkAll').addEventListener('click', e => {
      e.stopPropagation();
      HISTORY_NOTIFICATIONS.forEach(n => n.unread = false);
      renderNotifications();
    });

    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', e => {
      if (!e.target.closest('.dropdown')) {
        $$('.dropdown.is-open').forEach(d => d.classList.remove('is-open'));
      }
    });

    // Empty action
    $('#emptyAction').addEventListener('click', () => {
      state.search = '';
      state.category = 'todas';
      state.status = 'todos';
      state.dateFrom = null;
      state.dateTo = null;
      state.dateQuick = null;
      state.page = 1;
      $('#searchInput').value = '';
      $$('#categoryChips .chip').forEach(x => x.classList.toggle('is-active', x.dataset.cat === 'todas'));
      $$('#statusChips .chip').forEach(x => x.classList.toggle('is-active', x.dataset.status === 'todos'));
      updatePeriodTag();
      renderList();
    });
  }

  // ============ INIT ============
  function init() {
    renderSummary();
    renderList();
    renderNotifications();
    updatePeriodTag();
    bindEvents();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
