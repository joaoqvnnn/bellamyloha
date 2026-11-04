/* ============================================================
   MINHAS TELAS — lógica da página
   ============================================================ */

(function () {
  // ============ ESTADO ============
  const state = {
    search: '',
    filter: 'todas',
    sort: 'dueDate-asc',
    page: 1,
    perPage: 6,
  };

  const STATUS_LABELS = {
    ativa:     'Ativa',
    vencida:   'Vencida',
    proxima:   'Próxima',
    cancelada: 'Cancelada',
  };

  // ============ HELPERS ============
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function formatDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function formatCurrency(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function daysUntil(iso) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(iso + 'T00:00:00');
    return Math.round((target - today) / 86400000);
  }

  function initialOf(name) {
    return name.charAt(0).toUpperCase();
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

  // ============ FILTRAGEM / ORDENAÇÃO / PAGINAÇÃO ============
  function getFiltered() {
    let list = [...SCREENS_DATA];

    // Busca
    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      list = list.filter(s =>
        s.platform.toLowerCase().includes(q) ||
        s.plan.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    }

    // Filtro
    if (state.filter !== 'todas') {
      list = list.filter(s => s.status === state.filter);
    }

    // Ordenação
    const [key, dir] = state.sort.split('-');
    const mult = dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let va = a[key], vb = b[key];
      if (key === 'platform') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (typeof va === 'string') return va.localeCompare(vb) * mult;
      return (va - vb) * mult;
    });

    return list;
  }

  function renderSummary() {
    const counts = { ativa: 0, vencida: 0, proxima: 0, cancelada: 0 };
    SCREENS_DATA.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });

    $('#sumTodas').textContent     = SCREENS_DATA.length;
    $('#sumAtiva').textContent     = counts.ativa;
    $('#sumVencida').textContent   = counts.vencida;
    $('#sumProxima').textContent   = counts.proxima;
    $('#sumCancelada').textContent = counts.cancelada;
  }

  function renderGrid() {
    const grid  = $('#screensGrid');
    const empty = $('#emptyState');
    const pagin = $('#pagination');

    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.perPage));

    // Ajusta página
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.perPage;
    const pageItems = filtered.slice(start, start + state.perPage);

    // Estado vazio
    if (filtered.length === 0) {
      grid.innerHTML = '';
      pagin.innerHTML = '';
      empty.hidden = false;
      const noData = SCREENS_DATA.length === 0;
      $('#emptyTitle').textContent = noData ? 'Você ainda não tem telas' : 'Nenhuma tela encontrada';
      $('#emptyText').textContent  = noData
        ? 'Quando você contratar uma tela, ela aparecerá aqui.'
        : 'Tente ajustar a busca ou os filtros para encontrar o que procura.';
      $('#emptyAction').textContent = noData ? 'Ir para o catálogo' : 'Limpar filtros';
      $('#emptyAction').onclick = (e) => {
        e.preventDefault();
        if (noData) {
          toast('Redirecionando para o catálogo...', 'info');
        } else {
          state.search = '';
          state.filter = 'todas';
          state.page = 1;
          $('#searchInput').value = '';
          syncChips();
          renderGrid();
        }
      };
      return;
    }

    empty.hidden = true;

    // Renderiza cards
    grid.innerHTML = pageItems.map(screen => {
      const renewHidden = !(s.status === 'vencida' || s.status === 'proxima');
      const days = daysUntil(s.dueDate);
      const dueLabel = s.status === 'vencida'
        ? `Vencida há ${Math.abs(days)}d`
        : (days >= 0 ? `Vence em ${days}d` : '—');

      return `
        <article class="screen-card" data-id="${s.id}">
          <header class="screen-card-head">
            <div class="platform-badge" style="--c:${s.platformColor}">${initialOf(s.platform)}</div>
            <div class="screen-title">
              <h3>${s.platform}</h3>
              <span class="screen-id">${s.id}</span>
            </div>
            <span class="status-badge status-${s.status}">${STATUS_LABELS[s.status]}</span>
          </header>

          <div class="screen-body">
            <div class="screen-row">
              <span class="screen-label">Plano</span>
              <span class="screen-value">${s.plan}</span>
            </div>
            <div class="screen-row">
              <span class="screen-label">Contratada em</span>
              <span class="screen-value">${formatDate(s.contractDate)}</span>
            </div>
            <div class="screen-row">
              <span class="screen-label">Vencimento</span>
              <span class="screen-value">${formatDate(s.dueDate)}</span>
            </div>
            <div class="screen-row is-highlight">
              <span class="screen-label">Valor pago</span>
              <span class="screen-value">${formatCurrency(s.value)}</span>
            </div>
          </div>

          <footer class="screen-card-foot">
            <button class="btn btn-ghost" data-action="details">Detalhes</button>
            <button class="btn btn-ghost" data-action="validity">${dueLabel}</button>
            <button class="btn btn-primary" data-action="renew" ${renewHidden ? 'hidden' : ''}>Renovar</button>
          </footer>
        </article>
      `;
    }).join('');

    // Paginação
    renderPagination(totalPages);
  }

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
        renderGrid();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function syncChips() {
    $$('#filterChips .chip').forEach(c => {
      c.classList.toggle('is-active', c.dataset.filter === state.filter);
    });
  }

  // ============ AÇÕES DOS CARDS ============
  function openDetails(screenId) {
    const s = SCREENS_DATA.find(x => x.id === screenId);
    if (!s) return;

    const modal = $('#detailsModal');
    const body  = $('#detailsBody');

    body.innerHTML = `
      <div class="detail-head">
        <div class="platform-badge" style="--c:${s.platformColor}">${initialOf(s.platform)}</div>
        <div>
          <h2>${s.platform}</h2>
          <span class="screen-id">${s.id}</span>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-item"><span class="lbl">Plano</span><span class="val">${s.plan}</span></div>
        <div class="detail-item"><span class="lbl">Status</span><span class="val">${STATUS_LABELS[s.status]}</span></div>
        <div class="detail-item"><span class="lbl">Contratada em</span><span class="val">${formatDate(s.contractDate)}</span></div>
        <div class="detail-item"><span class="lbl">Vencimento</span><span class="val">${formatDate(s.dueDate)}</span></div>
        <div class="detail-item"><span class="lbl">Valor pago</span><span class="val">${formatCurrency(s.value)}</span></div>
        <div class="detail-item"><span class="lbl">Código</span><span class="val" style="font-family:ui-monospace,monospace;font-size:12.5px">${s.id}</span></div>
      </div>

      <p class="detail-section-title">Histórico de alterações</p>
      <div class="timeline">
        ${s.history.map(h => `
          <div class="timeline-item">
            <div class="t-date">${formatDate(h.date)}</div>
            <div class="t-action">${h.action}</div>
            <div class="t-detail">${h.detail}</div>
          </div>
        `).join('')}
      </div>
    `;

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function showValidity(screenId) {
    const s = SCREENS_DATA.find(x => x.id === screenId);
    if (!s) return;
    const days = daysUntil(s.dueDate);

    let msg, type;
    if (s.status === 'cancelada') {
      msg = `Tela cancelada em ${formatDate(s.dueDate)}.`;
      type = 'info';
    } else if (days < 0) {
      msg = `Tela vencida há ${Math.abs(days)} dia(s) — venceu em ${formatDate(s.dueDate)}.`;
      type = 'error';
    } else if (days <= 15) {
      msg = `Sua tela vence em ${days} dia(s) — ${formatDate(s.dueDate)}.`;
      type = 'warn';
    } else {
      msg = `Tela ativa até ${formatDate(s.dueDate)} — faltam ${days} dia(s).`;
      type = 'success';
    }
    toast(msg, type);
  }

  function requestRenewal(screenId) {
    const s = SCREENS_DATA.find(x => x.id === screenId);
    if (!s) return;
    // Simulação — em produção, chamaria endpoint de renovação
    toast(`Solicitação de renovação enviada para ${s.platform}. Você receberá o link de pagamento por e-mail.`, 'success');
  }

  // ============ EVENTOS ============
  function bindEvents() {
    // Busca
    $('#searchInput').addEventListener('input', (e) => {
      state.search = e.target.value;
      state.page = 1;
      renderGrid();
    });

    // Chips de filtro
    $$('#filterChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.filter = chip.dataset.filter;
        state.page = 1;
        syncChips();
        renderGrid();
      });
    });

    // Summary cards (também filtram)
    $$('.summary-card').forEach(card => {
      card.addEventListener('click', () => {
        state.filter = card.dataset.filter;
        state.page = 1;
        syncChips();
        renderGrid();
      });
    });

    // Ordenação
    $('#sortSelect').addEventListener('change', (e) => {
      state.sort = e.target.value;
      state.page = 1;
      renderGrid();
    });

    // Ações dos cards (delegação)
    $('#screensGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.closest('.screen-card')?.dataset.id;
      if (!id) return;
      const action = btn.dataset.action;

      if (action === 'details') openDetails(id);
      else if (action === 'validity') showValidity(id);
      else if (action === 'renew') requestRenewal(id);
    });

    // Fechar modais
    $$('[data-close]').forEach(el => {
      el.addEventListener('click', () => {
        $$('.modal').forEach(m => m.hidden = true);
        document.body.style.overflow = '';
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.modal').forEach(m => m.hidden = true);
        document.body.style.overflow = '';
      }
    });

    // Exportar (dropdown)
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

      // Simulação — em produção, chamar backend
      $('#emailModal').hidden = true;
      document.body.style.overflow = '';
      toast(`Solicitação registrada. A planilha será enviada para ${val}.`, 'success');
      input.value = '';
    });
  }

  // ============ EXPORTAÇÃO ============
  function buildRows() {
    const filtered = getFiltered();
    return filtered.map(s => ({
      'Código':        s.id,
      'Plataforma':    s.platform,
      'Plano':         s.plan,
      'Contratada em': formatDate(s.contractDate),
      'Vencimento':    formatDate(s.dueDate),
      'Valor (R$)':    s.value.toFixed(2).replace('.', ','),
      'Status':        STATUS_LABELS[s.status],
    }));
  }

  function exportCSV() {
    const rows = buildRows();
    if (!rows.length) { toast('Nenhuma tela para exportar.', 'warn'); return; }

    const headers = Object.keys(rows[0]);
    const escape  = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escape).join(','),
      ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `minhas-telas-${todaySlug()}.csv`);
    toast('Arquivo CSV gerado com sucesso.', 'success');
  }

  function exportXLSX() {
    const rows = buildRows();
    if (!rows.length) { toast('Nenhuma tela para exportar.', 'warn'); return; }

    const ws = XLSX.utils.json_to_sheet(rows);
    // Largura das colunas
    ws['!cols'] = [
      { wch: 16 }, { wch: 16 }, { wch: 20 },
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Minhas telas');
    XLSX.writeFile(wb, `minhas-telas-${todaySlug()}.xlsx`);
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

  function todaySlug() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // ============ INICIALIZAÇÃO ============
  function init() {
    renderSummary();
    renderGrid();
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
