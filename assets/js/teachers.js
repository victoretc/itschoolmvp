(() => {
  const root = document.querySelector('[data-teachers]');
  if (!root) return;

  const rail = root.querySelector('[data-teachers-rail]');
  const stage = root.querySelector('.sb-teachers__stage');
  const tabs = Array.from(root.querySelectorAll('[data-teacher-tab]'));
  const panels = Array.from(root.querySelectorAll('[data-teacher-panel]'));
  const prevButton = root.querySelector('[data-teachers-prev]');
  const nextButton = root.querySelector('[data-teachers-next]');

  if (!rail || !tabs.length || tabs.length !== panels.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 900px)');
  let current = 0;

  const scrollBehavior = () => (reduceMotion.matches ? 'auto' : 'smooth');

  const syncNav = () => {
    const max = rail.scrollWidth - rail.clientWidth - 2;
    if (prevButton) prevButton.disabled = rail.scrollLeft <= 2;
    if (nextButton) nextButton.disabled = rail.scrollLeft >= max;
  };

  const centerTab = (tab, animate) => {
    const railRect = rail.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const delta = tabRect.left - railRect.left - (rail.clientWidth - tabRect.width) / 2;
    rail.scrollTo({
      left: Math.max(0, rail.scrollLeft + delta),
      behavior: animate ? scrollBehavior() : 'auto',
    });
  };

  const revealStage = () => {
    if (!narrow.matches || !stage) return;
    if (stage.getBoundingClientRect().top >= 0) return;
    stage.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  };

  const select = (index, options = {}) => {
    const count = tabs.length;
    index = ((index % count) + count) % count;
    const changed = index !== current;
    current = index;

    panels.forEach((panel, i) => {
      const active = i === index;
      panel.classList.toggle('is-active', active);
      panel.tabIndex = active ? 0 : -1;
      const tab = tabs[i];
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    if (options.focus) tabs[index].focus({ preventScroll: true });
    if (changed) {
      centerTab(tabs[index], true);
      revealStage();
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index, { focus: false }));
  });

  rail.addEventListener('keydown', (event) => {
    const tab = event.target.closest('[data-teacher-tab]');
    if (!tab) return;

    const index = tabs.indexOf(tab);
    let next = null;

    if (event.key === 'ArrowRight') next = index + 1;
    else if (event.key === 'ArrowLeft') next = index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;

    if (next === null) return;
    event.preventDefault();
    select(next, { focus: true });
  });

  const pageRail = (direction) => {
    rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: scrollBehavior() });
  };

  if (prevButton) prevButton.addEventListener('click', () => pageRail(-1));
  if (nextButton) nextButton.addEventListener('click', () => pageRail(1));

  rail.addEventListener('scroll', syncNav, { passive: true });
  window.addEventListener('resize', syncNav);
  syncNav();
})();
