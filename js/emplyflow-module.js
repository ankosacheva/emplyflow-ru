/* =============================================================
   EmplyFlow — рантайм страниц модулей платформы.

   Файл общий для всех модулей: контент лежит в разметке страницы,
   скрипт отвечает только за поведение — прогресс ленты, режимы
   просмотра, появление блоков, анкету-демо и модалку заявки.
   Без внешних зависимостей; при prefers-reduced-motion страница
   остаётся полностью читаемой.
   ============================================================= */

(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var MODULE_ID = (document.body && document.body.getAttribute('data-module')) || 'module';

  /* ---------------------------------------------------------------
     АНАЛИТИКА
     --------------------------------------------------------------- */
  var sent = {};

  function track(event, params) {
    try {
      if (window.ym && window.mainMetrikaId) window.ym(window.mainMetrikaId, 'reachGoal', event, params);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'module_' + MODULE_ID + '_' + event, params: params || {} });
    } catch (e) { /* аналитика не должна ломать страницу */ }
  }

  function trackOnce(event, params) {
    if (sent[event]) return;
    sent[event] = 1;
    track(event, params);
  }

  /* ---------------------------------------------------------------
     ЛЕНТА: сегменты прогресса и активный экран
     --------------------------------------------------------------- */
  var reels = [];
  var fills = [];
  var activeReel = -1;

  function initFeed() {
    reels = $$('[data-reel]');
    var bars = $('#mbars');
    if (!bars || !reels.length) return;

    reels.forEach(function (sec, i) {
      var seg = document.createElement('span');
      seg.className = 'mbars__seg';
      seg.innerHTML = '<i class="mbars__fill"></i>';
      bars.appendChild(seg);
      fills.push(seg.firstChild);
      if (!sec.id) sec.id = 'reel-' + (i + 1);
    });

    document.documentElement.classList.add('has-snap');
  }

  function updateFeed(vh) {
    if (!reels.length) return;
    var best = -1;
    var bestArea = 0;

    for (var i = 0; i < reels.length; i++) {
      var r = reels[i].getBoundingClientRect();
      var passed = clamp((vh - r.top) / Math.max(r.height, 1), 0, 1);
      if (fills[i]) fills[i].style.width = (passed * 100).toFixed(1) + '%';

      var visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (visible > bestArea) { bestArea = visible; best = i; }
    }

    if (best > -1 && best !== activeReel) {
      activeReel = best;
      var accent = reels[best].getAttribute('data-accent');
      if (accent) document.documentElement.setAttribute('data-accent', accent);
      trackOnce('reel_view_' + (best + 1), { id: reels[best].id });
    }
  }

  /* ---------------------------------------------------------------
     ПЕРЕЛИСТЫВАНИЕ ЛЕНТЫ: один жест — один экран

     Нативный scroll-snap на резком свайпе или инерции тачпада
     пролистывает сразу несколько экранов. Поэтому в пределах ленты
     прокрутку берёт на себя скрипт: любой жест вниз или вверх
     переносит ровно на соседний экран, а всё, что прилетело следом
     по инерции, гасится до конца анимации. Ниже ленты (справочная
     часть) прокрутка остаётся обычной.
     --------------------------------------------------------------- */
  var snapStops = [];
  var snapBusy = false;
  var snapUntil = 0;
  var snapRAF = 0;

  function snapMedia() {
    if (reduced || snapStops.length < 2) return false;
    return window.matchMedia('(min-width: 861px) and (pointer: fine)').matches;
  }

  function snapEnabled() {
    return snapMedia() && !document.body.classList.contains('is-locked');
  }

  function snapTop(el) { return Math.round(el.getBoundingClientRect().top + window.pageYOffset); }

  function snapIndex() {
    var y = window.pageYOffset;
    var best = 0;
    var bestD = Infinity;
    for (var i = 0; i < snapStops.length; i++) {
      var d = Math.abs(snapTop(snapStops[i]) - y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function snapGo(index) {
    if (index < 0 || index >= snapStops.length) return false;
    var from = window.pageYOffset;
    var max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    var to = Math.min(snapTop(snapStops[index]), max);
    if (Math.abs(to - from) < 2) return false;

    snapBusy = true;
    var start = 0;
    var dur = clamp(320 + Math.abs(to - from) * 0.32, 380, 760);
    // scroll-behavior: smooth в CSS иначе анимирует каждый кадр поверх нашей анимации.
    var root = document.documentElement;
    root.style.scrollBehavior = 'auto';

    if (snapRAF) window.cancelAnimationFrame(snapRAF);
    (function step(ts) {
      if (!start) start = ts;
      var p = clamp((ts - start) / dur, 0, 1);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      window.scrollTo(0, from + (to - from) * e);
      if (p < 1) snapRAF = window.requestAnimationFrame(step);
      else {
        snapRAF = 0;
        snapBusy = false;
        root.style.scrollBehavior = '';
        // Инерция тачпада продолжает сыпать событиями ещё долю секунды.
        snapUntil = (window.performance ? performance.now() : Date.now()) + 220;
      }
    })(window.performance ? performance.now() : Date.now());

    return true;
  }

  function initSnap() {
    snapStops = $$('[data-reel]');
    var sw = $('.mswitch');
    if (sw) snapStops.push(sw);
    if (snapStops.length < 2) return;

    // Там, где листает скрипт, нативный снап только мешает: у него своя
    // точка выравнивания из-за scroll-padding-top.
    function syncNative() {
      document.documentElement.classList.toggle('has-snap', !snapMedia());
    }
    syncNative();
    window.addEventListener('resize', syncNative);

    window.addEventListener('wheel', function (e) {
      if (!snapEnabled()) return;
      if (e.ctrlKey) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

      var now = window.performance ? performance.now() : Date.now();
      var last = snapStops[snapStops.length - 1];
      var beyond = window.pageYOffset > snapTop(last) + 4;
      var down = e.deltaY > 0;

      // Ниже ленты — обычная прокрутка. Ленту подхватываем обратно,
      // только когда до неё остался один экран.
      if (beyond && down) return;
      if (beyond) {
        if (window.pageYOffset - snapTop(last) > window.innerHeight * 0.9) return;
        e.preventDefault();
        if (!snapBusy && now >= snapUntil) snapGo(snapStops.length - 1);
        else snapUntil = now + 140;
        return;
      }

      // Инерция тачпада: пока события идут сплошным потоком, гасим их
      // и держим замок — один жест остаётся одним экраном.
      if (snapBusy || now < snapUntil) {
        e.preventDefault();
        snapUntil = now + 140;
        return;
      }
      if (Math.abs(e.deltaY) < 4) return;

      var i = snapIndex();
      var next = i + (down ? 1 : -1);
      if (next < 0) return;
      if (next >= snapStops.length) return;

      e.preventDefault();
      snapGo(next);
    }, { passive: false });

    // Тачпадный «отпустил палец» и клавиатура ленты.
    window.addEventListener('keydown', function (e) {
      if (!snapEnabled()) return;
      if (e.key !== 'PageDown' && e.key !== 'PageUp') return;
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      var i = snapIndex();
      if (snapGo(i + (e.key === 'PageDown' ? 1 : -1))) e.preventDefault();
    });
  }

  /* ---------------------------------------------------------------
     РЕЖИМЫ «СМОТРЕТЬ» / «РАЗОБРАТЬСЯ»
     --------------------------------------------------------------- */
  var modeButtons = [];

  function initMode() {
    modeButtons = $$('[data-mode]');
    modeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode');
        var target = $(mode === 'details' ? '#details' : '#cover');
        if (!target) return;
        track('mode_switch', { mode: mode });
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  function updateMode() {
    var details = $('#details');
    if (!details || !modeButtons.length) return;
    var isDetails = details.getBoundingClientRect().top <= 120;
    modeButtons.forEach(function (btn) {
      var on = (btn.getAttribute('data-mode') === 'details') === isDetails;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* ---------------------------------------------------------------
     ПОЯВЛЕНИЕ БЛОКОВ
     --------------------------------------------------------------- */
  var revealQueue = [];

  function collectReveals() {
    $$('[data-reveal] > *').forEach(function (el) { el.classList.add('reveal'); });
    revealQueue = $$('.reveal');
    if (reduced) revealQueue.forEach(function (el) { el.classList.add('is-in'); });
  }

  function flushReveals(vh) {
    if (reduced || !revealQueue.length) return;
    var rest = [];
    for (var i = 0; i < revealQueue.length; i++) {
      var el = revealQueue[i];
      if (el.getBoundingClientRect().top < vh * 0.94) el.classList.add('is-in');
      else rest.push(el);
    }
    revealQueue = rest;
  }

  /* ---------------------------------------------------------------
     АНКЕТА РЕСПОНДЕНТА (демо шаблона 360°)
     --------------------------------------------------------------- */
  function initQuiz() {
    var root = $('[data-quiz]');
    if (!root) return;

    var raw = $('[data-quiz-json]', root);
    var cfg;
    try { cfg = JSON.parse(raw ? raw.textContent : '{}'); } catch (e) { return; }
    if (!cfg || !cfg.questions || !cfg.questions.length) return;

    var stage = $('.mquiz__stage', root);
    var result = $('.mquiz__result', root);
    var answers = [];
    var step = 0;

    function scaleLabel(v) { return cfg.scale[v - 1] || String(v); }

    function renderStep() {
      var q = cfg.questions[step];
      var pct = (step / cfg.questions.length) * 100;
      var html =
        '<div class="mquiz__progress">' +
          '<span>Вопрос ' + (step + 1) + ' из ' + cfg.questions.length + '</span>' +
          '<span class="mquiz__track"><i style="width:' + pct + '%"></i></span>' +
        '</div>' +
        '<p class="mquiz__block">' + q.block + '</p>' +
        '<p class="mquiz__q">' + q.text + '</p>' +
        '<div class="mquiz__scale" role="group" aria-label="Шкала оценки от 1 до 5">';

      for (var v = 5; v >= 1; v--) {
        html +=
          '<button type="button" class="mquiz__opt" data-val="' + v + '">' +
            '<span class="mquiz__n">' + v + '</span>' +
            '<span>' + scaleLabel(v) + '</span>' +
          '</button>';
      }

      html +=
        '</div>' +
        '<div class="mquiz__comment" hidden>' +
          '<label for="mquiz-comment">' + cfg.commentRule + '</label>' +
          '<textarea id="mquiz-comment" placeholder="Например: на прошлом релизе задача встала без предупреждения команды"></textarea>' +
          '<button type="button" class="mquiz__again" data-next>Отправить и продолжить</button>' +
        '</div>';

      stage.innerHTML = html;
      bindStep();
    }

    function bindStep() {
      var comment = $('.mquiz__comment', stage);
      var chosen = null;

      $$('.mquiz__opt', stage).forEach(function (btn) {
        btn.addEventListener('click', function () {
          chosen = parseInt(btn.getAttribute('data-val'), 10);
          $$('.mquiz__opt', stage).forEach(function (b) { b.classList.toggle('is-on', b === btn); });

          // Правило шаблона: при низкой оценке комментарий обязателен.
          if (chosen <= 2) {
            comment.hidden = false;
            var ta = $('textarea', comment);
            if (ta) ta.focus();
          } else {
            comment.hidden = true;
            window.setTimeout(function () { commit(chosen); }, reduced ? 0 : 260);
          }
        });
      });

      var nextBtn = $('[data-next]', stage);
      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          var ta = $('textarea', comment);
          if (!ta || !ta.value.trim()) {
            if (ta) ta.focus();
            nextBtn.textContent = 'Без комментария оценка не уйдёт';
            return;
          }
          commit(chosen);
        });
      }
    }

    function commit(value) {
      answers.push(value);
      step += 1;
      if (step < cfg.questions.length) renderStep();
      else finish();
    }

    function finish() {
      var sum = answers.reduce(function (a, b) { return a + b; }, 0);
      var avg = sum / answers.length;
      var vsOthers = avg - cfg.others;
      var vsSelf = avg - cfg.self;

      var verdict;
      if (Math.abs(vsOthers) < 0.35) verdict = 'Вы оценили примерно так же, как остальные респонденты.';
      else if (vsOthers > 0) verdict = 'Вы оценили мягче большинства коллег.';
      else verdict = 'Вы оценили строже большинства коллег.';

      result.innerHTML =
        '<div class="mquiz__verdict">' +
          '<b>Ваша средняя оценка: ' + avg.toFixed(1) + '</b>' +
          '<span>' + verdict + ' Коллеги в среднем поставили ' + cfg.others.toFixed(1) +
          ', сама Анна оценила себя на ' + cfg.self.toFixed(1) +
          '. Расхождение между самооценкой и внешней оценкой — ' + Math.abs(cfg.others - cfg.self).toFixed(1) +
          ' балла.</span>' +
        '</div>' +
        '<div class="mquiz__ai">' +
          '<div>' +
            '<b>AI-анализ результатов</b>' +
            '<p>' + cfg.ai + '</p>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="mquiz__again" data-restart>Пройти ещё раз</button>';

      root.classList.add('is-done');
      track('quiz_done', { avg: avg.toFixed(1), delta_self: vsSelf.toFixed(1) });

      var again = $('[data-restart]', result);
      if (again) {
        again.addEventListener('click', function () {
          answers = [];
          step = 0;
          root.classList.remove('is-done');
          renderStep();
        });
      }
    }

    renderStep();
    root.addEventListener('click', function () { trackOnce('quiz_start'); }, { once: true });
  }

  /* ---------------------------------------------------------------
     ВЫБОР ЦЕЛЕВОЙ ПОЗИЦИИ → РАЗРЫВ КОМПЕТЕНЦИЙ → ИПР
     --------------------------------------------------------------- */
  function initFit() {
    var root = $('[data-fit]');
    if (!root) return;

    var raw = $('[data-fit-json]', root);
    var cfg;
    try { cfg = JSON.parse(raw ? raw.textContent : '{}'); } catch (e) { return; }
    if (!cfg || !cfg.positions || !cfg.positions.length) return;

    var stage = $('.mfit__stage-host', root);
    if (!stage) return;

    function steps(n) {
      return '<p class="mfit__step"><b>Шаг ' + n + ' из 3</b>' +
        '<span><i style="width:' + (n / 3) * 100 + '%"></i></span></p>';
    }

    function dots(current, required) {
      var out = '<span class="mfit__dots" aria-label="Уровень ' + current + ' из требуемых ' + required + '">';
      for (var i = 1; i <= 5; i++) {
        var cls = i <= current ? ' class="is-have"' : (i <= required ? ' class="is-need"' : '');
        out += '<i' + cls + '></i>';
      }
      return out + '</span>';
    }

    function renderPick() {
      var html = steps(1) + '<div class="mfit__cards">';
      cfg.positions.forEach(function (p, i) {
        html +=
          '<button type="button" class="mfit__card" data-pos="' + i + '">' +
            '<span class="mfit__ttl">' + p.title + '</span>' +
            '<span class="mfit__match">' + p.match + '%</span>' +
            '<span class="mfit__meta">' +
              '<span>' + p.dept + '</span>' +
              '<span>' + p.type + '</span>' +
              '<span>Сложность: <b>' + p.difficulty + '</b></span>' +
              '<span>Срок: <b>' + p.months + ' мес.</b></span>' +
            '</span>' +
          '</button>';
      });
      html += '</div><p class="mfit__note">Позиции приходят из базы должностей компании. В продукте доступен ещё и поиск по всем должностям, карта треков и AI-чат о карьере.</p>';
      stage.innerHTML = html;

      $$('[data-pos]', stage).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var p = cfg.positions[parseInt(btn.getAttribute('data-pos'), 10)];
          track('fit_position', { title: p.title });
          renderCompare(p);
        });
      });
    }

    function renderCompare(p) {
      var rows = '';
      p.competencies.forEach(function (c) {
        var isGap = c.current < c.required;
        var state = isGap ? 'нужно ' + c.required + ' из 5'
          : (c.current > c.required ? 'выше на ' + (c.current - c.required) : 'закрыто');
        rows +=
          '<div class="mfit__row' + (isGap ? ' mfit__row--gap' : '') + '">' +
            '<span>' + c.name + '</span>' +
            dots(c.current, c.required) +
            '<span class="mfit__state">' + state + '</span>' +
          '</div>';
      });

      stage.innerHTML =
        steps(2) +
        '<div class="mfit__sum">' +
          '<span class="mfit__ready">' + p.match + '%</span>' +
          '<div><b>' + p.title + '</b>' + p.type.toLowerCase() + ', примерный срок перехода ' + p.months + ' мес.</div>' +
        '</div>' +
        '<div class="mfit__rows">' + rows + '</div>' +
        '<button type="button" class="mfit__cta" data-plan>Создать план развития с ИИ</button>' +
        '<button type="button" class="mfit__back" data-restart>Выбрать другую позицию</button>';

      $('[data-plan]', stage).addEventListener('click', function () {
        track('fit_plan', { title: p.title });
        renderPlan(p);
      });
      $('[data-restart]', stage).addEventListener('click', renderPick);
    }

    function renderPlan(p) {
      var stages = '';
      p.plan.forEach(function (s, i) {
        var chips = '';
        (s.competencies || []).forEach(function (c) { chips += '<span>' + c + '</span>'; });
        stages +=
          '<div class="mfit__stage">' +
            '<span class="mfit__n">' + (i + 1) + '</span>' +
            '<div>' +
              '<p class="mfit__sname">' + s.title + '<span>' + s.months + ' мес.</span></p>' +
              '<p class="mfit__srow"><b>KPI этапа:</b> ' + s.kpi + '</p>' +
              '<p class="mfit__srow"><b>Материалы:</b> ' + s.material + '</p>' +
              '<span class="mfit__chips">' + chips + '</span>' +
            '</div>' +
          '</div>';
      });

      stage.innerHTML =
        steps(3) +
        '<div class="mfit__plan">' + stages + '</div>' +
        '<p class="mfit__note"><b>Статус: черновик.</b> Дальше сотрудник отправляет план на согласование руководителю: тот утверждает, возвращает на правки или отклоняет. До согласования план остаётся черновиком, а не личной заметкой.</p>' +
        '<button type="button" class="mfit__back" data-restart>Собрать план под другую позицию</button>';

      $('[data-restart]', stage).addEventListener('click', renderPick);
    }

    renderPick();
    root.addEventListener('click', function () { trackOnce('fit_start'); }, { once: true });
  }

  /* ---------------------------------------------------------------
     ЖИВАЯ МАТРИЦА 9 BOX
     --------------------------------------------------------------- */
  function initNineBox() {
    var root = $('[data-ninebox]');
    if (!root) return;

    var cells = $$('.mnb__cell', root);
    var inputs = $$('input[type="range"]', root);
    var calc = $('[data-nb-calc]', root);
    var verdict = $('[data-nb-verdict]', root);
    if (cells.length !== 9 || inputs.length !== 3 || !calc || !verdict) return;

    var LEVELS = ['низкий', 'средний', 'высокий'];

    function level(pct) {
      if (pct <= 33) return 0;
      if (pct <= 66) return 1;
      return 2;
    }

    function paint() {
      var goals = +inputs[0].value;
      var kpi = +inputs[1].value;
      var a360 = +inputs[2].value;
      var x = Math.round((goals + kpi) / 2);

      inputs.forEach(function (el) {
        var out = el.parentNode.querySelector('output');
        if (out) out.value = el.value + '%';
      });

      var lx = level(x);
      var ly = level(a360);
      // Строки матрицы идут сверху вниз от высокого Y к низкому.
      var index = (2 - ly) * 3 + lx;

      cells.forEach(function (cell, i) {
        var on = i === index;
        cell.classList.toggle('is-on', on);
        var dot = cell.querySelector('.mnb__you');
        if (on && !dot) {
          dot = document.createElement('span');
          dot.className = 'mnb__you';
          dot.textContent = 'А.К.';
          cell.appendChild(dot);
        } else if (!on && dot) {
          dot.remove();
        }
      });

      calc.innerHTML =
        'Ось X: (' + goals + '% цели + ' + kpi + '% KPI) / 2 = <b>' + x + '%</b> — ' + LEVELS[lx] + '<br>' +
        'Ось Y: оценка 360° = <b>' + a360 + '%</b> — ' + LEVELS[ly];

      var cell = cells[index];
      verdict.innerHTML =
        '<b>' + (cell.getAttribute('data-name') || '') + '</b>' +
        '<span>' + (cell.getAttribute('data-hint') || '') + '</span>';
    }

    inputs.forEach(function (el) {
      el.addEventListener('input', paint);
      el.addEventListener('change', function () { trackOnce('ninebox_move'); });
    });
    paint();
  }

  /* ---------------------------------------------------------------
     МАРШРУТ СОГЛАСОВАНИЯ ЦЕЛИ
     --------------------------------------------------------------- */
  function initRoute() {
    var root = $('[data-route]');
    if (!root) return;

    var out = $('[data-rt-out]', root);
    if (!out) return;

    var state = { type: 'ind', resp: 'self', mgr: 'yes' };

    var AUTHOR = 'Мария К., аналитик';
    var AUTHOR_MGR = 'Алексей П., руководитель отдела';
    var RESP = 'Дмитрий В., продакт-аналитик';
    var RESP_MGR = 'Ольга Н., руководитель продукта';

    function node(role, name, key) {
      return '<div class="mrt__node' + (key ? ' mrt__node--key' : '') + '">' +
        '<span class="mrt__ico">' + (key ? '✓' : '·') + '</span>' +
        '<span><small>' + role + '</small><p>' + name + '</p></span>' +
        '</div>';
    }

    var ARROW = '<span class="mrt__arrow" aria-hidden="true">↓</span>';

    function render() {
      var team = state.type === 'team';
      var other = state.resp === 'other';

      if (state.mgr === 'no') {
        out.innerHTML =
          node('Цель', team ? 'Командная цель отдела аналитики' : 'Индивидуальная цель') + ARROW +
          node('Ответственный', other ? RESP : AUTHOR) + ARROW +
          node('Согласующий', 'не определён', false) +
          '<div class="mrt__warn"><b>Маршрут не строится.</b> У сотрудника не указан линейный руководитель — платформа предупреждает об этом в карточке цели и предлагает обратиться в HR.</div>';
        return;
      }

      var approver, rule;
      if (!team) {
        approver = other ? RESP_MGR : AUTHOR_MGR;
        rule = other
          ? 'Индивидуальная цель уходит руководителю того, кто за неё отвечает, а не автору. Ответственный — Дмитрий, поэтому согласует <b>его руководитель</b>.'
          : 'Индивидуальная цель уходит линейному руководителю сотрудника из его профиля. Выбирать маршрут вручную не нужно.';
      } else {
        approver = AUTHOR_MGR;
        rule = other
          ? 'Командная цель осталась у руководителя владельца команды, хотя ответственным назначен сотрудник из другой команды. Так маршрут <b>не уезжает не тому руководителю</b> только из-за выбора исполнителя.'
          : 'Для командной цели согласующим становится руководитель владельца команды: маршрут отражает управленческую логику, а не только исполнение.';
      }

      var sender = other ? RESP : AUTHOR;

      out.innerHTML =
        node('Цель', team ? 'Командная цель отдела аналитики' : 'Индивидуальная цель') + ARROW +
        node(team ? 'Владелец команды' : 'Владелец', AUTHOR) + ARROW +
        node('Ответственный', other ? RESP : AUTHOR + ' — он же владелец') + ARROW +
        node('Согласующий определён автоматически', approver, true) +
        '<p class="mrt__send">Отправить на согласование может <b>' + sender + '</b>: если ответственный отличается от владельца, отправителем считается ответственный.</p>' +
        '<div class="mrt__rule">' + rule + '</div>';
    }

    $$('.mrt__opt', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var group = btn.getAttribute('data-rt-group');
        state[group] = btn.getAttribute('data-rt-val');
        $$('.mrt__opt[data-rt-group="' + group + '"]', root).forEach(function (sib) {
          var on = sib === btn;
          sib.classList.toggle('is-on', on);
          sib.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        trackOnce('route_change');
        render();
      });
    });

    render();
  }

  /* ---------------------------------------------------------------
     AI-ПОДБОР ПРЕЕМНИКОВ
     --------------------------------------------------------------- */
  function initSuccession() {
    var root = $('[data-succ]');
    if (!root) return;

    var raw = $('[data-succ-json]', root);
    var cfg;
    try { cfg = JSON.parse(raw ? raw.textContent : '{}'); } catch (e) { return; }
    if (!cfg || !cfg.candidates || !cfg.candidates.length) return;

    var stage = $('.msc__stage', root);
    if (!stage) return;

    function kpi(covered) {
      var total = cfg.totalPositions;
      return '<div class="msc__kpi"><b>' + Math.round((covered / total) * 100) + '%</b>' +
        '<span><i>Покрытие ключевых позиций</i>' + covered + ' из ' + total + ' позиций имеют хотя бы одного преемника</span></div>';
    }

    function position() {
      return '<div class="msc__pos"><b>' + cfg.position + '</b>' +
        '<span>Держатель: ' + cfg.holder + ' · источник: справочник должностей · кадровый резерв</span></div>';
    }

    function renderStart() {
      stage.innerHTML =
        kpi(cfg.covered) + position() +
        '<button type="button" class="msc__go" data-succ-go>Подобрать резервистов с ИИ</button>' +
        '<p class="msc__note" style="margin-top:12px;">ИИ сравнивает кандидатов из поддерева подразделения с требованиями роли: компетенции должности, данные 360°, Performance Review, Self Review и карьерный трек.</p>';
      $('[data-succ-go]', stage).addEventListener('click', function () {
        track('succ_ai');
        renderList();
      });
    }

    function renderList() {
      var cards = '';
      cfg.candidates.forEach(function (c, i) {
        var tags = '';
        (c.strengths || []).forEach(function (t) { tags += '<span>' + t + '</span>'; });
        (c.gaps || []).forEach(function (t) { tags += '<span class="is-gap">' + t + '</span>'; });
        cards +=
          '<div class="msc__card">' +
            '<div class="msc__top">' +
              '<span class="msc__name">' + c.name + '<small>' + c.role + '</small></span>' +
              '<span class="msc__match">' + c.match + '%</span>' +
            '</div>' +
            '<p class="msc__why"><b>Почему подходит:</b> ' + c.why + '</p>' +
            '<span class="msc__tags">' + tags + '</span>' +
            '<button type="button" class="msc__nom" data-nom="' + i + '">Номинировать</button>' +
          '</div>';
      });

      stage.innerHTML =
        kpi(cfg.covered) + position() +
        '<p class="msc__why" style="margin:0 0 8px;"><b>ИИ предложил ' + cfg.candidates.length + ' кандидатов</b> из поддерева подразделения</p>' +
        '<div class="msc__cands">' + cards + '</div>' +
        '<button type="button" class="msc__back" data-succ-restart>Начать заново</button>';

      $$('[data-nom]', stage).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var c = cfg.candidates[parseInt(btn.getAttribute('data-nom'), 10)];
          track('succ_nominate', { name: c.name });
          renderDone(c);
        });
      });
      $('[data-succ-restart]', stage).addEventListener('click', renderStart);
    }

    function renderDone(c) {
      stage.innerHTML =
        kpi(cfg.covered + 1) + position() +
        '<div class="msc__done"><b>Номинация сохранена: ' + c.name + '</b>' +
        '<span>Позиция перестала быть непокрытой, KPI цикла пересчитан автоматически.</span></div>' +
        '<div class="msc__meta">' +
          '<div><i>Готовность</i><b>' + c.readiness + '</b></div>' +
          '<div><i>Gap</i><b>' + c.gap + '</b></div>' +
          '<div><i>Тип связи</i><b>' + c.link + '</b></div>' +
        '</div>' +
        '<p class="msc__note"><b>Дальше по процессу.</b> На эту же позицию можно назначить ещё преемников со своей готовностью и gap, а HR может скрыть чувствительную номинацию от нижестоящих руководителей. Разрыв компетенций уходит в план развития резервиста.</p>' +
        '<button type="button" class="msc__back" data-succ-restart>Подобрать другого кандидата</button>';
      $('[data-succ-restart]', stage).addEventListener('click', renderStart);
    }

    renderStart();
  }

  /* ---------------------------------------------------------------
     МОДАЛКА ЗАЯВКИ
     --------------------------------------------------------------- */
  function initDemoModal() {
    var modal = $('#ef-demo-modal');
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
      if (open) {
        e.preventDefault();
        track('demo_open', { from: open.getAttribute('data-track') || '' });
        window.__efOpenDemoForm();
      }
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

  /* ---------------------------------------------------------------
     ОБЩИЙ SCROLL-ТИК
     --------------------------------------------------------------- */
  var ticking = false;

  function tick() {
    ticking = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    updateFeed(vh);
    updateMode();
    flushReveals(vh);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(tick);
  }

  function boot() {
    initFeed();
    initMode();
    collectReveals();
    initQuiz();
    initFit();
    initNineBox();
    initRoute();
    initSuccession();
    initDemoModal();
    initSnap();
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
