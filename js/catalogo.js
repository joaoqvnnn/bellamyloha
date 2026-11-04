/* ============================================================
   CATÁLOGO — lógica
   ============================================================ */

(function () {
  // ============ CONFIG ============
  const MOCK_MODE = true;
  const API_BASE  = window.STREAMLY_API_BASE || '/api';
  const PER_PAGE = 9;

  // ============ ESTADO ============
  const state = {
    view: 'catalog',
    products: [],           // preenchido no init
    filtered: [],
    page: 1,
    search: '',
    category: 'todas',
    sort: 'relevance',
    filters: {
      categories: [],
      delivery: [],
      inStockOnly: false,
      priceMin: null,
      priceMax: null,
      ratingMin: 0,
    },
    activeProduct: null,
    productTab: 'descricao',
    productImageIndex: 0,
    cart: [],
    checkout: {
      step: 1,
      email: '',
      emailChanged: false,
      method: null,
      pixCharge: null,
      timerId: null,
      pollingId: null,
      orderCode: null,
    },
    bannerIndex: 0,
    bannerTimer: null,
  };

  const CART_KEY = 'streamly-cart';

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
  function formatDateLong(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function getProduct(id) {
    return CATALOG_PRODUCTS.find(p => p.id === id);
  }

  // ============ ICONS ============
  const ICONS = {
    star: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="m12 2.5 3 6.1 6.7 1-4.9 4.7 1.2 6.7L12 17.9 6 21 7.2 14.3 2.3 9.6l6.7-1 3-6.1Z"/></svg>',
    starOutline: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m12 2.5 3 6.1 6.7 1-4.9 4.7 1.2 6.7L12 17.9 6 21 7.2 14.3 2.3 9.6l6.7-1 3-6.1Z"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    verified: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    cart: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2.5 3.5h3l2.2 11h10.5l2-8H6"/></svg>',
    bolt: '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13l0-8Z"/></svg>',
    clock: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
    minus: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    plus: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    trash: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg>',
    shield: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 4.8 6v5.4c0 4.3 3 8.1 7.2 9.4 4.2-1.3 7.2-5.1 7.2-9.4V6L12 3.2Z"/></svg>',
  };

  // ============ TOAST ============
  const TOAST_ICONS = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>',
    error:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
    info:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></svg>',
    warn:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17v.1"/></svg>',
  };
  function toast(msg, type = 'info') {
    const stack = $('#toastStack');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span>${msg}</span>`;
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3600);
  }

  // ============ STARS ============
  function renderStars(rating, size = 12) {
    let html = '<span class="product-stars">';
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) html += ICONS.star;
      else if (i - 0.5 <= rating) html += '<span style="position:relative;display:inline-block;width:' + size + 'px;height:' + size + 'px">' + ICONS.starOutline + '<span style="position:absolute;inset:0;width:50%;overflow:hidden;color:#ffb300">' + ICONS.star + '</span></span>';
      else html += '<span style="opacity:.4">' + ICONS.star + '</span>';
    }
    html += '</span>';
    return html;
  }

  // ============ CART — localStorage ============
  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) state.cart = JSON.parse(raw);
    } catch { state.cart = []; }
  }
  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    renderCart();
    updateCartBadges();
  }

  function addToCart(productId, qty = 1, silent = false) {
    const p = getProduct(productId);
    if (!p) return;
    if (p.stock <= 0) { toast('Produto esgotado.', 'warn'); return; }
    const existing = state.cart.find(c => c.productId === productId);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, 10, p.stock);
    } else {
      state.cart.push({ productId, qty });
    }
    saveCart();
    if (!silent) {
      toast(`${p.name} adicionado ao carrinho.`, 'success');
      openCart();
    }
  }

  function removeFromCart(productId) {
    state.cart = state.cart.filter(c => c.productId !== productId);
    saveCart();
  }

  function updateCartQty(productId, qty) {
    const item = state.cart.find(c => c.productId === productId);
    if (!item) return;
    const p = getProduct(productId);
    if (qty <= 0) { removeFromCart(productId); return; }
    if (qty > p.stock) { toast('Estoque máximo atingido.', 'warn'); return; }
    item.qty = Math.min(qty, 10);
    saveCart();
  }

  function cartTotals() {
    let subtotal = 0, discount = 0;
    state.cart.forEach(c => {
      const p = getProduct(c.productId);
      if (!p) return;
      subtotal += p.price * c.qty;
      if (p.oldPrice) discount += (p.oldPrice - p.price) * c.qty;
    });
    return { subtotal, discount, total: subtotal };
  }

  function cartCount() {
    return state.cart.reduce((sum, c) => sum + c.qty, 0);
  }

  function updateCartBadges() {
    const count = cartCount();
    ['#cartBadge', '#bnCartBadge'].forEach(sel => {
      const el = $(sel);
      if (!el) return;
      if (count > 0) { el.textContent = count; el.style.display = ''; }
      else el.style.display = 'none';
    });
    const cc = $('#cartCount');
    if (cc) cc.textContent = `(${count})`;
  }

  // ============ BANNERS ============
  function renderBanners() {
    const track = $('#bannerTrack');
    const dots = $('#bannerDots');
    track.innerHTML = CATALOG_BANNERS.map(b => `
      <div class="banner-slide" style="background:${b.bg}" data-banner-product="${b.productId || ''}" data-banner-link="${b.link || ''}">
        <div class="banner-slide-content">
          <span class="banner-eyebrow">${b.eyebrow}</span>
          <h2>${b.title}</h2>
          <p>${b.subtitle}</p>
          <a href="#" class="banner-cta" data-banner-cta>
            ${b.cta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </div>
      </div>
    `).join('');

    dots.innerHTML = CATALOG_BANNERS.map((_, i) =>
      `<button class="banner-dot ${i === 0 ? 'is-active' : ''}" data-banner-dot="${i}" aria-label="Slide ${i+1}"></button>`
    ).join('');

    // Bind
    track.addEventListener('click', (e) => {
      const cta = e.target.closest('[data-banner-cta]');
      if (!cta) return;
      e.preventDefault();
      const slide = cta.closest('.banner-slide');
      const pid = slide.dataset.bannerProduct;
      const link = slide.dataset.bannerLink;
      if (pid) openProduct(pid);
      else if (link) window.location.href = link;
    });

    $$('[data-banner-dot]').forEach(d => {
      d.addEventListener('click', () => goToBanner(parseInt(d.dataset.bannerDot, 10)));
    });

    $('#bannerPrev').addEventListener('click', () => goToBanner(state.bannerIndex - 1));
    $('#bannerNext').addEventListener('click', () => goToBanner(state.bannerIndex + 1));

    startBannerAuto();
  }

  function goToBanner(idx) {
    const total = CATALOG_BANNERS.length;
    state.bannerIndex = ((idx % total) + total) % total;
    $('#bannerTrack').style.transform = `translateX(-${state.bannerIndex * 100}%)`;
    $$('[data-banner-dot]').forEach((d, i) => d.classList.toggle('is-active', i === state.bannerIndex));
    startBannerAuto();
  }

  function startBannerAuto() {
    clearInterval(state.bannerTimer);
    state.bannerTimer = setInterval(() => goToBanner(state.bannerIndex + 1), 6000);
  }

  // ============ CATEGORIAS ============
  function renderCategories() {
    const strip = $('#categoryStrip');
    const catCounts = {};

    CATALOG_PRODUCTS.forEach(p => {
      catCounts['todas'] = (catCounts['todas'] || 0) + 1;
      catCounts[p.category] = (catCounts[p.category] || 0) + 1;
      if (p.oldPrice) catCounts['promocoes'] = (catCounts['promocoes'] || 0) + 1;
    });

    strip.innerHTML = CATALOG_CATEGORIES.map(c => {
      const count = catCounts[c.id] || 0;
      return `
        <button class="category-chip ${state.category === c.id ? 'is-active' : ''}" data-category="${c.id}">
          ${c.label}
          <span class="cat-count">${count}</span>
        </button>
      `;
    }).join('');

    $$('#categoryStrip .category-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        state.category = btn.dataset.category;
        state.page = 1;
        renderCategories();
        applyFiltersAndRender();
      });
    });
  }

  // ============ FILTROS ============
  function applyFiltersAndRender() {
    let list = [...CATALOG_PRODUCTS];

    // Categoria (via strip)
    if (state.category === 'promocoes') list = list.filter(p => !!p.oldPrice);
    else if (state.category !== 'todas') list = list.filter(p => p.category === state.category);

    // Filtros do modal
    if (state.filters.categories.length) list = list.filter(p => state.filters.categories.includes(p.category));
    if (state.filters.delivery.length) list = list.filter(p => state.filters.delivery.includes(p.delivery));
    if (state.filters.inStockOnly) list = list.filter(p => p.stock > 0);
    if (state.filters.priceMin != null) list = list.filter(p => p.price >= state.filters.priceMin);
    if (state.filters.priceMax != null) list = list.filter(p => p.price <= state.filters.priceMax);
    if (state.filters.ratingMin > 0) list = list.filter(p => p.rating >= state.filters.ratingMin);

    // Busca
    if (state.search.trim()) {
      const q = state.search.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.platform.toLowerCase().includes(q) ||
        p.shortDesc.toLowerCase().includes(q)
      );
    }

    // Ordenação
    switch (state.sort) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'sales-desc': list.sort((a, b) => b.sales - a.sales); break;
      case 'rating-desc': list.sort((a, b) => b.rating - a.rating); break;
      case 'newest': list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')); break;
      default: // relevance
        list.sort((a, b) => {
          if (!!b.oldPrice !== !!a.oldPrice) return b.oldPrice ? 1 : -1;
          return b.rating - a.rating;
        });
    }

    state.filtered = list;

    const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * PER_PAGE;
    const pageItems = list.slice(start, start + PER_PAGE);

    $('#catalogCount').textContent = list.length;
    renderGrid(pageItems);
    renderPagination(totalPages);
    renderActiveFilters();
  }

  function renderGrid(items) {
    const grid = $('#productGrid');
    const empty = $('#emptyCatalog');

    if (items.length === 0) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    grid.innerHTML = items.map(p => {
      const outOfStock = p.stock <= 0;
      return `
        <article class="product-card ${outOfStock ? 'is-out-of-stock' : ''}" data-product="${p.id}">
          <div class="product-image" style="--pc:${p.platformColor}">
            ${p.oldPrice ? `<span class="product-badge-discount">-${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : ''}
            <span class="product-badge-delivery ${p.delivery === 'auto' ? 'auto' : ''}">
              ${p.delivery === 'auto' ? ICONS.bolt : ICONS.clock}
              ${p.delivery === 'auto' ? 'Imediata' : 'Manual'}
            </span>
            <span class="product-image-brand">${escapeHTML(p.platform.charAt(0))}</span>
            <span class="product-image-watermark">STREAMLY</span>
          </div>
          <div class="product-body">
            <span class="product-platform">${p.platform}</span>
            <h3 class="product-title">${p.name}</h3>
            <p class="product-desc">${p.shortDesc}</p>
            <div class="product-rating">
              ${renderStars(p.rating)}
              <strong>${p.rating.toFixed(1)}</strong>
              <span>(${p.reviewCount})</span>
              <span class="product-sales">${p.sales} vendas</span>
            </div>
            <div class="product-price-row">
              <div class="product-price-block">
                ${p.oldPrice ? `<div class="product-price-old">${formatCurrency(p.oldPrice)}</div>` : ''}
                <div class="product-price">
                  ${formatCurrency(p.price)}
                  <small>${p.period}</small>
                </div>
              </div>
            </div>
            <div class="product-actions">
              <button class="btn btn-primary" data-buy="${p.id}" ${outOfStock ? 'disabled' : ''}>
                ${outOfStock ? 'Esgotado' : 'Comprar'}
              </button>
              <button class="btn btn-ghost btn-add" data-add="${p.id}" ${outOfStock ? 'disabled' : ''} aria-label="Adicionar ao carrinho" title="Adicionar ao carrinho">
                ${ICONS.cart}
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Bind ações
    $$('[data-product]', grid).forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-buy]') || e.target.closest('[data-add]')) return;
        openProduct(card.dataset.product);
      });
    });
    $$('[data-buy]', grid).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = getProduct(btn.dataset.buy);
        if (!p) return;
        state.cart = [];
        addToCart(p.id, 1, true);
        openCheckout();
      });
    });
    $$('[data-add]', grid).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(btn.dataset.add, 1);
      });
    });
  }

  function renderPagination(totalPages) {
    const pagin = $('#pagination');
    if (totalPages <= 1) { pagin.innerHTML = ''; return; }

    const pages = [];
    pages.push(`<button data-page="prev" ${state.page === 1 ? 'disabled' : ''} aria-label="Anterior">‹</button>`);

    for (let i = 1; i <= totalPages; i++) {
      if (totalPages <= 7 || i === 1 || i === totalPages || Math.abs(i - state.page) <= 1) {
        pages.push(`<button data-page="${i}" class="${i === state.page ? 'is-active' : ''}">${i}</button>`);
      } else if (Math.abs(i - state.page) === 2) {
        pages.push(`<span style="color:var(--text-dim);padding:0 4px">…</span>`);
      }
    }
    pages.push(`<button data-page="next" ${state.page === totalPages ? 'disabled' : ''} aria-label="Próxima">›</button>`);

    pagin.innerHTML = pages.join('');

    $$('#pagination button').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.page;
        if (p === 'prev') state.page = Math.max(1, state.page - 1);
        else if (p === 'next') state.page = Math.min(totalPages, state.page + 1);
        else state.page = parseInt(p, 10);
        applyFiltersAndRender();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function renderActiveFilters() {
    const wrap = $('#activeFilters');
    const chips = [];
    if (state.filters.categories.length) state.filters.categories.forEach(c => chips.push({ label: c, clear: () => { state.filters.categories = state.filters.categories.filter(x => x !== c); applyFiltersAndRender(); } }));
    if (state.filters.delivery.length) state.filters.delivery.forEach(d => chips.push({ label: d === 'auto' ? 'Entrega imediata' : 'Entrega manual', clear: () => { state.filters.delivery = state.filters.delivery.filter(x => x !== d); applyFiltersAndRender(); } }));
    if (state.filters.inStockOnly) chips.push({ label: 'Com estoque', clear: () => { state.filters.inStockOnly = false; applyFiltersAndRender(); } });
    if (state.filters.priceMin != null) chips.push({ label: `≥ ${formatCurrency(state.filters.priceMin)}`, clear: () => { state.filters.priceMin = null; applyFiltersAndRender(); } });
    if (state.filters.priceMax != null) chips.push({ label: `≤ ${formatCurrency(state.filters.priceMax)}`, clear: () => { state.filters.priceMax = null; applyFiltersAndRender(); } });
    if (state.filters.ratingMin > 0) chips.push({ label: `${state.filters.ratingMin}+ estrelas`, clear: () => { state.filters.ratingMin = 0; applyFiltersAndRender(); } });

    if (chips.length === 0) { wrap.hidden = true; wrap.innerHTML = ''; $('#filterCount').hidden = true; return; }
    wrap.hidden = false;
    wrap.innerHTML = chips.map((c, i) => `
      <span class="active-filter">
        ${escapeHTML(c.label)}
        <button data-clear-filter="${i}" aria-label="Remover"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      </span>
    `).join('');
    $$('[data-clear-filter]').forEach(btn => {
      btn.addEventListener('click', () => chips[parseInt(btn.dataset.clearFilter, 10)].clear());
    });

    const fc = $('#filterCount');
    fc.textContent = chips.length;
    fc.hidden = false;
  }

  // ============ PRODUCT DETAIL ============
  function openProduct(id) {
    const p = getProduct(id);
    if (!p) return;
    state.activeProduct = p;
    state.productTab = 'descricao';
    state.productImageIndex = 0;
    state.view = 'product';
    renderProductView();
    $('#viewCatalog').hidden = true;
    $('#viewProduct').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeProduct() {
    state.view = 'catalog';
    $('#viewProduct').hidden = true;
    $('#viewCatalog').hidden = false;
    state.activeProduct = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderProductView() {
    const p = state.activeProduct;
    if (!p) return;

    $('#bcCategory').textContent = p.category;
    $('#bcProduct').textContent = p.name;
    $('#breadcrumb').querySelector('[data-bc="catalog"]').addEventListener('click', (e) => {
      e.preventDefault();
      closeProduct();
    });

    const thumbs = [0, 1, 2, 3];

    $('#productDetail').innerHTML = `
      <div class="product-gallery">
        <div class="product-main-image" style="--pc:${p.platformColor}">
          <span class="product-image-brand">${escapeHTML(p.platform.charAt(0))}</span>
        </div>
        <div class="product-thumbs">
          ${thumbs.map(i => `
            <div class="product-thumb ${i === state.productImageIndex ? 'is-active' : ''}" style="--pc:${p.platformColor}" data-thumb="${i}">
              <span class="product-image-brand">${escapeHTML(p.platform.charAt(0))}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="product-info">
        <span class="product-info-platform" style="--pc:${p.platformColor}">${p.platform}</span>
        <h1>${p.name}</h1>

        <div class="product-info-meta">
          <div class="product-rating">
            ${renderStars(p.rating, 14)}
            <strong>${p.rating.toFixed(1)}</strong>
            <span>(${p.reviewCount} avaliações)</span>
          </div>
          <span>${p.sales} vendas</span>
        </div>

        <div class="product-price-box">
          ${p.oldPrice ? `<div class="ppb-old">${formatCurrency(p.oldPrice)}</div>` : ''}
          <div class="ppb-current">
            <strong>${formatCurrency(p.price)}</strong>
            <span>${p.period}</span>
          </div>
          ${p.oldPrice ? `<span class="ppb-discount">Economize ${formatCurrency(p.oldPrice - p.price)}</span>` : ''}
        </div>

        <div class="product-delivery-info">
          ${p.delivery === 'auto' ? ICONS.bolt : ICONS.clock}
          <div>
            <strong>${p.delivery === 'auto' ? 'Entrega automática em até 5 minutos' : 'Entrega manual em até 2h úteis'}</strong>
            <br>Produto enviado para o e-mail cadastrado e disponível em Minhas telas.
          </div>
        </div>

        <div class="product-stock ${p.stock <= 0 ? 'out' : p.stock <= 5 ? 'low' : ''}">
          ${ICONS.check}
          ${p.stock <= 0 ? 'Produto esgotado' : p.stock <= 5 ? `Últimas ${p.stock} unidades` : `${p.stock} unidades em estoque`}
        </div>

        <div class="product-cta">
          <button class="btn btn-primary" id="buyNowBtn" ${p.stock <= 0 ? 'disabled' : ''}>
            ${p.stock <= 0 ? 'Produto esgotado' : 'Comprar agora'}
          </button>
          <button class="btn btn-ghost" id="addToCartBtn" ${p.stock <= 0 ? 'disabled' : ''}>
            ${ICONS.cart}
            Adicionar ao carrinho
          </button>
        </div>
      </div>
    `;

    // Bind gallery thumbs
    $$('.product-thumb').forEach(t => {
      t.addEventListener('click', () => {
        state.productImageIndex = parseInt(t.dataset.thumb, 10);
        $$('.product-thumb').forEach(x => x.classList.toggle('is-active', x === t));
      });
    });

    // Buy now
    const buy = $('#buyNowBtn');
    if (buy) buy.addEventListener('click', () => {
      state.cart = [];
      addToCart(p.id, 1, true);
      openCheckout();
    });

    // Add to cart
    const add = $('#addToCartBtn');
    if (add) add.addEventListener('click', () => addToCart(p.id, 1));

    // Tabs
    $('#productDetail').insertAdjacentHTML('afterend', `
      <div class="product-tabs">
        <div class="product-tabs-nav">
          <button class="product-tab-btn ${state.productTab === 'descricao' ? 'is-active' : ''}" data-tab="descricao">Descrição</button>
          <button class="product-tab-btn ${state.productTab === 'caracteristicas' ? 'is-active' : ''}" data-tab="caracteristicas">Características</button>
          <button class="product-tab-btn ${state.productTab === 'funcionamento' ? 'is-active' : ''}" data-tab="funcionamento">Como funciona</button>
        </div>
        <div class="product-tab-panel ${state.productTab === 'descricao' ? 'is-active' : ''}" data-panel="descricao">
          <div class="product-desc-text"><p>${p.description}</p></div>
        </div>
        <div class="product-tab-panel ${state.productTab === 'caracteristicas' ? 'is-active' : ''}" data-panel="caracteristicas">
          <div class="product-features">
            ${p.features.map(f => `<div class="feature-item">${ICONS.check}<span>${f}</span></div>`).join('')}
          </div>
        </div>
        <div class="product-tab-panel ${state.productTab === 'funcionamento' ? 'is-active' : ''}" data-panel="funcionamento">
          <div class="how-it-works">
            <strong>Como funciona a entrega:</strong>
            <ol>
              ${p.howItWorks.map(step => `<li>${step}</li>`).join('')}
            </ol>
          </div>
        </div>
      </div>
    `);

    $$('.product-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.productTab = btn.dataset.tab;
        $$('.product-tab-btn').forEach(b => b.classList.toggle('is-active', b === btn));
        $$('.product-tab-panel').forEach(panel => panel.classList.toggle('is-active', panel.dataset.panel === state.productTab));
      });
    });

    renderProductReviews(p);
    renderProductSimilars(p);
  }

  function renderProductReviews(p) {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    p.reviews.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1; });

    // Adiciona reviews distribuídas para o total do produto (mock)
    const totalMock = p.reviewCount;
    const extraRatings = totalMock - p.reviews.length;
    if (extraRatings > 0) {
      dist[5] += Math.round(extraRatings * 0.65);
      dist[4] += Math.round(extraRatings * 0.22);
      dist[3] += Math.round(extraRatings * 0.08);
      dist[2] += Math.round(extraRatings * 0.03);
      dist[1] += Math.max(0, extraRatings - dist[5] - dist[4] - dist[3] - dist[2] - p.reviews.filter(r => r.rating === 5).length);
    }

    const total = Object.values(dist).reduce((a, b) => a + b, 0);

    $('#reviewsSection').innerHTML = `
      <div class="reviews-head">
        <div>
          <h2>Avaliações dos clientes</h2>
          <p>${p.reviews.length} avaliações verificadas · ${p.sales} compras</p>
        </div>
      </div>

      <div class="reviews-grid">
        <div class="reviews-summary">
          <div class="reviews-summary-score">${p.rating.toFixed(1)}</div>
          <div class="reviews-summary-stars">${renderStars(p.rating, 16)}</div>
          <div class="reviews-summary-text">${total} avaliações</div>
          <div class="reviews-distribution">
            ${[5, 4, 3, 2, 1].map(star => {
              const pct = total > 0 ? (dist[star] / total) * 100 : 0;
              return `
                <div class="rd-row">
                  <span class="rd-label">${star}★</span>
                  <div class="rd-bar"><div class="rd-bar-fill" style="width:${pct}%"></div></div>
                  <span class="rd-count">${dist[star]}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="reviews-list">
          ${p.reviews.map(r => `
            <div class="review-card">
              <div class="review-head">
                <div class="review-avatar">${escapeHTML(r.author.charAt(0))}</div>
                <div>
                  <div class="review-author">${escapeHTML(r.author)}</div>
                  <div style="display:flex;align-items:center;gap:6px">
                    ${renderStars(r.rating, 13)}
                    ${r.verified ? `<span class="review-verified">${ICONS.verified} Compra verificada</span>` : ''}
                  </div>
                </div>
                <span class="review-date">${formatDate(r.date)}</span>
              </div>
              <p class="review-text">${escapeHTML(r.text)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderProductSimilars(p) {
    if (!p.similar || p.similar.length === 0) { $('#similarSection').innerHTML = ''; return; }
    const items = p.similar.map(id => getProduct(id)).filter(Boolean);

    $('#similarSection').innerHTML = `
      <h2>Produtos similares</h2>
      <div class="similar-grid">
        ${items.map(sp => `
          <article class="product-card" data-product="${sp.id}">
            <div class="product-image" style="--pc:${sp.platformColor};aspect-ratio:16/9">
              ${sp.oldPrice ? `<span class="product-badge-discount">-${Math.round((1 - sp.price / sp.oldPrice) * 100)}%</span>` : ''}
              <span class="product-badge-delivery ${sp.delivery === 'auto' ? 'auto' : ''}">
                ${sp.delivery === 'auto' ? ICONS.bolt : ICONS.clock}
                ${sp.delivery === 'auto' ? 'Imediata' : 'Manual'}
              </span>
              <span class="product-image-brand" style="font-size:48px">${escapeHTML(sp.platform.charAt(0))}</span>
            </div>
            <div class="product-body">
              <span class="product-platform">${sp.platform}</span>
              <h3 class="product-title" style="font-size:13px">${sp.name}</h3>
              <div class="product-rating">
                ${renderStars(sp.rating)}
                <strong>${sp.rating.toFixed(1)}</strong>
              </div>
              <div class="product-price-row">
                <div class="product-price-block">
                  ${sp.oldPrice ? `<div class="product-price-old">${formatCurrency(sp.oldPrice)}</div>` : ''}
                  <div class="product-price" style="font-size:17px">
                    ${formatCurrency(sp.price)}
                    <small>${sp.period}</small>
                  </div>
                </div>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;

    $$('#similarSection .product-card').forEach(card => {
      card.addEventListener('click', () => openProduct(card.dataset.product));
    });
  }

  // ============ CART — RENDER ============
  function openCart() {
    $('#cartDrawer').classList.add('is-open');
    $('#cartOverlay').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeCart() {
    $('#cartDrawer').classList.remove('is-open');
    $('#cartOverlay').hidden = true;
    document.body.style.overflow = '';
  }

  function renderCart() {
    const items = state.cart;
    const itemsEl = $('#cartItems');
    const emptyEl = $('#cartEmpty');
    const footerEl = $('#cartFooter');

    if (items.length === 0) {
      itemsEl.innerHTML = '';
      emptyEl.hidden = false;
      footerEl.hidden = true;
      return;
    }

    emptyEl.hidden = true;
    footerEl.hidden = false;

    itemsEl.innerHTML = items.map(item => {
      const p = getProduct(item.productId);
      if (!p) return '';
      return `
        <div class="cart-item" data-cart-item="${p.id}">
          <div class="cart-item-img" style="--pc:${p.platformColor}">${escapeHTML(p.platform.charAt(0))}</div>
          <div class="cart-item-body">
            <div class="cart-item-title">${escapeHTML(p.name)}</div>
            <div class="cart-item-meta">${p.period} · ${p.delivery === 'auto' ? 'Imediata' : 'Manual'}</div>
            <div class="cart-item-controls">
              <div class="qty-control">
                <button data-qty-dec="${p.id}" aria-label="Diminuir">${ICONS.minus}</button>
                <span>${item.qty}</span>
                <button data-qty-inc="${p.id}" aria-label="Aumentar">${ICONS.plus}</button>
              </div>
              <button class="cart-item-remove" data-cart-remove="${p.id}">Remover</button>
            </div>
          </div>
          <div class="cart-item-price">${formatCurrency(p.price * item.qty)}</div>
        </div>
      `;
    }).join('');

    // Bind
    $$('[data-qty-inc]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.qtyInc;
      const item = state.cart.find(c => c.productId === id);
      if (item) updateCartQty(id, item.qty + 1);
    }));
    $$('[data-qty-dec]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.qtyDec;
      const item = state.cart.find(c => c.productId === id);
      if (item) updateCartQty(id, item.qty - 1);
    }));
    $$('[data-cart-remove]').forEach(b => b.addEventListener('click', () => {
      removeFromCart(b.dataset.cartRemove);
      toast('Item removido do carrinho.', 'info');
    }));

    // Totals
    const t = cartTotals();
    $('#cartSubtotal').textContent = formatCurrency(t.subtotal);
    if (t.discount > 0) {
      $('#cartDiscountRow').hidden = false;
      $('#cartDiscount').textContent = '− ' + formatCurrency(t.discount);
    } else {
      $('#cartDiscountRow').hidden = true;
    }
    $('#cartTotal').textContent = formatCurrency(t.total);

    updateCartBadges();
  }

  // ============ CHECKOUT ============
  function openCheckout() {
    if (state.cart.length === 0) {
      toast('Seu carrinho está vazio.', 'warn');
      return;
    }
    closeCart();
    state.checkout = {
      step: 1,
      email: 'carlos.oliveira@email.com',
      emailChanged: false,
      method: null,
      pixCharge: null,
      timerId: null,
      pollingId: null,
      orderCode: null,
    };
    $('#checkoutModal').hidden = false;
    document.body.style.overflow = 'hidden';
    renderCheckout();
  }

  function closeCheckout() {
    if (state.checkout.timerId) clearInterval(state.checkout.timerId);
    if (state.checkout.pollingId) clearInterval(state.checkout.pollingId);
    $('#checkoutModal').hidden = true;
    document.body.style.overflow = '';
  }

  function renderCheckout() {
    // Atualiza steps
    $$('.chk-step').forEach(s => {
      const n = parseInt(s.dataset.step, 10);
      s.classList.toggle('is-active', n === state.checkout.step);
      s.classList.toggle('is-done', n < state.checkout.step);
    });

    const body = $('#checkoutBody');
    const step = state.checkout.step;

    if (step === 1) renderCheckoutEmail(body);
    else if (step === 2) renderCheckoutPayment(body);
    else if (step === 3) renderCheckoutReview(body);
    else if (step === 4) renderCheckoutPaymentProcessing(body);
    else if (step === 5) renderCheckoutSuccess(body);
  }

  function renderCheckoutEmail(body) {
    body.innerHTML = `
      <h2 class="checkout-title">Confirme seu e-mail</h2>
      <p class="checkout-subtitle">O produto será enviado para o e-mail abaixo. Você também pode alterá-lo antes de finalizar.</p>

      <div class="checkout-email-current">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/></svg>
        <strong id="checkoutEmailDisplay">${escapeHTML(state.checkout.email)}</strong>
        <button id="changeEmailBtn">${state.checkout.emailChanged ? 'Cancelar' : 'Alterar'}</button>
      </div>

      <div id="changeEmailForm" ${state.checkout.emailChanged ? '' : 'hidden'}>
        <div class="checkout-field">
          <label for="checkoutEmailInput">Novo e-mail</label>
          <input id="checkoutEmailInput" type="email" placeholder="voce@email.com" value="${state.checkout.emailChanged ? '' : ''}" />
          <span class="field-error" id="checkoutEmailError"></span>
        </div>
      </div>

      <div class="checkout-nav">
        <button class="btn btn-ghost" data-close-checkout>Cancelar</button>
        <button class="btn btn-primary" id="checkoutEmailNext">Continuar</button>
      </div>
    `;

    const changeBtn = $('#changeEmailBtn');
    const form = $('#changeEmailForm');
    const input = $('#checkoutEmailInput');

    changeBtn.addEventListener('click', () => {
      state.checkout.emailChanged = !state.checkout.emailChanged;
      form.hidden = !state.checkout.emailChanged;
      changeBtn.textContent = state.checkout.emailChanged ? 'Cancelar' : 'Alterar';
      if (state.checkout.emailChanged) setTimeout(() => input.focus(), 60);
    });

    $('#checkoutEmailNext').addEventListener('click', () => {
      const err = $('#checkoutEmailError');
      err.textContent = '';
      if (state.checkout.emailChanged) {
        const val = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(val)) {
          err.textContent = 'Informe um e-mail válido.';
          input.focus();
          return;
        }
        state.checkout.email = val;
      }
      state.checkout.step = 2;
      renderCheckout();
    });
  }

  function renderCheckoutPayment(body) {
    const t = cartTotals();
    body.innerHTML = `
      <h2 class="checkout-title">Como você quer pagar?</h2>
      <p class="checkout-subtitle">Total: <strong style="color:var(--text)">${formatCurrency(t.total)}</strong>. O produto só é liberado após a confirmação do pagamento.</p>

      <div class="payment-options">
        <button class="payment-option ${state.checkout.method === 'pix' ? 'is-selected' : ''}" data-method="pix">
          <div class="payment-option-icon payment-option-icon-pix">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 3.2 3.2L12 9.4 8.8 6.2 12 3ZM20.6 11.4l-3.2 3.2-3.2-3.2 3.2-3.2 3.2 3.2ZM6.8 11.4l-3.2 3.2L12 21l8.4-6.4-3.2-3.2"/></svg>
          </div>
          <div class="payment-option-body">
            <div class="payment-option-title">PIX via Mercado Pago</div>
            <div class="payment-option-sub">Confirmação em segundos. Liberação imediata.</div>
          </div>
          <div class="payment-option-radio"></div>
        </button>

        <button class="payment-option ${state.checkout.method === 'wallet' ? 'is-selected' : ''}" data-method="wallet">
          <div class="payment-option-icon payment-option-icon-wallet">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5v1H5.5A2.5 2.5 0 0 0 3 11v6a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 17V9.5A2.5 2.5 0 0 0 18.5 7"/><circle cx="16.5" cy="13" r="1.4"/></svg>
          </div>
          <div class="payment-option-body">
            <div class="payment-option-title">Saldo da carteira</div>
            <div class="payment-option-sub">Disponível: R$ 245,80 · Liberação imediata</div>
          </div>
          <div class="payment-option-radio"></div>
        </button>

        <button class="payment-option ${state.checkout.method === 'card' ? 'is-selected' : ''}" data-method="card">
          <div class="payment-option-icon payment-option-icon-card">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/></svg>
          </div>
          <div class="payment-option-body">
            <div class="payment-option-title">Cartão de crédito</div>
            <div class="payment-option-sub">Visa, Master, Elo, Amex · Até 3x sem juros</div>
          </div>
          <div class="payment-option-radio"></div>
        </button>
      </div>

      <div class="checkout-nav">
        <button class="btn btn-ghost" id="checkoutBack1">Voltar</button>
        <button class="btn btn-primary" id="checkoutPaymentNext" ${state.checkout.method ? '' : 'disabled'}>Continuar</button>
      </div>
    `;

    $$('.payment-option').forEach(opt => {
      opt.addEventListener('click', () => {
        state.checkout.method = opt.dataset.method;
        $$('.payment-option').forEach(o => o.classList.toggle('is-selected', o === opt));
        $('#checkoutPaymentNext').disabled = false;
      });
    });

    $('#checkoutBack1').addEventListener('click', () => { state.checkout.step = 1; renderCheckout(); });
    $('#checkoutPaymentNext').addEventListener('click', () => {
      if (!state.checkout.method) return;
      state.checkout.step = 3;
      renderCheckout();
    });
  }

  function renderCheckoutReview(body) {
    const t = cartTotals();
    const methodLabels = { pix: 'PIX via Mercado Pago', wallet: 'Saldo da carteira', card: 'Cartão de crédito' };

    body.innerHTML = `
      <h2 class="checkout-title">Revisar pedido</h2>
      <p class="checkout-subtitle">Confira os dados antes de finalizar.</p>

      <div class="checkout-summary">
        <h4>Itens</h4>
        ${state.cart.map(item => {
          const p = getProduct(item.productId);
          if (!p) return '';
          return `
            <div class="checkout-summary-item">
              <div class="csi-name">${escapeHTML(p.name)}<small>Qtd. ${item.qty} · ${p.period}</small></div>
              <div class="csi-price">${formatCurrency(p.price * item.qty)}</div>
            </div>
          `;
        }).join('')}
        ${t.discount > 0 ? `
          <div class="checkout-summary-item">
            <div class="csi-name">Descontos</div>
            <div class="csi-price" style="color:var(--ok)">− ${formatCurrency(t.discount)}</div>
          </div>
        ` : ''}
        <div class="checkout-summary-item" style="padding-top:12px;border-top:1px solid var(--border);margin-top:6px">
          <div class="csi-name" style="font-weight:700;font-size:14px">Total</div>
          <div class="csi-price" style="font-size:18px">${formatCurrency(t.total)}</div>
        </div>
      </div>

      <div class="checkout-summary">
        <h4>Entrega e pagamento</h4>
        <div class="checkout-summary-item">
          <div class="csi-name">E-mail de entrega</div>
          <div class="csi-price" style="font-weight:600">${escapeHTML(state.checkout.email)}</div>
        </div>
        <div class="checkout-summary-item">
          <div class="csi-name">Forma de pagamento</div>
          <div class="csi-price" style="font-weight:600">${methodLabels[state.checkout.method]}</div>
        </div>
        <div class="checkout-summary-item">
          <div class="csi-name">Prazo de entrega</div>
          <div class="csi-price" style="font-weight:600">${state.cart.some(c => getProduct(c.productId)?.delivery === 'manual') ? 'Até 2h úteis (manual)' : 'Até 5 minutos (automática)'}</div>
        </div>
      </div>

      <div class="checkout-nav">
        <button class="btn btn-ghost" id="checkoutBack2">Voltar</button>
        <button class="btn btn-primary" id="checkoutFinish">Finalizar e pagar</button>
      </div>
    `;

    $('#checkoutBack2').addEventListener('click', () => { state.checkout.step = 2; renderCheckout(); });
    $('#checkoutFinish').addEventListener('click', () => {
      state.checkout.step = 4;
      renderCheckout();
    });
  }

  function renderCheckoutPaymentProcessing(body) {
    if (state.checkout.method === 'pix') {
      generatePixCharge(body);
    } else {
      // Cartão ou saldo — simula aprovação automática
      body.innerHTML = `
        <div style="text-align:center;padding:40px 0">
          <div class="cart-empty-icon" style="margin:0 auto 20px;background:color-mix(in srgb,var(--info) 16%,transparent);color:var(--info)">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>
          </div>
          <h2 style="font-size:16px;font-weight:700;margin-bottom:6px">Processando pagamento...</h2>
          <p style="color:var(--text-muted);font-size:13px">Aguarde enquanto confirmamos.</p>
        </div>
      `;
      setTimeout(() => approveOrder(body), 1800);
    }
  }

  async function generatePixCharge(body) {
    const t = cartTotals();
    body.innerHTML = `
      <div style="text-align:center;padding:30px 0">
        <div class="cart-empty-icon" style="margin:0 auto 20px;background:color-mix(in srgb,var(--info) 16%,transparent);color:var(--info)">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>
        </div>
        <h2 style="font-size:16px;font-weight:700;margin-bottom:6px">Gerando cobrança PIX...</h2>
        <p style="color:var(--text-muted);font-size:13px">Aguarde um instante.</p>
      </div>
    `;

    try {
      const charge = await apiCreateCheckoutPix(t.total);
      state.checkout.pixCharge = charge;
      renderPixPaymentView(body);
      startPixPolling();
    } catch (err) {
      body.innerHTML = `
        <h2 class="checkout-title">Erro ao gerar cobrança</h2>
        <p class="checkout-subtitle">${err.message || 'Não foi possível gerar a cobrança PIX. Tente novamente.'}</p>
        <div class="checkout-nav">
          <button class="btn btn-ghost" id="checkoutBack3">Voltar</button>
          <button class="btn btn-primary" id="checkoutRetry">Tentar novamente</button>
        </div>
      `;
      $('#checkoutBack3').addEventListener('click', () => { state.checkout.step = 2; renderCheckout(); });
      $('#checkoutRetry').addEventListener('click', () => renderCheckoutPaymentProcessing(body));
    }
  }

  function renderPixPaymentView(body) {
    const charge = state.checkout.pixCharge;
    const t = cartTotals();

    body.innerHTML = `
      <h2 class="checkout-title">Pague via PIX</h2>
      <p class="checkout-subtitle">Escaneie o QR Code ou copie o código abaixo. O produto é liberado assim que confirmarmos o pagamento.</p>

      <div class="pix-view">
        <div class="pix-qr">
          <img src="${charge.qr_code_base64}" width="180" height="180" alt="QR Code PIX" />
        </div>
        <div class="pix-amount">${formatCurrency(t.total)}</div>
        <div class="pix-expire">
          ${ICONS.clock}
          Expira em <strong id="pixTimer">30:00</strong>
        </div>
      </div>

      <div class="pix-code">
        <span class="code" id="pixCodeText">${charge.qr_code}</span>
        <button class="btn btn-ghost" id="pixCopyBtn">Copiar</button>
      </div>

      <div class="pix-instructions">
        <strong>Como pagar:</strong> Abra o app do seu banco, escolha PIX → QR Code ou Copia e Cola, cole o código acima e confirme. O saldo será creditado automaticamente.
      </div>

      <div class="checkout-nav">
        <button class="btn btn-ghost" id="pixCancelBtn">Cancelar</button>
        <button class="btn btn-primary" id="pixCheckBtn">Já paguei</button>
      </div>
    `;

    $('#pixCopyBtn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(charge.qr_code);
        toast('Código PIX copiado.', 'success');
      } catch { toast('Não foi possível copiar.', 'warn'); }
    });

    $('#pixCancelBtn').addEventListener('click', () => {
      if (state.checkout.pollingId) clearInterval(state.checkout.pollingId);
      if (state.checkout.timerId) clearInterval(state.checkout.timerId);
      closeCheckout();
    });

    $('#pixCheckBtn').addEventListener('click', () => {
      toast('Verificando pagamento...', 'info');
      checkPixOnce();
    });

    startPixTimer();
  }

  function startPixTimer() {
    if (state.checkout.timerId) clearInterval(state.checkout.timerId);
    let seconds = 30 * 60;
    state.checkout.timerId = setInterval(() => {
      seconds--;
      const el = $('#pixTimer');
      if (!el) { clearInterval(state.checkout.timerId); return; }
      if (seconds <= 0) {
        clearInterval(state.checkout.timerId);
        clearInterval(state.checkout.pollingId);
        const body = $('#checkoutBody');
        body.innerHTML = `
          <div style="text-align:center;padding:40px 0">
            <div class="cart-empty-icon" style="margin:0 auto 20px;background:color-mix(in srgb,var(--warn) 16%,transparent);color:var(--warn)">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.2v.1"/></svg>
            </div>
            <h2 style="font-size:16px;font-weight:700;margin-bottom:6px">Cobrança expirada</h2>
            <p style="color:var(--text-muted);font-size:13px;margin-bottom:20px">O prazo para pagamento terminou.</p>
          </div>
          <div class="checkout-nav">
            <button class="btn btn-ghost" data-close-checkout>Fechar</button>
            <button class="btn btn-primary" id="pixRetryBtn">Tentar novamente</button>
          </div>
        `;
        body.querySelector('[data-close-checkout]').addEventListener('click', closeCheckout);
        $('#pixRetryBtn').addEventListener('click', () => { state.checkout.step = 4; renderCheckout(); });
        return;
      }
      const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
      const ss = String(seconds % 60).padStart(2, '0');
      el.textContent = `${mm}:${ss}`;
    }, 1000);
  }

  function startPixPolling() {
    if (state.checkout.pollingId) clearInterval(state.checkout.pollingId);
    state.checkout.pollingId = setInterval(checkPixOnce, 3000);
  }

  async function checkPixOnce() {
    if (!state.checkout.pixCharge) return;
    try {
      const result = await apiCheckCheckout(state.checkout.pixCharge.id);
      if (result.status === 'approved') {
        if (state.checkout.timerId) clearInterval(state.checkout.timerId);
        if (state.checkout.pollingId) clearInterval(state.checkout.pollingId);
        approveOrder($('#checkoutBody'));
      } else if (result.status === 'expired' || result.status === 'cancelled') {
        if (state.checkout.timerId) clearInterval(state.checkout.timerId);
        if (state.checkout.pollingId) clearInterval(state.checkout.pollingId);
      }
    } catch {}
  }

  async function approveOrder(body) {
    // Cria pedido mock
    const t = cartTotals();
    const code = 'PED-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000));
    state.checkout.orderCode = code;

    // Limpa carrinho
    state.cart = [];
    saveCart();

    state.checkout.step = 5;
    renderCheckout();
  }

  function renderCheckoutSuccess(body) {
    const t = cartTotals();
    body.innerHTML = `
      <div class="checkout-success">
        <div class="checkout-success-icon">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
        </div>
        <h2>Pagamento confirmado!</h2>
        <p>Seu pedido <strong>${state.checkout.orderCode}</strong> foi aprovado. O produto será enviado para <strong>${escapeHTML(state.checkout.email)}</strong> e ficará disponível em Minhas telas.</p>
        <div class="checkout-success-code">${state.checkout.orderCode}</div>

        <div class="checkout-success-links">
          <a href="index.html" class="btn btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            Ver minhas telas
          </a>
          <a href="meus-pedidos.html" class="btn btn-ghost">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v16L17 19l-2.5 2-2.5-2-2.5 2-2.5-2L3.5 21V5A1.5 1.5 0 0 1 5 3.5Z"/></svg>
            Meus pedidos
          </a>
        </div>
      </div>
    `;
  }

  // ============ API (MOCK + REAL) ============
  async function apiCreateCheckoutPix(amount) {
    if (MOCK_MODE) {
      await sleep(600);
      return {
        id: 'MOCK-ORD-' + Date.now(),
        status: 'pending',
        amount,
        qr_code_base64: generateMockQRBase64(),
        qr_code: '00020126580014BR.GOV.BCB.PIX0136' + Math.random().toString(36).slice(2) + '5204000053039865802BR5913STREAMLY6009SAO PAULO62070503***6304ABCD',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
    }
    const res = await fetch(`${API_BASE}/checkout/pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        items: state.cart,
        email: state.checkout.email,
      }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Falha ao gerar cobrança.');
    return res.json();
  }

  async function apiCheckCheckout(chargeId) {
    if (MOCK_MODE) {
      await sleep(300);
      return { id: chargeId, status: Math.random() < 0.3 ? 'approved' : 'pending' };
    }
    const res = await fetch(`${API_BASE}/checkout/pix/${chargeId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Falha ao verificar.');
    return res.json();
  }

  function generateMockQRBase64() {
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

  // ============ FILTER MODAL ============
  function openFilterModal() {
    // Popula categorias únicas
    const cats = [...new Set(CATALOG_PRODUCTS.map(p => p.category))];
    const catWrap = $('#filterCategories');
    catWrap.innerHTML = cats.map(c => `
      <label class="filter-check">
        <input type="checkbox" value="${c}" data-filter-cat ${state.filters.categories.includes(c) ? 'checked' : ''} />
        <span class="fc-box"></span>
        <span class="fc-label">${c}</span>
      </label>
    `).join('');

    // Preenche valores
    $$('[data-filter-delivery]').forEach(inp => {
      inp.checked = state.filters.delivery.includes(inp.value);
    });
    $('#filterInStock').checked = state.filters.inStockOnly;
    $('#priceMin').value = state.filters.priceMin ?? '';
    $('#priceMax').value = state.filters.priceMax ?? '';
    $$('[data-filter-rating]').forEach(inp => {
      inp.checked = parseFloat(inp.value) === state.filters.ratingMin;
    });

    $('#filterModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeFilterModal() {
    $('#filterModal').hidden = true;
    document.body.style.overflow = '';
  }

  function applyFilterModal() {
    const cats = $$('[data-filter-cat]').filter(i => i.checked).map(i => i.value);
    const delivery = $$('[data-filter-delivery]').filter(i => i.checked).map(i => i.value);
    const inStock = $('#filterInStock').checked;
    const min = $('#priceMin').value ? parseFloat($('#priceMin').value) : null;
    const max = $('#priceMax').value ? parseFloat($('#priceMax').value) : null;
    const ratingInput = $$('[data-filter-rating]').find(i => i.checked);
    const rating = ratingInput ? parseFloat(ratingInput.value) : 0;

    state.filters = {
      categories: cats,
      delivery,
      inStockOnly: inStock,
      priceMin: min,
      priceMax: max,
      ratingMin: rating,
    };
    state.page = 1;
    closeFilterModal();
    applyFiltersAndRender();
  }

  function clearFilters() {
    state.filters = {
      categories: [],
      delivery: [],
      inStockOnly: false,
      priceMin: null,
      priceMax: null,
      ratingMin: 0,
    };
    state.search = '';
    state.category = 'todas';
    state.page = 1;
    const si = $('#searchInput');
    if (si) si.value = '';
    renderCategories();
    applyFiltersAndRender();
  }

  // ============ NOTIFICAÇÕES ============
  function renderNotifications() {
    $('#notifList').innerHTML = `
      <div class="notif-item is-unread">
        <div class="notif-item-icon ok">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
        </div>
        <div class="notif-item-body">
          <div class="notif-item-title">Promoção: Netflix 4K com 20% off</div>
          <div class="notif-item-sub">Aproveite a oferta desta semana</div>
        </div>
      </div>
      <div class="notif-item is-unread">
        <div class="notif-item-icon info">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></svg>
        </div>
        <div class="notif-item-body">
          <div class="notif-item-title">Novo combo disponível</div>
          <div class="notif-item-sub">Netflix + Spotify com desconto</div>
        </div>
      </div>
    `;
  }

  // ============ EVENTOS ============
  function bindEvents() {
    // Theme já tratado em theme.js
    // Sidebar mobile → theme.js

    // Busca
    $('#searchInput').addEventListener('input', (e) => {
      state.search = e.target.value;
      state.page = 1;
      applyFiltersAndRender();
    });

    // Sort
    $('#sortSelect').addEventListener('change', (e) => {
      state.sort = e.target.value;
      state.page = 1;
      applyFiltersAndRender();
    });

    // Filtros
    $('#filterBtn').addEventListener('click', openFilterModal);
    $('#applyFilters').addEventListener('click', applyFilterModal);
    $('#clearFilterModal').addEventListener('click', () => {
      $('#filterCategories').querySelectorAll('input[type=checkbox]').forEach(i => i.checked = false);
      $$('[data-filter-delivery]').forEach(i => i.checked = false);
      $('#filterInStock').checked = false;
      $('#priceMin').value = '';
      $('#priceMax').value = '';
      $$('[data-filter-rating]').forEach(i => i.checked = i.value === '0');
    });
    $('#clearFiltersBtn')?.addEventListener('click', clearFilters);

    // Carrinho
    $('#cartBtn').addEventListener('click', openCart);
    $('#bnCart').addEventListener('click', openCart);
    $('#cartClose').addEventListener('click', closeCart);
    $('#cartOverlay').addEventListener('click', closeCart);
    $('#cartEmptyBtn').addEventListener('click', () => { closeCart(); });
    $('#continueBtn').addEventListener('click', closeCart);
    $('#checkoutBtn').addEventListener('click', openCheckout);

    // Checkout fechar
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-close-checkout]')) closeCheckout();
      if (e.target.closest('[data-close]')) {
        // Fechar modal filter se aberto
        if (!$('#filterModal').hidden) closeFilterModal();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!$('#filterModal').hidden) closeFilterModal();
        if (!$('#checkoutModal').hidden) closeCheckout();
        if (state.cart.length > 0 && $('#cartDrawer').classList.contains('is-open')) closeCart();
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
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        $$('.dropdown.is-open').forEach(d => d.classList.remove('is-open'));
      }
    });

    // Menu dropdown
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
    loadCart();
    renderBanners();
    renderCategories();
    renderNotifications();
    applyFiltersAndRender();
    renderCart();
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
