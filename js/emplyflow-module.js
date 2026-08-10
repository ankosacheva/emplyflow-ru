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

    function renderGuide() {
      var guide = cfg.scaleGuide || [];
      if (!guide.length) return '';
      var rows = guide.map(function (row) {
        return '<li><b>' + row.n + '</b><span>' + row.label + '</span><i>' + row.hint + '</i></li>';
      }).join('');
      return '<div class="mquiz__guide"><p class="mquiz__guide-h">Пояснение к шкале</p><ol class="mquiz__guide-list">' + rows + '</ol></div>';
    }

    function renderScale(q) {
      var fmt = q.format || 'mixed';
      var html = '';
      var aria = 'Шкала оценки от 1 до 5';

      if (fmt === 'numeric') {
        html += renderGuide();
        html += '<div class="mquiz__nums" role="group" aria-label="' + aria + '">';
        for (var n = 1; n <= 5; n++) {
          html += '<button type="button" class="mquiz__num" data-val="' + n + '" title="' + scaleLabel(n) + '">' + n + '</button>';
        }
        html += '</div>';
        return html;
      }

      html += '<div class="mquiz__scale mquiz__scale--verbal" role="group" aria-label="' + aria + '">';
      for (var v = 5; v >= 1; v--) {
        html +=
          '<button type="button" class="mquiz__opt mquiz__opt--verbal" data-val="' + v + '">' +
            '<span>' + scaleLabel(v) + '</span>' +
          '</button>';
      }
      html += '</div>';
      return html;
    }

    function renderComment(q, hidden) {
      var optional = q.commentOptional;
      var label = optional ? (q.commentLabel || 'Комментарий (необязательно)') : cfg.commentRule;
      var cls = 'mquiz__comment' + (optional ? ' mquiz__comment--opt' : '');
      var attrs = hidden && !optional ? ' hidden' : '';
      return (
        '<div class="' + cls + '"' + attrs + '>' +
          '<label for="mquiz-comment">' + label + '</label>' +
          '<textarea id="mquiz-comment" placeholder="' + (optional ? 'Например: на воркшопе в мае помогла двум джунам закрыть задачи' : 'Например: на прошлом релизе задача встала без предупреждения команды') + '"></textarea>' +
          '<button type="button" class="mquiz__again" data-next>' + (optional ? 'Продолжить' : 'Отправить и продолжить') + '</button>' +
        '</div>'
      );
    }

    function renderStep() {
      var q = cfg.questions[step];
      var pct = (step / cfg.questions.length) * 100;
      var fmt = q.format || 'mixed';
      var html =
        '<div class="mquiz__progress">' +
          '<span>Вопрос ' + (step + 1) + ' из ' + cfg.questions.length + '</span>' +
          '<span class="mquiz__track"><i style="width:' + pct + '%"></i></span>' +
        '</div>' +
        '<p class="mquiz__format">' + (fmt === 'numeric' ? 'Числовая шкала' : 'Словесная шкала') + '</p>' +
        '<p class="mquiz__block">' + q.block + '</p>' +
        '<p class="mquiz__q">' + q.text + '</p>';

      if (fmt === 'mixed') {
        html += '<div class="mquiz__scale" role="group" aria-label="Шкала оценки от 1 до 5">';
        for (var v = 5; v >= 1; v--) {
          html +=
            '<button type="button" class="mquiz__opt" data-val="' + v + '">' +
              '<span class="mquiz__n">' + v + '</span>' +
              '<span>' + scaleLabel(v) + '</span>' +
            '</button>';
        }
        html += '</div>';
      } else {
        html += renderScale(q);
      }

      html += renderComment(q, true);

      stage.innerHTML = html;
      bindStep(q);
    }

    function bindStep(q) {
      var comment = $('.mquiz__comment', stage);
      var optional = q.commentOptional;
      var chosen = null;

      function pick(val, btn) {
        chosen = val;
        $$('[data-val]', stage).forEach(function (b) { b.classList.toggle('is-on', b === btn); });

        if (optional) {
          comment.hidden = false;
          var nextBtn = $('[data-next]', stage);
          if (nextBtn) nextBtn.hidden = false;
          return;
        }

        if (val <= 2) {
          comment.hidden = false;
          var ta = $('textarea', comment);
          if (ta) ta.focus();
        } else {
          comment.hidden = true;
          window.setTimeout(function () { commit(chosen); }, reduced ? 0 : 260);
        }
      }

      $$('.mquiz__opt, .mquiz__num', stage).forEach(function (btn) {
        btn.addEventListener('click', function () {
          pick(parseInt(btn.getAttribute('data-val'), 10), btn);
        });
      });

      if (optional && comment) {
        comment.hidden = false;
        var optNext = $('[data-next]', comment);
        if (optNext) optNext.hidden = true;
      }

      var nextBtn = $('[data-next]', stage);
      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          if (!chosen) {
            nextBtn.textContent = 'Сначала выберите оценку';
            return;
          }
          if (!optional) {
            var ta = $('textarea', comment);
            if (!ta || !ta.value.trim()) {
              if (ta) ta.focus();
              nextBtn.textContent = 'Без комментария оценка не уйдёт';
              return;
            }
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
      html += '</div><p class="mfit__note">Позиции приходят из базы должностей компании. В продукте также доступен поиск по всем должностям, карта треков и AI-чат с карьерным консультантом.</p>';
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
    var levelsBox = $('[data-nb-levels]', root);
    if (cells.length !== 9 || inputs.length !== 3 || !calc || !verdict) return;

    var LEVELS = ['низкий', 'средний', 'высокий'];
    // 0 — плохо, 1 — нейтрально, 2 — хорошо
    var LEVEL_META = [
      { tone: 'bad', arrow: '↓' },
      { tone: 'mid', arrow: '→' },
      { tone: 'good', arrow: '↑' }
    ];

    function level(pct) {
      if (pct <= 33) return 0;
      if (pct <= 66) return 1;
      return 2;
    }

    function levelChip(label, lvl) {
      var m = LEVEL_META[lvl];
      return '<span class="mnbc__lvl mnbc__lvl--' + m.tone + '">' +
        '<i>' + m.arrow + '</i>' +
        '<span class="mnbc__lvl-l">' + label + '</span>' +
        '<b>' + LEVELS[lvl] + '</b>' +
        '</span>';
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
          dot.innerHTML =
            '<img class="mnb__you-ava" src="images/avatar-successor-anna.jpg" alt="" width="18" height="18" loading="lazy" decoding="async">' +
            '<span>А.К.</span>';
          cell.appendChild(dot);
        } else if (!on && dot) {
          dot.remove();
        }
      });

      calc.innerHTML =
        'Ось X: (' + goals + '% цели + ' + kpi + '% KPI) / 2 = <b>' + x + '%</b> — ' + LEVELS[lx] + '<br>' +
        'Ось Y: оценка 360° = <b>' + a360 + '%</b> — ' + LEVELS[ly];

      if (levelsBox) {
        levelsBox.innerHTML =
          levelChip('Результат и KPI', lx) +
          levelChip('Компетенции 360°', ly);
      }

      var cell = cells[index];
      verdict.innerHTML =
        '<span class="mnbc__verdict-eye">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0L13.5 10.5 24 12 13.5 13.5 12 24 10.5 13.5 0 12 10.5 10.5z"/></svg>' +
          'Рекомендация' +
        '</span>' +
        '<b>' + (cell.getAttribute('data-name') || '') + '</b>' +
        '<p class="mnbc__verdict-desc">' + (cell.getAttribute('data-hint') || '') + '</p>';
    }

    inputs.forEach(function (el) {
      el.addEventListener('input', paint);
      el.addEventListener('change', function () { trackOnce('ninebox_move'); });
    });
    paint();
  }

  /* ---------------------------------------------------------------
     ПРИБЛИЖЕНИЕ ЯЧЕЕК 9 BOX В HERO
     --------------------------------------------------------------- */
  function initNineBoxZoom() {
    var wrap = $('.mwin--9box .ef-9box__grid');
    if (!wrap) return;

    var cells = $$('.ef-9box-cell', wrap);
    if (!cells.length) return;

    var overlay = null;
    var lastFocus = null;

    function toneOf(cell) {
      var m = cell.className.match(/ef-9box-cell--(\w+)/);
      return m ? m[1] : 'fog';
    }

    function plural(n) {
      var mod10 = n % 10;
      var mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return 'человек';
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'человека';
      return 'человек';
    }

    function build() {
      overlay = document.createElement('div');
      overlay.className = 'mnbzoom';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML =
        '<div class="mnbzoom__backdrop" data-zoom-close></div>' +
        '<div class="mnbzoom__card">' +
          '<button type="button" class="mnbzoom__close" data-zoom-close aria-label="Закрыть">✕</button>' +
          '<div class="mnbzoom__avas"></div>' +
          '<h3 class="mnbzoom__title"></h3>' +
          '<p class="mnbzoom__count"></p>' +
          '<div class="mnbzoom__note"></div>' +
          '<p class="mnbzoom__hint">Нажмите Esc или кликните вне карточки, чтобы закрыть</p>' +
        '</div>';
      document.body.appendChild(overlay);

      $$('[data-zoom-close]', overlay).forEach(function (el) {
        el.addEventListener('click', close);
      });
    }

    function open(cell) {
      if (!overlay) build();
      lastFocus = document.activeElement;

      var tone = toneOf(cell);
      var titleEl = cell.querySelector('.ef-9box-meta strong');
      var countEl = cell.querySelector('.ef-9box-meta b');
      var whoEl = cell.querySelector('.ef-9box-note__who');
      var mEl = cell.querySelector('.ef-9box-note__m');
      var avas = cell.querySelectorAll('.ef-9box-avas img');
      var moreEl = cell.querySelector('.ef-9box-avas em');

      var card = overlay.querySelector('.mnbzoom__card');
      card.className = 'mnbzoom__card mnbzoom__card--' + tone;

      var avasBox = overlay.querySelector('.mnbzoom__avas');
      avasBox.innerHTML = '';
      avas.forEach(function (img) {
        var clone = img.cloneNode(true);
        clone.removeAttribute('width');
        clone.removeAttribute('height');
        avasBox.appendChild(clone);
      });
      if (moreEl) {
        var em = document.createElement('em');
        em.textContent = moreEl.textContent;
        avasBox.appendChild(em);
      }

      overlay.querySelector('.mnbzoom__title').textContent = titleEl ? titleEl.textContent : '';
      var n = countEl ? parseInt(countEl.textContent, 10) : 0;
      overlay.querySelector('.mnbzoom__count').textContent = n + ' ' + plural(n);

      var note = overlay.querySelector('.mnbzoom__note');
      if (whoEl && mEl) {
        note.style.display = '';
        note.innerHTML =
          '<span class="mnbzoom__note-who">' + whoEl.textContent + '</span>' +
          '<span class="mnbzoom__note-m">' + mEl.innerHTML + '</span>';
      } else {
        note.style.display = 'none';
      }

      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      var closeBtn = overlay.querySelector('.mnbzoom__close');
      if (closeBtn) closeBtn.focus();
      trackOnce('ninebox_zoom');
    }

    function close() {
      if (!overlay) return;
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    cells.forEach(function (cell) {
      cell.addEventListener('click', function () { open(cell); });
      cell.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(cell);
        }
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('is-open')) close();
    });
  }

  /* ---------------------------------------------------------------
     МАРШРУТ СОГЛАСОВАНИЯ ЦЕЛИ
     --------------------------------------------------------------- */
  function initRoute() {
    var root = $('[data-route]');
    if (!root) return;

    var out = $('[data-rt-out]', root);
    var live = $('.mrt__live', root);
    var status = $('[data-rt-status]', root);
    if (!out) return;

    var state = { type: 'ind', resp: 'self', mgr: 'yes' };

    var AVA = {
      maria: 'images/avatar-route-maria.jpg?v=20260804p',
      alexey: 'images/avatar-route-alexey.jpg?v=20260804p',
      dmitry: 'images/avatar-route-dmitry.jpg?v=20260804p',
      olga: 'images/avatar-route-olga.jpg?v=20260804p'
    };

    var AUTHOR = 'Мария К., аналитик';
    var AUTHOR_MGR = 'Алексей П., руководитель отдела';
    var RESP = 'Дмитрий В., продакт-аналитик';
    var RESP_MGR = 'Ольга Н., руководитель продукта';

    function node(role, name, opts) {
      opts = opts || {};
      var icon = opts.avatar
        ? '<img class="mrt__ava" src="' + opts.avatar + '" alt="" width="36" height="36" loading="lazy" decoding="async">'
        : '<span class="mrt__ico" aria-hidden="true">' + (opts.icon || '·') + '</span>';
      var cls = 'mrt__node' +
        (opts.key ? ' mrt__node--key' : '') +
        (opts.warn ? ' mrt__node--warn' : '');
      return '<div class="' + cls + '">' + icon +
        '<span><small>' + role + '</small><p>' + name + '</p></span></div>';
    }

    var ARROW = '<span class="mrt__arrow" aria-hidden="true">↓</span>';

    function flash() {
      out.classList.remove('is-rebuild');
      void out.offsetWidth;
      out.classList.add('is-rebuild');
    }

    function render() {
      var team = state.type === 'team';
      var other = state.resp === 'other';
      var flow = '';

      if (live) live.classList.toggle('is-warn', state.mgr === 'no');
      if (status) {
        status.textContent = state.mgr === 'no'
          ? 'маршрут не построен'
          : 'построен по оргструктуре';
      }

      if (state.mgr === 'no') {
        flow =
          node('Цель', team ? 'Командная цель отдела аналитики' : 'Индивидуальная цель', { icon: '◎' }) + ARROW +
          node('Ответственный', other ? RESP : AUTHOR, { avatar: other ? AVA.dmitry : AVA.maria }) + ARROW +
          node('Согласующий', 'не определён', { icon: '!', warn: true }) +
          '<div class="mrt__warn"><b>Маршрут не строится.</b> У сотрудника не указан линейный руководитель — платформа предупреждает об этом в карточке цели и предлагает обратиться в HR.</div>';
      } else {
        var approver, approverAva, rule;
        if (!team) {
          approver = other ? RESP_MGR : AUTHOR_MGR;
          approverAva = other ? AVA.olga : AVA.alexey;
          rule = other
            ? 'Индивидуальная цель уходит руководителю того, кто за неё отвечает, а не автору. Ответственный — Дмитрий, поэтому согласует <b>его руководитель</b>.'
            : 'Индивидуальная цель уходит линейному руководителю сотрудника из его профиля. Выбирать маршрут вручную не нужно.';
        } else {
          approver = other ? RESP_MGR : AUTHOR_MGR;
          approverAva = other ? AVA.olga : AVA.alexey;
          rule = other
            ? 'Командная цель с ответственным из другой команды: согласующим становится <b>руководитель ответственного</b>, а не владельца команды. При смене исполнителя маршрут пересобирается автоматически.'
            : 'Для командной цели согласующим становится руководитель владельца команды: маршрут отражает управленческую логику, а не только исполнение.';
        }

        var sender = other ? RESP : AUTHOR;

        flow =
          node('Цель', team ? 'Командная цель отдела аналитики' : 'Индивидуальная цель', { icon: '◎' }) + ARROW +
          node(team ? 'Владелец команды' : 'Владелец', AUTHOR, { avatar: AVA.maria }) + ARROW +
          node('Ответственный', other ? RESP : AUTHOR + ' — он же владелец', { avatar: other ? AVA.dmitry : AVA.maria }) + ARROW +
          node('Согласующий определён автоматически', approver, { avatar: approverAva, key: true }) +
          '<p class="mrt__send">Отправить на согласование может <b>' + sender + '</b>: если ответственный отличается от владельца, отправителем считается ответственный.</p>' +
          '<span class="mrt__cta">Отправить на согласование</span>' +
          '<div class="mrt__rule">' + rule + '</div>';
      }

      out.innerHTML = '<div class="mrt__flow">' + flow + '</div>';
      flash();
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
     ВЫБОР РОДИТЕЛЬСКОЙ ЦЕЛИ · ПРАВИЛА КАСКАДА
     --------------------------------------------------------------- */
  function initParentPick() {
    var root = $('[data-parent-pick]');
    if (!root) return;

    root.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-parent-opt]');
      if (!btn || !root.contains(btn)) return;

      root.querySelectorAll('[data-parent-opt]').forEach(function (opt) {
        var live = opt === btn;
        opt.classList.toggle('is-selected', live);
        opt.setAttribute('aria-pressed', live ? 'true' : 'false');
      });
    });
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
        '<img src="images/avatar-route-maria.jpg?v=20260804p" alt="Мария К.">' +
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
        '<div class="mgd__node"><img src="images/avatar-route-maria.jpg?v=20260804p" alt="Мария К."><span><small>Автор</small><p>Мария К., аналитик</p></span></div>' +
        '<div class="mgd__arrow" aria-hidden="true">↓</div>' +
        '<div class="mgd__node"><img src="images/avatar-route-maria.jpg?v=20260804p" alt="Мария К."><span><small>Ответственный</small><p>Мария К., аналитик</p></span></div>' +
        '<div class="mgd__arrow" aria-hidden="true">↓</div>' +
        '<div class="mgd__node is-key"><img src="images/avatar-route-alexey.jpg?v=20260804p" alt="Алексей П."><span><small>Согласующий · определён автоматически</small><p>Алексей П., руководитель отдела</p></span></div>' +
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
     КАРЬЕРНЫЙ ТРЕК · ОБЛОЖКА
     --------------------------------------------------------------- */
  function initCareerDemo() {
    var root = $('[data-career]');
    if (!root) return;

    var raw = $('[data-career-json]', root);
    var cfg;
    try { cfg = JSON.parse(raw ? raw.textContent : '{}'); } catch (e) { return; }
    if (!cfg || !cfg.stages || !cfg.stages.length) return;

    var rail = $('[data-career-rail]', root);
    var panel = $('[data-career-panel]', root);
    if (!rail || !panel) return;

    var readyOut = $('[data-career-ready]', root);
    var gapLabel = $('[data-career-gap-label]', root);
    var gapNum = $('[data-career-gap-num]', root);
    var gapBar = $('[data-career-gap-bar]', root);
    var barTitle = $('.mwin__title', root.closest('.mwin') || root);
    var token = $('[data-career-token]', root);
    var route = $('[data-career-route]', root);

    var routeLen = 0;
    if (route && route.getTotalLength) {
      try {
        routeLen = route.getTotalLength();
        route.style.strokeDasharray = String(routeLen);
        route.style.strokeDashoffset = String(routeLen);
      } catch (e) { routeLen = 0; }
    }

    var current = 1;
    var openStage = 1;
    var booted = false;

    function dots(current_, required) {
      var out = '<span class="mcareer__dots" aria-label="Уровень ' + current_ + ' из требуемых ' + required + '">';
      for (var i = 1; i <= 5; i++) {
        var cls = i <= current_ ? ' class="is-have"' : (i <= required ? ' class="is-need"' : '');
        out += '<i' + cls + '></i>';
      }
      return out + '</span>';
    }

    function gapView(stage) {
      var rows = '';
      (stage.rows || []).forEach(function (c) {
        var isGap = c.current < c.required;
        rows +=
          '<div class="mcareer__row' + (isGap ? ' mcareer__row--gap' : '') + '">' +
            '<span>' + c.name + '</span>' +
            dots(c.current, c.required) +
            '<span class="mcareer__state">' + (isGap ? 'нужно ' + c.required : 'закрыто') + '</span>' +
          '</div>';
      });
      return '<div class="mcareer__rows">' + rows + '</div>';
    }

    function iprView(stage) {
      var out = '';
      (stage.steps || []).forEach(function (s, i) {
        var open = i === openStage;
        var chips = '';
        (s.comps || []).forEach(function (c) { chips += '<span>' + c + '</span>'; });
        out +=
          '<div class="mcareer__stage' + (open ? ' is-open' : '') + '" data-state="' + s.state + '">' +
            '<button type="button" class="mcareer__head" data-career-stage="' + i + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
              '<span class="mcareer__n">' + (i + 1) + '</span>' +
              '<span class="mcareer__sname">' + s.title + '<span>' + s.months + '</span></span>' +
              '<span class="mcareer__badge">' + s.status + '</span>' +
            '</button>' +
            (open
              ? '<div class="mcareer__body">' +
                  '<p class="mcareer__srow"><b>KPI этапа:</b> ' + s.kpi + '</p>' +
                  '<p class="mcareer__srow"><b>Материалы:</b> ' + s.material + '</p>' +
                  '<p class="mcareer__srow"><b>Контроль:</b> ' + s.check + '</p>' +
                  '<span class="mcareer__chips">' + chips + '</span>' +
                  '<span class="mcareer__pbar"><i style="width:' + s.progress + '%"></i></span>' +
                '</div>'
              : '') +
          '</div>';
      });
      return '<div class="mcareer__ipr">' + out + '</div>';
    }

    function moveView(stage) {
      var out = '';
      (stage.timeline || []).forEach(function (t) {
        out += '<div class="mcareer__tlrow" data-state="' + t.state + '"><b>' + t.when + '</b><span>' + t.what + '</span></div>';
      });
      return '<div class="mcareer__tl">' + out + '</div>';
    }

    function paintRail() {
      $$('.mcareer__step', rail).forEach(function (btn, i) {
        var on = i === current;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
        btn.setAttribute('tabindex', on ? '0' : '-1');
      });
    }

    function paintSummary(stage) {
      if (readyOut) readyOut.textContent = stage.ready + '%';
      if (gapLabel) gapLabel.textContent = stage.gapLabel;
      if (gapNum) gapNum.textContent = stage.closed + ' / ' + stage.total;
      if (gapBar) gapBar.style.width = Math.round((stage.closed / stage.total) * 100) + '%';
      if (barTitle && stage.bar) barTitle.textContent = stage.bar;
    }

    function bindStages() {
      $$('[data-career-stage]', panel).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var i = parseInt(btn.getAttribute('data-career-stage'), 10);
          openStage = openStage === i ? -1 : i;
          track('career_ipr_stage', { stage: i + 1 });
          draw(false);
        });
      });
    }

    function draw(swap) {
      var stage = cfg.stages[current];
      var view = stage.id === 'gap' ? gapView(stage) : stage.id === 'ipr' ? iprView(stage) : moveView(stage);

      panel.innerHTML =
        '<p class="mcareer__ttl">' + stage.title + '</p>' + view +
        '<p class="mcareer__note">' + stage.note + '</p>';

      if (swap && !reduced) {
        panel.classList.remove('is-swap');
        void panel.offsetWidth;
        panel.classList.add('is-swap');
      }

      if (booted || swap) {
        if (token && stage.point) {
          token.style.left = stage.point.x + '%';
          token.style.top = stage.point.y + '%';
        }
        if (routeLen) {
          route.style.strokeDashoffset = String(routeLen * (1 - (stage.route || 0)));
        }
      }

      paintRail();
      paintSummary(stage);
      bindStages();
    }

    rail.innerHTML = '';
    cfg.stages.forEach(function (stage, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mcareer__step' + (stage.state === 'done' ? ' is-done' : stage.state === 'active' ? ' is-active' : '');
      btn.setAttribute('role', 'tab');
      if (stage.point) {
        btn.style.left = stage.point.x + '%';
        btn.style.top = stage.point.y + '%';
      }
      btn.innerHTML = '<i></i><span><b>' + stage.short + '</b><small>' + stage.sub + '</small></span>';
      btn.addEventListener('click', function () {
        current = i;
        openStage = stage.id === 'ipr' ? 1 : -1;
        track('career_stage', { stage: stage.short });
        draw(true);
      });
      rail.appendChild(btn);
    });

    draw(false);
    /* стартовое восхождение: после первого кадра аватар и маршрут
       плавно едут к активному этапу */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        booted = true;
        draw(false);
      });
    });
    root.addEventListener('click', function () { trackOnce('career_start'); }, { once: true });
  }

  /* ---------------------------------------------------------------
     КАРТА ВОЗМОЖНОСТЕЙ · клик по роли сравнивает сотрудника с позицией
     --------------------------------------------------------------- */
  function initCareerMap() {
    var root = $('[data-map]');
    if (!root) return;

    var raw = $('[data-map-json]', root);
    var cfg;
    try { cfg = JSON.parse(raw ? raw.textContent : '{}'); } catch (e) { return; }
    if (!cfg || !cfg.nodes) return;

    var panel = $('[data-map-panel]', root);
    var nodes = $$('[data-map-node]', root);
    var chips = $$('[data-map-filter]', root);
    if (!panel || !nodes.length) return;

    function dots(cur, req) {
      var out = '<span class="mcareer__dots" aria-label="Уровень ' + cur + ' из требуемых ' + req + '">';
      for (var i = 1; i <= 5; i++) {
        out += '<i' + (i <= cur ? ' class="is-have"' : (i <= req ? ' class="is-need"' : '')) + '></i>';
      }
      return out + '</span>';
    }

    function ring(pct, horizontal) {
      var c = 87.96;
      var off = (c * (1 - pct / 100)).toFixed(1);
      return '<span class="mmap__pring' + (horizontal ? ' mmap__pring--h' : '') + '">' +
        '<svg viewBox="0 0 34 34" aria-hidden="true">' +
          '<circle class="mmap__ring-bg" cx="17" cy="17" r="14"></circle>' +
          '<circle class="mmap__ring-val' + (horizontal ? ' mmap__ring-val--h' : '') + '" cx="17" cy="17" r="14" style="stroke-dasharray:' + c + ';stroke-dashoffset:' + off + '"></circle>' +
        '</svg><b>' + pct + '%</b></span>';
    }

    function render(id, swap) {
      var n = cfg.nodes[id];
      if (!n) return;

      var rows = '';
      (n.gaps || []).forEach(function (g) {
        rows += '<div class="mmap__pgap"><span>' + g.name + '</span>' + dots(g.current, g.required) + '<em>нужно ' + g.required + '</em></div>';
      });

      var horizontal = /горизонтальный|другая функция/.test(n.meta || '');
      panel.innerHTML =
        '<div class="mmap__phead">' +
          ring(n.match, horizontal) +
          '<span class="mmap__ptitle"><b>' + n.title + '</b><span>' + n.meta + '</span></span>' +
          '<span class="mmap__pmonths">' + n.months + '</span>' +
        '</div>' + rows +
        '<p class="mmap__pnote">' + n.note + '</p>';

      nodes.forEach(function (btn) {
        var on = btn.getAttribute('data-map-node') === id;
        btn.classList.toggle('is-sel', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      if (swap && !reduced) {
        panel.classList.remove('is-swap');
        void panel.offsetWidth;
        panel.classList.add('is-swap');
      }
    }

    nodes.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-map-node');
        track('career_map_node', { node: id });
        render(id, true);
      });
    });

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var f = chip.getAttribute('data-map-filter');
        chips.forEach(function (c) {
          var on = c === chip;
          c.classList.toggle('is-on', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        $$('[data-dept]', root).forEach(function (el) {
          el.classList.toggle('is-dim', f !== 'all' && el.getAttribute('data-dept') !== f);
        });
        track('career_map_filter', { filter: f });
      });
    });

    render(cfg.initial || nodes[0].getAttribute('data-map-node'), false);
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

    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
      });
    }

    function matchTier(pct) {
      if (pct >= 80) return 'hi';
      if (pct >= 70) return 'mid';
      return 'low';
    }

    function holderInfo() {
      if (cfg.holder && typeof cfg.holder === 'object') return cfg.holder;
      return { name: cfg.holder || '', meta: '', avatar: 'images/avatar-route-dmitry.jpg' };
    }

    function headerBento(covered) {
      var total = cfg.totalPositions;
      var pct = Math.round((covered / total) * 100);
      var holder = holderInfo();
      return '<div class="mscb__hero">' +
        '<article class="mscb__kpi">' +
          '<span class="mscb__kpi-num">' + pct + '%</span>' +
          '<span class="mscb__kpi-txt"><b>Покрытие ключевых позиций</b>' + covered + ' из ' + total + ' позиций с преемником</span>' +
        '</article>' +
        '<article class="mscb__role">' +
          '<div class="mscb__role-top"><span>Ключевая позиция</span><i>справочник · кадровый резерв</i></div>' +
          '<div class="mscb__role-main">' +
            '<img class="mscb__av" src="' + esc(holder.avatar) + '" alt="" width="40" height="40" loading="lazy" decoding="async">' +
            '<div><b>' + esc(cfg.position) + '</b><span>Держатель: ' + esc(holder.name) + (holder.meta ? ', ' + esc(holder.meta) : '') + '</span></div>' +
          '</div>' +
        '</article>' +
      '</div>';
    }

    function metricTiles(c) {
      var compPct = Math.round((c.comp.hit / c.comp.total) * 100);
      var compClass = compPct >= 83 ? 'is-ok' : (compPct >= 67 ? 'is-mid' : 'is-warn');
      var careerClass = c.careerOk ? 'is-ok' : 'is-warn';
      return '<div class="mscb__metrics">' +
        '<div class="mscb__metric ' + compClass + '">' +
          '<i>Компетенции</i><b>' + c.comp.hit + ' из ' + c.comp.total + '</b><span>Совпадение с моделью роли</span>' +
        '</div>' +
        '<div class="mscb__metric ' + careerClass + '">' +
          '<i>Карьерный трек</i><b>' + (c.careerOk ? 'Совпадает' : 'Частично') + '</b><span>' + esc(c.career) + '</span>' +
        '</div>' +
        '<div class="mscb__metric is-pr">' +
          '<i>Performance Review</i><b>' + esc(c.pr.score) + ' · ' + esc(c.pr.grade) + '</b>' +
          '<button type="button" class="mscb__pr-btn" data-pr-toggle>Посмотреть</button>' +
          '<div class="mscb__pr-quote" hidden><q>' + esc(c.pr.review) + '</q><cite>— ' + esc(c.pr.manager) + '</cite></div>' +
        '</div>' +
      '</div>';
    }

    function gapTags(gaps) {
      if (!gaps || !gaps.length) return '';
      var tags = '';
      gaps.forEach(function (t) { tags += '<span class="is-gap">' + esc(t) + '</span>'; });
      return '<div class="mscb__gaps"><i>Зоны развития</i><span>' + tags + '</span></div>';
    }

    function candidateCard(c, i) {
      var tier = matchTier(c.match);
      return '<article class="mscb__card' + (i === 0 ? ' mscb__card--lead' : '') + '">' +
        '<div class="mscb__head">' +
          '<img class="mscb__av" src="' + esc(c.avatar) + '" alt="" width="36" height="36" loading="lazy" decoding="async">' +
          '<div class="mscb__who"><b>' + esc(c.name) + '</b><span>' + esc(c.role) + '</span></div>' +
          '<span class="mscb__match mscb__match--' + tier + '">' + c.match + '%</span>' +
        '</div>' +
        metricTiles(c) +
        gapTags(c.gaps) +
        '<button type="button" class="mscb__nom" data-nom="' + i + '">Номинировать</button>' +
      '</article>';
    }

    function bindPrToggles() {
      $$('[data-pr-toggle]', stage).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var quote = btn.nextElementSibling;
          if (!quote) return;
          var open = quote.hasAttribute('hidden');
          $$('.mscb__pr-quote', stage).forEach(function (q) { q.setAttribute('hidden', ''); });
          $$('[data-pr-toggle]', stage).forEach(function (b) { b.classList.remove('is-on'); });
          if (open) {
            quote.removeAttribute('hidden');
            btn.classList.add('is-on');
            btn.textContent = 'Скрыть';
          } else {
            btn.textContent = 'Посмотреть';
          }
        });
      });
    }

    function renderStart() {
      stage.innerHTML =
        headerBento(cfg.covered) +
        '<button type="button" class="mscb__go" data-succ-go>Подобрать резервистов с ИИ</button>' +
        '<p class="mscb__note">ИИ сравнивает кандидатов из поддерева подразделения с требованиями роли: компетенции должности, 360°, Performance Review, Self Review и карьерный трек.</p>';
      $('[data-succ-go]', stage).addEventListener('click', function () {
        track('succ_ai');
        renderList();
      });
    }

    function renderList() {
      var cards = '';
      cfg.candidates.forEach(function (c, i) { cards += candidateCard(c, i); });

      stage.innerHTML =
        headerBento(cfg.covered) +
        '<p class="mscb__lead"><b>ИИ предложил ' + cfg.candidates.length + ' кандидатов</b> из поддерева подразделения</p>' +
        '<div class="mscb__grid">' + cards + '</div>' +
        '<button type="button" class="mscb__back" data-succ-restart>Начать заново</button>';

      $$('[data-nom]', stage).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var c = cfg.candidates[parseInt(btn.getAttribute('data-nom'), 10)];
          track('succ_nominate', { name: c.name });
          renderDone(c);
        });
      });
      bindPrToggles();
      $('[data-succ-restart]', stage).addEventListener('click', renderStart);
    }

    function renderDone(c) {
      stage.innerHTML =
        headerBento(cfg.covered + 1) +
        '<div class="mscb__done">' +
          '<img class="mscb__av" src="' + esc(c.avatar) + '" alt="" width="40" height="40" loading="lazy" decoding="async">' +
          '<div><b>Номинация сохранена: ' + esc(c.name) + '</b><span>Позиция перестала быть непокрытой, KPI цикла пересчитан автоматически.</span></div>' +
        '</div>' +
        '<div class="mscb__meta">' +
          '<div><i>Готовность</i><b>' + esc(c.readiness) + '</b></div>' +
          '<div><i>Gap</i><b>' + esc(c.gap) + '</b></div>' +
          '<div><i>Тип связи</i><b>' + esc(c.link) + '</b></div>' +
        '</div>' +
        '<p class="mscb__note"><b>Дальше по процессу.</b> На эту же позицию можно назначить ещё преемников со своей готовностью и gap, а HR может скрыть чувствительную номинацию от нижестоящих руководителей. Разрыв компетенций уходит в план развития резервиста.</p>' +
        '<button type="button" class="mscb__back" data-succ-restart>Подобрать другого кандидата</button>';
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

  function initPrDeck(deck) {
    if (!deck) return;

    var active = 'team';
    var touchStartX = 0;
    var touchStartY = 0;

    function setActive(which) {
      if (which !== 'team' && which !== 'phases') return;
      active = which;
      deck.setAttribute('data-active', which);
      deck.classList.add('is-touched');
      $$('.prdeck__tab', deck).forEach(function (tab) {
        var on = tab.getAttribute('data-pr-flip') === which;
        tab.classList.toggle('is-on', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      $$('.prdeck__sheet', deck).forEach(function (sheet) {
        sheet.classList.toggle('is-front', sheet.getAttribute('data-pr-sheet') === which);
      });
      track('pr_deck_flip', { screen: which });
    }

    deck.addEventListener('click', function (e) {
      var flip = e.target.closest('[data-pr-flip]');
      if (flip && deck.contains(flip)) {
        setActive(flip.getAttribute('data-pr-flip'));
        return;
      }
      var sheet = e.target.closest('.prdeck__sheet');
      if (sheet && deck.contains(sheet) && !sheet.classList.contains('is-front')) {
        setActive(sheet.getAttribute('data-pr-sheet'));
      }
    });

    deck.addEventListener('touchstart', function (e) {
      if (!e.touches || e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    deck.addEventListener('touchend', function (e) {
      if (!e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (dx < 0 && active === 'team') setActive('phases');
      else if (dx > 0 && active === 'phases') setActive('team');
    }, { passive: true });
  }

  /* ---------------------------------------------------------------
     HERO PERFORMANCE REVIEW — РЕЗУЛЬТАТ КОМАНДЫ
     --------------------------------------------------------------- */
  function initPrHero() {
    var root = $('[data-pr-hero]');
    if (!root) return;

    var raw = $('[data-pr-hero-json]', root);
    var cfg;
    try { cfg = JSON.parse(raw ? raw.textContent : '{}'); } catch (e) { return; }
    if (!cfg.employees || !cfg.employees.length) return;

    var empIdx = 0;
    var compId = null;
    var detailOpen = false;
    var swapTimer;

    var mockWrap = root.closest('.mreel__mock--prstack');
    var phasesEl = mockWrap ? $('[data-pr-phases]', mockWrap) : null;

    function phaseStatusLabel(status) {
      if (status === 'done') return 'завершён';
      if (status === 'active') return 'сейчас';
      return 'ожидает';
    }

    function drawPhases() {
      if (!phasesEl || !cfg.phases || !cfg.phases.length) return;
      var steps = cfg.phases.map(function (p) {
        return '<li class="mprstack__step is-' + p.status + '">' +
          '<i class="mprstack__dot" aria-hidden="true"></i>' +
          '<div><b>' + esc(p.name) + '</b><span>' + esc(p.dates) + '</span></div>' +
          '<em>' + phaseStatusLabel(p.status) + '</em>' +
          '</li>';
      }).join('');
      phasesEl.innerHTML = '<p class="mprstack__k">Этапы цикла</p><ol class="mprstack__list mprstack__list--fill">' + steps + '</ol>';
    }

    function esc(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function maxGradeCount() {
      var m = 0;
      cfg.grades.forEach(function (g) { if (g.count > m) m = g.count; });
      return m || 1;
    }

    function compValue(emp, id) {
      var c = emp[id];
      return c ? c.value : '—';
    }

    function radarPoint(cx, cy, radius, index, total, value) {
      var angle = (-Math.PI / 2) + ((2 * Math.PI * index) / total);
      var r = radius * (value / 5);
      return (cx + r * Math.cos(angle)).toFixed(1) + ',' + (cy + r * Math.sin(angle)).toFixed(1);
    }

    function radarRing(cx, cy, radius, total, level) {
      var pts = [];
      for (var i = 0; i < total; i++) {
        pts.push(radarPoint(cx, cy, radius * level, i, total, 5));
      }
      return pts.join(' ');
    }

    function radarLabelPos(cx, cy, radius, index, total) {
      var angle = (-Math.PI / 2) + ((2 * Math.PI * index) / total);
      var r = radius + 10;
      return {
        x: (cx + r * Math.cos(angle)).toFixed(1),
        y: (cy + r * Math.sin(angle) + 3).toFixed(1),
        anchor: Math.abs(Math.cos(angle)) < 0.2 ? 'middle' : (Math.cos(angle) > 0 ? 'start' : 'end')
      };
    }

    function fmtScore(v) {
      return String(v).replace('.', ',');
    }

    function radar360Delta(team, bench) {
      var d = Math.round((team - bench) * 10) / 10;
      if (d > 0) return { text: '+' + fmtScore(d), cls: 'is-up' };
      if (d < 0) return { text: fmtScore(d), cls: 'is-down' };
      return { text: '0', cls: 'is-flat' };
    }

    function radar360SvgMarkup() {
      var t = cfg.team360;
      if (!t || !t.competencies || !t.competencies.length) return '';
      var n = t.competencies.length;
      var cx = 60;
      var cy = 60;
      var R = 42;
      var teamPts = [];
      var benchPts = [];
      var labels = '';
      t.competencies.forEach(function (c, i) {
        teamPts.push(radarPoint(cx, cy, R, i, n, c.team));
        benchPts.push(radarPoint(cx, cy, R, i, n, c.bench));
        var lp = radarLabelPos(cx, cy, R, i, n);
        labels += '<text x="' + lp.x + '" y="' + lp.y + '" text-anchor="' + lp.anchor + '">' + esc(c.label) + '</text>';
      });
      return '<svg viewBox="-8 -8 136 136" role="img" aria-label="Многогранник компетенций команды">' +
        '<polygon class="grid-line" points="' + radarRing(cx, cy, R, n, 1) + '"></polygon>' +
        '<polygon class="grid-line" points="' + radarRing(cx, cy, R, n, 0.66) + '"></polygon>' +
        '<polygon class="grid-line" points="' + radarRing(cx, cy, R, n, 0.33) + '"></polygon>' +
        '<g class="grid-line">' +
          t.competencies.map(function (_, i) {
            var pt = radarPoint(cx, cy, R, i, n, 5).split(',');
            return '<line x1="' + cx + '" y1="' + cy + '" x2="' + pt[0] + '" y2="' + pt[1] + '"></line>';
          }).join('') +
        '</g>' +
        '<polygon class="poly-bench" points="' + benchPts.join(' ') + '"></polygon>' +
        '<polygon class="poly-team" points="' + teamPts.join(' ') + '"></polygon>' +
        labels +
      '</svg>';
    }

    function radar360KeysHtml(className) {
      return '<div class="' + (className || 'mprhero__radar-keys') + '">' +
        '<span><i style="background:#4a3bff"></i>Команда</span>' +
        '<span><i style="background:#c4c0dc"></i>Бенчмарк</span>' +
      '</div>';
    }

    function radar360TableHtml() {
      var t = cfg.team360;
      if (!t || !t.competencies || !t.competencies.length) return '';
      return '<div class="mprzoom__table">' +
        '<div class="mprzoom__tr mprzoom__tr--h">' +
          '<span>Компетенция</span><b>Команда</b><b>Бенчмарк</b><b>Δ</b>' +
        '</div>' +
        t.competencies.map(function (c) {
          var d = radar360Delta(c.team, c.bench);
          return '<div class="mprzoom__tr">' +
            '<span>' + esc(c.label) + '</span>' +
            '<b>' + fmtScore(c.team) + '</b>' +
            '<b>' + fmtScore(c.bench) + '</b>' +
            '<b class="mprzoom__delta ' + d.cls + '">' + d.text + '</b>' +
          '</div>';
        }).join('') +
      '</div>';
    }

    function insight360Html() {
      var t = cfg.team360;
      if (!t || !t.competencies || !t.competencies.length) return '';
      var ai = (t.ai || []).map(function (block) {
        return '<div class="mprhero__ai-block">' +
          '<span class="mprhero__ai-tag mprhero__ai-tag--' + block.type + '">' + esc(block.tag) + '</span>' +
          '<p>' + esc(block.text) + '</p></div>';
      }).join('');
      return '<div class="mprhero__radar-col">' +
          '<p class="msub">Многогранник по команде</p>' +
          '<button type="button" class="mprhero__radar-btn" data-pr-radar-open aria-label="Раскрыть многогранник по команде">' +
            '<span class="mprhero__radar-zoom-hint" aria-hidden="true">' +
              '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>' +
              'Раскрыть' +
            '</span>' +
            '<div class="mprhero__radar m360hero__radar">' +
              radar360SvgMarkup() +
              radar360KeysHtml() +
            '</div>' +
          '</button>' +
        '</div>' +
        '<div class="mprhero__ai-col">' +
          '<p class="mprhero__ai-h"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.1 6.4L21 10l-6.9 1.6L12 18l-2.1-6.4L3 10l6.9-1.6L12 2z"/></svg> AI-разбор 360°</p>' +
          '<div class="mprhero__ai-blocks">' + ai + '</div>' +
        '</div>';
    }

    var radarZoomOverlay = null;
    var radarZoomLastFocus = null;

    function buildRadarZoom() {
      radarZoomOverlay = document.createElement('div');
      radarZoomOverlay.className = 'mprzoom';
      radarZoomOverlay.setAttribute('role', 'dialog');
      radarZoomOverlay.setAttribute('aria-modal', 'true');
      radarZoomOverlay.setAttribute('aria-label', 'Многогранник компетенций команды');
      radarZoomOverlay.innerHTML =
        '<div class="mprzoom__backdrop" data-radar-close></div>' +
        '<div class="mprzoom__card">' +
          '<button type="button" class="mprzoom__close" data-radar-close aria-label="Закрыть">✕</button>' +
          '<p class="mprzoom__k">Многогранник по команде · H1 2026</p>' +
          '<div class="mprzoom__radar m360hero__radar"></div>' +
          '<div class="mprzoom__table-wrap"></div>' +
          '<p class="mprzoom__hint">Нажмите Esc или кликните вне карточки, чтобы закрыть</p>' +
        '</div>';
      document.body.appendChild(radarZoomOverlay);

      $$('[data-radar-close]', radarZoomOverlay).forEach(function (el) {
        el.addEventListener('click', closeRadarZoom);
      });
    }

    function openRadarZoom() {
      if (!cfg.team360) return;
      if (!radarZoomOverlay) buildRadarZoom();
      radarZoomLastFocus = document.activeElement;
      var radar = $('.mprzoom__radar', radarZoomOverlay);
      var table = $('.mprzoom__table-wrap', radarZoomOverlay);
      if (radar) {
        radar.innerHTML = radar360SvgMarkup() + radar360KeysHtml('mprzoom__radar-keys');
      }
      if (table) table.innerHTML = radar360TableHtml();
      radarZoomOverlay.classList.add('is-open');
      var closeBtn = $('.mprzoom__close', radarZoomOverlay);
      if (closeBtn) closeBtn.focus();
      track('pr_hero_radar_zoom');
    }

    function closeRadarZoom() {
      if (!radarZoomOverlay) return;
      radarZoomOverlay.classList.remove('is-open');
      if (radarZoomLastFocus && radarZoomLastFocus.focus) radarZoomLastFocus.focus();
    }

    function bindRadarZoom(scope) {
      var btn = scope ? $('[data-pr-radar-open]', scope) : null;
      if (!btn) return;
      btn.addEventListener('click', openRadarZoom);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && radarZoomOverlay && radarZoomOverlay.classList.contains('is-open')) {
        closeRadarZoom();
      }
    });

    function managerQuoteHtml() {
      return '<img src="' + esc(cfg.manager.avatar) + '" alt="" width="32" height="32">' +
        '<b>' + esc(cfg.manager.name) + ' · ' + esc(cfg.manager.role) + '</b>' +
        '<p>«' + esc(cfg.manager.quote) + '»</p>';
    }

    function drawInsight() {
      var el = $('.mprhero__insight', root);
      if (!el) return;

      if (detailOpen && compId === 'self') {
        el.hidden = false;
        el.className = 'mprhero__insight mprhero__insight--self is-in';
        el.innerHTML = insightSelfHtml(empIdx);
        bindSelfInsight(el);
        return;
      }

      if (detailOpen) {
        el.hidden = true;
        el.className = 'mprhero__insight is-empty';
        el.innerHTML = '';
        return;
      }

      el.hidden = false;
      el.className = 'mprhero__insight mprhero__insight--mgr';
      el.innerHTML = managerQuoteHtml();
    }

    function selfAiSummaryHtml() {
      var t = cfg.teamSelf;
      if (!t || !t.ai || !t.ai.length) {
        return '<p class="msub">Нет сводки по Self Review.</p>';
      }
      var ai = t.ai.map(function (block) {
        return '<div class="mprhero__ai-block">' +
          '<span class="mprhero__ai-tag mprhero__ai-tag--' + block.type + '">' + esc(block.tag) + '</span>' +
          '<p>' + esc(block.text) + '</p></div>';
      }).join('');
      var meta = (t.filled != null && t.total != null)
        ? '<span class="mprhero__self-meta">Проанализировано ' + t.filled + ' из ' + t.total + ' анкет · H1 2026</span>'
        : '';
      return '<div class="mprhero__self-ai">' +
        '<p class="mprhero__ai-h"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.1 6.4L21 10l-6.9 1.6L12 18l-2.1-6.4L3 10l6.9-1.6L12 2z"/></svg> AI-сводка по Self Review</p>' +
        meta +
        '<div class="mprhero__ai-blocks">' + ai + '</div>' +
        '</div>';
    }

    function insightSelfHtml(activeIdx) {
      var e = cfg.employees[activeIdx];
      if (!e || !e.self) return '';
      var pick = cfg.employees.map(function (emp, i) {
        return '<button type="button" class="mprhero__self-pick' + (i === activeIdx ? ' is-on' : '') + '" data-sr-idx="' + i + '" role="tab" aria-selected="' + (i === activeIdx ? 'true' : 'false') + '">' +
          '<img src="' + esc(emp.avatar) + '" alt="" width="20" height="20"><span>' + esc(emp.name) + '</span></button>';
      }).join('');
      var answers = (e.self.answers || []).map(function (a) {
        return '<div class="mprhero__self-qa"><b>' + esc(a.q) + '</b><p>' + esc(a.a) + '</p></div>';
      }).join('');
      return '<p class="msub">Анкета Self Review · H1 2026</p>' +
        '<div class="mprhero__self-picks" role="tablist" aria-label="Сотрудники">' + pick + '</div>' +
        '<div class="mprhero__self-card">' +
          '<div class="mprhero__self-head">' +
            '<img src="' + esc(e.avatar) + '" alt="" width="28" height="28">' +
            '<div><b>' + esc(e.name) + '</b><span>' + esc(e.role) + ' · ' + esc(e.self.value) + '</span></div>' +
          '</div>' +
          '<div class="mprhero__self-body">' + answers + '</div>' +
        '</div>';
    }

    function bindSelfInsight(el) {
      $$('[data-sr-idx]', el).forEach(function (btn) {
        btn.addEventListener('click', function () {
          empIdx = parseInt(btn.getAttribute('data-sr-idx'), 10);
          drawEmps();
          drawFocus();
          drawComps();
          drawDetail();
          drawInsight();
        });
      });
    }

    function kpiPct(val) {
      var m = String(val || '').match(/(\d+)/);
      return m ? Math.min(100, parseInt(m[1], 10)) : 0;
    }

    function kpiTeamHtml(activeIdx) {
      return '<div class="mprhero__kpiteam">' + cfg.employees.map(function (e, i) {
        var k = e.kpi;
        if (!k) return '';
        var pct = k.progress != null ? k.progress : kpiPct(k.value);
        var metrics = (k.items || []).map(function (it) {
          return '<span>' + esc(it.metric) + ' · <b>' + esc(it.fact) + '</b> / ' + esc(it.plan) + '</span>';
        }).join('');
        return '<div class="mprhero__kpirow' + (i === activeIdx ? ' is-on' : '') + '">' +
          '<img src="' + esc(e.avatar) + '" alt="" width="24" height="24">' +
          '<div class="mprhero__kpiwho"><b>' + esc(e.name) + '</b><span>' + esc(e.role) + '</span></div>' +
          '<b class="mprhero__kpival">' + esc(k.value) + '</b>' +
          '<div class="mprhero__prog"><i style="width:' + pct + '%"></i></div>' +
          (metrics ? '<div class="mprhero__kpimetrics">' + metrics + '</div>' : '') +
          '</div>';
      }).join('') + '</div>';
    }

    function detailHtml(emp, id) {
      if (id === 'kpi') {
        return kpiTeamHtml(empIdx);
      }

      if (id === 'self') {
        return selfAiSummaryHtml();
      }

      var c = emp[id];
      if (!c) return '<p class="msub">Нет данных по компоненту.</p>';

      if (id === 'okr' && c.items) {
        return c.items.map(function (it) {
          return '<div class="mprhero__item">' +
            '<div>' + esc(it.title) + '</div>' +
            '<b>' + it.progress + '%</b>' +
            '<div class="mprhero__prog"><i style="width:' + it.progress + '%"></i></div>' +
            (it.note ? '<span>' + esc(it.note) + '</span>' : '') +
            '</div>';
        }).join('');
      }

      if (id === '360' && c.items) {
        var rows = c.items.map(function (it) {
          return '<div class="mprhero__item"><div>' + esc(it.group) + '</div><b>' + esc(it.score) + '</b></div>';
        }).join('');
        var team = cfg.team360
          ? '<div class="mprhero__360team mprhero__insight--360 is-in">' + insight360Html() + '</div>'
          : '';
        return '<div class="mprhero__360rows">' + rows + '</div>' + team;
      }

      return '';
    }

    function drawBars() {
      var max = maxGradeCount();
      var bars = $('.mprhero__bars', root);
      if (!bars) return;
      bars.innerHTML = cfg.grades.map(function (g) {
        var pct = Math.round((g.count / max) * 100);
        return '<div class="mprhero__bar"><span>' + g.code + '</span><i><em data-bar style="background:' + g.color + '" data-w="' + pct + '"></em></i><b>' + g.count + '</b></div>';
      }).join('');
      requestAnimationFrame(function () {
        $$('[data-bar]', bars).forEach(function (el) {
          el.style.width = el.getAttribute('data-w') + '%';
        });
      });
    }

    function drawFocus() {
      var emp = cfg.employees[empIdx];
      var focus = $('.mprhero__focus', root);
      if (!focus || !emp) return;
      focus.classList.add('is-swap');
      clearTimeout(swapTimer);
      swapTimer = setTimeout(function () {
        focus.innerHTML =
          '<img src="' + esc(emp.avatar) + '" alt="" width="36" height="36">' +
          '<span class="mprhero__score">' + emp.score + '</span>' +
          '<span class="mprhero__who"><b>' + esc(emp.name) + ' · ' + esc(emp.gradeLabel) + '</b><span>взвешенный результат · грейд ' + esc(emp.grade) + '</span></span>' +
          '<span class="mprhero__badge">' + esc(emp.promo) + '</span>';
        focus.classList.remove('is-swap');
      }, 120);
    }

    function drawComps() {
      var emp = cfg.employees[empIdx];
      $$('.mprhero__comp', root).forEach(function (btn) {
        var id = btn.getAttribute('data-comp');
        var val = compValue(emp, id);
        var valEl = $('.mprhero__comp-val', btn);
        if (valEl) valEl.textContent = val;
        var on = id === compId;
        btn.classList.toggle('is-on', on);
        btn.classList.toggle('is-self', id === 'self');
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    function syncHeroState() {
      var hero = $('.mprhero', root);
      if (!hero) return;
      hero.classList.toggle('is-expanded', detailOpen);
      if (detailOpen && compId) hero.setAttribute('data-comp', compId);
      else hero.removeAttribute('data-comp');
    }

    function drawDetail() {
      var emp = cfg.employees[empIdx];
      var detail = $('.mprhero__detail', root);
      var panel = $('.mprhero__panel', root);
      if (!detail || !panel || !emp) return;
      if (!detailOpen || !compId) {
        detail.classList.remove('is-open');
        panel.innerHTML = '';
        panel.className = 'mprhero__panel';
        syncHeroState();
        return;
      }
      var panelMod = '';
      if (compId === 'kpi') panelMod = ' mprhero__panel--kpi';
      else if (compId === 'self') panelMod = ' mprhero__panel--self';
      else if (compId === '360') panelMod = ' mprhero__panel--360';
      else if (compId === 'okr') panelMod = ' mprhero__panel--okr';
      panel.className = 'mprhero__panel' + panelMod;
      panel.innerHTML = detailHtml(emp, compId);
      detail.classList.add('is-open');
      syncHeroState();
      if (compId === 'okr') {
        requestAnimationFrame(function () {
          $$('.mprhero__prog i', panel).forEach(function (bar) {
            var w = bar.style.width;
            bar.style.width = '0';
            requestAnimationFrame(function () { bar.style.width = w; });
          });
        });
      }
      if (compId === '360') bindRadarZoom(panel);
    }

    function drawEmps() {
      $$('.mprhero__emp', root).forEach(function (btn, i) {
        btn.classList.toggle('is-on', i === empIdx);
        btn.setAttribute('aria-selected', i === empIdx ? 'true' : 'false');
      });
    }

    function render() {
      drawEmps();
      drawFocus();
      drawComps();
      drawDetail();
      drawInsight();
    }

    var stackImgs = cfg.employees.slice(0, 5).map(function (e) {
      return '<img src="' + esc(e.avatar) + '" alt="" width="24" height="24">';
    }).join('');

    root.innerHTML =
      '<div class="mprhero">' +
        '<p class="mprhero__crumb">' + esc(cfg.unit) + '</p>' +
        '<div class="mprhero__head">' +
          '<div class="mprhero__team"><h4>' + esc(cfg.team) + '</h4><span class="mprhero__meta">' + cfg.employees.length + ' сотрудников · ' + esc(cfg.cycle) + '</span></div>' +
          '<div class="mprhero__stack" aria-hidden="true">' + stackImgs + '<span>команда</span></div>' +
        '</div>' +
        '<div class="mprhero__emps" role="tablist" aria-label="Сотрудники команды"></div>' +
        '<div class="mprhero__grid">' +
          '<div class="mprhero__dist"><p class="msub">Распределение оценок</p><div class="mprhero__bars"></div></div>' +
          '<div class="mprhero__focus"></div>' +
        '</div>' +
        '<div class="mprhero__comps">' +
          '<p class="msub">Компоненты результата · нажмите, чтобы раскрыть</p>' +
          '<div class="mprhero__rowline" role="tablist" aria-label="Компоненты оценки"></div>' +
          '<p class="mprhero__hint">Детали появятся ниже после выбора компонента</p>' +
        '</div>' +
        '<div class="mprhero__detail"><div class="mprhero__panel"></div></div>' +
        '<div class="mprhero__insight" data-pr-insight></div>' +
      '</div>';

    if (raw) root.appendChild(raw);

    var empsEl = $('.mprhero__emps', root);
    cfg.employees.forEach(function (e, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mprhero__emp';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.innerHTML = '<img src="' + esc(e.avatar) + '" alt="" width="22" height="22"><span>' + esc(e.name) + '</span>';
      b.addEventListener('click', function () {
        empIdx = i;
        track('pr_hero_employee', { employee: e.id });
        render();
      });
      empsEl.appendChild(b);
    });

    var rowline = $('.mprhero__rowline', root);
    cfg.components.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mprhero__comp' + (c.id === 'self' ? ' is-self' : '') + (c.id === compId ? ' is-on' : '');
      b.setAttribute('data-comp', c.id);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', c.id === compId ? 'true' : 'false');
      b.innerHTML = '<b>' + esc(c.label) + '</b><i class="mprhero__comp-val">—</i>' +
        (c.weight ? '<em>вес ' + c.weight + '</em>' : '<em>контекст</em>');
      b.addEventListener('click', function () {
        if (compId === c.id && detailOpen) {
          detailOpen = false;
          compId = null;
        } else {
          compId = c.id;
          detailOpen = true;
        }
        track('pr_hero_component', { component: c.id });
        drawComps();
        drawDetail();
        drawInsight();
        var hint = $('.mprhero__hint', root);
        if (hint) hint.style.display = detailOpen ? 'none' : '';
      });
      rowline.appendChild(b);
    });

    drawPhases();
    drawBars();
    render();

    var deck = mockWrap ? $('[data-pr-deck]', mockWrap) : null;
    initPrDeck(deck);
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
    if (!cfg || !cfg.teams || !cfg.teams.length) return;

    var teamsEl = $('.mwt__teams', root);
    var rows = $('.mwt__rows', root);
    var out = $('.mwt__out', root);
    var hint = $('.mwt__hint', root);
    var titleEl = $('[data-weights-title]');
    if (!teamsEl || !rows || !out) return;

    var activeTeam = 0;
    var resultInputs = [];

    function grade(score) {
      for (var i = 0; i < cfg.scale.length; i++) {
        if (score >= cfg.scale[i].from) return cfg.scale[i];
      }
      return cfg.scale[cfg.scale.length - 1];
    }

    function formatFact(c, value) {
      if (c.kind === '360') {
        var score = Math.round(value / 20 * 10) / 10;
        return score.toFixed(1).replace('.', ',') + ' из 5 — это ' + value + '%';
      }
      if (c.kind === 'kpi') return value + '% плана';
      return value + '% выполнения';
    }

    function draw() {
      var team = cfg.teams[activeTeam];
      var score = 0;

      team.components.forEach(function (c, i) {
        var result = parseInt(resultInputs[i].value, 10);
        score += result * c.weight / 100;
        var factLabel = $('[data-fact-label="' + i + '"]', rows);
        if (factLabel) factLabel.textContent = formatFact(c, result);
      });

      score = Math.round(score);
      var g = grade(score);
      out.innerHTML =
        '<span class="mwt__score">' + score + '</span>' +
        '<span class="mwt__grade"><b>' + g.title + '</b><span>' + g.note + '</span></span>' +
        '<span class="mwt__badge">' + g.code + '</span>';
      if (hint) hint.innerHTML = '<b>Решение руководителя:</b> ' + g.decision;
    }

    function renderTeam(index) {
      activeTeam = index;
      var team = cfg.teams[index];
      resultInputs = [];
      rows.innerHTML = '';

      if (titleEl) titleEl.textContent = 'Модель оценки · ' + team.label.toLowerCase();

      teamsEl.querySelectorAll('[data-team]').forEach(function (btn, i) {
        btn.classList.toggle('is-on', i === index);
        btn.setAttribute('aria-pressed', i === index ? 'true' : 'false');
      });

      team.components.forEach(function (c, i) {
        var row = document.createElement('div');
        row.className = 'mwt__row';
        row.innerHTML =
          '<span class="mwt__top"><b>' + c.name + '</b><span class="mwt__weight mwt__weight--' + c.kind + '">вес ' + c.weight + '%</span></span>' +
          '<label class="mwt__ctrl mwt__ctrl--fact">' +
            '<span>Факт</span>' +
            '<input class="mwt__range mwt__range--fact" type="range" min="' + c.min + '" max="' + c.max + '" step="1" value="' + c.result + '" aria-label="Факт компонента «' + c.name + '»">' +
            '<span class="mwt__factval" data-fact-label="' + i + '">' + formatFact(c, c.result) + '</span>' +
          '</label>';
        rows.appendChild(row);

        var resultInp = row.querySelector('.mwt__range--fact');
        resultInputs.push(resultInp);
        resultInp.addEventListener('input', draw);
        resultInp.addEventListener('change', function () {
          track('weights_change', { team: team.id, component: c.name, type: 'fact' });
        });
      });

      draw();
    }

    teamsEl.innerHTML = '';
    cfg.teams.forEach(function (team, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mwt__team';
      btn.setAttribute('data-team', team.id);
      btn.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      btn.textContent = team.label;
      btn.addEventListener('click', function () { renderTeam(i); });
      teamsEl.appendChild(btn);
    });

    renderTeam(0);
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

  function init360Hero() {
    var root = $('[data-360hero]');
    if (!root) return;

    var seg = $('.m360seg', root);
    var btns = $$('.m360seg__btn', root);
    var panels = $$('[data-360panel]', root);
    var title = $('[data-360title]', root);
    var pdf = $('[data-360pdf]', root);
    var hint = $('[data-360hint]', root);
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var current = 'person';
    var busy = false;
    var hintDone = false;

    function dismissHint() {
      if (hintDone || !hint) return;
      hintDone = true;
      hint.classList.add('is-done');
      if (seg) seg.classList.remove('is-tease');
    }

    function teaseSeg() {
      if (!seg || reduced || hintDone || seg.getAttribute('data-active') !== 'person') return;
      seg.classList.add('is-tease');
      window.setTimeout(function () { seg.classList.remove('is-tease'); }, 3800);
    }

    function showPanel(view) {
      if (view === current || busy) return;
      dismissHint();
      var from = panels.filter(function (p) { return p.getAttribute('data-360panel') === current; })[0];
      var to = panels.filter(function (p) { return p.getAttribute('data-360panel') === view; })[0];
      if (!from || !to) return;
      busy = true;
      current = view;

      btns.forEach(function (b) {
        var on = b.getAttribute('data-360view') === view;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (seg) seg.setAttribute('data-active', view);
      if (hint && !hintDone) {
        hint.textContent = view === 'person'
          ? 'Переключите на «Команда» — откроется командная аналитика'
          : 'Вернитесь на «Сотрудник» — личная карточка сотрудника';
      }
      if (title) {
        var t = title.getAttribute('data-title-' + view);
        if (t) title.textContent = t;
      }
      if (pdf) pdf.hidden = view === 'team';

      if (reduced) {
        from.hidden = true; from.classList.remove('is-active');
        to.hidden = false; to.classList.add('is-active');
        busy = false;
        return;
      }

      from.classList.remove('is-active');
      window.setTimeout(function () {
        from.hidden = true;
        to.hidden = false;
        // форс-рефлоу вместо rAF: transition входа отрабатывает даже во вкладке без фокуса
        void to.offsetWidth;
        to.classList.add('is-active');
        busy = false;
      }, 260);
    }

    btns.forEach(function (b) {
      b.addEventListener('click', function () { showPanel(b.getAttribute('data-360view')); });
    });

    window.setTimeout(teaseSeg, 1400);

    if (pdf) {
      pdf.addEventListener('click', function () {
        pdf.classList.add('is-busy');
        window.setTimeout(function () { pdf.classList.remove('is-busy'); }, 1600);
        var url = new URL('report-360-demo.html', location.href);
        url.searchParams.set('print', '1');
        window.open(url.pathname + url.search, '_blank', 'noopener');
      });
    }
  }

  /* ---------------------------------------------------------------
     ОХВАТ КАМПАНИИ 360° · СТАТУСЫ И СВЯЗКИ
     --------------------------------------------------------------- */
  function initCampaignCover() {
    var root = $('[data-campaign-cover]');
    if (!root) return;

    var listEl = $('[data-cv-list]', root);
    var titleEl = $('[data-cv-title]', root);
    var chipEl = $('[data-cv-chip]', root);
    if (!listEl || !titleEl) return;

    var AVA = 'images/';
    var v = '?v=20260808m';

    var DATA = {
      sent: {
        label: 'Запросов отправлено',
        count: 248,
        pairs: [
          { from: { name: 'Мария К.', role: 'коллега', img: AVA + 'avatar-route-maria.jpg' + v }, to: { name: 'Анна Ковалёва', role: 'оцениваемый · Product', img: AVA + 'avatar-successor-anna.jpg' + v } },
          { from: { name: 'Алексей П.', role: 'руководитель', img: AVA + 'avatar-route-alexey.jpg' + v }, to: { name: 'Анна Ковалёва', role: 'оцениваемый · Product', img: AVA + 'avatar-successor-anna.jpg' + v } },
          { from: { name: 'Игорь Т.', role: 'подчинённый', img: AVA + 'avatar-recog-igor.jpg' + v }, to: { name: 'Дмитрий Р.', role: 'оцениваемый · Analytics', img: AVA + 'avatar-successor-dmitry.jpg' + v } },
          { from: { name: 'Ольга Н.', role: 'коллега', img: AVA + 'avatar-route-olga.jpg' + v }, to: { name: 'Пётр С.', role: 'оцениваемый · Sales', img: AVA + 'avatar-9box-02.jpg' + v } }
        ]
      },
      done: {
        label: 'Оценок завершено',
        count: 191,
        pairs: [
          { from: { name: 'Алексей П.', role: 'руководитель', img: AVA + 'avatar-route-alexey.jpg' + v }, to: { name: 'Анна Ковалёва', role: 'оцениваемый · Product', img: AVA + 'avatar-successor-anna.jpg' + v } },
          { from: { name: 'Мария К.', role: 'коллега', img: AVA + 'avatar-route-maria.jpg' + v }, to: { name: 'Дмитрий Р.', role: 'оцениваемый · Analytics', img: AVA + 'avatar-successor-dmitry.jpg' + v } },
          { from: { name: 'Ольга М.', role: 'HR BP', img: AVA + 'avatar-9box-05.jpg' + v }, to: { name: 'Пётр С.', role: 'оцениваемый · Sales', img: AVA + 'avatar-9box-02.jpg' + v } },
          { from: { name: 'Дмитрий В.', role: 'коллега', img: AVA + 'avatar-route-dmitry.jpg' + v }, to: { name: 'Анна Ковалёва', role: 'оцениваемый · Product', img: AVA + 'avatar-successor-anna.jpg' + v } }
        ]
      },
      pending: {
        label: 'Ожидает ответа',
        count: 44,
        pairs: [
          { from: { name: 'Мария К.', role: 'коллега', img: AVA + 'avatar-route-maria.jpg' + v }, to: { name: 'Анна Ковалёва', role: 'оцениваемый · Product', img: AVA + 'avatar-successor-anna.jpg' + v } },
          { from: { name: 'Игорь Т.', role: 'подчинённый', img: AVA + 'avatar-recog-igor.jpg' + v }, to: { name: 'Анна Ковалёва', role: 'оцениваемый · Product', img: AVA + 'avatar-successor-anna.jpg' + v } },
          { from: { name: 'Пётр С.', role: 'руководитель', img: AVA + 'avatar-9box-02.jpg' + v }, to: { name: 'Дмитрий Р.', role: 'оцениваемый · Analytics', img: AVA + 'avatar-successor-dmitry.jpg' + v } },
          { from: { name: 'Ольга Н.', role: 'коллега', img: AVA + 'avatar-route-olga.jpg' + v }, to: { name: 'Пётр С.', role: 'оцениваемый · Sales', img: AVA + 'avatar-9box-02.jpg' + v } }
        ]
      },
      rejected: {
        label: 'Отклонено и истекло',
        count: 13,
        pairs: [
          { from: { name: 'Наталья В.', role: 'коллега · отклонила', img: AVA + 'avatar-9box-03.jpg' + v }, to: { name: 'Дмитрий Р.', role: 'оцениваемый · Analytics', img: AVA + 'avatar-successor-dmitry.jpg' + v }, reason: 'отклонено' },
          { from: { name: 'Сергей Л.', role: 'подчинённый · истекло', img: AVA + 'avatar-9box-04.jpg' + v }, to: { name: 'Анна Ковалёва', role: 'оцениваемый · Product', img: AVA + 'avatar-successor-anna.jpg' + v }, reason: 'истекло' },
          { from: { name: 'Елена Г.', role: 'коллега · отклонила', img: AVA + 'avatar-career-anna.jpg' + v }, to: { name: 'Пётр С.', role: 'оцениваемый · Sales', img: AVA + 'avatar-9box-02.jpg' + v }, reason: 'отклонено' }
        ]
      }
    };

    var active = 'pending';

    function person(p) {
      return '<div class="mcover__person">' +
        '<img src="' + p.img + '" alt="" width="30" height="30" loading="lazy" decoding="async">' +
        '<span><b>' + p.name + '</b><small>' + p.role + '</small></span></div>';
    }

    function actions(status, pair, idx) {
      var html = '';
      if (status === 'done') {
        html += '<button type="button" class="mcover__btn mcover__btn--primary" data-cv-act="view">Просмотреть</button>';
      } else if (status === 'pending' || status === 'sent') {
        html += '<button type="button" class="mcover__btn mcover__btn--primary" data-cv-act="remind" data-cv-idx="' + idx + '">Напомнить</button>';
        html += '<button type="button" class="mcover__btn mcover__btn--danger" data-cv-act="reject">Отклонить</button>';
        html += '<button type="button" class="mcover__btn mcover__btn--muted" data-cv-act="cancel">Отменить</button>';
      } else {
        html += '<button type="button" class="mcover__btn mcover__btn--muted" data-cv-act="cancel">Отменить</button>';
      }
      return '<div class="mcover__pair-acts">' + html + '</div>';
    }

    function render(status) {
      var block = DATA[status];
      if (!block) return;
      active = status;

      titleEl.textContent = block.label + ' · ' + block.pairs.length + ' из ' + block.count;

      listEl.innerHTML = block.pairs.map(function (pair, i) {
        return '<article class="mcover__pair">' +
          '<div class="mcover__pair-main">' +
          person(pair.from) +
          '<span class="mcover__arrow" aria-hidden="true">→</span>' +
          person(pair.to) +
          '</div>' +
          actions(status, pair, i) +
          '</article>';
      }).join('');

      $$('.mcover__stat', root).forEach(function (btn) {
        var on = btn.getAttribute('data-cv-status') === status;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    $$('.mcover__stat', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        render(btn.getAttribute('data-cv-status'));
      });
    });

    listEl.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-cv-act]');
      if (!btn || !listEl.contains(btn)) return;
      var act = btn.getAttribute('data-cv-act');
      var pairEl = btn.closest('.mcover__pair');
      var fromEl = pairEl && $('.mcover__person', pairEl);
      var fromName = fromEl && $('b', fromEl) ? $('b', fromEl).textContent : '';
      if (act === 'remind') {
        btn.classList.add('is-sent');
        btn.textContent = 'Отправлено';
        if (chipEl && fromName) {
          chipEl.innerHTML = '<span>Напоминание отправлено <b>' + fromName + '</b></span><b>только что</b>';
        }
      } else if (act === 'view') {
        var url = new URL('report-360-demo.html', location.href);
        url.searchParams.set('print', '1');
        window.open(url.pathname + url.search, '_blank', 'noopener');
      } else if (act === 'reject' || act === 'cancel') {
        if (pairEl) {
          pairEl.style.opacity = '0.45';
          pairEl.style.pointerEvents = 'none';
        }
      }
    });

    render(active);
  }

  function boot() {
    init360Hero();
    initCampaignCover();
    initPrHero();
    initFeed();
    initMode();
    collectReveals();
    initQuiz();
    initFit();
    initNineBox();
    initNineBoxZoom();
    initRoute();
    initGoalDemo();
    initCareerDemo();
    initCareerMap();
    initParentPick();
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
