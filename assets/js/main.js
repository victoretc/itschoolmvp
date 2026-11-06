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

    const holder = player.querySelector('[data-video-player]');
    let iframe = null;

    const start = () => {
      if (iframe) return;

      iframe = document.createElement('iframe');
      iframe.src =
        'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
      iframe.title = player.dataset.videoTitle || 'Видео о школе';
      iframe.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;

      // The poster stays visible underneath until the player is ready, so the
      // block never flashes an empty frame while YouTube loads.
      iframe.addEventListener('load', () => {
        if (facade.isConnected) facade.remove();
      });

      (holder || player).append(iframe);
    };

    facade.addEventListener('click', (event) => {
      event.preventDefault();
      start();
    });
  });
})();

(() => {
  const items = document.querySelectorAll('details.sb-acc');
  if (!items.length || typeof Element.prototype.animate !== 'function') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Opening carries the content in; closing gets out of the way faster. Long
  // course bodies get a little more time so the reveal never turns into a blur.
  const OPEN_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const CLOSE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
  const duration = (base, perPixel, max, height) =>
    Math.min(max, Math.round(base + height * perPixel));

  items.forEach((item) => {
    const summary = item.querySelector('.sb-acc__summary');
    const panel = item.querySelector('.sb-acc__panel');
    if (!summary || !panel) return;

    let expanded = item.open;
    let animation = null;

    const measure = () => {
      const style = getComputedStyle(panel);
      return {
        height: panel.getBoundingClientRect().height,
        paddingBottom: parseFloat(style.paddingBottom) || 0,
        opacity: parseFloat(style.opacity),
      };
    };

    const settle = () => {
      animation = null;
      item.classList.remove('is-animating');
      item.style.removeProperty('--acc-rot');
      panel.style.height = '';
      panel.style.paddingBottom = '';
    };

    const run = (from, to, timing) => {
      item.classList.add('is-animating');
      panel.style.height = from.height + 'px';
      panel.style.paddingBottom = from.paddingBottom + 'px';

      const anim = panel.animate(
        [
          { height: from.height + 'px', paddingBottom: from.paddingBottom + 'px', opacity: from.opacity },
          { height: to.height + 'px', paddingBottom: to.paddingBottom + 'px', opacity: to.opacity },
        ],
        Object.assign({ fill: 'forwards' }, timing)
      );

      animation = anim;
      anim.onfinish = () => {
        if (animation !== anim) return;
        anim.cancel();
        if (!expanded) item.open = false;
        settle();
      };
    };

    summary.addEventListener('click', (event) => {
      event.preventDefault();

      const current =
        animation || expanded
          ? measure()
          : { height: 0, paddingBottom: 0, opacity: 0 };

      if (reduceMotion.matches) {
        if (animation) {
          animation.cancel();
          settle();
        }
        expanded = !expanded;
        item.open = expanded;
        return;
      }

      if (animation) {
        animation.cancel();
        animation = null;
      }
      panel.style.height = '';
      panel.style.paddingBottom = '';

      expanded = !expanded;
      item.style.setProperty('--acc-rot', expanded ? '0deg' : '90deg');

      if (expanded) {
        item.open = true;
        const natural = measure();
        run(current, { ...natural, opacity: 1 }, {
          duration: duration(220, 0.09, 380, natural.height),
          easing: OPEN_EASE,
        });
      } else {
        run(current, { height: 0, paddingBottom: 0, opacity: 0 }, {
          duration: duration(160, 0.06, 300, current.height),
          easing: CLOSE_EASE,
        });
      }
    });
  });
})();
