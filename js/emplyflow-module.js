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
     ДЕМО КАСКАДА ЦЕЛЕЙ · ОБЛОЖКА
     --------------------------------------------------------------- */
  function initGoalDemo() {
    var root = $('[data-goal-demo]');
    if (!root) return;

    var raw = $('[data-goal-json]', root);
    var cfg;
    try { cfg = JSON.parse(raw ? raw.textContent : '{}'); } catch (e) { return; }
    if (!cfg || !cfg.steps || !cfg.steps.length) return;

    var rail = $('[data-goal-rail]', root);
    var stage = $('[data-goal-stage]', root);
    var barTitle = $('[data-goal-title]', root);
    if (!rail || !stage) return;

    var current = 0;
    var timer = null;
    var paused = false;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var selectedBranch = 'commerce';

    var branches = {
      commerce: {
        area: 'Коммерческий блок',
        title: 'Увеличить конверсию воронки',
        meta: 'родитель для команд продаж и маркетинга',
        parent: 'Вырасти выручку бизнеса на 18%',
        owner: 'Владелец: директор по продажам',
        bar: 'Каскад · коммерческий блок',
        kr1: 'Конверсия в заявку 2,4% → 3,2%',
        kr2: 'Время ответа менеджера до 15 минут',
        kr3: 'Доля повторных обращений не выше 18%',
        note: 'Эта командная цель станет родительской для целей маркетинга и продаж'
      },
      product: {
        area: 'Продукт',
        title: 'Сократить time-to-value',
        meta: 'связано с retention и NPS',
        parent: 'Вырасти выручку бизнеса на 18%',
        owner: 'Владелец: директор продукта',
        bar: 'Каскад · продуктовая команда',
        kr1: 'Активация нового клиента до 7 дней',
        kr2: 'Доля завершённых onboarding-сценариев 85%',
        kr3: 'NPS после первого месяца не ниже 45',
        note: 'Цель связывает продукт, внедрение и клиентский успех в одном каскаде'
      },
      success: {
        area: 'Customer Success',
        title: 'Удержать ключевых клиентов',
        meta: 'кросс-командная цель',
        parent: 'Вырасти выручку бизнеса на 18%',
        owner: 'Владелец: руководитель Customer Success',
        bar: 'Каскад · Customer Success',
        kr1: 'Churn ключевых клиентов не выше 4%',
        kr2: '90% рисковых аккаунтов с планом удержания',
        kr3: 'Расширения в базе +12% к H1',
        note: 'Кросс-командная цель может быть передана в работу продукту или аккаунт-команде'
      }
    };

    function sceneCompany() {
      return '<div class="mgd__scene">' +
        '<span class="mgd__lvl">Уровень компании</span>' +
        '<div class="mgd__tree" aria-label="Дерево целей компании">' +
        '<div class="mgd__tree-root">' +
        '<span class="mgd__tree-kicker">Компания</span>' +
        '<span class="mgd__tree-title">Вырасти выручку бизнеса на 18% · H1 2026</span>' +
        '<span class="mgd__tree-meta">Стратегия периода · владелец: CEO</span>' +
        '</div>' +
        '<div class="mgd__tree-lines" aria-hidden="true"></div>' +
        '<div class="mgd__branches">' +
        '<button type="button" class="mgd__tree-node' + (selectedBranch === 'commerce' ? ' is-live' : '') + '" data-goal-jump="1" data-goal-branch="commerce">' +
        '<span class="mgd__tree-kicker">Коммерческий блок</span>' +
        '<span class="mgd__tree-title">Увеличить конверсию воронки</span>' +
        '<span class="mgd__tree-meta">родитель для команд продаж и маркетинга</span>' +
        '</button>' +
        '<button type="button" class="mgd__tree-node' + (selectedBranch === 'product' ? ' is-live' : '') + '" data-goal-jump="1" data-goal-branch="product">' +
        '<span class="mgd__tree-kicker">Продукт</span>' +
        '<span class="mgd__tree-title">Сократить time-to-value</span>' +
        '<span class="mgd__tree-meta">связано с retention и NPS</span>' +
        '</button>' +
        '<button type="button" class="mgd__tree-node' + (selectedBranch === 'success' ? ' is-live' : '') + '" data-goal-jump="1" data-goal-branch="success">' +
        '<span class="mgd__tree-kicker">Customer Success</span>' +
        '<span class="mgd__tree-title">Удержать ключевых клиентов</span>' +
        '<span class="mgd__tree-meta">кросс-командная цель</span>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '<div class="mgd__chip">Ветки дерева строятся на основе привязки дочерних целей к родительским.</div>' +
        '</div>';
    }

    function sceneTeam() {
      var goal = branches[selectedBranch] || branches.commerce;
      return '<div class="mgd__scene">' +
        '<span class="mgd__lvl">Каскад на команду</span>' +
        '<div class="mgd__card is-parent">' + goal.parent + '</div>' +
        '<div class="mgd__link"><i aria-hidden="true"></i> привязка к родительской цели</div>' +
        '<div class="mgd__card is-key">' + goal.title + ' · H1 2026' +
        '<span style="display:block;margin-top:5px;font-size:11px;font-weight:700;color:#8681ab;">' + goal.area + ' · ' + goal.owner + '</span>' +
        '</div>' +
        '<div class="mpersp" style="margin-top:12px;">' +
        '<div class="mpersp__row"><span class="mpersp__ava mpersp__ava--dot" style="background:#4a3bff;"></span><span class="mpersp__name">' + goal.kr1 + ' · вес 40%</span><span class="mpersp__val">40%</span></div>' +
        '<div class="mpersp__row"><span class="mpersp__ava mpersp__ava--dot" style="background:#5fce87;"></span><span class="mpersp__name">' + goal.kr2 + ' · вес 35%</span><span class="mpersp__val">35%</span></div>' +
        '<div class="mpersp__row"><span class="mpersp__ava mpersp__ava--dot" style="background:#ffb777;"></span><span class="mpersp__name">' + goal.kr3 + ' · вес 25%</span><span class="mpersp__val">25%</span></div>' +
        '</div>' +
        '<div class="mgd__chip">' + goal.note + '</div>' +
        '</div>';
    }

    function sceneIndividual() {
      return '<div class="mgd__scene">' +
        '<span class="mgd__lvl">Индивидуальная цель</span>' +
        '<div class="mgd__person">' +
        '<img src="images/avatar-goal-employee.jpg" alt="Мария К.">' +
        '<div><b>Мария К.</b><span>аналитик · индивидуальная цель</span></div>' +
        '</div>' +
        '<div class="mgd__card is-parent" style="margin-bottom:10px;">Увеличить конверсию воронки</div>' +
        '<p class="msub" style="margin-top:0;">Key Results и веса</p>' +
        '<div class="mpersp">' +
        '<div class="mpersp__row"><span class="mpersp__ava mpersp__ava--dot" style="background:#4a3bff;"></span>' +
        '<span class="mpersp__name">Конверсия в заявку 2,4% → 3,2% · вес 40%</span>' +
        '<span class="mpersp__val">75%</span><span class="mpersp__bar"><i style="width:75%;background:#4a3bff;"></i></span></div>' +
        '<div class="mpersp__row"><span class="mpersp__ava mpersp__ava--dot" style="background:#5fce87;"></span>' +
        '<span class="mpersp__name">Время ответа менеджера до 15 минут · вес 35%</span>' +
        '<span class="mpersp__val">90%</span><span class="mpersp__bar"><i style="width:90%;background:#5fce87;"></i></span></div>' +
        '<div class="mpersp__row"><span class="mpersp__ava mpersp__ava--dot" style="background:#ffb777;"></span>' +
        '<span class="mpersp__name">Доля повторных обращений 18% · вес 25%</span>' +
        '<span class="mpersp__val">40%</span><span class="mpersp__bar"><i style="width:40%;background:#ffb777;"></i></span></div>' +
        '</div>' +
        '<div class="mgd__progress"><span>Прогресс по весам KR</span><b>71% · в норме</b></div>' +
        '</div>';
    }

    function sceneRoute() {
      return '<div class="mgd__scene">' +
        '<span class="mgd__lvl">Маршрут согласования</span>' +
        '<div class="mgd__route">' +
        '<div class="mgd__node"><span><small>Автор</small><p>Мария К., аналитик</p></span></div>' +
        '<div class="mgd__arrow" aria-hidden="true">↓</div>' +
        '<div class="mgd__node"><span><small>Ответственный</small><p>Мария К., аналитик</p></span></div>' +
        '<div class="mgd__arrow" aria-hidden="true">↓</div>' +
        '<div class="mgd__node is-key"><span><small>Согласующий · определён автоматически</small><p>Алексей П., руководитель отдела</p></span></div>' +
        '</div>' +
        '<div class="mgd__send"><span>Отправить на согласование</span><span style="opacity:.85;font-size:11px;">платформа построила маршрут по оргструктуре</span></div>' +
        '</div>';
    }

    var scenes = [sceneCompany, sceneTeam, sceneIndividual, sceneRoute];

    function draw() {
      var step = cfg.steps[current];
      if (barTitle && step.bar) {
        barTitle.textContent = current === 1 && branches[selectedBranch] ? branches[selectedBranch].bar : step.bar;
      }
      stage.innerHTML = scenes[current]();
      $$('[data-goal-jump]', stage).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var branch = btn.getAttribute('data-goal-branch');
          if (branch && branches[branch]) selectedBranch = branch;
          goTo(parseInt(btn.getAttribute('data-goal-jump'), 10), true);
        });
      });
      $$('.mgd__step', rail).forEach(function (btn, i) {
        var on = i === current;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
        btn.setAttribute('tabindex', on ? '0' : '-1');
      });
    }

    function goTo(i, user) {
      current = (i + cfg.steps.length) % cfg.steps.length;
      if (user) {
        track('goal_demo_step', { step: cfg.steps[current].short });
        stopAuto();
      }
      draw();
    }

    function stopAuto() {
      paused = true;
      if (timer) { clearInterval(timer); timer = null; }
    }

    function startAuto() {
      if (paused || reduced) return;
      if (timer) clearInterval(timer);
      timer = setInterval(function () {
        goTo(current + 1, false);
      }, cfg.interval || 4800);
    }

    rail.innerHTML = '';
    cfg.steps.forEach(function (step, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mgd__step';
      btn.setAttribute('role', 'tab');
      btn.textContent = step.short;
      btn.addEventListener('click', function () { goTo(i, true); });
      rail.appendChild(btn);
    });

    root.addEventListener('mouseenter', stopAuto);
    root.addEventListener('focusin', stopAuto);

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !paused) startAuto();
          else if (timer) { clearInterval(timer); timer = null; }
        });
      }, { threshold: 0.35 });
      obs.observe(root);
    } else {
      startAuto();
    }

    draw();
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
     БЛАГОДАРНОСТЬ КОЛЛЕГЕ
     --------------------------------------------------------------- */
  function initThanks() {
    var root = $('[data-thanks]');
    if (!root) return;

    var raw = $('[data-thanks-json]', root);
    var cfg;
    try { cfg = JSON.parse(raw ? raw.textContent : '{}'); } catch (e) { return; }
    if (!cfg || !cfg.items || !cfg.items.length) return;

    var stage = $('.mth__stage', root);
    if (!stage) return;

    var tab = 'projects';
    var count = cfg.count;
    var open = null;
    var flash = '';
    var warn = '';
    var bump = false;
    var log = [];

    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
      });
    }

    function render() {
      var html =
        '<div class="mth__head"><span class="mth__ava"></span>' +
        '<span class="mth__who"><b>' + cfg.person + '</b><span>' + cfg.role + '</span></span>' +
        '<span class="mth__count' + (bump ? ' is-up' : '') + '">' + count + ' благодарностей</span></div>';
      bump = false;

      if (flash) html += '<div class="mth__toast">' + flash + '</div>';
      if (warn) html += '<div class="mth__warn">' + warn + '</div>';

      if (open) {
        html +=
          '<div class="mth__dialog">' +
            '<p><b>Отправить благодарность</b><br>За ' + (open.tab === 'projects' ? 'проект' : 'достижение') + ' «' + open.title + '»</p>' +
            '<textarea class="mth__field" rows="3" data-thanks-msg placeholder="Сообщение (необязательно)"></textarea>' +
            '<div class="mth__row"><button type="button" class="mth__send" data-thanks-confirm>Отправить</button>' +
            '<button type="button" class="mth__cancel" data-thanks-cancel>Отмена</button></div>' +
          '</div>';
      } else {
        html +=
          '<div class="mth__tabs">' +
            '<button type="button" class="mth__tab' + (tab === 'projects' ? ' is-on' : '') + '" data-thanks-tab="projects">Проекты</button>' +
            '<button type="button" class="mth__tab' + (tab === 'achievements' ? ' is-on' : '') + '" data-thanks-tab="achievements">Достижения</button>' +
          '</div><div class="mth__items">';

        cfg.items.forEach(function (it, i) {
          if (it.tab !== tab) return;
          html +=
            '<div class="mth__item' + (it.sent ? ' is-done' : '') + '">' +
              '<span><b>' + it.title + '</b><span>' + it.sub + '</span></span>' +
              '<button type="button" class="mth__send' + (it.sent ? ' is-sent' : '') + '" data-thanks-pick="' + i + '">' +
              (it.sent ? 'Отправлено' : 'Благодарность') + '</button>' +
            '</div>';
        });
        html += '</div>';
      }

      if (log.length) {
        html += '<div class="mth__log"><p>История благодарностей</p>';
        log.forEach(function (l) { html += '<div>' + l + '</div>'; });
        html += '</div>';
      }

      stage.innerHTML = html;

      $$('[data-thanks-tab]', stage).forEach(function (b) {
        b.addEventListener('click', function () {
          tab = b.getAttribute('data-thanks-tab');
          flash = ''; warn = '';
          render();
        });
      });

      $$('[data-thanks-pick]', stage).forEach(function (b) {
        b.addEventListener('click', function () {
          var it = cfg.items[parseInt(b.getAttribute('data-thanks-pick'), 10)];
          flash = ''; warn = '';
          if (it.sent) {
            warn = 'Вы уже благодарили за ' + (it.tab === 'projects' ? 'этот проект' : 'это достижение') + '. Повторная благодарность за тот же объект не отправляется.';
            render();
            return;
          }
          open = it;
          track('thanks_open', { title: it.title });
          render();
          var f = $('[data-thanks-msg]', stage);
          if (f) f.focus();
        });
      });

      var cancel = $('[data-thanks-cancel]', stage);
      if (cancel) cancel.addEventListener('click', function () { open = null; render(); });

      var confirm = $('[data-thanks-confirm]', stage);
      if (confirm) confirm.addEventListener('click', function () {
        var field = $('[data-thanks-msg]', stage);
        var msg = field ? field.value.trim() : '';
        open.sent = true;
        count += 1;
        bump = true;
        flash = 'Благодарность отправлена. Счётчик в профиле обновился.';
        log.unshift('<b>Вы</b> — за ' + (open.tab === 'projects' ? 'проект' : 'достижение') + ' «' + open.title + '»' +
          (msg ? '<br>«' + esc(msg) + '»' : '') + '<i>сегодня</i>');
        track('thanks_send', { title: open.title, with_message: msg ? 1 : 0 });
        open = null;
        render();
      });
    }

    render();
  }

  /* ---------------------------------------------------------------
     ФАЗЫ ЦИКЛА PERFORMANCE REVIEW
     --------------------------------------------------------------- */
  function initPhases() {
    var root = $('[data-phases]');
    if (!root) return;

    var raw = $('[data-phases-json]', root);
    var cfg;
    try { cfg = JSON.parse(raw ? raw.textContent : '{}'); } catch (e) { return; }
    if (!cfg || !cfg.phases || !cfg.phases.length) return;

    var line = $('.mph__line', root);
    var panel = $('.mph__panel', root);
    if (!line || !panel) return;

    var current = 0;

    function draw() {
      var p = cfg.phases[current];
      var roles = '';
      p.roles.forEach(function (r) {
        roles += '<div class="mph__role' + (r.idle ? ' is-idle' : '') + '"><b>' + r.role + '</b><span>' + r.text + '</span></div>';
      });
      panel.innerHTML =
        '<h4>' + p.title + '</h4>' +
        '<p class="mph__when">' + p.when + '</p>' +
        '<div class="mph__roles">' + roles + '</div>' +
        (p.lock ? '<div class="mph__lock">' + p.lock + '</div>' : '');

      $$('.mph__step', line).forEach(function (b, i) {
        b.classList.toggle('is-on', i === current);
        b.setAttribute('aria-pressed', i === current ? 'true' : 'false');
      });
    }

    line.innerHTML = '';
    cfg.phases.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mph__step';
      b.innerHTML = '<b>' + p.short + '</b><i>' + p.dates + '</i>';
      b.addEventListener('click', function () {
        current = i;
        track('phase_open', { phase: p.short });
        draw();
      });
      line.appendChild(b);
    });

    draw();
  }

  /* ---------------------------------------------------------------
     ВЕСА КОМПОНЕНТОВ И ИТОГОВЫЙ БАЛЛ
     --------------------------------------------------------------- */
  function initWeights() {
    var root = $('[data-weights]');
    if (!root) return;

    var raw = $('[data-weights-json]', root);
    var cfg;
    try { cfg = JSON.parse(raw ? raw.textContent : '{}'); } catch (e) { return; }
    if (!cfg || !cfg.components || !cfg.components.length) return;

    var rows = $('.mwt__rows', root);
    var out = $('.mwt__out', root);
    var hint = $('.mwt__hint', root);
    if (!rows || !out) return;

    var inputs = [];

    function grade(score) {
      for (var i = 0; i < cfg.scale.length; i++) {
        if (score >= cfg.scale[i].from) return cfg.scale[i];
      }
      return cfg.scale[cfg.scale.length - 1];
    }

    function draw() {
      var sum = 0;
      inputs.forEach(function (inp) { sum += parseInt(inp.value, 10); });
      if (sum <= 0) sum = 1;

      var score = 0;
      cfg.components.forEach(function (c, i) {
        var w = parseInt(inputs[i].value, 10) / sum;
        score += c.result * w;
        var label = $('[data-weight-label="' + i + '"]', rows);
        if (label) label.textContent = Math.round(w * 100) + '%';
      });

      score = Math.round(score);
      var g = grade(score);
      out.innerHTML =
        '<span class="mwt__score">' + score + '</span>' +
        '<span class="mwt__grade"><b>' + g.title + '</b><span>' + g.note + '</span></span>' +
        '<span class="mwt__badge">' + g.code + '</span>';
      if (hint) hint.innerHTML = '<b>Решение руководителя:</b> ' + g.decision;
    }

    rows.innerHTML = '';
    cfg.components.forEach(function (c, i) {
      var row = document.createElement('div');
      row.className = 'mwt__row';
      row.innerHTML =
        '<span class="mwt__top"><b>' + c.name + '</b><span data-weight-label="' + i + '">0%</span></span>' +
        '<p class="mwt__fact">' + c.fact + '</p>' +
        '<input class="mwt__range" type="range" min="0" max="100" step="5" value="' + c.weight + '" aria-label="Вес компонента «' + c.name + '»">';
      rows.appendChild(row);
      var inp = row.querySelector('input');
      inputs.push(inp);
      inp.addEventListener('input', draw);
      inp.addEventListener('change', function () { track('weights_change', { component: c.name }); });
    });

    draw();
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
     КЛАВИАТУРА: перелистывание ленты
     --------------------------------------------------------------- */
  function initKeys() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'PageDown' && e.key !== 'PageUp') return;
      if (!reels.length || activeReel < 0) return;
      var next = activeReel + (e.key === 'PageDown' ? 1 : -1);
      if (next < 0 || next >= reels.length) return;
      e.preventDefault();
      reels[next].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
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
    initGoalDemo();
    initSuccession();
    initThanks();
    initPhases();
    initWeights();
    initDemoModal();
    initKeys();
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
