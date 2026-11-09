/* ---------------------------------------------------------------- loader */
/* Runs only when the inline head script opened the boot screen: first visit
   of the session, never on repeat navigations or bfcache restores. */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('is-booting')) return;

  const loader = document.querySelector('[data-loader]');
  const MIN_VISIBLE = 600;
  const started = performance.now();
  let released = false;

  const release = () => {
    if (released) return;
    released = true;

    window.setTimeout(() => {
      root.classList.add('is-loader-out');

      try {
        window.sessionStorage.setItem('itschool-booted', '1');
      } catch (error) {
        /* Storage disabled: the boot screen simply repeats next visit. */
      }

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        root.classList.remove('is-booting', 'is-loader-out');
        if (loader) loader.remove();
      };

      if (loader) loader.addEventListener('transitionend', cleanup, { once: true });
      window.setTimeout(cleanup, 700);
    }, Math.max(0, MIN_VISIBLE - (performance.now() - started)));
  };

  if (document.readyState === 'complete') release();
  else window.addEventListener('load', release, { once: true });

  /* A hanging image must not keep the page covered. */
  window.setTimeout(release, 3500);
})();

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
    { rootMargin: '0px 0px -48px 0px', threshold: 0 }
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
  const videos = document.querySelectorAll('video[data-autoplay]');
  if (!videos.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  videos.forEach((video) => {
    const wrap = video.closest('.sb-more__video');
    const toggle = wrap && wrap.querySelector('[data-video-toggle]');
    let userPaused = reduceMotion.matches;

    // Native controls stay in the markup as a no-JS fallback; with JS the
    // lightweight overlay button replaces them.
    video.controls = false;

    const sync = () => {
      if (wrap) wrap.classList.toggle('is-paused', video.paused);
      if (toggle) toggle.setAttribute('aria-label', video.paused ? 'Воспроизвести видео' : 'Пауза');
    };

    const flip = () => {
      if (video.paused) {
        userPaused = false;
        video.play().catch(() => {});
      } else {
        userPaused = true;
        video.pause();
      }
    };

    if (toggle) {
      toggle.hidden = false;
      toggle.addEventListener('click', flip);
    }

    video.addEventListener('click', flip);

    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      sync();
      return;
    }

    // Play only while the block is on screen: no wasted bandwidth and no
    // video running off-screen. A pause from the viewer wins over autoplay.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!userPaused) video.play().catch(() => {});
          } else if (!video.paused) {
            video.pause();
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(video);
    sync();
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

/* ---------------------------------------------------- live review widget */
(() => {
  const items = document.querySelectorAll('[data-live-frame]');
  if (!items.length) return;

  items.forEach((item) => {
    const frame = item.querySelector('iframe[data-src]');
    if (!frame) return;

    const load = () => {
      if (frame.getAttribute('src')) return;
      if (window.itschoolCookieConsent && !window.itschoolCookieConsent.allows('functional')) return;
      frame.setAttribute('src', frame.dataset.src);
    };

    item.addEventListener('toggle', () => {
      if (item.open) load();
    });

    if (item.open) load();
  });
})();

/* ---------------------------------------------------------- consultation */
(() => {
  const root = document.querySelector('[data-consult]');
  if (!root) return;

  const dialog = root.querySelector('.consult__dialog');
  const form = root.querySelector('[data-consult-form]');
  const success = root.querySelector('[data-consult-success]');
  const titleEl = root.querySelector('[data-consult-title]');
  const leadEl = root.querySelector('[data-consult-lead]');
  const submit = root.querySelector('[data-consult-submit]');
  const formError = root.querySelector('[data-consult-form-error]');
  const nameInput = form.elements.name;
  const phoneInput = form.elements.phone;

  const baseTitle = titleEl.textContent.trim();
  const baseLead = leadEl.textContent.trim();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const background = () =>
    [document.querySelector('.header'), document.getElementById('main'), document.querySelector('.footer')].filter(Boolean);

  let isOpen = false;
  let lastFocused = null;
  let closeTimer = 0;
  let submitted = false;

  /* ------------------------------------------------------------ scroll */

  const lockScroll = () => {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) document.documentElement.style.paddingRight = gap + 'px';
    document.documentElement.classList.add('has-consult');
  };

  const unlockScroll = () => {
    document.documentElement.classList.remove('has-consult');
    document.documentElement.style.removeProperty('padding-right');
  };

  /* ------------------------------------------------------------ errors */

  const setError = (name, message) => {
    const input = form.elements[name];
    const error = form.querySelector('[data-error-for="' + name + '"]');
    const field = input.closest('.consult__field');

    if (error) {
      error.textContent = message || '';
      error.hidden = !message;
    }
    if (field) field.classList.toggle('has-error', Boolean(message));
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  };

  const clearErrors = () => {
    ['name', 'phone'].forEach((name) => setError(name, ''));
    formError.hidden = true;
  };

  /* ------------------------------------------------------------- phone */

  const formatPhone = (raw) => {
    let digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('80')) digits = '375' + digits.slice(2);
    if (!digits.startsWith('375')) digits = '375' + digits;
    digits = digits.slice(0, 12);

    let value = '+375';
    if (digits.length > 3) value += ' (' + digits.slice(3, 5);
    if (digits.length > 5) value += ') ' + digits.slice(5, 8);
    if (digits.length > 8) value += '-' + digits.slice(8, 10);
    if (digits.length > 10) value += '-' + digits.slice(10, 12);
    return value;
  };

  phoneInput.addEventListener('input', () => {
    phoneInput.value = formatPhone(phoneInput.value);
  });

  phoneInput.addEventListener('focus', () => {
    if (!phoneInput.value) phoneInput.value = '+375 ';
  });

  phoneInput.addEventListener('blur', () => {
    if (phoneInput.value.replace(/\D/g, '').length <= 3) phoneInput.value = '';
  });

  /* ---------------------------------------------------------- validate */

  const validate = () => {
    const name = nameInput.value.trim();
    const digits = phoneInput.value.replace(/\D/g, '');
    let firstInvalid = null;

    if (name.length < 2) {
      setError('name', 'Напишите, как к вам обращаться');
      firstInvalid = firstInvalid || nameInput;
    } else {
      setError('name', '');
    }

    if (digits.length !== 12 || !digits.startsWith('375')) {
      setError('phone', 'Введите номер в формате +375 (29) 000-00-00');
      firstInvalid = firstInvalid || phoneInput;
    } else {
      setError('phone', '');
    }

    if (firstInvalid) firstInvalid.focus({ preventScroll: false });
    return !firstInvalid;
  };

  /* ------------------------------------------------------------ states */

  const showForm = () => {
    form.hidden = false;
    success.hidden = true;
  };

  const showSuccess = () => {
    submitted = true;
    form.hidden = true;
    success.hidden = false;
    const done = success.querySelector('.consult__done');
    if (done) done.focus({ preventScroll: true });
  };

  const resetForm = () => {
    form.reset();
    phoneInput.value = '';
    clearErrors();
    submit.classList.remove('is-loading');
    submit.disabled = false;
    showForm();
    submitted = false;
  };

  /* --------------------------------------------------------- open/close */

  const open = (trigger) => {
    if (isOpen) return;

    window.clearTimeout(closeTimer);
    isOpen = true;
    lastFocused = document.activeElement;

    if (submitted) resetForm();

    const data = trigger ? trigger.dataset : {};
    titleEl.textContent = data.consultTitle || baseTitle;
    leadEl.textContent = data.consultLead || baseLead;

    root.hidden = false;
    root.classList.remove('is-closing');
    void root.offsetWidth;

    lockScroll();
    background().forEach((el) => {
      el.inert = true;
      el.setAttribute('aria-hidden', 'true');
    });

    window.requestAnimationFrame(() => root.classList.add('is-open'));
    dialog.focus({ preventScroll: true });

    if (window.dataLayer) {
      window.dataLayer.push({ event: 'consult_open', source: data.consultSource || 'cta' });
    }
  };

  const close = () => {
    if (!isOpen) return;

    isOpen = false;
    root.classList.remove('is-open');
    root.classList.add('is-closing');

    if (window.location.hash === '#consult') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    const finish = () => {
      root.hidden = true;
      root.classList.remove('is-closing');
      unlockScroll();
      background().forEach((el) => {
        el.inert = false;
        el.removeAttribute('aria-hidden');
      });
      if (lastFocused && lastFocused.isConnected) lastFocused.focus({ preventScroll: true });
    };

    closeTimer = window.setTimeout(finish, reduceMotion.matches ? 120 : 200);
  };

  /* ------------------------------------------------------------ events */

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-consult-open]');
    if (opener) {
      event.preventDefault();
      open(opener);
      return;
    }

    if (event.target.closest('[data-consult-close]')) {
      event.preventDefault();
      close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.offsetParent !== null);

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  nameInput.addEventListener('input', () => {
    if (nameInput.getAttribute('aria-invalid') === 'true') setError('name', '');
  });

  phoneInput.addEventListener('input', () => {
    if (phoneInput.getAttribute('aria-invalid') === 'true') setError('phone', '');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.hidden = true;

    if (!validate()) return;

    submit.classList.add('is-loading');
    submit.disabled = true;

    const endpoint = form.getAttribute('action');

    try {
      if (endpoint) {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Request failed');
      } else {
        // Static MVP: no backend yet. Replace with a real endpoint via
        // [params] consultEndpoint in hugo.toml.
        await new Promise((resolve) => window.setTimeout(resolve, 700));
      }

      if (window.dataLayer) window.dataLayer.push({ event: 'consult_submit' });
      showSuccess();
    } catch (error) {
      formError.textContent = 'Не удалось отправить заявку. Позвоните нам: +375 (29) 871-76-12.';
      formError.hidden = false;
    } finally {
      submit.classList.remove('is-loading');
      submit.disabled = false;
    }
  });

  if (window.location.hash === '#consult') open();
})();

