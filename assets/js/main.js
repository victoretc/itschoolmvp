(() => {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');

  if (!toggle || !menu) return;

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  const label = toggle.querySelector('.header__burger-label');

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.dataset.open = String(open);
    if (label) label.textContent = open ? 'Закрыть' : 'Меню';
  };

  toggle.addEventListener('click', () => {
    setOpen(!isOpen());
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!isOpen()) return;
    if (menu.contains(e.target) || toggle.contains(e.target)) return;
    setOpen(false);
  });

  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 60.0625rem)').matches) setOpen(false);
  });
})();

(() => {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  document.documentElement.classList.add('motion-ready');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.15 }
  );

  items.forEach((item) => observer.observe(item));
})();

(() => {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  let queued = false;

  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    queued = false;
  };

  update();
  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(update);
    },
    { passive: true }
  );
})();

(() => {
  const players = document.querySelectorAll('[data-video]');
  if (!players.length) return;

  players.forEach((player) => {
    const facade = player.querySelector('[data-video-play]');
    const id = player.dataset.videoId;
    if (!facade || !id) return;

    facade.addEventListener('click', (event) => {
      event.preventDefault();

      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      iframe.title = player.dataset.videoTitle || 'Видео о школе';
      iframe.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;

      player.replaceChildren(iframe);
      iframe.focus();
    });
  });
})();
