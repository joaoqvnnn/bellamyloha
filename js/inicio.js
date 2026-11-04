/* ============================================================
   INÍCIO — lógica do dashboard
   ============================================================ */

(function () {
  // ============ HELPERS ============
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  function formatCurrency(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR');
  }
  function formatDateShort(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function formatDateHuman(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function daysUntil(iso) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(iso + 'T00:00:00');
    return Math.round((target - today) / 86400000);
  }
  function initialOf(s) {
    return String(s || '?').charAt(0).toUpperCase();
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3600);
  }

  // ============ STATS ============
  const STAT_ICONS = {
    tv: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.7"/><path d="M21 4v5h-5"/></svg>',
    wallet: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5v1H5.5A2.5 2.5 0 0 0 3 11v6a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 17V9.5A2.5 2.5 0 0 0 18.5 7"/><circle cx="16.5" cy="13" r="1.4"/></svg>',
    order: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v16L17 19l-2.5 2-2.5-2-2.5 2-2.5-2L3.5 21V5A1.5 1.5 0 0 1 5 3.5Z"/><path d="M8 8.5h8M8 12.5h6"/></svg>',
  };

  function renderStats() {
    const s = HOME_STATS;
    const wrap = $('#homeStats');

    wrap.innerHTML = `
      <a href="index.html" class="stat-card" style="--sc:#e50914">
        <div class="stat-icon">${STAT_ICONS.tv}</div>
        <span class="stat-label">Telas ativas</span>
        <strong class="stat-value">${s.screens.active}</strong>
        <span class="stat-sub">${s.screens.total} no total${s.screens.expiring > 0 ? ` · <span style="color:var(--warn)">${s.screens.expiring} vencendo</span>` : ''}</span>
      </a>

      <a href="carteira.html" class="stat-card" style="--sc:#00c2a8">
        <div class="stat-icon">${STAT_ICONS.wallet}</div>
        <span class="stat-label">Saldo disponível</span>
        <strong class="stat-value">${formatCurrency(s.wallet.balance)}</strong>
        <span class="stat-sub">${s.wallet.pending > 0 ? `<span style="color:var(--warn)">${formatCurrency(s.wallet.pending)} pendente</span>` : 'Nenhum valor pendente'}</span>
      </a>

      <a href="meus-pedidos.html" class="stat-card" style="--sc:#0a84ff">
        <div class="stat-icon">${STAT_ICONS.order}</div>
        <span class="stat-label">Pedidos</span>
        <strong class="stat-value">${s.orders.total}</strong>
        <span class="stat-sub">${s.orders.pending > 0 ? `<span style="color:var(--warn)">${s.orders.pending} pendentes</span>` : 'Todos concluídos'}</span>
      </a>

      <a href="assinaturas.html" class="stat-card" style="--sc:#a78bfa">
        <div class="stat-icon">${STAT_ICONS.refresh}</div>
        <span class="stat-label">Assinaturas</span>
        <strong class="stat-value">${s.subscriptions.active}</strong>
        <span class="stat-sub">${s.subscriptions.nextDueIn > 0 ? `Próxima em ${s.subscriptions.nextDueIn} dias` : 'Nenhuma próxima'}</span>
      </a>
    `;
  }

  // ============ ALERTAS ============
  const ALERT_ICONS = {
    clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
    alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17v.1"/></svg>',
    wallet: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5v1H5.5A2.5 2.5 0 0 0 3 11v6a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 17V9.5A2.5 2.5 0 0 0 18.5 7"/><circle cx="16.5" cy="13" r="1.4"/></svg>',
  };

  function renderAlerts() {
    const wrap = $('#homeAlerts');
    if (HOME_ALERTS.length === 0) { wrap.hidden = true; return; }
    wrap.hidden = false;

    wrap.innerHTML = HOME_ALERTS.map(a => `
      <a href="${a.action}" class="alert-banner is-${a.type}">
        <div class="alert-icon">${ALERT_ICONS[a.icon] || ALERT_ICONS.alert}</div>
        <div class="alert-body">
          <div class="alert-title">${escapeHTML(a.title)}</div>
          <div class="alert-text">${escapeHTML(a.text)}</div>
        </div>
        <svg class="alert-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>
      </a>
    `).join('');
  }

  // ============ QUICK ACTION COUNTS ============
  function renderQuickActions() {
    $('#qaScreensCount').textContent = `${HOME_STATS.screens.active} ${HOME_STATS.screens.active === 1 ? 'tela ativa' : 'telas ativas'}`;
    $('#qaOrdersCount').textContent = `${HOME_STATS.orders.total} ${HOME_STATS.orders.total === 1 ? 'pedido' : 'pedidos'}`;
    $('#qaSubsCount').textContent = `${HOME_STATS.subscriptions.active} ${HOME_STATS.subscriptions.active === 1 ? 'assinatura' : 'assinaturas'}`;
  }

  // ============ TELAS ATIVAS ============
  function renderScreens() {
    const wrap = $('#homeScreens');
    if (HOME_SCREENS.length === 0) {
      wrap.innerHTML = `
        <div class="home-screens-empty">
          Você ainda não tem telas ativas. <a href="catalogo.html">Comprar agora</a>
        </div>
      `;
      $('#screensSub').textContent = 'Nenhuma tela no momento.';
      return;
    }

    $('#screensSub').textContent = `${HOME_SCREENS.length} ${HOME_SCREENS.length === 1 ? 'tela' : 'telas'} · acesso rápido`;

    wrap.innerHTML = HOME_SCREENS.map(s => {
      const days = daysUntil(s.dueDate);
      const statusLabel = s.status === 'ativa' ? 'Ativa' : s.status === 'proxima' ? `Vence em ${days}d` : s.status;
      return `
        <a href="index.html" class="home-screen-card">
          <div class="hsc-platform" style="--c:${s.platformColor}">${initialOf(s.platform)}</div>
          <div class="hsc-body">
            <div class="hsc-name">${escapeHTML(s.platform)} · ${escapeHTML(s.plan)}</div>
            <div class="hsc-meta">
              <span class="hsc-status ${s.status}">${statusLabel}</span>
              <span class="dot">·</span>
              <span>Vence ${formatDateShort(s.dueDate)}</span>
            </div>
          </div>
          <svg class="hsc-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>
        </a>
      `;
    }).join('');
  }

  // ============ PRODUTOS ============
  function renderProducts(container, items) {
    if (!items.length) {
      container.innerHTML = `<div class="home-orders-empty">Nenhum produto disponível no momento.</div>`;
      return;
    }

    container.innerHTML = items.map(p => `
      <a href="catalogo.html" class="home-product-card">
        <div class="hpc-image" style="--c:${p.platformColor}">
          ${p.discount ? `<span class="hpc-badge-discount">-${p.discount}%</span>` : ''}
          <span class="hpc-badge-delivery ${p.delivery === 'auto' ? 'auto' : ''}">
            ${p.delivery === 'auto' ? 'Imediata' : 'Manual'}
          </span>
          <span class="hpc-brand">${initialOf(p.platform)}</span>
        </div>
        <div class="hpc-body">
          <span class="hpc-platform">${escapeHTML(p.platform)}</span>
          <span class="hpc-name">${escapeHTML(p.name)}</span>
          ${p.oldPrice ? `<span class="hpc-old-price">${formatCurrency(p.oldPrice)}</span>` : ''}
          <span class="hpc-price">${formatCurrency(p.price)}<small>${p.period}</small></span>
        </div>
      </a>
    `).join('');
  }

  // ============ PEDIDOS ============
  const ORDER_STATUS_LABEL = {
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    em_processamento: 'Em proc.',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    reembolsado: 'Reembolsado',
  };

  function renderOrders() {
    const wrap = $('#homeOrders');
    if (HOME_RECENT_ORDERS.length === 0) {
      wrap.innerHTML = `<div class="home-orders-empty">Você ainda não fez nenhum pedido.</div>`;
      return;
    }

    wrap.innerHTML = HOME_RECENT_ORDERS.map(o => `
      <a href="meus-pedidos.html" class="home-order-card">
        <div class="hoc-icon" style="--c:${o.platformColor}">${initialOf(o.platform)}</div>
        <div class="hoc-body">
          <div class="hoc-title">${escapeHTML(o.product)}</div>
          <div class="hoc-meta">
            <span class="hoc-code">${o.id}</span>
            <span class="dot">·</span>
            <span>${formatDateShort(o.date)} às ${formatTime(o.date)}</span>
          </div>
        </div>
        <span class="hoc-status hoc-${o.status}">${ORDER_STATUS_LABEL[o.status] || o.status}</span>
        <span class="hoc-value">${formatCurrency(o.value)}</span>
      </a>
    `).join('');
  }

  // ============ NOTIFICAÇÕES ============
  function renderNotifications() {
    const list = $('#notifList');
    if (!list) return;

    list.innerHTML = HOME_NOTIFICATIONS.map((n, i) => {
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
            <div class="notif-item-title">${escapeHTML(n.title)}</div>
            <div class="notif-item-sub">${escapeHTML(n.sub)}</div>
          </div>
        </div>
      `;
    }).join('');

    const unread = HOME_NOTIFICATIONS.filter(n => n.unread).length;
    const badge = $('#notifBadge');
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? '' : 'none';
    }
  }

  // ============ HEADER PERSONALIZADO ============
  function renderHero() {
    // Nome
    let firstName = 'Carlos';
    try {
      const user = JSON.parse(localStorage.getItem('streamly-user') || '{}');
      if (user && user.name) firstName = user.name.split(' ')[0];
    } catch {}
    $('#heroName').textContent = firstName;

    // Data humanizada
    const now = new Date();
    const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
    const day = now.getDate();
    const month = now.toLocaleDateString('pt-BR', { month: 'long' });
    const formatted = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} de ${month}`;
    $('#heroDate').textContent = formatted;

    // Subtítulo baseado na hora
    const hour = now.getHours();
    let sub;
    if (hour < 6) sub = 'Boa madrugada. Aqui está o resumo da sua conta.';
    else if (hour < 12) sub = 'Bom dia. Aqui está o resumo da sua conta.';
    else if (hour < 18) sub = 'Boa tarde. Aqui está o resumo da sua conta.';
    else sub = 'Boa noite. Aqui está o resumo da sua conta.';
    $('#heroSub').textContent = sub;
  }

  // ============ CARRINHO — badge ============
  function updateCartBadge() {
    let count = 0;
    try {
      const cart = JSON.parse(localStorage.getItem('streamly-cart') || '[]');
      count = cart.reduce((sum, c) => sum + (c.qty || 1), 0);
    } catch {}
    ['#cartBadge', '#bnCartBadge'].forEach(sel => {
      const el = $(sel);
      if (!el) return;
      if (count > 0) { el.textContent = count; el.style.display = ''; }
      else el.style.display = 'none';
    });
  }

  // ============ EVENTOS ============
  function bindEvents() {
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

    // Cart
    const cartBtn = $('#cartBtn');
    if (cartBtn) {
      cartBtn.addEventListener('click', () => {
        window.location.href = 'catalogo.html';
      });
    }
    const bnCart = $('#bnCart');
    if (bnCart) {
      bnCart.addEventListener('click', () => {
        window.location.href = 'catalogo.html';
      });
    }

    // Fecha dropdowns
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        $$('.dropdown.is-open').forEach(d => d.classList.remove('is-open'));
      }
    });
  }

  // ============ INIT ============
  function init() {
    renderHero();
    renderStats();
    renderAlerts();
    renderQuickActions();
    renderScreens();
    renderProducts($('#homeFeatured'), HOME_FEATURED);
    renderProducts($('#homeRecommended'), HOME_RECOMMENDED);
    renderOrders();
    renderNotifications();
    updateCartBadge();
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
