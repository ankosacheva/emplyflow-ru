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

    window.addEventListener('pageshow', function () { finish(); });
    window.addEventListener('pagehide', function (e) {
      if (e.persisted) finish();
    });
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
   * 2. Видеосцены (Higgsfield)
   *
   * Один источник на элемент: desktop/mobile выбирается до загрузки,
   * чтобы не тянуть оба файла. Ниже первого экрана — ленивая загрузка,
   * воспроизведение только во viewport. В reduced-motion остаётся poster.
   * ---------------------------------------------------------- */
  function initVideoScenes() {
    var videos = document.querySelectorAll('[data-video]');
    if (!videos.length) return;

    var isMobile = window.matchMedia('(max-width: 700px)').matches;

    Array.prototype.forEach.call(videos, function (video) {
      // reduced-motion: показываем только poster, источники не грузим
      if (reduced) {
        video.removeAttribute('autoplay');
        return;
      }

      var base = video.getAttribute('data-video');
      var mobileBase = video.getAttribute('data-video-mobile');
      var src = isMobile && mobileBase ? mobileBase : base;
      var priority = video.hasAttribute('data-video-priority');

      function attach() {
        if (video.dataset.loaded === '1') return;
        video.dataset.loaded = '1';

        ['webm', 'mp4'].forEach(function (ext) {
          var source = document.createElement('source');
          source.src = src + '.' + ext;
          source.type = ext === 'webm' ? 'video/webm' : 'video/mp4';
          video.appendChild(source);
        });

        video.load();
        var p = video.play();
        if (p && p.catch) p.catch(function () { /* автоплей заблокирован — остаётся poster */ });
      }

      if (priority) attach();

      observe([video], function (el, isIn) {
        if (isIn) {
          attach();
          var p = el.play();
          if (p && p.catch) p.catch(function () {});
        } else if (el.dataset.loaded === '1') {
          el.pause();
        }
      }, { threshold: 0.05 });
    });
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
      if (open) { e.preventDefault(); e.stopPropagation(); window.__efOpenDemoForm(); }
    }, true);

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
    if (window.__efEnsureDemoModules) window.__efEnsureDemoModules();
    initVideoScenes();

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
