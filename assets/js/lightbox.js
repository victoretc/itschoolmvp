(() => {
  const root = document.querySelector('[data-lightbox]');
  if (!root) return;

  const image = root.querySelector('.lightbox__img');
  const closeButton = root.querySelector('[data-lightbox-close]');
  const background = [
    document.querySelector('.header'),
    document.querySelector('main'),
    document.querySelector('.footer'),
    document.querySelector('.consult'),
  ].filter(Boolean);

  let lastFocused = null;
  let closeTimer = 0;

  const largestFromSrcset = (srcset) => {
    if (!srcset) return '';
    return srcset
      .split(',')
      .map((part) => {
        const [url, descriptor] = part.trim().split(/\s+/);
        return { url, width: parseFloat(descriptor) || 0 };
      })
      .sort((a, b) => b.width - a.width)[0]?.url || '';
  };

  const sourceFor = (img) => {
    if (img.dataset.full) return img.dataset.full;
    const best = largestFromSrcset(img.getAttribute('srcset'));
    return best || img.currentSrc || img.src;
  };

  const open = (img) => {
    const src = sourceFor(img);
    if (!src) return;

    lastFocused = document.activeElement;
    window.clearTimeout(closeTimer);
    image.src = src;
    image.alt = img.alt || '';

    root.hidden = false;
    document.documentElement.classList.add('has-lightbox');
    background.forEach((el) => { el.inert = true; });

    window.requestAnimationFrame(() => root.classList.add('is-open'));
    closeButton.focus({ preventScroll: true });
  };

  const close = () => {
    if (root.hidden) return;

    root.classList.remove('is-open');
    document.documentElement.classList.remove('has-lightbox');
    background.forEach((el) => { el.inert = false; });

    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      root.hidden = true;
      image.removeAttribute('src');
    }, 200);

    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
  };

  const canOpen = (img) => (
    img.closest('#main') &&
    !img.closest('[data-lightbox]') &&
    !img.closest('[data-video]') &&
    !img.hasAttribute('data-no-lightbox')
  );

  document.addEventListener('click', (event) => {
    const direct = event.target.closest('img');
    if (direct && canOpen(direct)) {
      event.preventDefault();
      event.stopPropagation();
      open(direct);
      return;
    }

    const link = event.target.closest('#main a');
    if (!link) return;

    const card = link.closest('.sb-blog-tile, .sb-blog-card, article, figure, li');
    const img = link.querySelector('img') || card?.querySelector('img');
    if (!img || !canOpen(img)) return;

    const box = img.getBoundingClientRect();
    const overPhoto = (
      box.width > 0 &&
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom
    );
    if (!overPhoto) return;

    event.preventDefault();
    event.stopPropagation();
    open(img);
  });

  root.addEventListener('click', (event) => {
    if (event.target === root || event.target.closest('[data-lightbox-close]')) close();
  });

  document.addEventListener('keydown', (event) => {
    if (root.hidden) return;
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      closeButton.focus({ preventScroll: true });
    }
  });

  document.querySelectorAll('#main img').forEach((img) => {
    if (!canOpen(img)) return;
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', img.alt ? `Открыть фото: ${img.alt}` : 'Открыть фотографию');
    img.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(img);
      }
    });
  });
})();
