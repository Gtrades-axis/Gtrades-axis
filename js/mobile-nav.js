/* GTRADES-AXIS mobile navigation
 * Adds an accessible hamburger + backdrop to pages that use a .sidebar.
 * Works with existing .open and .active sidebar conventions.
 */
(() => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const openClasses = ['open', 'active'];
  const isOpen = () => openClasses.some(c => sidebar.classList.contains(c));
  const setOpen = (open) => {
    openClasses.forEach(c => sidebar.classList.toggle(c, open));
    toggle.setAttribute('aria-expanded', String(open));
    backdrop.hidden = !open;
    document.body.classList.toggle('mobile-nav-open', open);
  };

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'mobile-nav-toggle';
  toggle.setAttribute('aria-label', 'Open navigation menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span></span><span></span><span></span>';

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'mobile-nav-backdrop';
  backdrop.setAttribute('aria-label', 'Close navigation menu');
  backdrop.hidden = true;

  document.body.append(toggle, backdrop);
  toggle.addEventListener('click', () => setOpen(!isOpen()));
  backdrop.addEventListener('click', () => setOpen(false));

  sidebar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 900px)').matches) setOpen(false);
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen()) setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (!window.matchMedia('(max-width: 900px)').matches) setOpen(false);
  });
})();
