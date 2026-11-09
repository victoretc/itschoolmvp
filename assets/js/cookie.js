/* ============================================================
   Cookie consent
   - stores the visitor's choice for 12 months (localStorage)
   - gates Yandex.Metrica and third-party embeds behind consent
   - powers the notice and the /cookies/ settings form
   ============================================================ */
(() => {
  const STORAGE_KEY = 'itschool-cookie-consent';
  const VERSION = 1;
  const TTL = 365 * 24 * 60 * 60 * 1000;

  const root = document.querySelector('[data-cookie-consent]');
  const form = document.querySelector('[data-cookie-settings]');
  const statusEl = document.querySelector('[data-cookie-status]');
  const settingsUrl = document.body.dataset.cookieSettingsUrl || '/cookies/#settings';
  const isSettingsPage = Boolean(form);

  let current = null;
  let metrikaStarted = false;
  let bannerTimer = 0;
  let hideTimer = 0;

  const normalize = (value) => ({
    necessary: true,
    analytics: Boolean(value && value.analytics),
    functional: Boolean(value && value.functional),
  });

  /* ------------------------------------------------------------ store */

  const read = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw);
      if (!data || data.version !== VERSION) return null;
      if (!data.ts || Date.now() - data.ts > TTL) return null;

      return normalize(data);
    } catch (error) {
      return null;
    }
  };

  const allows = (category) =>
    category === 'necessary' || Boolean(current && current[category]);

  /* --------------------------------------------------- analytics gate */

  const dropCookie = (name) => {
    const paths = ['/', window.location.pathname || '/'];
    const domains = ['', window.location.hostname, '.' + window.location.hostname];

    paths.forEach((path) => {
      domains.forEach((domain) => {
        document.cookie =
          name + '=; Max-Age=0; path=' + path + (domain ? '; domain=' + domain : '');
      });
    });
  };

  const clearAnalyticsCookies = () => {
    document.cookie.split(';').forEach((part) => {
      const name = part.split('=')[0].trim();
      if (/^(_ym_|ym_)/.test(name)) dropCookie(name);
    });
  };

  const loadMetrika = () => {
    const id = document.body.dataset.metrikaId;
    if (!id || metrikaStarted) return;

    metrikaStarted = true;

    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      for (let j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) return;
      }
      k = e.createElement(t);
      a = e.getElementsByTagName(t)[0];
      k.async = 1;
      k.src = r;
      a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

    window.ym(id, 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: false,
    });
  };

  /* ------------------------------------------------------ embeds gate */

  const embedNotice = (holder) => {
    const notice = document.createElement('div');
    notice.className = 'cookie-embed__notice';
    notice.innerHTML =
      '<span class="cookie-embed__icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" focusable="false">' +
          '<rect x="4.5" y="10" width="15" height="10.5" rx="2.6" stroke="currentColor" stroke-width="1.7"/>' +
          '<path d="M8 10V7.4a4 4 0 0 1 8 0V10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
        '</svg>' +
      '</span>' +
      '<p class="cookie-embed__text">Здесь загружается внешний виджет Яндекса. Он использует функциональные файлы cookie.</p>' +
      '<div class="cookie-embed__actions">' +
        '<button class="cookie-embed__btn" type="button" data-cookie-embed-load>Загрузить</button>' +
        '<a class="cookie-embed__link" href="' + settingsUrl + '">Настроить</a>' +
      '</div>';

    holder.appendChild(notice);
    return notice;
  };

  const syncEmbeds = () => {
    document.querySelectorAll('iframe[data-cookie-embed]').forEach((frame) => {
      const holder = frame.parentElement;
      if (!holder) return;

      holder.classList.add('cookie-embed');
      const notice = holder.querySelector('.cookie-embed__notice');

      if (allows('functional')) {
        holder.classList.remove('is-blocked');
        if (frame.dataset.src && !frame.getAttribute('src')) {
          frame.setAttribute('src', frame.dataset.src);
        }
        if (notice) notice.remove();
        return;
      }

      holder.classList.add('is-blocked');
      frame.removeAttribute('src');
      if (!notice) embedNotice(holder);
    });
  };

  /* ------------------------------------------------------ settings UI */

  const setStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
  };

  const syncForm = () => {
    if (!form) return;

    ['analytics', 'functional'].forEach((name) => {
      const input = form.querySelector('[data-cookie-category="' + name + '"]');
      if (input) input.checked = allows(name);
    });
  };

  /* --------------------------------------------------------- notice */

  const showBanner = () => {
    if (!root || isSettingsPage || current) return;

    window.clearTimeout(bannerTimer);
    window.clearTimeout(hideTimer);
    root.hidden = false;

    window.requestAnimationFrame(() => {
      root.classList.add('is-visible');
    });
  };

  const hideBanner = () => {
    if (!root || root.hidden) return;

    root.classList.remove('is-visible');
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      root.hidden = true;
    }, 260);
  };

  /* ---------------------------------------------------------- apply */

  const apply = (state) => {
    current = state ? normalize(state) : null;
    document.documentElement.dataset.cookieConsentState = current ? 'set' : 'unset';

    if (current && current.analytics) {
      loadMetrika();
    } else if (metrikaStarted) {
      clearAnalyticsCookies();
    }

    syncEmbeds();
    syncForm();

    if (current) hideBanner();
  };

  const write = (state) => {
    const next = normalize(state);

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          necessary: true,
          analytics: next.analytics,
          functional: next.functional,
          version: VERSION,
          ts: Date.now(),
        })
      );
    } catch (error) {
      /* Private mode or storage disabled: consent applies to this visit only. */
    }

    apply(next);

    window.dispatchEvent(
      new CustomEvent('cookieconsent:change', { detail: { ...next } })
    );

    return next;
  };

  /* --------------------------------------------------------- events */

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-cookie-accept]')) {
      write({ necessary: true, analytics: true, functional: true });
      return;
    }

    if (event.target.closest('[data-cookie-reject]')) {
      write({ necessary: true, analytics: false, functional: false });
      return;
    }

    if (event.target.closest('[data-cookie-accept-all]')) {
      write({ necessary: true, analytics: true, functional: true });
      setStatus('Все категории включены. Изменить настройки можно здесь в любой момент.');
      return;
    }

    if (event.target.closest('[data-cookie-reject-all]')) {
      write({ necessary: true, analytics: false, functional: false });
      setStatus('Оставлены только необходимые файлы cookie. Изменить настройки можно здесь в любой момент.');
      return;
    }

    if (event.target.closest('[data-cookie-embed-load]')) {
      write({
        necessary: true,
        analytics: Boolean(current && current.analytics),
        functional: true,
      });
      return;
    }
  });

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const analyticsInput = form.querySelector('[data-cookie-category="analytics"]');
      const functionalInput = form.querySelector('[data-cookie-category="functional"]');

      write({
        necessary: true,
        analytics: Boolean(analyticsInput && analyticsInput.checked),
        functional: Boolean(functionalInput && functionalInput.checked),
      });

      setStatus('Настройки сохранены. Изменения применены сразу.');
    });
  }

  /* ---------------------------------------------------------- boot */

  current = read();
  apply(current);

  if (!current && !isSettingsPage) {
    bannerTimer = window.setTimeout(showBanner, 600);
  }

  window.itschoolCookieConsent = {
    get: () => (current ? { ...current } : null),
    allows,
    save: (state) => write(state),
    openSettings: () => {
      window.location.href = settingsUrl;
    },
  };
})();