(() => {
  const buttons = document.querySelectorAll('[data-pixels]');
  if (!buttons.length) return;

  const PIXEL_SIZE = 10;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const build = (container) => {
    const button = container.parentElement;
    if (!button) return;

    const width = button.offsetWidth;
    const height = button.offsetHeight;
    const cols = Math.ceil(width / PIXEL_SIZE);
    const rows = Math.ceil(height / PIXEL_SIZE);

    if (!cols || !rows) {
      container.replaceChildren();
      return;
    }

    const fragment = document.createDocumentFragment();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const pixel = document.createElement('span');
        pixel.className = 'header__cta-pixel';
        pixel.style.left = `${col * PIXEL_SIZE}px`;
        pixel.style.top = `${row * PIXEL_SIZE}px`;
        pixel.style.width = `${Math.min(PIXEL_SIZE, width - col * PIXEL_SIZE)}px`;
        pixel.style.height = `${Math.min(PIXEL_SIZE, height - row * PIXEL_SIZE)}px`;
        pixel.style.transitionDelay = reduceMotion.matches
          ? '0s'
          : `${(Math.random() * 1).toFixed(2)}s`;
        fragment.appendChild(pixel);
      }
    }

    container.replaceChildren(fragment);
  };

  buttons.forEach((container) => {
    build(container);

    if ('ResizeObserver' in window) {
      let frame = 0;
      const observer = new ResizeObserver(() => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => build(container));
      });
      observer.observe(container.parentElement || container);
    } else {
      window.addEventListener('resize', () => build(container));
    }
  });
})();

(() => {
  const list = document.querySelector('[data-course-list]');
  if (!list) return;

  const extras = Array.from(list.querySelectorAll('[data-course-extra]'));
  const button = list.querySelector('[data-course-more]');
  const label = button && button.querySelector('[data-course-more-label]');
  const count = button && button.querySelector('[data-course-more-count]');
  const wrap = list.querySelector('[data-course-more-wrap]');

  if (!extras.length || !button || !label || !wrap) {
    if (wrap) wrap.remove();
    return;
  }

  const setExpanded = (expanded) => {
    button.setAttribute('aria-expanded', String(expanded));
    label.textContent = expanded ? 'Свернуть' : 'Смотреть ещё';
    if (count) count.hidden = expanded;

    extras.forEach((item) => {
      item.hidden = !expanded;
      if (expanded) item.classList.add('is-visible');
    });
  };

  extras.forEach((item) => {
    item.hidden = true;
  });

  wrap.hidden = false;

  button.addEventListener('click', () => {
    setExpanded(button.getAttribute('aria-expanded') !== 'true');
  });
})();
