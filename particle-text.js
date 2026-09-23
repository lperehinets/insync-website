/* Canvas particle text with a scroll-driven metallic bead repulsor. */
(() => {
  const PAD = 170;
  const SPRING = 0.045;
  const MAX_FORCE = 40;
  const HOVER_REACH = 60;
  const SIZE_VARIANTS = 12;
  const MIN_SCALE = 0.35;
  const MAX_SCALE = 1.5;
  const NOISE = 0.18;
  const PHASE = 46;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) return;

  function sampleGap() {
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return /firefox/i.test(ua) ? 4 : 3;
    return 2;
  }

  function wrapWords(ctx, text, maxWidth) {
    const lines = [];
    let current = '';
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const next = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(next).width > maxWidth + 1) {
        lines.push(current);
        current = word;
      } else current = next;
    }
    if (current) lines.push(current);
    return lines;
  }

  function fontFrom(el, fallbackHost) {
    const style = getComputedStyle(el || fallbackHost);
    return {
      font: `${style.fontStyle} ${style.fontWeight} ${parseFloat(style.fontSize)}px ${style.fontFamily}`,
      size: parseFloat(style.fontSize),
      lineHeight: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.25,
      letterSpacing: style.letterSpacing,
      marginTop: parseFloat(style.marginTop) || 0,
      marginBottom: parseFloat(style.marginBottom) || 0,
      color: style.color
    };
  }

  class ParticleText {
    constructor(host, { repulsor = null, gap = 0 } = {}) {
      this.host = host;
      this.repulsor = repulsor;
      this.gap = gap || sampleGap();
      this.textEl = host.querySelector('.pt-text');
      this.canvas = host.querySelector('.pt-canvas');
      this.active = false;
      this.visible = false;
      this.dirty = false;
      this.displaced = 0;
      this.raf = 0;
      this.lastFrame = 0;
      this.frame = 0;
      this.color = '';
      this.dpr = 1;
      this.cw = 0;
      this.ch = 0;
      this.count = 0;
      this.homeX = null;
      this.homeY = null;
      this.x = null;
      this.y = null;
      this.vx = null;
      this.vy = null;
      this.awake = null;
      this.noiseA = null;
      this.noiseB = null;
      this.sizeIdx = null;
      this.rowIndex = null;
      this.source = null;
      this.tint = null;
      this.sprite = null;
      this.cell = 1;
      this.spriteSize = 1;
      this.ctx = null;
      this.resizeTimer = 0;
      this._onResize = () => {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => this.rebuild(), this.active ? 150 : 0);
      };
    }

    init() {
      if (!this.textEl || !this.canvas) return;
      this.ro = new ResizeObserver(entries => {
        if (entries.at(-1)?.contentRect?.width) this._onResize();
      });
      this.ro.observe(this.host);
      this.io = new IntersectionObserver(entries => {
        this.visible = entries.at(-1)?.isIntersecting ?? false;
        if (this.visible) this.kick();
        else this.stop();
      }, { rootMargin: '100px' });
      this.io.observe(this.host);
      document.fonts.ready.then(() => this.rebuild());
    }

    destroy() {
      this.stop();
      this.ro?.disconnect();
      this.io?.disconnect();
      clearTimeout(this.resizeTimer);
    }

    kick() {
      if (!this.raf && this.visible) this.raf = requestAnimationFrame(t => this.tick(t));
    }

    stop() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
    }

    layoutLines(width) {
      const titleEl = this.textEl.querySelector('.pt-title');
      const bodyEl = this.textEl.querySelector('.pt-body');
      const measure = document.createElement('canvas').getContext('2d');
      const blocks = [];

      if (titleEl || bodyEl) {
        if (titleEl) {
          const meta = fontFrom(titleEl, this.host);
          measure.font = meta.font;
          if ('letterSpacing' in measure) measure.letterSpacing = meta.letterSpacing;
          blocks.push({
            ...meta,
            lines: wrapWords(measure, titleEl.textContent.trim(), width)
          });
        }
        if (bodyEl) {
          const meta = fontFrom(bodyEl, this.host);
          measure.font = meta.font;
          if ('letterSpacing' in measure) measure.letterSpacing = meta.letterSpacing;
          blocks.push({
            ...meta,
            lines: wrapWords(measure, bodyEl.textContent.trim(), width)
          });
        }
        return blocks;
      }

      const meta = fontFrom(this.host, this.host);
      measure.font = meta.font;
      if ('letterSpacing' in measure) measure.letterSpacing = meta.letterSpacing;
      const uppercase = getComputedStyle(this.host).textTransform === 'uppercase';
      const raw = (this.textEl.dataset.paragraphs || this.textEl.textContent || '')
        .replace(/\r/g, '')
        .split('\n');
      const lines = [];
      for (const paragraph of raw) {
        const text = uppercase ? paragraph.toUpperCase() : paragraph;
        if (!text.trim()) {
          lines.push('');
          continue;
        }
        lines.push(...wrapWords(measure, text, width));
      }
      return [{ ...meta, lines, marginTop: 0, marginBottom: 0 }];
    }

    rebuild() {
      const me = this.host;
      const canvas = this.canvas;
      if (!me || !canvas || !this.textEl) return;

      const width = me.clientWidth;
      if (!width) return;

      const blocks = this.layoutLines(width);
      if (!blocks.length) return;

      let contentH = 0;
      blocks.forEach((block, index) => {
        contentH += block.marginTop;
        contentH += block.lines.length * block.lineHeight;
        contentH += block.marginBottom;
        if (index < blocks.length - 1) contentH += 0;
      });

      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.cw = width + 2 * PAD;
      this.ch = contentH + 2 * PAD;
      const iw = Math.round(this.cw * this.dpr);
      const ih = Math.round(this.ch * this.dpr);

      this.source = document.createElement('canvas');
      this.source.width = iw;
      this.source.height = ih;
      const src = this.source.getContext('2d');
      src.scale(this.dpr, this.dpr);
      src.fillStyle = '#fff';
      src.textAlign = 'left';
      src.textBaseline = 'alphabetic';

      let y = PAD;
      for (const block of blocks) {
        y += block.marginTop;
        src.font = block.font;
        if ('letterSpacing' in src) src.letterSpacing = block.letterSpacing;
        const metrics = src.measureText('Mg');
        const ascent = metrics.fontBoundingBoxAscent ?? block.size * 0.8;
        const descent = metrics.fontBoundingBoxDescent ?? block.size * 0.2;
        const baseline = (block.lineHeight - (ascent + descent)) / 2 + ascent;
        block.lines.forEach((line, i) => {
          if (!line) return;
          src.fillText(line, PAD, y + i * block.lineHeight + baseline);
        });
        y += block.lines.length * block.lineHeight + block.marginBottom;
      }

      const data = src.getImageData(0, 0, iw, ih).data;
      const step = Math.round(this.gap * this.dpr);
      const cols = Math.floor(iw / step);
      const rows = Math.floor(ih / step);
      const xs = [];
      const ys = [];
      this.rowIndex = new Int32Array(rows + 1);
      for (let row = 0; row < rows; row++) {
        this.rowIndex[row] = xs.length;
        for (let col = 0; col < cols; col++) {
          let hit = false;
          for (let oy = 0; oy < step && !hit; oy++) {
            const base = ((row * step + oy) * iw + col * step) * 4 + 3;
            for (let ox = 0; ox < step; ox++) {
              if (data[base + ox * 4] > 64) {
                hit = true;
                break;
              }
            }
          }
          if (hit) {
            xs.push(col * this.gap);
            ys.push(row * this.gap);
          }
        }
      }
      this.rowIndex[rows] = xs.length;
      this.count = xs.length;
      this.homeX = Float32Array.from(xs);
      this.homeY = Float32Array.from(ys);
      this.x = Float32Array.from(xs);
      this.y = Float32Array.from(ys);
      this.vx = new Float32Array(this.count);
      this.vy = new Float32Array(this.count);
      this.awake = new Uint8Array(this.count);
      this.noiseA = new Float32Array(this.count);
      this.noiseB = new Float32Array(this.count);
      this.sizeIdx = new Uint8Array(this.count);
      const a = (Math.PI * 2) / PHASE;
      const b = (Math.PI * 2) / (PHASE * 1.7);
      for (let i = 0; i < this.count; i++) {
        const hx = this.homeX[i];
        const hy = this.homeY[i];
        this.noiseA[i] = 0.5 + 0.25 * Math.sin(hx * a + hy * a * 0.7) + 0.25 * Math.cos(hy * b - hx * b * 0.4);
        this.noiseB[i] = 0.5 + 0.25 * Math.cos(hx * b + 1.7) + 0.25 * Math.sin(hy * a + 0.6);
        this.sizeIdx[i] = Math.min(SIZE_VARIANTS - 1, Math.floor(this.noiseB[i] * SIZE_VARIANTS));
      }

      this.displaced = 0;
      this.cell = step;
      this.spriteSize = Math.ceil(step * MAX_SCALE) + 2;
      canvas.width = iw;
      canvas.height = ih;
      canvas.style.width = `${this.cw}px`;
      canvas.style.height = `${this.ch}px`;
      canvas.style.left = `${-PAD}px`;
      canvas.style.top = `${-PAD}px`;
      this.ctx = canvas.getContext('2d');
      this.color = '';
      this.dirty = true;
      this.host.classList.add('pt-host--fx');
      this.active = this.count > 0;
      this.kick();
    }

    tintSprites(color) {
      if (!this.source) return;
      this.tint = document.createElement('canvas');
      this.tint.width = this.source.width;
      this.tint.height = this.source.height;
      const t = this.tint.getContext('2d');
      t.clearRect(0, 0, this.tint.width, this.tint.height);
      t.drawImage(this.source, 0, 0);
      t.globalCompositeOperation = 'source-in';
      t.fillStyle = color;
      t.fillRect(0, 0, this.tint.width, this.tint.height);
      t.globalCompositeOperation = 'source-over';

      this.sprite = document.createElement('canvas');
      this.sprite.width = this.spriteSize * SIZE_VARIANTS;
      this.sprite.height = this.spriteSize;
      const s = this.sprite.getContext('2d');
      s.fillStyle = color;
      for (let i = 0; i < SIZE_VARIANTS; i++) {
        const r = (this.cell * (MIN_SCALE + (MAX_SCALE - MIN_SCALE) * (i / (SIZE_VARIANTS - 1)))) / 2;
        s.beginPath();
        s.arc(i * this.spriteSize + this.spriteSize / 2, this.spriteSize / 2, r, 0, Math.PI * 2);
        s.fill();
      }
    }

    wake(force) {
      const reach = Math.sqrt(force.wake2);
      const row0 = Math.max(0, Math.floor((force.y - reach) / this.gap));
      const row1 = Math.min(this.rowIndex.length - 2, Math.ceil((force.y + reach) / this.gap));
      if (row1 < row0) return;
      for (let i = this.rowIndex[row0]; i < this.rowIndex[row1 + 1]; i++) {
        if (this.awake[i]) continue;
        const dx = this.homeX[i] - force.x;
        const dy = this.homeY[i] - force.y;
        if (dx * dx + dy * dy < force.wake2) {
          this.awake[i] = 1;
          this.displaced++;
        }
      }
    }

    forces() {
      const list = [];
      if (this.repulsor?.dataset.repulse === '0') return list;
      const canvasRect = this.canvas.getBoundingClientRect();
      const bead = this.repulsor?.getBoundingClientRect();
      if (
        bead &&
        bead.width > 0 &&
        bead.bottom > canvasRect.top &&
        bead.top < canvasRect.bottom &&
        bead.right > canvasRect.left &&
        bead.left < canvasRect.right
      ) {
        const radius = bead.width / 2 + 10;
        const reach = radius + HOVER_REACH;
        list.push({
          x: bead.left + bead.width / 2 - canvasRect.left,
          y: bead.top + bead.height / 2 - canvasRect.top,
          strength: (radius * 4.65) ** 2,
          reach,
          wake2: reach * reach
        });
      }
      return list;
    }

    tick(now) {
      if (!this.visible) {
        this.raf = 0;
        return;
      }
      if (now - this.lastFrame < 15) {
        this.raf = requestAnimationFrame(t => this.tick(t));
        return;
      }
      this.lastFrame = now;
      this.frame++;

      if (!this.displaced && this.frame % 3 !== 0) {
        this.raf = requestAnimationFrame(t => this.tick(t));
        return;
      }

      const color = getComputedStyle(this.canvas).color || getComputedStyle(this.host).color;
      if (color !== this.color) {
        this.tintSprites(color);
        this.color = color;
        this.dirty = true;
      }

      const forces = this.forces();
      for (const force of forces) this.wake(force);

      if (this.displaced) {
        const t = performance.now() * 0.001;
        for (let i = 0; i < this.count; i++) {
          if (!this.awake[i]) continue;
          let ax = (this.homeX[i] - this.x[i]) * SPRING;
          let ay = (this.homeY[i] - this.y[i]) * SPRING;
          let inside = false;
          for (const force of forces) {
            const dx = this.x[i] - force.x;
            const dy = this.y[i] - force.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 >= force.wake2) continue;
            inside = true;
            if (dist2 < 0.01) continue;
            const dist = Math.sqrt(dist2);
            const falloff = 1 - dist / force.reach;
            const q = (Math.min(force.strength / dist2, MAX_FORCE) * falloff * falloff) / dist;
            const push = q * (0.55 + 0.9 * this.noiseA[i]);
            const swirl = q * (this.noiseA[i] - 0.5) * 0.9;
            ax += dx * push - dy * swirl;
            ay += dy * push + dx * swirl;
          }
          if (inside) {
            const phase = t * (0.6 + 0.8 * this.noiseB[i]);
            const seed = this.noiseA[i] * 4 + i * 0.37;
            ax += Math.cos(phase + seed) * NOISE;
            ay += Math.sin(phase * 0.83 + seed) * NOISE;
          }
          const damp = 0.68 + 0.05 * this.noiseB[i];
          this.vx[i] = (this.vx[i] + ax) * damp;
          this.vy[i] = (this.vy[i] + ay) * damp;
          this.x[i] += this.vx[i];
          this.y[i] += this.vy[i];
          if (
            !inside &&
            Math.abs(this.x[i] - this.homeX[i]) < 0.3 &&
            Math.abs(this.y[i] - this.homeY[i]) < 0.3 &&
            Math.abs(this.vx[i]) < 0.08 &&
            Math.abs(this.vy[i]) < 0.08
          ) {
            this.x[i] = this.homeX[i];
            this.y[i] = this.homeY[i];
            this.vx[i] = 0;
            this.vy[i] = 0;
            this.awake[i] = 0;
            this.displaced--;
          }
        }
        this.dirty = true;
      }

      if (this.dirty && this.tint && this.ctx) {
        const ctx = this.ctx;
        const dpr = this.dpr;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(this.tint, 0, 0);
        if (this.displaced && this.sprite) {
          for (let i = 0; i < this.count; i++) {
            if (!this.awake[i]) continue;
            ctx.clearRect(Math.round(this.homeX[i] * dpr), Math.round(this.homeY[i] * dpr), this.cell, this.cell);
          }
          const half = this.spriteSize / 2;
          const offset = (this.gap / 2) * dpr;
          for (let i = 0; i < this.count; i++) {
            if (!this.awake[i]) continue;
            ctx.drawImage(
              this.sprite,
              this.sizeIdx[i] * this.spriteSize,
              0,
              this.spriteSize,
              this.spriteSize,
              Math.round(this.x[i] * dpr + offset - half),
              Math.round(this.y[i] * dpr + offset - half),
              this.spriteSize,
              this.spriteSize
            );
          }
        }
        this.dirty = this.displaced > 0;
      }

      this.raf = requestAnimationFrame(t => this.tick(t));
    }
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function bootBeadPath(bead, runway) {
    const stage = runway.querySelector('.values-bead');
    const sticky = runway.querySelector('.values-sticky');
    const cards = [...runway.querySelectorAll('.value-card')];
    if (!stage || cards.length < 2) return () => {};

    let raf = 0;
    const update = () => {
      try {
        const rect = runway.getBoundingClientRect();
        const travel = Math.max(1, runway.offsetHeight - window.innerHeight);
        const progress = clamp((-rect.top) / travel, 0, 1);

        const stageRect = stage.getBoundingClientRect();
        const stickyRect = sticky.getBoundingClientRect();
        const size = bead.offsetWidth || 54;
        const stacked = window.matchMedia('(max-width: 650px)').matches ||
          (cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left < 40);

        // Through the vertical middle of each text block, then finish below point 02.
        const anchors = cards.map((card) => {
          const block = card.querySelector('.pt-text') || card.querySelector('.pt-host') || card;
          const br = block.getBoundingClientRect();
          const cr = card.getBoundingClientRect();
          const x = stacked
            ? cr.left - stageRect.left + Math.min(cr.width * 0.42, 160)
            : cr.left - stageRect.left + cr.width * 0.5;
          return {
            x,
            throughY: br.top - stageRect.top + br.height * 0.52,
            belowY: br.bottom - stageRect.top + size * 1.35
          };
        });

        // 0–6%: wait left of 01 on the text midline
        // 6–72%: flow through the middle of 01 → 02 → 03
        // 72–100%: drop under point 02 with ↓
        let x;
        let y;
        let showDown = false;
        let repulse = false;

        if (progress < 0.06) {
          x = anchors[0].x - (stacked ? 0 : Math.min(56, cards[0].getBoundingClientRect().width * 0.22));
          y = anchors[0].throughY;
        } else if (progress < 0.72) {
          const u = easeInOut((progress - 0.06) / 0.66);
          repulse = true;
          if (u < 0.5) {
            const f = u / 0.5;
            x = anchors[0].x + (anchors[1].x - anchors[0].x) * f;
            y = anchors[0].throughY + (anchors[1].throughY - anchors[0].throughY) * f;
          } else {
            const f = (u - 0.5) / 0.5;
            x = anchors[1].x + (anchors[2].x - anchors[1].x) * f;
            y = anchors[1].throughY + (anchors[2].throughY - anchors[1].throughY) * f;
          }
        } else {
          const d = easeInOut((progress - 0.72) / 0.28);
          x = anchors[2].x + (anchors[1].x - anchors[2].x) * d;
          y = anchors[2].throughY + (anchors[1].belowY - anchors[2].throughY) * d;
          showDown = d > 0.4;
          repulse = d < 0.55;
        }

        bead.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0)`;
        bead.dataset.progress = progress.toFixed(3);
        const inView = stickyRect.bottom > 60 && stickyRect.top < window.innerHeight - 40;
        bead.classList.toggle('bead-entry--in', inView && progress >= 0 && progress < 1.05);
        bead.classList.toggle('metal-bead--waiting', inView && progress < 0.06);
        bead.classList.toggle('metal-bead--down', showDown);
        bead.dataset.repulse = repulse ? '1' : '0';
      } catch (err) {
        bead.dataset.beadError = String(err && err.message || err);
      }
    };

    const tick = () => {
      update();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onScroll = () => update();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', update);
    const interval = window.setInterval(update, 50);
    update();
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(interval);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', update);
    };
  }

  function boot() {
    const bead = document.getElementById('metal-bead');
    const runway = document.getElementById('values-runway');
    const hosts = [...document.querySelectorAll('[data-particle-text]')];
    if (!bead || !runway || !hosts.length) return;

    const instances = hosts.map((host) => {
      const pt = new ParticleText(host, { repulsor: bead });
      pt.init();
      return pt;
    });

    const stopPath = bootBeadPath(bead, runway);
    window.addEventListener('pagehide', () => {
      instances.forEach((pt) => pt.destroy());
    }, { once: true });
    window.addEventListener('beforeunload', stopPath, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
