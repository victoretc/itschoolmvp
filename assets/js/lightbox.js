(() => {
  const root = document.querySelector('[data-lightbox]');
  if (!root) return;

  const image = root.querySelector('.lightbox__img');
  const closeButton = root.querySelector('[data-lightbox-close]');
  const prevButton = root.querySelector('[data-lightbox-prev]');
  const nextButton = root.querySelector('[data-lightbox-next]');
  const counter = root.querySelector('[data-lightbox-counter]');
  const background = [
    document.querySelector('.header'),
    document.querySelector('main'),
    document.querySelector('.footer'),
    document.querySelector('.consult'),
  ].filter(Boolean);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let lastFocused = null;
  let closeTimer = 0;
  let gallery = [];
  let index = 0;
  let dragStart = null;
  let swiped = false;

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

  const canOpen = (img) => (
    img.closest('#main') &&
    !img.closest('[data-lightbox]') &&
    !img.closest('[data-video]') &&
    !img.hasAttribute('data-no-lightbox')
  );

  const groupFor = (img) => {
    const group = img.closest('[data-lightbox-group]');
    if (!group) return [img];
    const items = Array.from(group.querySelectorAll('img')).filter(canOpen);
    return items.length ? items : [img];
  };

  const render = (animate) => {
    const current = gallery[index];
    const src = current ? sourceFor(current) : '';
    if (!src) return;

    image.src = src;
    image.alt = current.alt || '';

    const total = gallery.length;
    const multiple = total > 1;
    prevButton.hidden = !multiple;
    nextButton.hidden = !multiple;
    counter.hidden = !multiple;

    if (multiple) {
      counter.textContent = `${index + 1} / ${total}`;
      root.setAttribute('aria-label', `Просмотр фотографии, ${index + 1} из ${total}`);
    } else {
      root.setAttribute('aria-label', 'Просмотр фотографии');
    }

    if (animate && !reduceMotion.matches && typeof image.animate === 'function') {
      image.animate(
        [{ opacity: 0.35 }, { opacity: 1 }],
        { duration: 160, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
      );
    }
  };

  const step = (delta) => {
    if (gallery.length < 2) return;
    index = (index + delta + gallery.length) % gallery.length;
    render(true);
  };

  const open = (img) => {
    gallery = groupFor(img);
    index = Math.max(0, gallery.indexOf(img));
    lastFocused = document.activeElement;

    window.clearTimeout(closeTimer);
    render(false);

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
    if (event.target.closest('[data-lightbox-prev]')) {
      step(-1);
      return;
    }
    if (event.target.closest('[data-lightbox-next]')) {
      step(1);
      return;
    }
    if (swiped) {
      swiped = false;
      return;
    }
    if (event.target === root || event.target.closest('[data-lightbox-close]')) close();
  });

  /* Flick left or right across any photo to move through the carousel. */
  root.addEventListener('pointerdown', (event) => {
    if (gallery.length < 2) return;
    dragStart = { x: event.clientX, y: event.clientY };
  });

  root.addEventListener('pointerup', (event) => {
    if (!dragStart) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    dragStart = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    swiped = true;
    window.setTimeout(() => { swiped = false; }, 400);
    step(dx < 0 ? 1 : -1);
  });

  root.addEventListener('pointercancel', () => { dragStart = null; });

  /* Native image dragging would cancel the pointer sequence mid-swipe. */
  root.addEventListener('dragstart', (event) => event.preventDefault());

  document.addEventListener('keydown', (event) => {
    if (root.hidden) return;

    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
      return;
    }
    if (event.key === 'Tab') {
      const items = [closeButton, prevButton, nextButton].filter((el) => !el.hidden);
      const current = items.indexOf(document.activeElement);
      const dir = event.shiftKey ? -1 : 1;
      const next = items[(current < 0 ? 0 : (current + dir + items.length) % items.length)];
      event.preventDefault();
      (next || closeButton).focus({ preventScroll: true });
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
