/* =============================================================
   EmplyFlow — телеком-кейс «Один AI. Три режима развития»
   Motion language: сигнал → узел → ветка → сеть.
   Без внешних зависимостей: IntersectionObserver, один rAF-тик
   на скролл, Canvas 2D для двух сцен.
   ============================================================= */

(function () {
  'use strict';

  var DATA = window.EF_TELECOM_CASE;
  if (!DATA) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ---------------------------------------------------------------
     Аналитика: используем то, что уже стоит на сайте.
     --------------------------------------------------------------- */
  var sent = {};
  function track(event, params) {
    try {
      if (window.ym && window.mainMetrikaId) {
        window.ym(window.mainMetrikaId, 'reachGoal', event, params || {});
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'telecom_case_' + event, params: params || {} });
    } catch (e) {}
  }
  function trackOnce(event, params) {
    if (sent[event]) return;
    sent[event] = true;
    track(event, params);
  }

  /* ---------------------------------------------------------------
     PRELOADER
     --------------------------------------------------------------- */
  function initPreloader() {
    var pre = $('#preloader');
    if (!pre) return;
    if (reduced) { pre.classList.add('is-done'); return; }

    var nodes = $$('.preloader__node', pre);
    var labels = $$('.preloader__label', pre);
    var step = 0;

    function advance() {
      if (step < nodes.length) {
        nodes[step].classList.add('is-on');
        labels.forEach(function (l, i) { l.classList.toggle('is-on', i === step); });
        step += 1;
      }
    }

    advance();
    var timer = setInterval(advance, 520);

    function finish() {
      clearInterval(timer);
      nodes.forEach(function (n) { n.classList.add('is-on'); });
      pre.classList.add('is-done');
      window.setTimeout(function () { pre.setAttribute('hidden', ''); }, 600);
    }

    // Скрываем по готовности ресурсов, но не растягиваем показ искусственно.
    var minShow = window.setTimeout(function () {
      if (document.readyState === 'complete') finish();
      else window.addEventListener('load', finish, { once: true });
    }, 900);

    // Страховка: если что-то не загрузилось, не держим экран.
    window.setTimeout(function () { window.clearTimeout(minShow); finish(); }, 4000);
  }

  /* ---------------------------------------------------------------
     REVEAL
     --------------------------------------------------------------- */
  // Проверяем в общем scroll-тике, а не через IntersectionObserver:
  // при программном переходе (deep-link, поиск по странице, «домой»/«конец»)
  // наблюдатель может не успеть отработать, и блок остался бы невидимым.
  var pendingReveals = [];
  function initReveal() {
    var items = $$('.reveal');
    if (reduced) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    pendingReveals = items;
  }

  var pendingFills = [];

  function flushReveals(vh) {
    var i, el, rest;

    if (pendingReveals.length) {
      rest = [];
      for (i = 0; i < pendingReveals.length; i++) {
        el = pendingReveals[i];
        if (el.getBoundingClientRect().top < vh * 0.94) el.classList.add('is-in');
        else rest.push(el);
      }
      pendingReveals = rest;
    }

    if (pendingFills.length) {
      rest = [];
      for (i = 0; i < pendingFills.length; i++) {
        el = pendingFills[i];
        if (el.getBoundingClientRect().top < vh * 0.86) el.style.width = el.getAttribute('data-v') + '%';
        else rest.push(el);
      }
      pendingFills = rest;
    }
  }

  /* ---------------------------------------------------------------
     HERO — диалог, индикаторы, сжатие волны
     --------------------------------------------------------------- */
  function initHero() {
    var msgs = $$('#hero-dialogue .msg');
    var chips = $$('#hero-indicators .ind-chip');

    if (reduced) {
      msgs.forEach(function (m) { m.classList.add('is-in'); });
      chips.forEach(function (c) { c.classList.add('is-on'); });
      return;
    }

    msgs.forEach(function (m, i) {
      window.setTimeout(function () { m.classList.add('is-in'); }, 700 + i * 850);
    });
    chips.forEach(function (c, i) {
      window.setTimeout(function () { c.classList.add('is-on'); }, 1900 + i * 300);
    });
  }

  /* ---------------------------------------------------------------
     HERO VIDEO — сигнал, который становится сетью.
     Источник выбирается по ширине экрана, грузится только при
     появлении в вьюпорте. Если видео не запустилось — Canvas-фолбэк.
     --------------------------------------------------------------- */
  function initHeroVideo(onFallback) {
    var video = document.getElementById('hero-video');
    if (!video) { onFallback(); return; }

    // В reduced-motion остаётся только постер.
    if (reduced) { video.classList.add('is-ready'); return; }

    var mobile = window.matchMedia('(max-width: 760px)').matches;
    var base = 'media/case-telecom/hero-signal' + (mobile ? '-mobile' : '');
    if (mobile) video.setAttribute('poster', 'media/case-telecom/posters/hero-signal-mobile.jpg');

    [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(function (pair) {
      var s = document.createElement('source');
      s.src = base + '.' + pair[0];
      s.type = pair[1];
      video.appendChild(s);
    });

    var failed = false;
    function fallback() {
      if (failed) return;
      failed = true;
      video.remove();
      onFallback();
    }

    video.addEventListener('error', fallback);
    video.addEventListener('loadeddata', function () { video.classList.add('is-ready'); });

    function play() {
      var p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () { /* автоплей может быть запрещён — остаётся постер */ });
    }

    var started = false;
    function start() {
      if (started) return;
      started = true;
      video.load();
      play();
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { start(); play(); }
          else if (started) video.pause();
        });
      }, { threshold: 0.05 }).observe(video);
    } else start();

    // Если через 6 секунд не появилось ни одного кадра — включаем Canvas.
    window.setTimeout(function () {
      if (video.readyState < 2) fallback();
    }, 6000);
  }

  /* ---------------------------------------------------------------
     CANVAS-СЕТЬ — фолбэк hero и сцена финала
     --------------------------------------------------------------- */
  function initNetworkCanvas(canvas, opts) {
    if (!canvas || reduced) return null;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    opts = opts || {};
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var nodes = [];
    var w = 0, h = 0, raf = 0, running = false, t = 0;

    function resize() {
      var r = canvas.getBoundingClientRect();
      w = Math.max(320, r.width);
      h = Math.max(240, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      var target = clamp(Math.round((w * h) / 26000), 22, opts.max || 64);
      nodes = [];
      for (var i = 0; i < target; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          r: 1 + Math.random() * 1.6,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    var palette = opts.palette || ['#8a7bff', '#7fe9cd', '#ffb777'];

    function frame() {
      t += 0.006;
      ctx.clearRect(0, 0, w, h);

      var i, j, a, b, dx, dy, dist;

      // связи
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;

        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = a.x - b.x; dy = a.y - b.y;
          dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 150) continue;
          ctx.globalAlpha = (1 - dist / 150) * 0.16;
          ctx.strokeStyle = palette[(i + j) % palette.length];
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // узлы
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        var pulse = 0.55 + 0.45 * Math.sin(t * 3 + a.phase);
        ctx.globalAlpha = 0.28 + pulse * 0.45;
        ctx.fillStyle = palette[i % palette.length];
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r * (0.8 + pulse * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      raf = window.requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; raf = window.requestAnimationFrame(frame); } }
    function stop() { running = false; window.cancelAnimationFrame(raf); }

    resize();

    var ro;
    if ('ResizeObserver' in window) {
      var rt;
      ro = new ResizeObserver(function () {
        window.clearTimeout(rt);
        rt = window.setTimeout(resize, 160);
      });
      ro.observe(canvas);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0.05 }).observe(canvas);
    } else start();

    return { start: start, stop: stop };
  }

  /* ---------------------------------------------------------------
     ГЛАВА 2 — очередь в переговорную
     --------------------------------------------------------------- */
  var roomState = { stage: -1 };
  function initRoom() {
    var queue = $('#room-queue');
    var count = $('#room-count');
    if (!queue || !count) return;

    var stages = [
      { n: 10, dots: 10, served: 6, label: '10 участников' },
      { n: 100, dots: 60, served: 9, label: '100 участников' },
      { n: 1000, dots: 120, served: 9, label: '1 000+ участников' }
    ];

    function render(idx) {
      if (roomState.stage === idx) return;
      roomState.stage = idx;
      var s = stages[idx];
      count.textContent = s.label;
      queue.innerHTML = '';
      var frag = document.createDocumentFragment();
      for (var i = 0; i < s.dots; i++) {
        var d = document.createElement('span');
        d.className = 'room__dot' + (i < s.served ? ' is-served' : ' is-wait');
        if (!reduced) d.style.transitionDelay = (i % 24) * 12 + 'ms';
        frag.appendChild(d);
      }
      queue.appendChild(frag);
    }

    render(0);
    roomState.render = render;
    roomState.stages = stages;
  }

  /* ---------------------------------------------------------------
     ГЛАВА 3 — маршрутизатор
     --------------------------------------------------------------- */
  function initRouter() {
    var wrap = $('#router-cards');
    if (!wrap) return;

    DATA.branches.forEach(function (b) {
      var fact = DATA.facts[b.metricId] || {};
      var card = document.createElement('a');
      card.className = 'branch-card';
      card.href = '#' + b.id;
      card.setAttribute('role', 'listitem');
      card.setAttribute('data-theme', b.theme);
      card.setAttribute('data-branch-card', b.id);

      var statusBadge = fact.status === 'client_input'
        ? '<span class="badge badge--client">Требует подтверждения</span>'
        : '';

      card.innerHTML =
        '<span class="branch-card__top">' +
          '<span class="branch-card__n">' + b.index + '</span>' +
          '<span class="branch-card__status">' + b.statusLabel + '</span>' +
        '</span>' +
        '<h3 class="branch-card__title">' + b.title + '</h3>' +
        '<p class="branch-card__sub">' + b.subtitle + '</p>' +
        '<span class="branch-card__metric">' +
          '<span class="branch-card__value" data-fact="' + b.metricId + '">' + (fact.value || '—') + '</span>' +
          '<span class="branch-card__label">' + (fact.label || '') + '</span>' +
        '</span>' +
        (statusBadge ? '<span>' + statusBadge + '</span>' : '') +
        '<p class="branch-card__preview">' + b.preview + '</p>';

      card.addEventListener('click', function () {
        track('branch_select', { branch: b.id });
      });

      wrap.appendChild(card);
    });

    // длина путей для scroll-linked отрисовки
    $$('#router-svg .router__path').forEach(function (p) {
      var len = p.getTotalLength ? p.getTotalLength() : 1000;
      p.style.setProperty('--len', len);
      p.style.setProperty('--draw', reduced ? 1 : 0);
    });
  }

  /* ---------------------------------------------------------------
     ВЕТКА 1 — конструктор компетенции
     --------------------------------------------------------------- */
  function indicatorRow(ind) {
    return '<div class="ind-row" data-ind="' + ind.n + '">' +
      '<span class="ind-row__n">' + ind.n + '</span>' +
      '<span class="ind-row__title">' + ind.title +
        (ind.base ? '<span class="ind-row__base">базовый</span>' : '') +
      '</span>' +
      '<span class="ind-row__weight">вес ' + ind.weight + '</span>' +
    '</div>';
  }

  function initLeadership() {
    var L = DATA.leadership;

    var indWrap = $('#lead-indicators');
    if (indWrap) indWrap.innerHTML = L.indicators.map(indicatorRow).join('');

    var setWrap = $('#lead-settings');
    if (setWrap) {
      setWrap.innerHTML = L.interviewSettings.map(function (s) {
        return '<div class="setting"><span class="setting__label">' + s.label +
          '</span><span class="setting__value">' + s.value + '</span></div>';
      }).join('');
    }

    var scaleWrap = $('#lead-scale');
    if (scaleWrap) {
      scaleWrap.innerHTML = L.scale.levels.map(function (lv) {
        return '<div class="scaleline__step"><span class="scaleline__score">' + lv.score +
          '</span><span class="scaleline__name">' + lv.title + '</span></div>';
      }).join('');
    }

    var rulesWrap = $('#lead-rules');
    if (rulesWrap) {
      rulesWrap.innerHTML = L.scale.rounding.map(function (r) {
        return '<span class="rule-chip">' + r + '</span>';
      }).join('');
    }

    /* --- корзины кейсов --- */
    var basketsWrap = $('#lead-baskets');
    if (basketsWrap) {
      basketsWrap.innerHTML = L.baskets.map(function (b, bi) {
        var cases = '';
        for (var i = 0; i < b.cases; i++) cases += '<span class="basket__case" data-case="' + i + '"></span>';
        return '<div class="basket" data-basket="' + bi + '">' +
          '<span class="basket__title">' + b.title + '</span>' +
          '<span class="basket__focus">' + b.focus + '</span>' +
          '<span class="basket__inds">' + b.indicators.map(function (n) {
            return '<span class="mini-ind">инд. ' + n + '</span>';
          }).join('') + '</span>' +
          '<span class="basket__cases">' + cases + '</span>' +
        '</div>';
      }).join('');
    }

    var comboBtn = $('#combo-btn');
    var comboText = $('#combo-text');

    function pickCombo(silent) {
      var picked = [];
      $$('#lead-baskets .basket').forEach(function (basket, bi) {
        var cases = $$('.basket__case', basket);
        cases.forEach(function (c) { c.classList.remove('is-picked'); });
        if (!cases.length) return;
        var idx = Math.floor(Math.random() * cases.length);
        cases[idx].classList.add('is-picked');
        picked.push((bi + 1) + '.' + (idx + 1));
      });
      if (comboText) {
        comboText.textContent = 'Комбинация для участника: кейсы ' + picked.join(' · ') +
          ' — по одному из каждой корзины';
      }
      if (!silent) track('case_combo_reroll');
    }

    if (comboBtn) comboBtn.addEventListener('click', function () { pickCombo(false); });
    pickCombo(true);

    /* --- диалог с уточнениями --- */
    var thread = $('#probe-thread');
    var probeInds = $('#probe-inds');
    var nextBtn = $('#probe-next');
    var resetBtn = $('#probe-reset');
    var depthRows = $$('#probe-depth .depth-row');
    var pos = 0;

    if (probeInds) probeInds.innerHTML = L.indicators.map(indicatorRow).join('');

    function renderProbeStep() {
      if (!thread) return;
      var item = L.demoDialogue[pos];
      if (!item) return;

      var el = document.createElement('div');
      el.className = 'msg msg--' + (item.role === 'ai' ? 'ai' : 'user');
      var tag = item.role === 'ai' ? (item.kind || 'AI') : (item.depth || 'Ответ');
      el.innerHTML = '<span class="msg__tag">' + tag + '</span>' + item.text;
      thread.appendChild(el);
      // eslint-disable-next-line no-unused-expressions
      el.offsetWidth;
      el.classList.add('is-in');

      if (item.role === 'user') {
        var depthIndex = ['Общий ответ', 'Конкретное управленческое решение', 'Измеримый план действий']
          .indexOf(item.depth);
        depthRows.forEach(function (r, i) { r.classList.toggle('is-on', i <= depthIndex && depthIndex >= 0); });
        (item.lights || []).forEach(function (n) {
          var row = probeInds && probeInds.querySelector('[data-ind="' + n + '"]');
          if (row) row.classList.add('is-lit');
        });
      }

      pos += 1;
      if (nextBtn) {
        nextBtn.disabled = pos >= L.demoDialogue.length;
        nextBtn.textContent = pos >= L.demoDialogue.length ? 'Диалог завершён' : 'Следующая реплика';
      }
    }

    function resetProbe(auto) {
      pos = 0;
      if (thread) thread.innerHTML = '';
      depthRows.forEach(function (r) { r.classList.remove('is-on'); });
      $$('.ind-row', probeInds).forEach(function (r) { r.classList.remove('is-lit'); });
      if (nextBtn) { nextBtn.disabled = false; nextBtn.textContent = 'Следующая реплика'; }
      renderProbeStep();
      if (!auto) track('probe_reset');
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        renderProbeStep();
        trackOnce('probe_advance');
      });
    }
    if (resetBtn) resetBtn.addEventListener('click', function () { resetProbe(false); });

    if (reduced) {
      // в reduced-motion показываем весь диалог сразу
      while (pos < L.demoDialogue.length) renderProbeStep();
    } else {
      resetProbe(true);
    }

    /* --- отчёт --- */
    var R = L.demoReport;
    var scoreEl = $('#report-score');
    var levelEl = $('#report-level');
    if (scoreEl) scoreEl.textContent = R.score;
    if (levelEl) levelEl.textContent = R.level;

    var strengthEl = $('#report-strength');
    var growthEl = $('#report-growth');
    if (strengthEl) strengthEl.textContent = R.strengths;
    if (growthEl) growthEl.textContent = R.growth;

    var resLabel = { positive: 'проявлен положительно', partial: 'проявлен частично', none: 'не проявлен' };
    var skillsWrap = $('#report-skills');
    if (skillsWrap) {
      skillsWrap.innerHTML = R.skills.map(function (s) {
        return '<div class="skill"><span class="skill__n">' + s.n + '</span>' +
          '<span>' + s.title + '</span>' +
          '<span class="skill__res" data-res="' + s.result + '">' + resLabel[s.result] + '</span></div>';
      }).join('');
    }

    var blocksWrap = $('#report-blocks');
    if (blocksWrap) {
      blocksWrap.innerHTML = R.blocks.map(function (b) {
        return '<span class="rule-chip">' + b + '</span>';
      }).join('');
    }

    var toggle = $('#report-toggle');
    var panel = $('#report-full');
    if (toggle && panel) {
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (open) panel.setAttribute('hidden', '');
        else { panel.removeAttribute('hidden'); trackOnce('report_expand'); }
        toggle.firstChild.textContent = open ? 'Раскрыть полный отчёт ' : 'Свернуть отчёт ';
      });
    }
  }

  /* ---------------------------------------------------------------
     ВЕТКА 2 — обучение
     --------------------------------------------------------------- */
  function initLearning() {
    var LN = DATA.learning;

    var track4 = $('#learning-track');
    if (track4) {
      track4.innerHTML = LN.timeline.map(function (label, i) {
        return '<div class="track__step"><span class="track__n">0' + (i + 1) +
          '</span><span class="track__label">' + label + '</span></div>';
      }).join('');
    }

    var compare = $('#learning-compare');
    if (compare) {
      compare.innerHTML = [renderAnswer(LN.before, LN.components, false), renderAnswer(LN.after, LN.components, true)].join('');
    }

    function renderAnswer(a, comps, isAfter) {
      var bars = comps.map(function (c) {
        var v = a.levels[c.id] || 0;
        return '<div class="abar"><span class="abar__top"><span>' + c.title +
          '</span><span>' + v + ' / 3</span></span>' +
          '<span class="abar__track"><span class="abar__fill" style="--v:' + v + '"></span></span></div>';
      }).join('');
      var notes = (isAfter ? a.gains : a.flaws).map(function (n) {
        return '<span class="note"><i aria-hidden="true">' + (isAfter ? '↗' : '!') + '</i>' + n + '</span>';
      }).join('');
      return '<div class="answer' + (isAfter ? ' answer--after' : '') + '">' +
        '<span class="answer__cap">' + a.caption + '</span>' +
        '<p class="answer__text">«' + a.text + '»</p>' +
        '<div class="answer__bars">' + bars + '</div>' +
        '<div class="answer__notes">' + notes + '</div>' +
      '</div>';
    }

    // график распределения
    var chart = $('#dist-chart');
    if (chart) {
      var pts = LN.distribution;
      var W = 320, H = 170, padL = 26, padR = 10, padT = 12, padB = 26;
      var iw = W - padL - padR, ih = H - padT - padB;
      var maxV = Math.max.apply(null, pts);
      var coords = pts.map(function (v, i) {
        return [padL + (i / (pts.length - 1)) * iw, padT + ih - (v / maxV) * ih];
      });

      var d = 'M' + coords[0][0].toFixed(1) + ',' + coords[0][1].toFixed(1);
      for (var i = 1; i < coords.length; i++) {
        var p0 = coords[i - 1], p1 = coords[i];
        var cx = (p0[0] + p1[0]) / 2;
        d += ' C' + cx.toFixed(1) + ',' + p0[1].toFixed(1) + ' ' + cx.toFixed(1) + ',' + p1[1].toFixed(1) +
             ' ' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1);
      }
      var area = d + ' L' + coords[coords.length - 1][0].toFixed(1) + ',' + (padT + ih) +
                 ' L' + coords[0][0].toFixed(1) + ',' + (padT + ih) + ' Z';

      var ticks = '';
      for (var s = 1; s <= 5; s++) {
        var x = padL + ((s - 1) / 4) * iw;
        ticks += '<text class="dist__tick" x="' + x.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + s + '</text>';
      }

      chart.insertAdjacentHTML('beforeend',
        '<path class="dist__area" d="' + area + '"></path>' +
        '<path class="dist__line" d="' + d + '"></path>' +
        '<line class="dist__axis" x1="' + padL + '" y1="' + (padT + ih) + '" x2="' + (W - padR) + '" y2="' + (padT + ih) + '"></line>' +
        ticks
      );
    }

    renderBars('#selfmatch-q', '#selfmatch-rows', LN.selfMatch);
    renderBars('#reportvalue-q', '#reportvalue-rows', LN.reportValue);

    function renderBars(qSel, rowsSel, set) {
      var q = $(qSel), rows = $(rowsSel);
      if (q) q.textContent = set.question;
      if (!rows) return;
      rows.innerHTML = set.rows.map(function (r) {
        return '<div class="brow"><span class="brow__label">' + r.label +
          '</span><span class="brow__val">' + r.value + '%</span>' +
          '<span class="brow__bar"><span class="brow__fill" data-v="' + r.value + '"></span></span></div>';
      }).join('');
    }

    // заполняем полосы при появлении (через общий scroll-тик, см. flushReveals)
    var fills = $$('.brow__fill');
    if (reduced) {
      fills.forEach(function (f) { f.style.width = f.getAttribute('data-v') + '%'; });
    } else {
      pendingFills = fills;
    }
  }

  /* ---------------------------------------------------------------
     ВЕТКА 3 — переговоры
     --------------------------------------------------------------- */
  function initSales() {
    var S = DATA.sales;

    /* режимы */
    var modesWrap = $('#sales-modes');
    if (modesWrap) {
      modesWrap.innerHTML = S.modes.map(function (m, i) {
        return '<button type="button" class="mode' + (i === 1 ? ' is-on' : '') + '" data-mode="' + m.id + '" aria-pressed="' + (i === 1) + '">' +
          '<span class="mode__lead">' + m.lead + '</span>' +
          '<h4 class="mode__title">' + m.title + '</h4>' +
          '<ul class="mode__items">' + m.items.map(function (it) { return '<li>' + it + '</li>'; }).join('') + '</ul>' +
        '</button>';
      }).join('');

      $$('.mode', modesWrap).forEach(function (btn) {
        btn.addEventListener('click', function () {
          $$('.mode', modesWrap).forEach(function (b) {
            b.classList.remove('is-on');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('is-on');
          btn.setAttribute('aria-pressed', 'true');
          track('mode_switch', { mode: btn.getAttribute('data-mode') });
        });
      });
    }

    /* роль клиента */
    var roleGrid = $('#role-grid');
    if (roleGrid) {
      roleGrid.innerHTML = S.roleConfig.map(function (c) {
        return '<div class="role__cell"><span class="role__key">' + c.label +
          '</span><span class="role__val">' + c.value + '</span></div>';
      }).join('');
    }
    var rolePrev = $('#role-preview');
    if (rolePrev) rolePrev.textContent = '«' + S.rolePreview + '»';

    /* индикаторы диалога */
    var demoSkillIds = ['discovery', 'objection', 'solution', 'close'];
    var skillTitles = {};
    S.skills.forEach(function (s) { skillTitles[s.id] = s.title; });

    var skillsWrap = $('#nego-skills');
    var skillState = { discovery: 0, objection: 0, solution: 0, close: 0 };

    function renderSkills() {
      if (!skillsWrap) return;
      var head = '<p class="ui__block-title">Индикаторы диалога</p>';
      skillsWrap.innerHTML = head + demoSkillIds.map(function (id) {
        var v = clamp(skillState[id], 0, 4);
        return '<div class="nskill"><span class="nskill__top"><span>' + skillTitles[id] +
          '</span></span><span class="nskill__track"><span class="nskill__fill" style="--v:' + v + '"></span></span></div>';
      }).join('');
    }
    renderSkills();

    /* демо-диалог */
    var thread = $('#nego-thread');
    var choicesWrap = $('#nego-choices');
    var explain = $('#nego-explain');
    var resetBtn = $('#nego-reset');

    function addMsg(role, tag, text) {
      if (!thread) return;
      var el = document.createElement('div');
      el.className = 'msg msg--' + role;
      el.innerHTML = '<span class="msg__tag">' + tag + '</span>' + text;
      thread.appendChild(el);
      // eslint-disable-next-line no-unused-expressions
      el.offsetWidth;
      el.classList.add('is-in');
    }

    function renderChoices() {
      if (!choicesWrap) return;
      choicesWrap.innerHTML = S.demo.choices.map(function (c) {
        return '<button type="button" class="choice" data-choice="' + c.id + '">' +
          '<span class="choice__text">' + c.text + '</span></button>';
      }).join('');

      $$('.choice', choicesWrap).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-choice');
          var choice = null;
          S.demo.choices.forEach(function (c) { if (c.id === id) choice = c; });
          if (!choice) return;

          addMsg('user', 'Менеджер', choice.text);
          addMsg('ai', 'Клиент', choice.reply);

          Object.keys(choice.effects).forEach(function (k) {
            if (typeof skillState[k] === 'number') skillState[k] = clamp(skillState[k] + choice.effects[k], 0, 4);
          });
          renderSkills();

          if (explain) {
            explain.hidden = false;
            explain.textContent = choice.explanation;
          }

          $$('.choice', choicesWrap).forEach(function (b) {
            b.disabled = true;
            if (b === btn) b.classList.add('is-picked');
          });

          track('nego_choice', { choice: id });
          trackOnce('nego_start');
        });
      });
    }

    function resetNego(auto) {
      if (thread) thread.innerHTML = '';
      skillState = { discovery: 0, objection: 0, solution: 0, close: 0 };
      renderSkills();
      if (explain) { explain.hidden = true; explain.textContent = ''; }
      addMsg('ai', 'Клиент · демо-роль', S.demo.opening);
      renderChoices();
      if (!auto) track('nego_reset');
    }

    if (resetBtn) resetBtn.addEventListener('click', function () { resetNego(false); });
    resetNego(true);

    /* попытки */
    var attemptsWrap = $('#sales-attempts');
    if (attemptsWrap) {
      attemptsWrap.innerHTML = S.attempts.map(function (a) {
        var rows = S.skills.map(function (s) {
          var res = a.results[s.id] || 'none';
          return '<div class="askill"><span>' + s.title + '</span><i data-res="' + res + '" aria-hidden="true"></i>' +
            '<span class="visually-hidden">' +
            (res === 'positive' ? 'проявлен положительно' : res === 'partial' ? 'проявлен частично' : 'не проявлен') +
            '</span></div>';
        }).join('');
        return '<div class="attempt' + (a.n === 2 ? ' attempt--second' : '') + '">' +
          '<span class="attempt__n">Попытка ' + a.n + ' из 2</span>' +
          '<p class="attempt__summary">' + a.summary + '</p>' +
          '<div class="attempt__skills">' + rows + '</div>' +
        '</div>';
      }).join('');
    }

    /* карта профилей */
    initMap(S);

    /* поединки */
    var pairingWrap = $('#sales-pairing');
    if (pairingWrap) {
      var random = [[0.86, 0.24], [0.32, 0.78], [0.9, 0.35], [0.28, 0.66]];
      var balanced = [[0.82, 0.76], [0.44, 0.5], [0.66, 0.6], [0.34, 0.4]];
      pairingWrap.innerHTML =
        pairBox('Случайные пары', 'Разрыв уровней, диалог становится односторонним', random, false) +
        pairBox('Пары по профилям', 'Сопоставимый уровень при разных переговорных стилях', balanced, true);
    }

    function pairBox(cap, note, pairs, balancedFlag) {
      var rows = pairs.map(function (p, i) {
        return '<div class="pair">' +
          '<span class="pair__side" style="--lvl:' + p[0] + '"><span>Участник ' + (i * 2 + 1) + '</span></span>' +
          '<span class="pair__vs">vs</span>' +
          '<span class="pair__side" style="--lvl:' + p[1] + '"><span>Участник ' + (i * 2 + 2) + '</span></span>' +
        '</div>';
      }).join('');
      return '<div class="pair-box' + (balancedFlag ? ' pair-box--balanced' : '') + '">' +
        '<span class="pair-box__cap">' + cap + '</span>' +
        '<div class="pair-list">' + rows + '</div>' +
        '<p class="tiny">' + note + '</p>' +
      '</div>';
    }
  }

  /* ---------------------------------------------------------------
     Карта переговорных профилей — Canvas, без 1000 DOM-узлов
     --------------------------------------------------------------- */
  function initMap(S) {
    var canvas = $('#map-canvas');
    if (!canvas) return;

    var axX = $('#map-axis-x'), axY = $('#map-axis-y');
    if (axX) axX.textContent = S.axes.x + ' →';
    if (axY) axY.textContent = S.axes.y + ' →';

    var colors = ['#ffb777', '#ffb8e2', '#cec8ff', '#7fe9cd', '#8a7bff', '#ffd9b3'];

    var legend = $('#map-legend');
    if (legend) {
      legend.innerHTML = S.segments.map(function (s, i) {
        return '<span class="map__seg"><i aria-hidden="true" style="background:' + colors[i % colors.length] + '"></i>' + s.title + '</span>';
      }).join('');
    }

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, points = [], raf = 0, running = false, t = 0;
    var TOTAL = 1000;

    // детерминированный генератор, чтобы карта не «прыгала» между рендерами
    var seed = 20260729;
    function rnd() {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    }
    function gauss() {
      return (rnd() + rnd() + rnd() + rnd() - 2) / 2;
    }

    function build() {
      seed = 20260729;
      points = [];
      var perSeg = Math.floor(TOTAL / S.segments.length);
      S.segments.forEach(function (seg, si) {
        for (var i = 0; i < perSeg; i++) {
          points.push({
            x: clamp(seg.x + gauss() * seg.size, 0.03, 0.97),
            y: clamp(seg.y + gauss() * seg.size, 0.03, 0.97),
            seg: si,
            phase: rnd() * Math.PI * 2
          });
        }
      });
    }

    function resize() {
      var r = canvas.getBoundingClientRect();
      w = Math.max(280, r.width);
      h = Math.max(240, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // сетка
      ctx.strokeStyle = 'rgba(217,214,255,0.08)';
      ctx.lineWidth = 1;
      for (var g = 1; g < 4; g++) {
        var gx = (w / 4) * g, gy = (h / 4) * g;
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      for (var i = 0; i < points.length; i++) {
        var p = points[i];
        var drift = reduced ? 0 : Math.sin(t + p.phase) * 1.4;
        var x = p.x * w + drift;
        var y = (1 - p.y) * h + Math.cos(t + p.phase) * (reduced ? 0 : 1.1);
        ctx.globalAlpha = 0.78;
        ctx.fillStyle = colors[p.seg % colors.length];
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function frame() {
      t += 0.01;
      draw();
      raf = window.requestAnimationFrame(frame);
    }

    build();
    resize();

    if (!reduced) {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              if (!running) { running = true; raf = window.requestAnimationFrame(frame); trackOnce('map_view'); }
            } else { running = false; window.cancelAnimationFrame(raf); }
          });
        }, { threshold: 0.1 }).observe(canvas);
      } else { running = true; raf = window.requestAnimationFrame(frame); }
    }

    if ('ResizeObserver' in window) {
      var rt;
      new ResizeObserver(function () {
        window.clearTimeout(rt);
        rt = window.setTimeout(resize, 160);
      }).observe(canvas);
    }
  }

  /* ---------------------------------------------------------------
     КОНСТРУКТОР AI-ИНТЕРВЬЮ
     --------------------------------------------------------------- */
  var builderState = { active: -1 };
  function initBuilder() {
    var B = DATA.builder;
    var stepsWrap = $('#builder-steps');
    if (!stepsWrap) return;

    stepsWrap.innerHTML = B.steps.map(function (s) {
      return '<div class="bstep" data-step="' + s.id + '">' +
        '<span class="bstep__n">' + s.n + '</span>' +
        '<span><span class="bstep__title">' + s.title + '</span>' +
        '<span class="bstep__note">' + s.note + '</span></span>' +
      '</div>';
    }).join('');

    var controls = $('#builder-controls');
    if (controls) {
      controls.innerHTML = B.controls.map(function (c) {
        return '<span class="bctl">' + c + '</span>';
      }).join('');
    }

    var draftItems = ['Компетенция', 'Индикатор 1', 'Индикатор 2', 'Индикатор 3', 'Корзина кейсов', 'Порядок вопросов', 'Критерии', 'Шаблон отчёта'];
    var draftWrap = $('#builder-draft');
    if (draftWrap) {
      draftWrap.innerHTML = draftItems.map(function (d, i) {
        return '<span class="bchip" data-draft="' + i + '">' + d + '</span>';
      }).join('');
    }

    var taskText = 'Нужно оценить, как руководители развивают потенциал своей команды. Три ситуации, уточняющие вопросы, отчёт с сильными сторонами и зонами развития.';
    var taskEl = $('#builder-task');

    var screens = $$('.bpanel__screen');
    var steps = $$('.bstep', stepsWrap);

    function typeTask(progress) {
      if (!taskEl) return;
      var n = Math.round(taskText.length * clamp(progress, 0, 1));
      taskEl.innerHTML = taskText.slice(0, n) + '<span class="bpanel__caret" aria-hidden="true"></span>';
    }

    function setActive(idx) {
      if (builderState.active === idx) return;
      builderState.active = idx;
      var step = B.steps[idx];
      if (!step) return;

      steps.forEach(function (el, i) { el.classList.toggle('is-on', i === idx); });
      screens.forEach(function (sc) {
        sc.classList.toggle('is-on', sc.getAttribute('data-screen') === step.preview);
      });

      if (step.id === 'task') typeTask(1);
      if (idx >= 1) typeTask(1);

      var drafts = $$('.bchip', draftWrap);
      if (idx >= 1) {
        drafts.forEach(function (c, i) {
          if (reduced) { c.classList.add('is-in'); return; }
          window.setTimeout(function () { c.classList.add('is-in'); }, i * 70);
        });
      }
      drafts.forEach(function (c, i) { c.classList.toggle('is-edited', idx >= 2 && (i === 1 || i === 6)); });

      trackOnce('builder_step_' + step.id);
      if (idx > 0) trackOnce('builder_interact');
    }

    builderState.setActive = setActive;
    builderState.count = B.steps.length;
    setActive(0);
    typeTask(reduced ? 1 : 0.12);
  }

  /* ---------------------------------------------------------------
     ФИНАЛ
     --------------------------------------------------------------- */
  function initFinale() {
    var rolesWrap = $('#finale-roles');
    if (rolesWrap) {
      rolesWrap.innerHTML = DATA.finale.roles.map(function (r) {
        return '<span class="finale__role">' + r + '</span>';
      }).join('');
    }
    var nextWrap = $('#finale-next');
    if (nextWrap) {
      nextWrap.innerHTML = DATA.finale.next.map(function (n) {
        return '<li>' + n + '</li>';
      }).join('');
    }
  }

  /* ---------------------------------------------------------------
     ЕДИНЫЙ SCROLL-ТИК
     --------------------------------------------------------------- */
  function initScroll() {
    var topbar = $('#topbar');
    var progress = $('#topbar-progress');
    var heroWave = $('#hero-wave');
    var routerSection = $('#router');
    var routerPaths = $$('#router-svg .router__path');
    var roomSection = $('#scale');
    var builderSection = $('#builder');
    var chapters = $$('[data-chapter]');
    var ticking = false;

    function measure() {
      var y = window.scrollY || window.pageYOffset || 0;
      var vh = window.innerHeight || 1;
      var docH = Math.max(document.body.scrollHeight - vh, 1);

      flushReveals(vh);

      // прогресс чтения
      if (progress) progress.style.setProperty('--read', clamp(y / docH, 0, 1));

      // топбар
      if (topbar) topbar.classList.toggle('is-stuck', y > 24);

      // hero: длинная волна сжимается
      if (heroWave) {
        var p = clamp(y / (vh * 0.8), 0, 1);
        heroWave.style.setProperty('--squeeze', (1 - p * 0.86).toFixed(3));
      }

      // активная тема — по секции в середине экрана
      var mid = y + vh * 0.42;
      for (var i = 0; i < chapters.length; i++) {
        var c = chapters[i];
        var top = c.offsetTop;
        if (mid >= top && mid < top + c.offsetHeight) {
          var theme = c.getAttribute('data-theme');
          if (theme && document.body.getAttribute('data-active-theme') !== theme) {
            document.body.setAttribute('data-active-theme', theme);
          }
          var branch = c.getAttribute('data-branch');
          if (branch) {
            trackOnce('branch_view_' + branch);
            $$('[data-branch-card]').forEach(function (card) {
              card.classList.toggle('is-active', card.getAttribute('data-branch-card') === branch);
            });
          }
          break;
        }
      }

      // маршрутизатор: рисуем пути по мере прохождения секции
      if (routerSection && routerPaths.length && !reduced) {
        var rTop = routerSection.offsetTop - vh * 0.75;
        var rProg = clamp((y - rTop) / (routerSection.offsetHeight * 0.7), 0, 1);
        routerPaths.forEach(function (p, idx) {
          var delay = idx === 0 ? 0 : 0.18;
          var local = clamp((rProg - delay) / (1 - delay), 0, 1);
          p.style.setProperty('--draw', local.toFixed(3));
        });
      }

      // очередь в переговорной
      if (roomSection && roomState.render) {
        var sTop = roomSection.offsetTop - vh * 0.5;
        var sProg = clamp((y - sTop) / (roomSection.offsetHeight * 0.75), 0, 1);
        roomState.render(sProg > 0.62 ? 2 : sProg > 0.3 ? 1 : 0);
      }

      // шаги конструктора
      if (builderSection && builderState.setActive) {
        var bTop = builderSection.offsetTop - vh * 0.35;
        var bProg = clamp((y - bTop) / (builderSection.offsetHeight * 0.72), 0, 1);
        var idx2 = Math.min(builderState.count - 1, Math.floor(bProg * builderState.count));
        builderState.setActive(idx2);
      }

    }

    // Сбрасываем флаг в finally: одна ошибка внутри тика не должна
    // навсегда остановить обновление скролла.
    function tick() {
      try { measure(); } catch (err) {
        if (window.console && console.error) console.error('[telecom-case] scroll tick', err);
      } finally { ticking = false; }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(tick);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Страховка поверх событий scroll: программная прокрутка (deep-link, поиск
    // по странице, встроенные webview) в ряде окружений событий не порождает.
    // Дешёвый опрос позиции, выходим сразу, если ничего не изменилось.
    var lastY = -1, lastH = -1, lastW = -1;
    function poll() {
      var y = window.scrollY || window.pageYOffset || 0;
      var vh = window.innerHeight;
      var vw = window.innerWidth;
      if (y === lastY && vh === lastH && vw === lastW) return;
      lastY = y; lastH = vh; lastW = vw;
      tick();
    }
    window.setInterval(poll, 200);
    poll();

    trackOnce('hero_view');
  }

  /* ---------------------------------------------------------------
     CTA-аналитика
     --------------------------------------------------------------- */
  function initCta() {
    $$('[data-track]').forEach(function (el) {
      el.addEventListener('click', function () {
        track('cta_click', { id: el.getAttribute('data-track') });
      });
    });

    var finale = $('#finale');
    if (finale && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) trackOnce('case_complete'); });
      }, { threshold: 0.4 }).observe(finale);
    }
  }

  /* ---------------------------------------------------------------
     СТАРТ
     --------------------------------------------------------------- */
  function boot() {
    initPreloader();
    initRouter();
    initRoom();
    initLeadership();
    initLearning();
    initSales();
    initBuilder();
    initFinale();
    initReveal();
    initHero();
    initScroll();
    initCta();

    initHeroVideo(function () {
      var canvas = $('#hero-canvas');
      if (!canvas) return;
      canvas.removeAttribute('hidden');
      initNetworkCanvas(canvas, { max: 58, palette: ['#8a7bff', '#cec8ff', '#7fe9cd'] });
    });

    initNetworkCanvas($('#finale-canvas'), { max: 70, palette: ['#8a7bff', '#7fe9cd', '#ffb777'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else boot();
})();
