/* ============================================================
   TEMA (dark/light) + persistência + sidebar mobile
   ============================================================ */

(function () {
  const STORAGE_KEY = 'streamly-theme';
  const root = document.documentElement;

  // 1. Restaura tema salvo ou preferência do sistema
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') {
    root.setAttribute('data-theme', saved);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }

  // 2. Toggle do tema
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
      // Atualiza meta theme-color (barra do navegador mobile)
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'dark' ? '#000000' : '#ffffff');
    });
  }

  // 3. Sidebar mobile
  const navToggle = document.getElementById('navToggle');
  const overlay   = document.getElementById('overlay');
  const sidebar   = document.getElementById('sidebar');

  const closeSidebar = () => document.body.classList.remove('sidebar-open');
  const openSidebar  = () => document.body.classList.add('sidebar-open');

  if (navToggle) navToggle.addEventListener('click', openSidebar);
  if (overlay)   overlay.addEventListener('click', closeSidebar);

  // Fecha ao clicar em qualquer link da sidebar (mobile)
  if (sidebar) {
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', closeSidebar);
    });
  }

  // 4. Dropdown do menu 3 pontinhos
  const menuBtn = document.getElementById('menuBtn');
  const menuDropdown = document.getElementById('menuDropdown');

  if (menuBtn && menuDropdown) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = menuBtn.closest('.dropdown');
      const isOpen = parent.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Fecha dropdowns ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown.is-open').forEach(d => {
        d.classList.remove('is-open');
        const btn = d.querySelector('[aria-haspopup]');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }
  });
})();
