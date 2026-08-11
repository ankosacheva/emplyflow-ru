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
   * 2b. Hero 3D — каскад целей и кольцо оценки 360°
   *
   * Связи каскада рисуются по фактическим позициям плиток,
   * поэтому геометрия не расходится при любой ширине экрана.
   * Импульсы идут сверху вниз: цель закрыта — уровень открылся.
   * ---------------------------------------------------------- */
  function initHero3D() {
    var root = document.querySelector('[data-hero3d]');
    if (!root) return;

    var stage = root.querySelector('[data-hero3d-stage]');
    var cascade = root.querySelector('[data-cascade]');
    var svg = root.querySelector('[data-cascade-links]');
    if (!cascade || !svg) return;

    var NS = 'http://www.w3.org/2000/svg';
    var tiers = cascade.querySelectorAll('.cascade__tier');
    if (tiers.length < 2) return;

    function centers(tier, edge) {
      var box = svg.getBoundingClientRect();
      var plates = tier.querySelectorAll('[data-plate]');
      return Array.prototype.map.call(plates, function (plate) {
        var r = plate.getBoundingClientRect();
        return {
          x: r.left - box.left + r.width / 2,
          y: edge === 'top' ? r.top - box.top : r.bottom - box.top
        };
      });
    }

    function drawLinks() {
      var box = svg.getBoundingClientRect();
      if (!box.width || !box.height) return;

      svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      for (var t = 0; t < tiers.length - 1; t++) {
        var from = centers(tiers[t], 'bottom');
        var to = centers(tiers[t + 1], 'top');
        if (!from.length || !to.length) continue;

        to.forEach(function (target, i) {
          var source = from[Math.min(i, from.length - 1)];
          var midY = source.y + (target.y - source.y) / 2;
          var d = 'M' + source.x + ',' + source.y +
            ' C' + source.x + ',' + midY + ' ' + target.x + ',' + midY +
            ' ' + target.x + ',' + target.y;

          var path = document.createElementNS(NS, 'path');
          path.setAttribute('d', d);
          path.setAttribute('class', 'cascade__link' + (i % 2 ? ' cascade__link--dashed' : ''));
          svg.appendChild(path);

          if (reduced) return;

          var dot = document.createElementNS(NS, 'circle');
          dot.setAttribute('r', '3');
          dot.setAttribute('class', 'cascade__dot');
          dot.setAttribute('fill', '#d5fff3');

          var motion = document.createElementNS(NS, 'animateMotion');
          motion.setAttribute('dur', '3.2s');
          motion.setAttribute('repeatCount', 'indefinite');
          motion.setAttribute('begin', (0.45 * i + 0.9 * t).toFixed(2) + 's');
          motion.setAttribute('path', d);
          motion.setAttribute('keyPoints', '0;1');
          motion.setAttribute('keyTimes', '0;1');
          motion.setAttribute('calcMode', 'spline');
          motion.setAttribute('keySplines', '0.4 0 0.2 1');
          dot.appendChild(motion);
          svg.appendChild(dot);
        });
      }
    }

    drawLinks();
    window.addEventListener('resize', function () {
      window.clearTimeout(drawLinks._t);
      drawLinks._t = window.setTimeout(drawLinks, 180);
    });
    window.addEventListener('orientationchange', function () {
      window.setTimeout(drawLinks, 320);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLinks);

    if (reduced || !stage) return;

    // Параллакс: сцена доворачивается за курсором в пределах своего блока.
    root.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = root.getBoundingClientRect();
      if (!r.width || !r.height) return;
      root.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      root.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });

    root.addEventListener('pointerleave', function () {
      root.style.setProperty('--px', '0');
      root.style.setProperty('--py', '0');
    });

    // Вне экрана сцена не тратит кадры.
    observe([root], function (el, isIn) {
      el.classList.toggle('is-paused', !isIn);
    }, { threshold: 0.05 });
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
    var track = root.querySelector('.route__track');
    var section = root.closest('[data-route-scroll]') || root.closest('.chapter');
    if (!stations.length || !panel) return;

    var titleEl = panel.querySelector('[data-route-title]');
    var textEl = panel.querySelector('[data-route-text]');
    var phaseEl = panel.querySelector('[data-route-phase]');
    var metricEl = panel.querySelector('[data-route-metric]');
    var current = -1;
    var scrubbing = false;
    var count = stations.length;

    function setLineProgress(p) {
      if (!line) return;
      line.style.setProperty('--route-progress', clamp(p, 0, 1));
    }

    function indexFromProgress(p) {
      if (count <= 1) return 0;
      return clamp(Math.floor(p * count), 0, count - 1);
    }

    function select(index, focus) {
      if (index === current) return;
      current = index;
      var st = stations[index];

      Array.prototype.forEach.call(stations, function (el, i) {
        el.setAttribute('aria-selected', String(i === index));
        el.setAttribute('tabindex', i === index ? '0' : '-1');
        el.classList.toggle('is-done', i < index);
      });

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

    function applyProgress(p, focus) {
      setLineProgress(p);
      select(indexFromProgress(p), focus);
    }

    Array.prototype.forEach.call(stations, function (el, i) {
      el.addEventListener('click', function () {
        scrubbing = false;
        if (line) line.classList.remove('is-scrubbing');
        applyProgress(count > 1 ? i / (count - 1) : 0);
      });
      el.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = Math.min(i + 1, count - 1);
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = Math.max(i - 1, 0);
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = count - 1;
        if (next === null) return;
        e.preventDefault();
        applyProgress(count > 1 ? next / (count - 1) : 0, true);
      });
    });

    if (track) {
      track.addEventListener('mousemove', function (e) {
        var rect = track.getBoundingClientRect();
        if (!rect.height) return;
        scrubbing = true;
        if (line) line.classList.add('is-scrubbing');
        applyProgress(clamp((e.clientY - rect.top) / rect.height, 0, 1));
      });
      track.addEventListener('mouseleave', function () {
        scrubbing = false;
        if (line) line.classList.remove('is-scrubbing');
      });
    }

    if (section && section.hasAttribute('data-route-scroll')) {
      section.style.setProperty('--route-steps', String(count));
    }

    applyProgress(0);

    if (!reduced) {
      onScrollFrame(function () {
        if (scrubbing) return;

        var el = section || root;
        var rect = el.getBoundingClientRect();
        var vh = window.innerHeight;
        if (rect.bottom < 0 || rect.top > vh) return;

        var start = vh * 0.24;
        var span = rect.height - vh * 0.52;
        if (span <= 0) {
          span = root.getBoundingClientRect().height - vh * 0.5;
          if (span <= 0) return;
          applyProgress(clamp((vh * 0.5 - root.getBoundingClientRect().top) / span, 0, 1));
          return;
        }

        applyProgress(clamp((start - rect.top) / span, 0, 1));
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
    var mqMobileSeq = window.matchMedia('(max-width: 1080px)');

    function setActive(i) {
      if (i === active) return;
      active = i;
      Array.prototype.forEach.call(steps, function (el, idx) { el.classList.toggle('is-active', idx === i); });
      if (mqMobileSeq.matches) return;
      Array.prototype.forEach.call(scenes, function (el, idx) { el.classList.toggle('is-active', idx === i); });
      if (chromeLabel && steps[i]) chromeLabel.textContent = steps[i].getAttribute('data-chrome') || '';
    }

    function pickMobileStep() {
      /* Линия чтения ниже sticky-панели: последний шаг, чей верх прошёл якорь */
      var anchor = window.innerHeight * 0.46;
      var best = 0;
      for (var i = 0; i < steps.length; i++) {
        if (steps[i].getBoundingClientRect().top <= anchor) best = i;
      }
      return best;
    }

    function pickDesktopStep() {
      var mid = window.innerHeight * 0.5;
      var best = 0;
      var bestDist = Infinity;
      for (var i = 0; i < steps.length; i++) {
        var r = steps[i].getBoundingClientRect();
        var d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      return best;
    }

    onScrollFrame(function () {
      setActive(mqMobileSeq.matches ? pickMobileStep() : pickDesktopStep());
    });

    if (mqMobileSeq.addEventListener) {
      mqMobileSeq.addEventListener('change', function () { schedule(); });
    } else if (mqMobileSeq.addListener) {
      mqMobileSeq.addListener(function () { schedule(); });
    }

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
      if (window.__efResetLeadForm) window.__efResetLeadForm();
      if (modal.hidden) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };

    document.addEventListener('click', function (e) {
      if (e.target.closest('.ef-demo-modal__close')) { window.__efCloseDemoForm(); return; }
      var open = e.target.closest('[data-ef-demo-open]');
      if (open) { e.preventDefault(); e.stopPropagation(); window.__efOpenDemoForm(); }
    }, true);

    document.addEventListener('keydown', function (e) {
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
    initHero3D();

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
