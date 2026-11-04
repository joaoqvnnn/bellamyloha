/* ============================================================
   TEMA + APARÊNCIA (aplicado em todas as páginas)
   ============================================================ */

(function () {
  const THEME_KEY    = 'streamly-theme';       // 'dark' | 'light' | 'system'
  const SETTINGS_KEY = 'streamly-settings';

  const root = document.documentElement;

  // ---------- 1. Carrega o tema salvo ----------
  function resolveTheme(saved) {
    if (saved === 'dark' || saved === 'light') return saved;
    // 'system' ou sem preferência → segue o sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  const savedTheme = localStorage.getItem(THEME_KEY);
  root.setAttribute('data-theme', resolveTheme(savedTheme));

  // Escuta mudanças do sistema quando o tema é "system"
  if (savedTheme === 'system' || !savedTheme) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (localStorage.getItem(THEME_KEY) === 'system') {
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    });
  }

  // ---------- 2. Carrega e aplica aparência estendida ----------
  const APPEARANCE_DEFAULTS = {
    primary: 'red',
    cardStyle: 'rounded',
    fontSize: 'md',
    contrastHigh: false,
    reduceAnimations: false,
    improveReadability: false,
  };

  let settings = {};
  try { settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch {}
  const appearance = { ...APPEARANCE_DEFAULTS, ...(settings.appearance || {}) };

  root.setAttribute('data-primary', appearance.primary);
  root.setAttribute('data-card-style', appearance.cardStyle);
  root.setAttribute('data-font-size', appearance.fontSize);
  root.setAttribute('data-contrast', appearance.contrastHigh ? 'high' : 'normal');
  root.setAttribute('data-animations', appearance.reduceAnimations ? 'off' : 'on');
  root.setAttribute('data-readability', appearance.improveReadability ? 'enhanced' : 'normal');

  // ---------- 3. Toggle de tema na navbar ----------
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'dark' ? '#000000' : '#ffffff');
    });
  }

  // ---------- 4. Sidebar mobile ----------
  const navToggle = document.getElementById('navToggle');
  const overlay   = document.getElementById('overlay');
  const sidebar   = document.getElementById('sidebar');

  const closeSidebar = () => document.body.classList.remove('sidebar-open');
  const openSidebar  = () => document.body.classList.add('sidebar-open');

  if (navToggle) navToggle.addEventListener('click', openSidebar);
  if (overlay)   overlay.addEventListener('click', closeSidebar);
  if (sidebar) {
    sidebar.querySelectorAll('.nav-item').forEach(i => i.addEventListener('click', closeSidebar));
  }

  // ---------- 5. Dropdown do menu (3 pontinhos) ----------
  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = menuBtn.closest('.dropdown');
      const isOpen = parent.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', String(isOpen));
    });
  }

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
