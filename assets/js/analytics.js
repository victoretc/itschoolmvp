/* ============================================================
   Yandex.Metrica goals
   - fires only with the visitor's consent to analytics cookies
   - safe to call at any time: without consent or without a counter
     the call is silently ignored
   - goal names must match the JS goals in the Metrica interface
   ============================================================ */
(() => {
  const counterId = () => document.body.dataset.metrikaId || '';

  const allowed = () => {
    const consent = window.itschoolCookieConsent;
    return Boolean(consent && consent.allows('analytics'));
  };

  window.itschoolGoal = (name, params) => {
    if (!name || !window.ym || !counterId() || !allowed()) return;
    window.ym(counterId(), 'reachGoal', name, params || {});
  };

  /* Phone and messenger taps are counted everywhere on the site. */
  document.addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href') || '';

    if (href.indexOf('tel:') === 0) {
      window.itschoolGoal('phone_click', { phone: href.slice(4) });
      return;
    }

    if (href.indexOf('viber://') === 0) {
      window.itschoolGoal('viber_click');
    }
  });
})();
