/* ============================================================
   ADMIN PANEL — lógica completa
   ============================================================ */

(function () {
  const API_BASE = window.STREAMLY_API_BASE || '/api';
  const TOKEN_KEY = 'streamly-admin-token';

  // ---------- Auth guard ----------
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = 'admin-login.html';
    return;
  }

  const state = {
    section: 'dashboard',
    adminUser: JSON.parse(localStorage.getItem('streamly-admin-user') || '{}'),
    // caches das listas
    data: {},
  };

  // ---------- Helpers ----------
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtBRL(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  }
  function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  // ---------- HTTP ----------
  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}/admin${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = 'admin-login.html';
      throw new Error('Sessão expirada.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro na requisição.');
    return data;
  }

  // ---------- Toast ----------
  const TOAST_ICONS = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>',
    error:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
    warn:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17v.1"/></svg>',
    info:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></svg>',
  };
  function toast(msg, type = 'info') {
    const stack = $('#toastStack');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span>${esc(msg)}</span>`;
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3600);
  }

  // ---------- Modal ----------
  function openModal(html) {
    $('#adminModalBody').innerHTML = html;
    $('#adminModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    $('#adminModal').hidden = true;
    document.body.style.overflow = '';
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-modal]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#adminModal').hidden) closeModal();
  });

  function confirmAction({ title, text, confirmLabel = 'Confirmar', confirmClass = 'admin-btn-danger', onConfirm }) {
    openModal(`
      <h2 class="modal-title">${esc(title)}</h2>
      <p class="modal-text">${text}</p>
      <div class="admin-form-actions">
        <button class="admin-btn admin-btn-ghost" data-close-modal>Cancelar</button>
        <button class="admin-btn ${confirmClass}" id="modalConfirm">${esc(confirmLabel)}</button>
      </div>
    `);
    $('#modalConfirm').addEventListener('click', async () => {
      try { await onConfirm(); closeModal(); }
      catch (err) { toast(err.message, 'error'); }
    });
  }

  // ---------- Navigation ----------
  const SECTION_META = {
    dashboard:     { title: 'Dashboard',           subtitle: 'Visão geral da plataforma' },
    users:         { title: 'Usuários',            subtitle: 'Gerenciar contas e permissões' },
    products:      { title: 'Produtos',            subtitle: 'Catálogo de telas e assinaturas' },
    orders:        { title: 'Pedidos',             subtitle: 'Todos os pedidos da plataforma' },
    transactions:  { title: 'Transações',          subtitle: 'Histórico financeiro global' },
    screens:       { title: 'Telas',               subtitle: 'Telas entregues aos clientes' },
    subscriptions: { title: 'Assinaturas',         subtitle: 'Assinaturas ativas de todos os clientes' },
    tickets:       { title: 'Suporte',             subtitle: 'Tickets e chamados abertos' },
    cpf:           { title: 'Solicitações de CPF', subtitle: 'Alterações de CPF pendentes' },
    recharge:      { title: 'Recarga',             subtitle: 'Pacotes e bônus da carteira' },
    site:          { title: 'Site institucional',  subtitle: 'Sobre, privacidade, contato e rodapé' },
    notifications: { title: 'Notificações',        subtitle: 'Enviar avisos para os clientes' },
  };

  function setSection(section) {
    state.section = section;
    const meta = SECTION_META[section] || SECTION_META.dashboard;
    $('#pageTitle').textContent = meta.title;
    $('#pageSubtitle').textContent = meta.subtitle;

    $$('.admin-nav-item').forEach(item => {
      item.classList.toggle('is-active', item.dataset.section === section);
    });

    const content = $('#adminContent');
    content.innerHTML = `<div class="admin-empty">Carregando...</div>`;

    const loaders = {
      dashboard: loadDashboard,
      users: loadUsers,
      products: loadProducts,
      orders: loadOrders,
      transactions: loadTransactions,
      screens: loadScreens,
      subscriptions: loadSubscriptions,
      tickets: loadTickets,
      cpf: loadCpfRequests,
      recharge: loadRechargeConfig,
      site: loadSiteContent,
      notifications: loadNotifications,
    };

    (loaders[section] || loadDashboard)()
      .catch(err => {
        console.error(err);
        content.innerHTML = `<div class="admin-empty">Erro ao carregar. ${esc(err.message)}</div>`;
      });

    if (window.innerWidth <= 960) {
      closeSidebar();
    }
  }

  // ============================================================
  // DASHBOARD
  // ============================================================
  async function loadDashboard() {
    const stats = await api('/stats');
    const content = $('#adminContent');

    content.innerHTML = `
      <div class="admin-stats-grid">
        <div class="admin-stat-card" style="--sc:#e50914">
          <div class="admin-stat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8M22 21a6 6 0 0 0-6-6"/></svg></div>
          <span class="admin-stat-label">Usuários</span>
          <strong class="admin-stat-value">${stats.users.total}</strong>
          <span class="admin-stat-sub">${stats.users.active} ativos · ${stats.users.banned} banidos</span>
        </div>
        <div class="admin-stat-card" style="--sc:#0a84ff">
          <div class="admin-stat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v16L17 19l-2.5 2-2.5-2-2.5 2-2.5-2L3.5 21V5A1.5 1.5 0 0 1 5 3.5Z"/></svg></div>
          <span class="admin-stat-label">Pedidos</span>
          <strong class="admin-stat-value">${stats.orders.total}</strong>
          <span class="admin-stat-sub">${stats.orders.pending} pendentes</span>
        </div>
        <div class="admin-stat-card" style="--sc:#30d158">
          <div class="admin-stat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4"/></svg></div>
          <span class="admin-stat-label">Receita (recargas)</span>
          <strong class="admin-stat-value">${fmtBRL(stats.revenue)}</strong>
          <span class="admin-stat-sub">Total aprovado</span>
        </div>
        <div class="admin-stat-card" style="--sc:#a78bfa">
          <div class="admin-stat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div>
          <span class="admin-stat-label">Telas ativas</span>
          <strong class="admin-stat-value">${stats.screens.active}</strong>
          <span class="admin-stat-sub">${stats.screens.total} no total</span>
        </div>
      </div>

      <div class="admin-dash-grid">
        <div class="admin-card">
          <h2>Atenção necessária</h2>
          <div style="display:flex; flex-direction:column; gap:8px">
            ${stats.tickets.pending > 0 ? `
              <a href="#" class="admin-quick-link" data-goto="tickets">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.5 7.4L3.5 20.5l1.6-5A8.4 8.4 0 1 1 21 11.5Z"/></svg>
                <span>${stats.tickets.pending} ticket(s) aguardando</span>
              </a>` : ''}
            ${stats.cpfRequests.pending > 0 ? `
              <a href="#" class="admin-quick-link" data-goto="cpf">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.6" y="5" width="18.8" height="14" rx="2.6"/><circle cx="8.4" cy="11" r="2"/></svg>
                <span>${stats.cpfRequests.pending} solicitação(ões) de CPF</span>
              </a>` : ''}
            ${stats.orders.pending > 0 ? `
              <a href="#" class="admin-quick-link" data-goto="orders">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v16L17 19l-2.5 2-2.5-2-2.5 2-2.5-2L3.5 21V5A1.5 1.5 0 0 1 5 3.5Z"/></svg>
                <span>${stats.orders.pending} pedido(s) pendentes</span>
              </a>` : ''}
            ${stats.tickets.pending === 0 && stats.cpfRequests.pending === 0 && stats.orders.pending === 0 ? `
              <div class="admin-empty" style="padding:20px">Tudo em ordem. Nenhuma pendência.</div>
            ` : ''}
          </div>
        </div>
        <div class="admin-card">
          <h2>Atalhos</h2>
          <div class="admin-quick-links">
            <a href="#" class="admin-quick-link" data-goto="products"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9c1.1 0 2-.9 2-2Z"/></svg>Novo produto</a>
            <a href="#" class="admin-quick-link" data-goto="site"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18M3 12h18"/></svg>Editar site</a>
            <a href="#" class="admin-quick-link" data-goto="notifications"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/></svg>Enviar aviso</a>
            <a href="#" class="admin-quick-link" data-goto="recharge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5v1H5.5A2.5 2.5 0 0 0 3 11v6a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 17V9.5A2.5 2.5 0 0 0 18.5 7"/></svg>Pacotes</a>
          </div>
        </div>
      </div>
    `;

    $$('[data-goto]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        setSection(el.dataset.goto);
      });
    });
  }

  // ============================================================
  // USUÁRIOS
  // ============================================================
  async function loadUsers(page = 1, search = '', status = '') {
    const params = new URLSearchParams();
    params.set('page', page);
    if (search) params.set('search', search);
    if (status) params.set('status', status);

    const data = await api(`/users?${params}`);
    const content = $('#adminContent');
    const totalPages = Math.max(1, Math.ceil(data.total / data.perPage));

    content.innerHTML = `
      <div class="admin-toolbar">
        <div class="admin-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input id="userSearch" type="search" placeholder="Buscar por nome, e-mail ou CPF" value="${esc(search)}" />
        </div>
        <select class="admin-select" id="userStatus">
          <option value="">Todos os status</option>
          <option value="ativa"  ${status === 'ativa'  ? 'selected' : ''}>Ativos</option>
          <option value="banned" ${status === 'banned' ? 'selected' : ''}>Banidos</option>
        </select>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>CPF</th>
              <th>Status</th>
              <th>Saldo</th>
              <th>Pedidos</th>
              <th>Cadastro</th>
              <th class="right">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.length === 0 ? `
              <tr><td colspan="7" class="admin-empty">Nenhum usuário encontrado.</td></tr>
            ` : data.items.map(u => `
              <tr data-user-id="${u.id}">
                <td>
                  <div style="display:flex; align-items:center; gap:8px">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--surface-2);display:grid;place-items:center;font-weight:700;font-size:11px">${esc(u.name?.charAt(0) || '?')}</div>
                    <div>
                      <div style="font-weight:600">${esc(u.name)} ${u.role === 'admin' ? '<span class="admin-tag admin-tag-admin" style="margin-left:6px">ADMIN</span>' : ''}</div>
                      <div style="font-size:11px;color:var(--text-muted)">${esc(u.email)}</div>
                    </div>
                  </div>
                </td>
                <td class="mono">${esc(u.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '—')}</td>
                <td>
                  ${u.status === 'ativa'
                    ? '<span class="admin-tag admin-tag-ok">Ativo</span>'
                    : '<span class="admin-tag admin-tag-err">Banido</span>'}
                </td>
                <td>${fmtBRL(u.wallet?.balance || 0)}</td>
                <td>${u._count?.orders || 0}</td>
                <td class="mono">${fmtDate(u.createdAt)}</td>
                <td class="right">
                  <button class="admin-btn admin-btn-ghost admin-btn-sm" data-action="view" data-id="${u.id}">Ver</button>
                  ${u.status === 'ativa'
                    ? `<button class="admin-btn admin-btn-sm admin-btn-danger" data-action="ban" data-id="${u.id}" ${u.role === 'admin' ? 'disabled' : ''} style="margin-left:4px">Banir</button>`
                    : `<button class="admin-btn admin-btn-ghost admin-btn-sm" data-action="unban" data-id="${u.id}" style="margin-left:4px">Desbanir</button>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${totalPages > 1 ? `
        <div class="admin-pagination">
          ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
            <button class="${p === page ? 'is-active' : ''}" data-page="${p}">${p}</button>
          `).join('')}
        </div>
      ` : ''}
    `;

    // Bind
    let searchTimer;
    $('#userSearch').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadUsers(1, e.target.value, $('#userStatus').value), 400);
    });
    $('#userStatus').addEventListener('change', (e) => loadUsers(1, $('#userSearch').value, e.target.value));
    $$('.admin-pagination button').forEach(b => {
      b.addEventListener('click', () => loadUsers(parseInt(b.dataset.page, 10), search, status));
    });

    $$('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleUserAction(btn.dataset.action, btn.dataset.id));
    });
  }

  async function handleUserAction(action, userId) {
    if (action === 'view') {
      const { user } = await api(`/users/${userId}`);
      openModal(`
        <h2 class="modal-title">${esc(user.name)}</h2>
        <p class="modal-text">${esc(user.email)}</p>
        <div class="admin-form-grid">
          <div class="admin-form-field"><label>CPF</label><input value="${esc(user.cpf)}" readonly /></div>
          <div class="admin-form-field"><label>Telefone</label><input value="${esc(user.phone || '—')}" readonly /></div>
          <div class="admin-form-field"><label>Status</label><input value="${esc(user.status)}" readonly /></div>
          <div class="admin-form-field"><label>Role</label><input value="${esc(user.role)}" readonly /></div>
          <div class="admin-form-field"><label>Saldo</label><input value="${fmtBRL(user.wallet?.balance || 0)}" readonly /></div>
          <div class="admin-form-field"><label>Cadastro</label><input value="${fmtDateTime(user.createdAt)}" readonly /></div>
        </div>
        <div class="admin-form-actions">
          <button class="admin-btn admin-btn-ghost" data-close-modal>Fechar</button>
          <button class="admin-btn admin-btn-primary" data-close-modal>OK</button>
        </div>
      `);
      return;
    }

    if (action === 'ban') {
      openModal(`
        <h2 class="modal-title">Banir usuário?</h2>
        <p class="modal-text">O usuário será desconectado de todos os dispositivos e não poderá mais acessar a conta.</p>
        <div class="admin-form-field full">
          <label>Motivo do banimento</label>
          <input id="banReason" placeholder="Ex: violação dos termos de uso" />
        </div>
        <div class="admin-form-actions">
          <button class="admin-btn admin-btn-ghost" data-close-modal>Cancelar</button>
          <button class="admin-btn admin-btn-danger" id="confirmBan">Banir</button>
        </div>
      `);
      $('#confirmBan').addEventListener('click', async () => {
        try {
          await api(`/users/${userId}/ban`, {
            method: 'POST',
            body: JSON.stringify({ reason: $('#banReason').value || 'Violação dos termos' }),
          });
          closeModal();
          toast('Usuário banido.', 'success');
          loadUsers();
        } catch (err) { toast(err.message, 'error'); }
      });
      return;
    }

    if (action === 'unban') {
      confirmAction({
        title: 'Desbanir usuário?',
        text: 'O usuário voltará a ter acesso normal à conta.',
        confirmLabel: 'Desbanir',
        confirmClass: 'admin-btn-primary',
        onConfirm: async () => {
          await api(`/users/${userId}/unban`, { method: 'POST' });
          toast('Usuário desbanido.', 'success');
          loadUsers();
        },
      });
    }
  }

  // ============================================================
  // PRODUTOS
  // ============================================================
  async function loadProducts(page = 1, search = '') {
    const params = new URLSearchParams();
    params.set('page', page);
    if (search) params.set('search', search);

    const data = await api(`/products?${params}`);
    const content = $('#adminContent');

    content.innerHTML = `
      <div class="admin-toolbar">
        <div class="admin-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input id="productSearch" type="search" placeholder="Buscar produto" value="${esc(search)}" />
        </div>
        <button class="admin-btn admin-btn-primary" id="newProductBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Novo produto
        </button>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Plataforma</th>
              <th>Preço</th>
              <th>Bônus</th>
              <th>Estoque</th>
              <th>Status</th>
              <th class="right">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.length === 0 ? `
              <tr><td colspan="7" class="admin-empty">Nenhum produto encontrado.</td></tr>
            ` : data.items.map(p => `
              <tr>
                <td>
                  <div style="font-weight:600">${esc(p.name)}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${esc(p.category)}</div>
                </td>
                <td>${esc(p.platform)}</td>
                <td><strong>${fmtBRL(p.price)}</strong>${p.oldPrice ? ` <span style="text-decoration:line-through;color:var(--text-dim);font-size:11px">${fmtBRL(p.oldPrice)}</span>` : ''}</td>
                <td>${p.bonus ? `<span class="admin-tag admin-tag-ok">${esc(p.bonus)}</span>` : '—'}</td>
                <td>${p.stock}</td>
                <td>${p.active ? '<span class="admin-tag admin-tag-ok">Ativo</span>' : '<span class="admin-tag admin-tag-neutral">Inativo</span>'}</td>
                <td class="right">
                  <button class="admin-btn admin-btn-ghost admin-btn-sm" data-action="edit" data-id="${p.id}">Editar</button>
                  ${p.active ? `<button class="admin-btn admin-btn-sm admin-btn-danger" data-action="delete" data-id="${p.id}" style="margin-left:4px">Desativar</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    let searchTimer;
    $('#productSearch').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadProducts(1, e.target.value), 400);
    });

    $('#newProductBtn').addEventListener('click', () => openProductModal());
    $$('[data-action="edit"]').forEach(b => {
      b.addEventListener('click', async () => {
        const product = data.items.find(x => x.id === b.dataset.id);
        openProductModal(product);
      });
    });
    $$('[data-action="delete"]').forEach(b => {
      b.addEventListener('click', () => {
        confirmAction({
          title: 'Desativar produto?',
          text: 'O produto deixará de aparecer no catálogo, mas pedidos existentes serão mantidos.',
          confirmLabel: 'Desativar',
          onConfirm: async () => {
            await api(`/products/${b.dataset.id}`, { method: 'DELETE' });
            toast('Produto desativado.', 'success');
            loadProducts();
          },
        });
      });
    });
  }

  function openProductModal(product = null) {
    const isEdit = !!product;
    const p = product || {
      name: '', platform: '', platformColor: '#e50914', category: 'Filmes e séries',
      shortDesc: '', description: '', price: '', oldPrice: '', period: '/mês',
      delivery: 'auto', stock: 0, bonus: '', active: true,
    };

    openModal(`
      <h2 class="modal-title">${isEdit ? 'Editar produto' : 'Novo produto'}</h2>
      <p class="modal-text">Preencha os campos abaixo.</p>
      <div class="admin-form-grid">
        <div class="admin-form-field full"><label>Nome *</label><input id="pName" value="${esc(p.name)}" /></div>
        <div class="admin-form-field"><label>Plataforma *</label><input id="pPlatform" value="${esc(p.platform)}" /></div>
        <div class="admin-form-field"><label>Cor</label><input id="pPlatformColor" type="color" value="${esc(p.platformColor)}" /></div>
        <div class="admin-form-field">
          <label>Categoria</label>
          <select id="pCategory">
            ${['Filmes e séries','Música','Combos','Infantil','Documentários','Esportes'].map(c => `<option ${c === p.category ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="admin-form-field">
          <label>Entrega</label>
          <select id="pDelivery">
            <option value="auto" ${p.delivery === 'auto' ? 'selected' : ''}>Automática (até 5 min)</option>
            <option value="manual" ${p.delivery === 'manual' ? 'selected' : ''}>Manual (até 2h)</option>
          </select>
        </div>
        <div class="admin-form-field full"><label>Descrição curta</label><input id="pShortDesc" value="${esc(p.shortDesc)}" /></div>
        <div class="admin-form-field full"><label>Descrição completa</label><textarea id="pDescription">${esc(p.description)}</textarea></div>
        <div class="admin-form-field"><label>Preço (R$) *</label><input id="pPrice" type="number" step="0.01" value="${p.price}" /></div>
        <div class="admin-form-field"><label>Preço antigo (opcional)</label><input id="pOldPrice" type="number" step="0.01" value="${p.oldPrice || ''}" /></div>
        <div class="admin-form-field">
          <label>Período</label>
          <select id="pPeriod">
            <option ${p.period === '/mês' ? 'selected' : ''}>/mês</option>
            <option ${p.period === '/ano' ? 'selected' : ''}>/ano</option>
          </select>
        </div>
        <div class="admin-form-field"><label>Estoque</label><input id="pStock" type="number" value="${p.stock}" /></div>
        <div class="admin-form-field full"><label>Bônus (opcional)</label><input id="pBonus" value="${esc(p.bonus || '')}" placeholder="Ex: +2 telas grátis ou +30 dias" /></div>
        <div class="admin-form-field full">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer">
            <input type="checkbox" id="pActive" ${p.active ? 'checked' : ''} style="width:auto;height:auto" />
            <span>Produto ativo no catálogo</span>
          </label>
        </div>
      </div>
      <div class="admin-form-actions">
        <button class="admin-btn admin-btn-ghost" data-close-modal>Cancelar</button>
        <button class="admin-btn admin-btn-primary" id="saveProduct">${isEdit ? 'Salvar' : 'Criar produto'}</button>
      </div>
    `);

    $('#saveProduct').addEventListener('click', async () => {
      const payload = {
        name: $('#pName').value.trim(),
        platform: $('#pPlatform').value.trim(),
        platformColor: $('#pPlatformColor').value,
        category: $('#pCategory').value,
        shortDesc: $('#pShortDesc').value.trim(),
        description: $('#pDescription').value.trim(),
        price: parseFloat($('#pPrice').value),
        oldPrice: $('#pOldPrice').value ? parseFloat($('#pOldPrice').value) : null,
        period: $('#pPeriod').value,
        delivery: $('#pDelivery').value,
        stock: parseInt($('#pStock').value, 10) || 0,
        bonus: $('#pBonus').value.trim() || null,
        active: $('#pActive').checked,
      };
      try {
        if (isEdit) {
          await api(`/products/${product.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
          toast('Produto atualizado.', 'success');
        } else {
          await api('/products', { method: 'POST', body: JSON.stringify(payload) });
          toast('Produto criado.', 'success');
        }
        closeModal();
        loadProducts();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  // ============================================================
  // PEDIDOS
  // ============================================================
  async function loadOrders(page = 1, status = '') {
    const params = new URLSearchParams();
    params.set('page', page);
    if (status) params.set('status', status);

    const data = await api(`/orders?${params}`);
    const content = $('#adminContent');

    content.innerHTML = `
      <div class="admin-toolbar">
        <select class="admin-select" id="orderStatus">
          <option value="">Todos os status</option>
          ${['pendente','aprovado','em_processamento','concluido','cancelado','reembolsado'].map(s => `<option value="${s}" ${status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Total</th>
              <th>Status</th>
              <th>Data</th>
              <th class="right">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.length === 0
              ? '<tr><td colspan="7" class="admin-empty">Nenhum pedido.</td></tr>'
              : data.items.map(o => `
                <tr>
                  <td class="mono">${esc(o.number)}</td>
                  <td>
                    <div>${esc(o.user?.name)}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${esc(o.user?.email)}</div>
                  </td>
                  <td>${o.items.map(i => `${i.quantity}× ${esc(i.product?.name || '?')}`).join('<br>')}</td>
                  <td><strong>${fmtBRL(o.total)}</strong></td>
                  <td><span class="admin-tag admin-tag-info">${esc(o.status)}</span></td>
                  <td class="mono">${fmtDate(o.createdAt)}</td>
                  <td class="right">
                    <select class="admin-select" style="height:32px;font-size:12px" data-order-status="${o.id}">
                      ${['pendente','aprovado','em_processamento','concluido','cancelado','reembolsado'].map(s =>
                        `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
                      ).join('')}
                    </select>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;

    $('#orderStatus').addEventListener('change', (e) => loadOrders(1, e.target.value));

    $$('[data-order-status]').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await api(`/orders/${sel.dataset.orderStatus}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: sel.value }),
          });
          toast('Status atualizado.', 'success');
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  }

  // ============================================================
  // TRANSAÇÕES
  // ============================================================
  async function loadTransactions(page = 1) {
    const data = await api(`/transactions?page=${page}`);
    const content = $('#adminContent');

    content.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Status</th>
              <th class="right">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.length === 0
              ? '<tr><td colspan="6" class="admin-empty">Nenhuma transação.</td></tr>'
              : data.items.map(t => `
                <tr>
                  <td class="mono">${fmtDateTime(t.createdAt)}</td>
                  <td>${esc(t.user?.name)}<br><span style="font-size:11px;color:var(--text-muted)">${esc(t.user?.email)}</span></td>
                  <td>${esc(t.description)}</td>
                  <td>${t.type === 'entrada' ? '<span class="admin-tag admin-tag-ok">Entrada</span>' : '<span class="admin-tag admin-tag-neutral">Saída</span>'}</td>
                  <td><span class="admin-tag admin-tag-info">${esc(t.status)}</span></td>
                  <td class="right"><strong>${t.type === 'entrada' ? '+' : '−'} ${fmtBRL(t.value)}</strong></td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ============================================================
  // TELAS
  // ============================================================
  async function loadScreens(page = 1, status = '') {
    const params = new URLSearchParams();
    params.set('page', page);
    if (status) params.set('status', status);

    const data = await api(`/screens?${params}`);
    const content = $('#adminContent');

    content.innerHTML = `
      <div class="admin-toolbar">
        <select class="admin-select" id="screenStatus">
          <option value="">Todos os status</option>
          ${['ativa','proxima','vencida','cancelada'].map(s => `<option value="${s}" ${status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Plataforma</th>
              <th>Plano</th>
              <th>Vencimento</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.length === 0
              ? '<tr><td colspan="6" class="admin-empty">Nenhuma tela.</td></tr>'
              : data.items.map(s => `
                <tr>
                  <td class="mono">${esc(s.code)}</td>
                  <td>${esc(s.user?.name)}<br><span style="font-size:11px;color:var(--text-muted)">${esc(s.user?.email)}</span></td>
                  <td>${esc(s.platform)}</td>
                  <td>${esc(s.plan)}</td>
                  <td class="mono">${fmtDate(s.dueDate)}</td>
                  <td><span class="admin-tag admin-tag-${s.status === 'ativa' ? 'ok' : s.status === 'vencida' ? 'err' : 'warn'}">${esc(s.status)}</span></td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;

    $('#screenStatus').addEventListener('change', (e) => loadScreens(1, e.target.value));
  }

  // ============================================================
  // ASSINATURAS
  // ============================================================
  async function loadSubscriptions(page = 1) {
    const data = await api(`/subscriptions?page=${page}`);
    const content = $('#adminContent');

    content.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Plataforma</th>
              <th>Plano</th>
              <th>Valor</th>
              <th>Próxima cobrança</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.length === 0
              ? '<tr><td colspan="6" class="admin-empty">Nenhuma assinatura.</td></tr>'
              : data.items.map(s => `
                <tr>
                  <td>${esc(s.user?.name)}<br><span style="font-size:11px;color:var(--text-muted)">${esc(s.user?.email)}</span></td>
                  <td>${esc(s.platform)}</td>
                  <td>${esc(s.plan)}</td>
                  <td>${fmtBRL(s.value)} ${esc(s.periodicity)}</td>
                  <td class="mono">${fmtDate(s.nextBillingDate)}</td>
                  <td><span class="admin-tag admin-tag-${s.status === 'ativa' ? 'ok' : 'neutral'}">${esc(s.status)}</span></td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ============================================================
  // SUPORTE
  // ============================================================
  async function loadTickets(page = 1, status = '') {
    const params = new URLSearchParams();
    params.set('page', page);
    if (status) params.set('status', status);

    const data = await api(`/tickets?${params}`);
    const content = $('#adminContent');

    content.innerHTML = `
      <div class="admin-toolbar">
        <select class="admin-select" id="ticketStatus">
          <option value="">Todos os status</option>
          ${['aguardando','em_andamento','finalizado'].map(s => `<option value="${s}" ${status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Assunto</th>
              <th>Categoria</th>
              <th>Status</th>
              <th class="right">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.length === 0
              ? '<tr><td colspan="6" class="admin-empty">Nenhum ticket.</td></tr>'
              : data.items.map(t => `
                <tr>
                  <td class="mono">${esc(t.code)}</td>
                  <td>${esc(t.user?.name)}<br><span style="font-size:11px;color:var(--text-muted)">${esc(t.user?.email)}</span></td>
                  <td>${esc(t.subject)}</td>
                  <td>${esc(t.category)}</td>
                  <td>
                    <select class="admin-select" style="height:32px;font-size:12px" data-ticket-status="${t.id}">
                      ${['aguardando','em_andamento','finalizado'].map(s =>
                        `<option value="${s}" ${t.status === s ? 'selected' : ''}>${s}</option>`
                      ).join('')}
                    </select>
                  </td>
                  <td class="right">
                    <button class="admin-btn admin-btn-ghost admin-btn-sm" data-view-ticket="${t.id}">Ver</button>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;

    $('#ticketStatus').addEventListener('change', (e) => loadTickets(1, e.target.value));

    $$('[data-ticket-status]').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await api(`/tickets/${sel.dataset.ticketStatus}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: sel.value }),
          });
          toast('Status do ticket atualizado.', 'success');
        } catch (err) { toast(err.message, 'error'); }
      });
    });

    $$('[data-view-ticket]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = data.items.find(x => x.id === btn.dataset.viewTicket);
        openModal(`
          <h2 class="modal-title">${esc(t.subject)}</h2>
          <p class="modal-text">${esc(t.code)} · ${esc(t.user?.name)}</p>
          <p style="font-size:13px;line-height:1.6;white-space:pre-wrap">${esc(t.description)}</p>
          <div class="admin-form-actions">
            <button class="admin-btn admin-btn-ghost" data-close-modal>Fechar</button>
          </div>
        `);
      });
    });
  }

  // ============================================================
  // SOLICITAÇÕES DE CPF
  // ============================================================
  async function loadCpfRequests() {
    const data = await api('/cpf-requests');
    const content = $('#adminContent');

    content.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Motivo</th>
              <th>Status</th>
              <th>Data</th>
              <th class="right">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.length === 0
              ? '<tr><td colspan="6" class="admin-empty">Nenhuma solicitação.</td></tr>'
              : data.items.map(r => `
                <tr>
                  <td class="mono">${esc(r.code)}</td>
                  <td>${esc(r.user?.name)}<br><span style="font-size:11px;color:var(--text-muted)">${esc(r.user?.email)}</span></td>
                  <td>${esc(r.reason)}</td>
                  <td><span class="admin-tag admin-tag-${r.status === 'aprovado' ? 'ok' : r.status === 'recusado' ? 'err' : 'warn'}">${esc(r.status)}</span></td>
                  <td class="mono">${fmtDate(r.createdAt)}</td>
                  <td class="right">
                    ${r.status === 'pendente' ? `
                      <button class="admin-btn admin-btn-sm admin-btn-primary" data-cpf-approve="${r.id}" style="margin-right:4px">Aprovar</button>
                      <button class="admin-btn admin-btn-sm admin-btn-ghost" data-cpf-reject="${r.id}">Recusar</button>
                    ` : `<button class="admin-btn admin-btn-ghost admin-btn-sm" data-view-cpf="${r.id}">Ver</button>`}
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;

    $$('[data-cpf-approve]').forEach(btn => {
      btn.addEventListener('click', () => openCpfApproveModal(btn.dataset.cpfApprove));
    });

    $$('[data-cpf-reject]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = data.items.find(x => x.id === btn.dataset.cpfReject);
        openModal(`
          <h2 class="modal-title">Recusar solicitação?</h2>
          <p class="modal-text">O cliente será notificado. Motivo: ${esc(r.reason)}</p>
          <div class="admin-form-actions">
            <button class="admin-btn admin-btn-ghost" data-close-modal>Cancelar</button>
            <button class="admin-btn admin-btn-danger" id="confirmReject">Recusar</button>
          </div>
        `);
        $('#confirmReject').addEventListener('click', async () => {
          try {
            await api(`/cpf-requests/${btn.dataset.cpfReject}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'recusado' }),
            });
            closeModal();
            toast('Solicitação recusada.', 'success');
            loadCpfRequests();
          } catch (err) { toast(err.message, 'error'); }
        });
      });
    });

    $$('[data-view-cpf]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = data.items.find(x => x.id === btn.dataset.viewCpf);
        openModal(`
          <h2 class="modal-title">Solicitação ${esc(r.code)}</h2>
          <p class="modal-text">${esc(r.user?.name)} · ${esc(r.user?.email)}</p>
          <div class="admin-form-field full">
            <label>Motivo</label>
            <input value="${esc(r.reason)}" readonly />
          </div>
          <div class="admin-form-field full">
            <label>Detalhes</label>
            <textarea readonly>${esc(r.details)}</textarea>
          </div>
          <div class="admin-form-actions">
            <button class="admin-btn admin-btn-ghost" data-close-modal>Fechar</button>
          </div>
        `);
      });
    });
  }

  function openCpfApproveModal(requestId) {
    openModal(`
      <h2 class="modal-title">Aprovar alteração de CPF</h2>
      <p class="modal-text">Informe o novo CPF que será atribuído ao cliente. Esta ação é registrada com auditoria.</p>
      <div class="admin-form-field full">
        <label>Novo CPF</label>
        <input id="newCpfValue" placeholder="000.000.000-00" maxlength="14" />
      </div>
      <div class="admin-form-actions">
        <button class="admin-btn admin-btn-ghost" data-close-modal>Cancelar</button>
        <button class="admin-btn admin-btn-primary" id="confirmApprove">Aprovar</button>
      </div>
    `);

    const input = $('#newCpfValue');
    input.addEventListener('input', () => {
      let v = input.value.replace(/\D/g, '').slice(0, 11);
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      input.value = v;
    });

    $('#confirmApprove').addEventListener('click', async () => {
      try {
        await api(`/cpf-requests/${requestId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'aprovado', newCpf: input.value }),
        });
        closeModal();
        toast('CPF alterado com sucesso.', 'success');
        loadCpfRequests();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  // ============================================================
  // RECARGA
  // ============================================================
  async function loadRechargeConfig() {
    const config = await api('/recharge-config');
    const content = $('#adminContent');

    content.innerHTML = `
      <div class="admin-card" style="margin-bottom:14px">
        <h2>Limites</h2>
        <div class="admin-form-grid">
          <div class="admin-form-field">
            <label>Valor mínimo (R$)</label>
            <input id="rcMin" type="number" step="0.01" value="${config.minAmount}" />
          </div>
          <div class="admin-form-field">
            <label>Valor máximo (R$)</label>
            <input id="rcMax" type="number" step="0.01" value="${config.maxAmount}" />
          </div>
        </div>
      </div>

      <div class="admin-card" style="margin-bottom:14px">
        <h2>Pacotes de recarga <button class="admin-btn admin-btn-ghost admin-btn-sm" id="addPackage">+ Adicionar</button></h2>
        <div id="packagesList" style="display:flex;flex-direction:column;gap:8px">
          ${config.packages.map((p, i) => `
            <div style="display:flex;gap:8px;align-items:center;padding:10px;background:var(--surface-2);border-radius:9px" data-pkg="${i}">
              <input type="number" class="pkgValue" value="${p.value}" placeholder="Valor" style="width:120px;height:36px;padding:0 10px;background:var(--surface);border:1px solid var(--border);border-radius:7px;color:var(--text)" />
              <span style="color:var(--text-muted)">→</span>
              <input type="number" class="pkgBonus" value="${p.bonus}" placeholder="Bônus" style="width:120px;height:36px;padding:0 10px;background:var(--surface);border:1px solid var(--border);border-radius:7px;color:var(--text)" />
              <span style="color:var(--text-muted);font-size:12px">bônus</span>
              <button class="admin-btn admin-btn-sm admin-btn-danger" style="margin-left:auto" data-remove-pkg="${i}">Remover</button>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="admin-form-actions" style="padding-top:0;border:0">
        <button class="admin-btn admin-btn-primary" id="saveRecharge">Salvar configurações</button>
      </div>
    `;

    $('#addPackage').addEventListener('click', () => {
      const list = $('#packagesList');
      const idx = list.children.length;
      const div = document.createElement('div');
      div.style = 'display:flex;gap:8px;align-items:center;padding:10px;background:var(--surface-2);border-radius:9px';
      div.dataset.pkg = idx;
      div.innerHTML = `
        <input type="number" class="pkgValue" placeholder="Valor" style="width:120px;height:36px;padding:0 10px;background:var(--surface);border:1px solid var(--border);border-radius:7px;color:var(--text)" />
        <span style="color:var(--text-muted)">→</span>
        <input type="number" class="pkgBonus" placeholder="Bônus" value="0" style="width:120px;height:36px;padding:0 10px;background:var(--surface);border:1px solid var(--border);border-radius:7px;color:var(--text)" />
        <span style="color:var(--text-muted);font-size:12px">bônus</span>
        <button class="admin-btn admin-btn-sm admin-btn-danger" style="margin-left:auto" data-remove-pkg="${idx}">Remover</button>
      `;
      list.appendChild(div);
      bindRemoveBtns();
    });

    function bindRemoveBtns() {
      $$('[data-remove-pkg]').forEach(btn => {
        btn.onclick = () => btn.closest('[data-pkg]').remove();
      });
    }
    bindRemoveBtns();

    $('#saveRecharge').addEventListener('click', async () => {
      const packages = $$('#packagesList [data-pkg]').map(row => ({
        value: parseFloat(row.querySelector('.pkgValue').value) || 0,
        bonus: parseFloat(row.querySelector('.pkgBonus').value) || 0,
      })).filter(p => p.value > 0);

      const bonusTiers = packages.map(p => ({
        min: p.value,
        max: p.value + 49.99,
        bonus: p.bonus,
      }));

      try {
        await api('/recharge-config', {
          method: 'PUT',
          body: JSON.stringify({
            minAmount: parseFloat($('#rcMin').value),
            maxAmount: parseFloat($('#rcMax').value),
            packages,
            bonusTiers,
          }),
        });
        toast('Configurações salvas.', 'success');
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  // ============================================================
  // SITE INSTITUCIONAL
  // ============================================================
  async function loadSiteContent() {
    const { content } = await api('/site-content');
    const c = content || {};
    const wrapper = $('#adminContent');

    wrapper.innerHTML = `
      <div class="admin-card" style="margin-bottom:14px">
        <h2>Marca</h2>
        <div class="admin-form-grid">
          <div class="admin-form-field"><label>Nome da marca</label><input data-site="brand.name" value="${esc(c['brand.name'] || '')}" /></div>
          <div class="admin-form-field"><label>Tagline</label><input data-site="brand.tagline" value="${esc(c['brand.tagline'] || '')}" /></div>
        </div>
      </div>

      <div class="admin-card" style="margin-bottom:14px">
        <h2>Sobre nós</h2>
        <div class="admin-form-field"><label>Título</label><input data-site="about.title" value="${esc(c['about.title'] || '')}" /></div>
        <div class="admin-form-field" style="margin-top:10px"><label>Conteúdo (HTML permitido)</label><textarea data-site="about.content" rows="6">${esc(c['about.content'] || '')}</textarea></div>
      </div>

      <div class="admin-card" style="margin-bottom:14px">
        <h2>Política de Privacidade</h2>
        <div class="admin-form-field"><label>Título</label><input data-site="privacy.title" value="${esc(c['privacy.title'] || '')}" /></div>
        <div class="admin-form-field" style="margin-top:10px"><label>Conteúdo (HTML permitido)</label><textarea data-site="privacy.content" rows="6">${esc(c['privacy.content'] || '')}</textarea></div>
      </div>

      <div class="admin-card" style="margin-bottom:14px">
        <h2>Termos de Uso</h2>
        <div class="admin-form-field"><label>Título</label><input data-site="terms.title" value="${esc(c['terms.title'] || '')}" /></div>
        <div class="admin-form-field" style="margin-top:10px"><label>Conteúdo (HTML permitido)</label><textarea data-site="terms.content" rows="6">${esc(c['terms.content'] || '')}</textarea></div>
      </div>

      <div class="admin-card" style="margin-bottom:14px">
        <h2>Contato</h2>
        <div class="admin-form-grid">
          <div class="admin-form-field"><label>E-mail</label><input data-site="contact.email" value="${esc(c['contact.email'] || '')}" /></div>
          <div class="admin-form-field"><label>WhatsApp</label><input data-site="contact.whatsapp" value="${esc(c['contact.whatsapp'] || '')}" /></div>
          <div class="admin-form-field full"><label>Horário de atendimento</label><input data-site="contact.hours" value="${esc(c['contact.hours'] || '')}" /></div>
        </div>
      </div>

      <div class="admin-card" style="margin-bottom:14px">
        <h2>Endereço</h2>
        <div class="admin-form-grid">
          <div class="admin-form-field"><label>Rua</label><input data-site="address.street" value="${esc(c['address.street'] || '')}" /></div>
          <div class="admin-form-field"><label>Número</label><input data-site="address.number" value="${esc(c['address.number'] || '')}" /></div>
          <div class="admin-form-field"><label>Complemento</label><input data-site="address.complement" value="${esc(c['address.complement'] || '')}" /></div>
          <div class="admin-form-field"><label>Bairro</label><input data-site="address.neighborhood" value="${esc(c['address.neighborhood'] || '')}" /></div>
          <div class="admin-form-field"><label>Cidade</label><input data-site="address.city" value="${esc(c['address.city'] || '')}" /></div>
          <div class="admin-form-field"><label>UF</label><input data-site="address.state" value="${esc(c['address.state'] || '')}" maxlength="2" /></div>
          <div class="admin-form-field"><label>CEP</label><input data-site="address.cep" value="${esc(c['address.cep'] || '')}" /></div>
          <div class="admin-form-field"><label>País</label><input data-site="address.country" value="${esc(c['address.country'] || '')}" /></div>
        </div>
      </div>

      <div class="admin-card" style="margin-bottom:14px">
        <h2>Rodapé</h2>
        <div class="admin-form-field"><label>Copyright</label><input data-site="footer.copyright" value="${esc(c['footer.copyright'] || '')}" /></div>
        <div class="admin-form-field" style="margin-top:10px"><label>CNPJ</label><input data-site="footer.cnpj" value="${esc(c['footer.cnpj'] || '')}" /></div>
      </div>

      <div class="admin-form-actions" style="padding-top:0;border:0">
        <button class="admin-btn admin-btn-primary" id="saveSiteContent">Salvar conteúdo</button>
      </div>
    `;

    $('#saveSiteContent').addEventListener('click', async () => {
      const payload = {};
      $$('[data-site]').forEach(el => { payload[el.dataset.site] = el.value; });
      try {
        await api('/site-content', {
          method: 'PUT',
          body: JSON.stringify({ content: payload }),
        });
        toast('Conteúdo do site atualizado.', 'success');
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  // ============================================================
  // NOTIFICAÇÕES BROADCAST
  // ============================================================
  async function loadNotifications() {
    const content = $('#adminContent');
    content.innerHTML = `
      <div class="admin-card">
        <h2>Enviar notificação</h2>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:18px">A notificação aparece no sino de todos os usuários ativos.</p>
        <div class="admin-form-grid">
          <div class="admin-form-field">
            <label>Tipo</label>
            <select id="notifType">
              <option value="info">Informação</option>
              <option value="success">Sucesso</option>
              <option value="warn">Aviso</option>
              <option value="err">Erro / crítico</option>
            </select>
          </div>
          <div class="admin-form-field full"><label>Título</label><input id="notifTitle" placeholder="Ex: Promoção de Black Friday" /></div>
          <div class="admin-form-field full"><label>Mensagem</label><textarea id="notifSub" rows="3" placeholder="Detalhes da notificação"></textarea></div>
        </div>
        <div class="admin-form-actions">
          <button class="admin-btn admin-btn-primary" id="sendNotif">Enviar para todos</button>
        </div>
      </div>
    `;

    $('#sendNotif').addEventListener('click', async () => {
      const title = $('#notifTitle').value.trim();
      const sub = $('#notifSub').value.trim();
      if (!title || !sub) {
        toast('Preencha título e mensagem.', 'warn');
        return;
      }
      confirmAction({
        title: 'Enviar para todos?',
        text: 'A notificação será enviada para todos os usuários ativos.',
        confirmLabel: 'Enviar',
        confirmClass: 'admin-btn-primary',
        onConfirm: async () => {
          const result = await api('/notifications/broadcast', {
            method: 'POST',
            body: JSON.stringify({ type: $('#notifType').value, title, sub }),
          });
          toast(`${result.sent} notificações enviadas.`, 'success');
          $('#notifTitle').value = '';
          $('#notifSub').value = '';
        },
      });
    });
  }

  // ============================================================
  // SIDEBAR MOBILE + LOGOUT
  // ============================================================
  function openSidebar() {
    $('#adminSidebar').classList.add('is-open');
    $('#adminOverlay').hidden = false;
  }
  function closeSidebar() {
    $('#adminSidebar').classList.remove('is-open');
    $('#adminOverlay').hidden = true;
  }

  function bindEvents() {
    $$('.admin-nav-item[data-section]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        setSection(item.dataset.section);
      });
    });

    $('#adminHamburger').addEventListener('click', openSidebar);
    $('#adminOverlay').addEventListener('click', closeSidebar);

    $('#logoutBtn').addEventListener('click', () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('streamly-admin-user');
      window.location.href = 'admin-login.html';
    });
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    // Popula info do admin
    $('#adminName').textContent = state.adminUser.name || 'Admin';
    $('#adminEmail').textContent = state.adminUser.email || '';

    // Badges de pendentes
    api('/stats').then(s => {
      if (s.tickets.pending > 0) {
        const b = $('#badgeTickets');
        b.textContent = s.tickets.pending;
        b.hidden = false;
      }
      if (s.cpfRequests.pending > 0) {
        const b = $('#badgeCpf');
        b.textContent = s.cpfRequests.pending;
        b.hidden = false;
      }
    }).catch(() => {});

    bindEvents();
    setSection('dashboard');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
