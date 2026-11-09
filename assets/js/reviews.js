(() => {
  const root = document.querySelector('[data-reviews-carousel]');
  if (!root) return;

  const stage = root.querySelector('[data-reviews-stage]');
  const rail = root.querySelector('[data-reviews-rail]');
  if (!stage || !rail) return;

  const originals = Array.from(rail.children);
  if (originals.length < 2) return;

  /* Five faces leave 72° gaps, so the ring reads as a fan. Clone the set
     once to halve the step; clones are decorative, keep them out of the
     lightbox tab order and forward their clicks to the real review. */
  if (originals.length < 10) {
    originals.forEach((item, index) => {
      const clone = item.cloneNode(true);
      clone.classList.add('sb-reviews__item--clone');
      clone.dataset.reviewsSource = String(index);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('img').forEach((img) => img.setAttribute('data-no-lightbox', ''));
      rail.appendChild(clone);
    });
  }

  const items = Array.from(rail.children);
  const originalCount = originals.length;
  const prevButton = root.querySelector('[data-reviews-prev]');
  const nextButton = root.querySelector('[data-reviews-next]');
  const counter = root.querySelector('[data-reviews-current]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const step = 360 / items.length;

  let rotation = 0;
  let radius = 0;
  let frame = 0;
  let pointer = null;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  let dragMoved = 0;
  let captured = false;

  const pad = (value) => String(value).padStart(2, '0');

  const render = () => {
    rail.style.setProperty('--reviews-rot', `${-rotation}deg`);

    if (counter) {
      const index = ((Math.round(rotation / step) % originalCount) + originalCount) % originalCount;
      counter.textContent = pad(index + 1);
    }
  };

  const measure = () => {
    const width = items[0].offsetWidth;
    if (!width) return;

    radius = (width * items.length) / (2 * Math.PI);
    rail.style.setProperty('--reviews-radius', `${radius}px`);
    items.forEach((item, index) => {
      item.style.setProperty('--reviews-angle', `${index * step}deg`);
    });
    render();
  };

  const stop = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  };

  const settle = (target) => {
    stop();

    if (reduceMotion.matches) {
      rotation = target;
      render();
      return;
    }

    const tick = () => {
      const diff = target - rotation;

      if (Math.abs(diff) < 0.04) {
        rotation = target;
        render();
        frame = 0;
        return;
      }

      rotation += diff * 0.16;
      render();
      frame = window.requestAnimationFrame(tick);
    };

    tick();
  };

  const nearest = (offset = 0) => {
    return Math.round((rotation + offset) / step) * step;
  };

  const go = (direction) => {
    settle(nearest(direction * step));
  };

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.target.closest('button, a')) return;

    pointer = event.pointerId;
    lastX = event.clientX;
    lastTime = performance.now();
    velocity = 0;
    dragMoved = 0;
    captured = false;

    stop();
    root.classList.add('is-dragging');
  };

  const onPointerMove = (event) => {
    if (pointer === null || event.pointerId !== pointer) return;

    const now = performance.now();
    const dx = event.clientX - lastX;
    const dt = Math.max(now - lastTime, 1);
    const ratio = window.matchMedia('(max-width: 720px)').matches ? 0.28 : 0.2;
    const delta = dx * ratio;

    lastX = event.clientX;
    lastTime = now;
    dragMoved += Math.abs(dx);
    velocity = (-delta / dt) * 16;
    rotation -= delta;

    /* Capture only after a real drag: capturing on pointerdown retargets
       the click to the stage and a tap on a screenshot never opens it. */
    if (!captured && dragMoved > 6) {
      captured = true;
      stage.setPointerCapture(pointer);
    }

    render();
  };

  const endDrag = (event, flick = true) => {
    if (pointer === null || event.pointerId !== pointer) return;

    if (captured && stage.hasPointerCapture(pointer)) stage.releasePointerCapture(pointer);
    pointer = null;
    captured = false;
    root.classList.remove('is-dragging');

    const projected = flick ? rotation + velocity * 3 : rotation;
    settle(Math.round(projected / step) * step);
  };

  /* A drag must not also read as a click on the screenshot. */
  root.addEventListener(
    'click',
    (event) => {
      if (dragMoved <= 8) return;
      event.preventDefault();
      event.stopPropagation();
      dragMoved = 0;
    },
    true,
  );

  /* The card facing the viewer is often a clone. Pass its click to the
     matching original so every visible review opens in the lightbox. */
  root.addEventListener('click', (event) => {
    if (dragMoved > 8) return;

    const clone = event.target.closest('.sb-reviews__item--clone');
    if (!clone) return;

    const source = originals[Number(clone.dataset.reviewsSource)];
    const image = source && source.querySelector('img');
    if (image) image.click();
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    }
  });

  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', (event) => endDrag(event, false));

  if (prevButton) prevButton.addEventListener('click', () => go(-1));
  if (nextButton) nextButton.addEventListener('click', () => go(1));

  if ('ResizeObserver' in window) {
    new ResizeObserver(measure).observe(stage);
  } else {
    window.addEventListener('resize', measure);
  }

  root.classList.add('is-3d');
  measure();
  window.requestAnimationFrame(measure);
})();
