/* GTRADES-AXIS™ — responsive navigation helper */
(() => {
  const init = () => {
    const sidebar = document.querySelector('.dashboard-container > .sidebar, .dashboard > .sidebar, .academy-container > .sidebar, .admin-app > .sidebar');
    if (!sidebar) return;

    // Do not create duplicate controls.
    if (document.querySelector('.gtrades-mobile-toggle')) return;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'gtrades-mobile-toggle';
    toggle.setAttribute('aria-label', 'Open navigation menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span aria-hidden="true">☰</span>';

    const overlay = document.createElement('div');
    overlay.className = 'gtrades-mobile-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    document.body.append(toggle, overlay);

    const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

    const close = () => {
      sidebar.classList.remove('open', 'active');
      overlay.classList.remove('show');
      document.body.classList.remove('gtrades-menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation menu');
    };

    const open = () => {
      sidebar.classList.add('open');
      overlay.classList.add('show');
      document.body.classList.add('gtrades-menu-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close navigation menu');
    };

    toggle.addEventListener('click', () => {
      if (sidebar.classList.contains('open')) close();
      else open();
    });

    overlay.addEventListener('click', close);
    sidebar.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      if (isMobile()) close();
    }));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });

    window.addEventListener('resize', () => {
      if (!isMobile()) close();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
