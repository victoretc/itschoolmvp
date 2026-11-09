/* Glass CTA with silk threads that follow the pointer.
   Ported from the React "web-shot-button" component to plain canvas. */
(() => {
  const roots = Array.from(document.querySelectorAll('[data-web-shot]'));
  if (!roots.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const SEGS = 16;
  const SPREAD = 17;
  const DAMP = 0.9;
  const GRAVITY = 0.05;

  const init = (wrap) => {
    const btn = wrap.querySelector('[data-web-shot-btn]');
    const cv = wrap.querySelector('[data-web-shot-canvas]');
    const ctx = cv && cv.getContext('2d');
    if (!btn || !cv || !ctx) return;

    const reach = Number(wrap.dataset.webShotReach) || 120;
    const n = Math.max(1, Math.round(Number(wrap.dataset.webShotThreads) || 5));
    const pad = reach + 24;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let ink = '#0a6e9e';
    let active = false;
    let ext = 0;
    let raf = 0;

    const pointer = { x: 0, y: 0, known: false };
    const hold = { x: 0, y: 0 };
    const list = Array.from({ length: n }, (_, i) => ({
      pts: Array.from({ length: SEGS }, () => ({ x: 0, y: 0, px: 0, py: 0 })),
      lag: 0.14 + (((i * 37) % 10) / 10) * 0.22,
      ax: 0,
      ay: 0,
      seeded: false,
    }));

    const measure = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = btn.offsetWidth;
      h = btn.offsetHeight;
      const cw = w + pad * 2;
      const ch = h + pad * 2;
      Object.assign(cv.style, {
        width: `${cw}px`,
        height: `${ch}px`,
        left: `${-pad}px`,
        top: `${-pad}px`,
      });
      cv.width = Math.round(cw * dpr);
      cv.height = Math.round(ch * dpr);
    };

    /* Pointer in canvas space, read from the centre so a press does not shift it. */
    const local = () => {
      const r = btn.getBoundingClientRect();
      return {
        x: pointer.x - (r.left + r.width / 2) + pad + w / 2,
        y: pointer.y - (r.top + r.height / 2) + pad + h / 2,
      };
    };

    /* Nearest point of the pill: end-circle centre, outward normal, distance outside the edge. */
    const cap = (x, y) => {
      const r = Math.min(w, h) / 2;
      const cy = pad + h / 2;
      const cx = Math.min(Math.max(x, pad + r), pad + w - r);
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy) || 1e-6;
      return { cx, cy, r, nx: dx / d, ny: dy / d, dist: d - r };
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const path = (pts) => {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let j = 1; j < pts.length - 1; j++) {
        ctx.quadraticCurveTo(pts[j].x, pts[j].y, (pts[j].x + pts[j + 1].x) / 2, (pts[j].y + pts[j + 1].y) / 2);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    };

    const draw = () => {
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.92;
      ctx.lineWidth = 1.15;
      for (const s of list) {
        ctx.beginPath();
        path(s.pts);
        ctx.stroke();
      }
      if (ext > 0.35) {
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.7 * Math.min(1, (ext - 0.35) * 3);
        for (const at of [0.55, 0.78]) {
          const j = Math.round(at * (SEGS - 1));
          for (let i = 0; i < list.length - 1; i++) {
            const a = list[i].pts[j];
            const b = list[i + 1].pts[j];
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 3, b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    };

    const tick = () => {
      raf = 0;
      if (!w || !h) return;

      const p = local();
      const here = cap(p.x, p.y);
      const want = pointer.known && !btn.disabled && here.dist > 1 && here.dist < reach;
      if (want && !active) ink = getComputedStyle(wrap).color || ink;
      active = want;
      if (active) {
        hold.x = p.x;
        hold.y = p.y;
      }
      ext += ((active ? 1 : 0) - ext) * (active ? 0.1 : 0.2);
      if (!active && ext < 0.003) ext = 0;

      const hc = cap(hold.x, hold.y);
      const perpX = -hc.ny;
      const perpY = hc.nx;
      const inset = Math.min(6, hc.r * 0.5);

      list.forEach((s, i) => {
        const o = i - (n - 1) / 2;
        const b = cap(
          hc.cx + hc.nx * (hc.r - inset) + perpX * o * SPREAD,
          hc.cy + hc.ny * (hc.r - inset) + perpY * o * SPREAD,
        );
        const axT = b.cx + b.nx * (b.r - inset);
        const ayT = b.cy + b.ny * (b.r - inset);
        if (!s.seeded) {
          s.ax = axT;
          s.ay = ayT;
          for (const q of s.pts) {
            q.x = q.px = axT;
            q.y = q.py = ayT;
          }
          s.seeded = true;
        }
        if (active) {
          s.ax += (axT - s.ax) * 0.3;
          s.ay += (ayT - s.ay) * 0.3;
        }
        const dx = hold.x - s.ax;
        const dy = hold.y - s.ay;
        const d = Math.hypot(dx, dy) || 1e-6;
        const len = ext * Math.min(d, reach + hc.r);
        const seg = len / (SEGS - 1);
        const pts = s.pts;
        for (let j = 1; j < pts.length; j++) {
          const q = pts[j];
          const vx = (q.x - q.px) * DAMP;
          const vy = (q.y - q.py) * DAMP;
          q.px = q.x;
          q.py = q.y;
          q.x += vx;
          q.y += vy + GRAVITY * ext;
        }
        const tip = pts[pts.length - 1];
        tip.x += (s.ax + (dx / d) * len - tip.x) * s.lag;
        tip.y += (s.ay + (dy / d) * len - tip.y) * s.lag;
        pts[0].x = pts[0].px = s.ax;
        pts[0].y = pts[0].py = s.ay;
        for (let k = 0; k < 6; k++) {
          for (let j = 1; j < pts.length; j++) {
            const a = pts[j - 1];
            const q = pts[j];
            const ex = q.x - a.x;
            const ey = q.y - a.y;
            const el = Math.hypot(ex, ey) || 1e-6;
            if (el <= seg) continue;
            const diff = (el - seg) / el;
            if (j === 1) {
              q.x -= ex * diff;
              q.y -= ey * diff;
            } else {
              a.x += ex * diff * 0.5;
              a.y += ey * diff * 0.5;
              q.x -= ex * diff * 0.5;
              q.y -= ey * diff * 0.5;
            }
          }
        }
      });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w + pad * 2, h + pad * 2);
      if (ext > 0.01) draw();

      if (active || ext > 0) kick();
      else for (const s of list) s.seeded = false;
    };

    const controller = new AbortController();
    const listen = (target, event, handler, options) =>
      target.addEventListener(event, handler, { signal: controller.signal, ...options });

    const onMove = (e) => {
      if (e.pointerType === 'touch' && e.buttons === 0) return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.known = true;
      if (raf) return;
      const r = btn.getBoundingClientRect();
      if (
        e.clientX > r.left - reach &&
        e.clientX < r.right + reach &&
        e.clientY > r.top - reach &&
        e.clientY < r.bottom + reach
      ) {
        kick();
      }
    };
    const onEnd = (e) => {
      if (e.pointerType !== 'touch') return;
      pointer.known = false;
      kick();
    };
    const onOut = (e) => {
      if (e.relatedTarget) return;
      pointer.known = false;
      kick();
    };

    measure();
    const ro = new ResizeObserver(() => {
      measure();
      kick();
    });
    ro.observe(btn);
    listen(window, 'pointermove', onMove, { passive: true });
    listen(window, 'pointerdown', onMove, { passive: true });
    listen(window, 'pointerup', onEnd, { passive: true });
    listen(window, 'pointercancel', onEnd, { passive: true });
    listen(document, 'pointerout', onOut, { passive: true });

    window.addEventListener(
      'pagehide',
      () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        controller.abort();
      },
      { once: true },
    );
  };

  roots.forEach(init);
})();
