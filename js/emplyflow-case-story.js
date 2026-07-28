/**
 * EmplyFlow — Case Story Mode
 *
 * Scroll-driven storytelling без внешних зависимостей:
 * Flow-проводник, canvas-сцены «хаос → порядок», sticky-секвенция
 * продукта, интерактивная карта проекта, демо кадрового решения.
 *
 * Все анимации управляются скроллом и уважают prefers-reduced-motion.
 */
(function () {
  'use strict';

  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reduceQuery.matches;
  var rafId = null;
  var scheduled = false;
  var tasks = [];

  function onScrollFrame(fn) { tasks.push(fn); }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    rafId = requestAnimationFrame(function () {
      scheduled = false;
      for (var i = 0; i < tasks.length; i++) tasks[i]();
    });
  }

  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

  function observe(elements, cb, options) {
    if (!elements.length) return null;
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(elements, function (el) { cb(el, true); });
      return null;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { cb(entry.target, entry.isIntersecting, io); });
    }, options || { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(elements, function (el) { io.observe(el); });
    return io;
  }

  /* ---------------------------------------------------------- *
   * 0. Preloader
   * ---------------------------------------------------------- */
  function initPreloader() {
    var root = document.getElementById('preloader');
    if (!root) return;

    var statusEl = root.querySelector('[data-preloader-status]');
    var barEl = root.querySelector('[data-preloader-bar]');
    var steps = ['Собираем данные', 'Восстанавливаем историю проекта', 'Запускаем Flow'];
    var i = 0;
    var timer = null;

    function finish() {
      if (!root || root.classList.contains('is-done')) return;
      if (timer) clearInterval(timer);
      if (barEl) barEl.style.width = '100%';
      root.classList.add('is-done');
      document.body.classList.remove('is-locked');
      window.setTimeout(function () {
        if (root && root.parentNode) root.parentNode.removeChild(root);
      }, 700);
    }

    if (reduced) { finish(); return; }

    document.body.classList.add('is-locked');
    if (statusEl) statusEl.textContent = steps[0];
    if (barEl) barEl.style.width = '18%';

    timer = window.setInterval(function () {
      i += 1;
      if (i >= steps.length) { finish(); return; }
      if (statusEl) statusEl.textContent = steps[i];
      if (barEl) barEl.style.width = (28 + i * 30) + '%';
    }, 420);

    // Не имитируем долгую загрузку: как только страница готова — уходим.
    if (document.readyState === 'complete') window.setTimeout(finish, 900);
    else window.addEventListener('load', function () { window.setTimeout(finish, 500); }, { once: true });

    window.setTimeout(finish, 3200); // страховка
  }

  /* ---------------------------------------------------------- *
   * 1. Flow guide — прогресс и смена характера по главам
   * ---------------------------------------------------------- */
  function initFlowGuide() {
    var guide = document.querySelector('[data-flow-guide]');
    var bar = document.querySelector('[data-read-progress]');
    var topbar = document.querySelector('[data-topbar]');
    var counter = guide ? guide.querySelector('[data-flow-count]') : null;
    var chapters = document.querySelectorAll('[data-chapter]');
    var total = chapters.length;

    if (counter && total) counter.textContent = '01 / ' + String(total).padStart(2, '0');

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;

      if (guide) guide.style.setProperty('--progress', progress.toFixed(4));
      if (bar) bar.style.setProperty('--read', progress.toFixed(4));
      if (topbar) topbar.classList.toggle('is-stuck', window.scrollY > 40);

      if (guide && !reduced) {
        guide.style.setProperty('--flow-spin', (progress * 540).toFixed(1) + 'deg');
      }

      // активная глава определяет оттенок Flow
      var active = null;
      var mid = window.innerHeight * 0.42;
      for (var i = 0; i < total; i++) {
        var rect = chapters[i].getBoundingClientRect();
        if (rect.top <= mid && rect.bottom > mid) { active = i; break; }
      }
      if (active === null) return;

      var tint = chapters[active].getAttribute('data-flow-tint');
      if (guide && tint) guide.style.setProperty('--flow-tint', tint);
      if (counter) counter.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    }

    onScrollFrame(update);
    update();
  }

  /* ---------------------------------------------------------- *
   * 2. Canvas-сцены: хаос данных (hero) и порядок (результаты)
   * ---------------------------------------------------------- */
  function initCanvasScene(canvas, mode) {
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    var sheets = [];
    var spark = { x: 0, y: 0, vx: 0, vy: 0 };
    var running = false;
    var frame = null;
    var t = 0;

    var TINTS = mode === 'order'
      ? ['rgba(213,255,243,', 'rgba(206,200,255,', 'rgba(255,184,226,']
      : ['rgba(217,214,255,', 'rgba(255,184,226,', 'rgba(122,110,255,'];

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = Math.max(rect.width, 1);
      h = Math.max(rect.height, 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      var area = w * h;
      var count = clamp(Math.round(area / 26000), 12, mode === 'order' ? 34 : 46);
      sheets = [];
      for (var i = 0; i < count; i++) {
        var sw = 60 + Math.random() * 110;
        sheets.push({
          x: Math.random() * w,
          y: Math.random() * h,
          w: sw,
          h: sw * (0.58 + Math.random() * 0.3),
          rot: (Math.random() - 0.5) * (mode === 'order' ? 0.08 : 0.7),
          vx: (Math.random() - 0.5) * (mode === 'order' ? 0.09 : 0.26),
          vy: (Math.random() - 0.5) * (mode === 'order' ? 0.09 : 0.24),
          depth: 0.35 + Math.random() * 0.65,
          rows: 2 + Math.floor(Math.random() * 4),
          tint: TINTS[i % TINTS.length]
        });
      }
      // целевая сетка для режима «порядок»
      if (mode === 'order') {
        var cols = Math.max(3, Math.round(Math.sqrt(sheets.length * (w / Math.max(h, 1)))));
        sheets.forEach(function (s, i) {
          var rows = Math.ceil(sheets.length / cols);
          s.tx = ((i % cols) + 0.5) * (w / cols);
          s.ty = (Math.floor(i / cols) + 0.5) * (h / rows);
        });
      }
      spark.x = w * 0.2;
      spark.y = h * 0.6;
    }

    function drawSheet(s) {
      var alpha = 0.05 + s.depth * 0.12;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = s.tint + alpha.toFixed(3) + ')';
      ctx.strokeStyle = s.tint + (alpha + 0.12).toFixed(3) + ')';
      ctx.lineWidth = 1;
      var r = 8;
      var x = -s.w / 2, y = -s.h / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + s.w, y, x + s.w, y + s.h, r);
      ctx.arcTo(x + s.w, y + s.h, x, y + s.h, r);
      ctx.arcTo(x, y + s.h, x, y, r);
      ctx.arcTo(x, y, x + s.w, y, r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // строки «таблицы»
      ctx.strokeStyle = s.tint + (alpha + 0.06).toFixed(3) + ')';
      for (var i = 1; i <= s.rows; i++) {
        var ly = y + (s.h / (s.rows + 1)) * i;
        ctx.beginPath();
        ctx.moveTo(x + 9, ly);
        ctx.lineTo(x + s.w - 9, ly);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawSpark() {
      var R = 13;
      ctx.save();
      ctx.translate(spark.x, spark.y);
      ctx.rotate(t * 0.012);
      var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 3.4);
      grad.addColorStop(0, mode === 'order' ? 'rgba(213,255,243,0.6)' : 'rgba(255,184,226,0.55)');
      grad.addColorStop(1, 'rgba(255,184,226,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, R * 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = mode === 'order' ? '#d5fff3' : '#ffb8e2';
      ctx.beginPath();
      ctx.moveTo(0, -R);
      ctx.quadraticCurveTo(R * 0.22, -R * 0.22, R, 0);
      ctx.quadraticCurveTo(R * 0.22, R * 0.22, 0, R);
      ctx.quadraticCurveTo(-R * 0.22, R * 0.22, -R, 0);
      ctx.quadraticCurveTo(-R * 0.22, -R * 0.22, 0, -R);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawLinks() {
      // в режиме «порядок» Flow связывает ближайшие карточки
      ctx.strokeStyle = 'rgba(213,255,243,0.16)';
      ctx.lineWidth = 1;
      for (var i = 0; i < sheets.length; i++) {
        var s = sheets[i];
        var dx = s.x - spark.x, dy = s.y - spark.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 220) {
          ctx.globalAlpha = 1 - d / 220;
          ctx.beginPath();
          ctx.moveTo(spark.x, spark.y);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    function step() {
      t += 1;
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < sheets.length; i++) {
        var s = sheets[i];
        if (mode === 'order') {
          s.x += (s.tx - s.x) * 0.012 + Math.sin((t + i * 40) * 0.004) * 0.14;
          s.y += (s.ty - s.y) * 0.012 + Math.cos((t + i * 30) * 0.004) * 0.14;
          s.rot += (0 - s.rot) * 0.02;
        } else {
          s.x += s.vx * s.depth;
          s.y += s.vy * s.depth;
          s.rot += 0.0012 * s.depth;
          if (s.x < -s.w) s.x = w + s.w;
          if (s.x > w + s.w) s.x = -s.w;
          if (s.y < -s.h) s.y = h + s.h;
          if (s.y > h + s.h) s.y = -s.h;
        }
        drawSheet(s);
      }

      if (mode === 'order') drawLinks();

      // Flow: в хаосе — рывками огибает препятствия, в порядке — плавно
      if (mode === 'order') {
        spark.x = w * 0.5 + Math.cos(t * 0.006) * w * 0.28;
        spark.y = h * 0.5 + Math.sin(t * 0.009) * h * 0.22;
      } else {
        var tx = w * (0.5 + Math.cos(t * 0.0042) * 0.34);
        var ty = h * (0.5 + Math.sin(t * 0.0075) * 0.3);
        for (var j = 0; j < sheets.length; j++) {
          var o = sheets[j];
          var ox = spark.x - o.x, oy = spark.y - o.y;
          var od = Math.sqrt(ox * ox + oy * oy);
          if (od < 90 && od > 0.01) { tx += (ox / od) * 46; ty += (oy / od) * 46; }
        }
        spark.vx += (tx - spark.x) * 0.0016;
        spark.vy += (ty - spark.y) * 0.0016;
        spark.vx *= 0.94; spark.vy *= 0.94;
        spark.x += spark.vx; spark.y += spark.vy;
      }

      drawSpark();
      frame = requestAnimationFrame(step);
    }

    function renderStatic() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < sheets.length; i++) {
        if (mode === 'order') { sheets[i].x = sheets[i].tx; sheets[i].y = sheets[i].ty; sheets[i].rot = 0; }
        drawSheet(sheets[i]);
      }
      spark.x = w * 0.5; spark.y = h * 0.5;
      if (mode === 'order') drawLinks();
      drawSpark();
    }

    function start() {
      if (running || reduced) return;
      running = true;
      frame = requestAnimationFrame(step);
    }
    function stop() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = null;
    }

    resize();
    if (reduced) { renderStatic(); return; }

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 200);
    });

    observe([canvas], function (el, isIn) { isIn ? start() : stop(); }, { threshold: 0 });
  }

  /* ---------------------------------------------------------- *
   * 3. Reveal-эффекты
   * ---------------------------------------------------------- */
  function initReveals() {
    observe(document.querySelectorAll('[data-reveal]'), function (el, isIn, io) {
      if (!isIn) return;
      el.classList.add('is-in');
      if (io) io.unobserve(el);
    }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });

    // hero: последовательное появление фактов
    var items = document.querySelectorAll('[data-hero-line]');
    Array.prototype.forEach.call(items, function (el, i) {
      window.setTimeout(function () { el.classList.add('is-in'); }, reduced ? 0 : 500 + i * 260);
    });

    // цитата по словам
    var quote = document.querySelector('[data-quote]');
    var quoteText = quote ? quote.querySelector('[data-quote-text]') : null;
    if (quoteText && !quoteText.dataset.split) {
      quoteText.dataset.split = '1';
      var words = quoteText.textContent.trim().split(/\s+/);
      quoteText.textContent = '';
      words.forEach(function (word, i) {
        var span = document.createElement('span');
        span.textContent = word;
        span.style.setProperty('--i', i);
        quoteText.appendChild(span);
        if (i < words.length - 1) quoteText.appendChild(document.createTextNode(' '));
      });
    }
  }

  /* ---------------------------------------------------------- *
   * 4. Счётчики
   * ---------------------------------------------------------- */
  function initCounters() {
    observe(document.querySelectorAll('[data-count-to]'), function (el, isIn, io) {
      if (!isIn) return;
      if (io) io.unobserve(el);

      var to = parseFloat(el.getAttribute('data-count-to'));
      var suffix = el.getAttribute('data-count-suffix') || '';
      if (isNaN(to)) return;

      if (reduced) { el.textContent = formatNum(to) + suffix; return; }

      var from = parseFloat(el.getAttribute('data-count-from')) || 0;
      var dur = 1100;
      var start = null;

      function tick(ts) {
        if (start === null) start = ts;
        var p = clamp((ts - start) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = formatNum(from + (to - from) * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });

    function formatNum(n) {
      var rounded = Math.round(n);
      return rounded >= 1000 ? rounded.toLocaleString('ru-RU') : String(rounded);
    }
  }

  /* ---------------------------------------------------------- *
   * 5. Story «Подробнее»
   * ---------------------------------------------------------- */
  function initStoryDetails() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-story-more]');
      if (!btn) return;
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.classList.toggle('is-open', !open);
      btn.querySelector('[data-story-more-label]').textContent = open ? 'Подробнее' : 'Свернуть';
    });
  }

  /* ---------------------------------------------------------- *
   * 6. Карта трансформации
   * ---------------------------------------------------------- */
  function initRouteMap() {
    var root = document.querySelector('[data-route]');
    if (!root) return;

    var stations = root.querySelectorAll('[data-station]');
    var line = root.querySelector('[data-route-line]');
    var panel = root.querySelector('[data-route-panel]');
    if (!stations.length || !panel) return;

    var titleEl = panel.querySelector('[data-route-title]');
    var textEl = panel.querySelector('[data-route-text]');
    var phaseEl = panel.querySelector('[data-route-phase]');
    var metricEl = panel.querySelector('[data-route-metric]');
    var current = -1;

    function select(index, focus) {
      if (index === current) return;
      current = index;
      var st = stations[index];

      Array.prototype.forEach.call(stations, function (el, i) {
        el.setAttribute('aria-selected', String(i === index));
        el.setAttribute('tabindex', i === index ? '0' : '-1');
        el.classList.toggle('is-done', i < index);
      });

      if (line) line.style.setProperty('--route-progress', stations.length > 1 ? index / (stations.length - 1) : 0);

      if (titleEl) titleEl.textContent = st.getAttribute('data-title') || '';
      if (textEl) textEl.textContent = st.getAttribute('data-text') || '';
      if (phaseEl) phaseEl.textContent = st.getAttribute('data-phase') || '';

      var metric = st.getAttribute('data-metric');
      var metricLabel = st.getAttribute('data-metric-label');
      if (metricEl) {
        if (metric) {
          metricEl.hidden = false;
          metricEl.querySelector('b').textContent = metric;
          metricEl.querySelector('span').textContent = metricLabel || '';
        } else {
          metricEl.hidden = true;
        }
      }

      if (focus) st.focus();
    }

    Array.prototype.forEach.call(stations, function (el, i) {
      el.addEventListener('click', function () { select(i); });
      el.addEventListener('mouseenter', function () { select(i); });
      el.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = Math.min(i + 1, stations.length - 1);
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = Math.max(i - 1, 0);
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = stations.length - 1;
        if (next === null) return;
        e.preventDefault();
        select(next, true);
      });
    });

    select(0);

    // Скролл ведёт Flow по маршруту
    if (!reduced) {
      onScrollFrame(function () {
        var rect = root.getBoundingClientRect();
        var vh = window.innerHeight;
        if (rect.bottom < 0 || rect.top > vh) return;
        var span = rect.height - vh * 0.5;
        if (span <= 0) return;
        var p = clamp((vh * 0.5 - rect.top) / span, 0, 1);
        var idx = Math.round(p * (stations.length - 1));
        select(idx);
      });
    }
  }

  /* ---------------------------------------------------------- *
   * 7. Sticky-секвенция продукта
   * ---------------------------------------------------------- */
  function initSequence() {
    var root = document.querySelector('[data-sequence]');
    if (!root) return;

    var steps = root.querySelectorAll('[data-seq-step]');
    var scenes = root.querySelectorAll('[data-seq-scene]');
    var chromeLabel = root.querySelector('[data-seq-chrome]');
    if (!steps.length || !scenes.length) return;

    if (reduced) {
      Array.prototype.forEach.call(steps, function (s) { s.classList.add('is-active'); });
      Array.prototype.forEach.call(scenes, function (s) { s.classList.add('is-active'); });
      return;
    }

    var active = -1;

    function setActive(i) {
      if (i === active) return;
      active = i;
      Array.prototype.forEach.call(steps, function (el, idx) { el.classList.toggle('is-active', idx === i); });
      Array.prototype.forEach.call(scenes, function (el, idx) { el.classList.toggle('is-active', idx === i); });
      if (chromeLabel && steps[i]) chromeLabel.textContent = steps[i].getAttribute('data-chrome') || '';
    }

    onScrollFrame(function () {
      var mid = window.innerHeight * 0.5;
      var best = 0;
      var bestDist = Infinity;
      for (var i = 0; i < steps.length; i++) {
        var r = steps[i].getBoundingClientRect();
        var d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      setActive(best);
    });

    setActive(0);
  }

  /* ---------------------------------------------------------- *
   * 8. Демо кадрового решения
   * ---------------------------------------------------------- */
  function initDecisionDemo() {
    var root = document.querySelector('[data-decision]');
    if (!root) return;

    var cards = root.querySelectorAll('[data-candidate]');
    var verdict = root.querySelector('[data-verdict]');
    if (!cards.length || !verdict) return;

    var titleEl = verdict.querySelector('[data-verdict-title]');
    var textEl = verdict.querySelector('[data-verdict-text]');

    observe(cards, function (el, isIn, io) {
      if (!isIn) return;
      el.classList.add('is-shown');
      if (io) io.unobserve(el);
    }, { threshold: 0.35 });

    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener('click', function () {
        Array.prototype.forEach.call(cards, function (c) {
          c.setAttribute('aria-pressed', String(c === card));
        });
        if (titleEl) titleEl.textContent = card.getAttribute('data-verdict-title') || '';
        if (textEl) textEl.textContent = card.getAttribute('data-verdict-text') || '';
        verdict.hidden = false;
        if (!reduced) verdict.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  /* ---------------------------------------------------------- *
   * 9. Модалка заявки
   * ---------------------------------------------------------- */
  function initDemoModal() {
    var modal = document.getElementById('ef-demo-modal');
    if (!modal) return;
    var lastFocused = null;

    window.__efOpenDemoForm = function () {
      lastFocused = document.activeElement;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      var first = modal.querySelector('.ef-lead-form__input');
      if (first) window.setTimeout(function () { first.focus(); }, 60);
    };

    window.__efCloseDemoForm = function () {
      if (modal.hidden) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-ef-demo-close]')) { window.__efCloseDemoForm(); return; }
      var open = e.target.closest('[data-ef-demo-open]');
      if (open) { e.preventDefault(); window.__efOpenDemoForm(); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') window.__efCloseDemoForm();
      if (e.key !== 'Tab' || modal.hidden) return;

      var focusables = modal.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------------------------------------------------------- *
   * boot
   * ---------------------------------------------------------- */
  function boot() {
    initPreloader();
    initFlowGuide();
    initReveals();
    initCounters();
    initStoryDetails();
    initRouteMap();
    initSequence();
    initDecisionDemo();
    initDemoModal();

    initCanvasScene(document.querySelector('[data-canvas="chaos"]'), 'chaos');
    initCanvasScene(document.querySelector('[data-canvas="order"]'), 'order');

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
  }

  if (typeof reduceQuery.addEventListener === 'function') {
    reduceQuery.addEventListener('change', function (e) { reduced = e.matches; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener('pagehide', function () {
    if (rafId) cancelAnimationFrame(rafId);
    tasks.length = 0;
  });
})();
