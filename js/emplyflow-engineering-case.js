/* =============================================================
   EmplyFlow — инжиниринговый кейс
   Логика страницы page96490096.html.

   Принципы: один scroll-тик на все сцены, никакого внешнего
   рантайма, полный контент доступен при prefers-reduced-motion.
   ============================================================= */

(function () {
  'use strict';

  var DATA = window.EF_ENGINEERING_CASE;
  if (!DATA) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------------------------------------------------------------
     АНАЛИТИКА
     --------------------------------------------------------------- */
  var sent = {};

  function track(event, params) {
    try {
      if (window.ym && window.mainMetrikaId) window.ym(window.mainMetrikaId, 'reachGoal', event, params);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'engineering_case_' + event, params: params || {} });
    } catch (e) { /* аналитика не должна ломать страницу */ }
  }

  function trackOnce(event, params) {
    if (sent[event]) return;
    sent[event] = 1;
    track(event, params);
  }

  /* ---------------------------------------------------------------
     ПРЕЛОАДЕР
     --------------------------------------------------------------- */
  function initPreloader() {
    var el = $('#preloader');
    if (!el) return;

    if (reduced) {
      el.classList.add('is-done');
      document.body.classList.remove('is-locked');
      return;
    }

    var pts = $$('.preloader__pt', el);
    var labels = $$('.preloader__label', el);
    var i = 0;
    var started = Date.now();
    document.body.classList.add('is-locked');

    function step() {
      pts.forEach(function (p, n) { p.classList.toggle('is-on', n <= i); });
      labels.forEach(function (l, n) { l.classList.toggle('is-on', n === i); });
      i += 1;
      if (i < pts.length) window.setTimeout(step, 480);
    }
    step();

    function finish() {
      var wait = Math.max(0, 1500 - (Date.now() - started));
      window.setTimeout(function () {
        el.classList.add('is-done');
        document.body.classList.remove('is-locked');
        window.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700);
      }, wait);
    }

    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish, { once: true });
    window.setTimeout(finish, 4200);
  }

  /* ---------------------------------------------------------------
     REVEAL — управляется общим scroll-тиком
     --------------------------------------------------------------- */
  var revealQueue = [];

  function collectReveals() {
    $$('.chapter .shell > *, .finale__inner > *').forEach(function (el) {
      if (el.classList.contains('reveal')) return;
      el.classList.add('reveal');
    });
    revealQueue = $$('.reveal');
    if (reduced) revealQueue.forEach(function (el) { el.classList.add('is-in'); });
  }

  function flushReveals(vh) {
    if (reduced || !revealQueue.length) return;
    var rest = [];
    for (var i = 0; i < revealQueue.length; i++) {
      var el = revealQueue[i];
      if (el.getBoundingClientRect().top < vh * 0.92) el.classList.add('is-in');
      else rest.push(el);
    }
    revealQueue = rest;
  }

  /* ---------------------------------------------------------------
     РЕЛЬС ГЛАВ
     --------------------------------------------------------------- */
  var railState = { el: null, buttons: [], active: '' };

  function initRail() {
    var rail = $('#rail');
    var list = $('#rail-list');
    if (!rail || !list) return;

    $$('[data-chapter]').forEach(function (sec) {
      var title = sec.getAttribute('data-chapter-title') || sec.id;
      var li = document.createElement('li');
      li.innerHTML =
        '<button type="button" class="rail__btn" data-rail="' + sec.id + '">' +
          '<span class="rail__label">' + esc(title) + '</span>' +
          '<span class="rail__dot" aria-hidden="true"></span>' +
        '</button>';
      var btn = li.firstChild;
      btn.setAttribute('aria-label', 'Перейти к разделу: ' + title);
      btn.setAttribute('title', title);
      btn.addEventListener('click', function () {
        sec.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        track('rail_jump', { chapter: sec.id });
      });
      list.appendChild(li);
    });

    railState.el = rail;
    railState.buttons = $$('[data-rail]', list);
  }

  function setActiveChapter(id, title) {
    if (railState.active === id) return;
    railState.active = id;

    if (railState.el) {
      railState.el.classList.toggle('is-on', id !== 'hero');
      railState.buttons.forEach(function (b) {
        b.classList.toggle('is-active', b.getAttribute('data-rail') === id);
      });
    }

    var cap = $('#topbar-chapter');
    if (cap) cap.textContent = title || '';
    if (id) trackOnce('chapter_view_' + id);
  }

  /* ---------------------------------------------------------------
     ГЛАВА 1 — HERO: blueprint на canvas + узлы ролей
     --------------------------------------------------------------- */
  var heroState = { fill: 0 };

  function initHeroNodes() {
    var wrap = $('#hero-nodes');
    if (!wrap) return;

    DATA.heroNodes.forEach(function (n, i) {
      var el = document.createElement('div');
      el.className = 'hero__node';
      el.setAttribute('data-node', n.id);
      el.innerHTML =
        '<span class="hero__node-title">' + esc(n.title) + '</span>' +
        '<ul class="hero__node-reqs">' +
          n.reqs.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') +
        '</ul>';
      wrap.appendChild(el);

      if (reduced) { el.classList.add('is-in'); return; }
      window.setTimeout(function () { el.classList.add('is-in'); }, 900 + i * 180);
    });
  }

  function initVideoScenes() {
    var videos = $$('[data-video]');
    if (!videos.length) return;

    var isMobile = window.matchMedia('(max-width: 700px)').matches;

    videos.forEach(function (video) {
      if (reduced) {
        video.removeAttribute('autoplay');
        return;
      }

      var base = video.getAttribute('data-video');
      var mobileBase = video.getAttribute('data-video-mobile');
      var src = isMobile && mobileBase ? mobileBase : base;
      var priority = video.hasAttribute('data-video-priority');
      var isHero = video.id === 'hero-video';
      var hero = isHero ? $('#hero') : null;
      var finale = video.classList.contains('finale__video') ? $('#finale') : null;

      function attach() {
        if (video.dataset.loaded === '1') return;
        video.dataset.loaded = '1';

        ['webm', 'mp4'].forEach(function (ext) {
          var source = document.createElement('source');
          source.src = src + '.' + ext;
          source.type = ext === 'webm' ? 'video/webm' : 'video/mp4';
          video.appendChild(source);
        });

        video.addEventListener('loadeddata', function () {
          video.classList.add('is-ready');
          if (hero) hero.classList.add('has-video');
          if (finale) finale.classList.add('has-video');
        }, { once: true });

        video.load();
        var p = video.play();
        if (p && p.catch) p.catch(function () { /* автоплей может быть запрещён */ });
      }

      if (priority) attach();

      if (!window.IntersectionObserver) {
        if (!priority) attach();
        return;
      }

      new IntersectionObserver(function (entries) {
        var isIn = entries[0].isIntersecting;
        if (isIn) {
          attach();
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        } else if (video.dataset.loaded === '1') {
          video.pause();
        }
      }, { threshold: 0.05 }).observe(video);
    });
  }

  function initHeroCanvas() {
    var canvas = $('#hero-canvas');
    if (!canvas || reduced) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    var structure = [];
    var talent = [];
    var links = [];
    var raf = 0;
    var visible = true;

    function build() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // верхняя конструкция — узлы проекта
      structure = [];
      var cols = 7, rows = 3;
      for (var c = 0; c < cols; c++) {
        for (var r = 0; r < rows; r++) {
          structure.push({
            x: w * (0.46 + (c / (cols - 1)) * 0.5) + (r % 2 ? 10 : -10),
            y: h * (0.12 + (r / (rows - 1)) * 0.42),
            r: 1.6 + (r === 1 ? 0.8 : 0)
          });
        }
      }

      // нижний слой — скрытая экспертиза внутри компании
      talent = [];
      for (var i = 0; i < 26; i++) {
        talent.push({
          x: w * (0.42 + Math.random() * 0.56),
          y: h * (0.68 + Math.random() * 0.28),
          r: 1.2 + Math.random() * 1.6,
          ph: Math.random() * Math.PI * 2,
          sp: 0.4 + Math.random() * 0.6
        });
      }

      // связи «экспертиза → узел проекта»
      links = [];
      for (var k = 0; k < 12; k++) {
        links.push({
          a: talent[Math.floor(Math.random() * talent.length)],
          b: structure[Math.floor(Math.random() * structure.length)],
          d: Math.random(),
          sp: 0.0016 + Math.random() * 0.0022
        });
      }
    }

    function draw(t) {
      raf = window.requestAnimationFrame(draw);
      if (!visible || !w) return;

      ctx.clearRect(0, 0, w, h);

      // каркас конструкции
      ctx.strokeStyle = 'rgba(138, 123, 255, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 0; i < structure.length; i++) {
        for (var j = i + 1; j < structure.length; j++) {
          var dx = structure[i].x - structure[j].x;
          var dy = structure[i].y - structure[j].y;
          if (dx * dx + dy * dy < 20000) {
            ctx.moveTo(structure[i].x, structure[i].y);
            ctx.lineTo(structure[j].x, structure[j].y);
          }
        }
      }
      ctx.stroke();

      // узлы конструкции
      for (var s = 0; s < structure.length; s++) {
        var n = structure[s];
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(206, 200, 255, 0.5)';
        ctx.fill();
      }

      // экспертиза
      for (var p = 0; p < talent.length; p++) {
        var m = talent[p];
        var pulse = 0.5 + 0.5 * Math.sin(t * 0.0011 * m.sp + m.ph);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * (0.8 + pulse * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(127, 233, 205, ' + (0.22 + pulse * 0.3) + ')';
        ctx.fill();
      }

      // связи, которые постепенно достраиваются
      for (var l = 0; l < links.length; l++) {
        var ln = links[l];
        ln.d += ln.sp;
        if (ln.d > 1.4) ln.d = 0;
        var prog = clamp(ln.d, 0, 1) * clamp(heroState.fill, 0.15, 1);
        var cx = ln.a.x + (ln.b.x - ln.a.x) * prog;
        var cy = ln.a.y + (ln.b.y - ln.a.y) * prog;
        var grad = ctx.createLinearGradient(ln.a.x, ln.a.y, cx, cy);
        grad.addColorStop(0, 'rgba(127, 233, 205, 0.32)');
        grad.addColorStop(1, 'rgba(138, 123, 255, 0.06)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ln.a.x, ln.a.y);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      }
    }

    build();
    raf = window.requestAnimationFrame(draw);

    var io = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.01 }) : null;
    if (io) io.observe(canvas);

    var rt = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(rt);
      rt = window.setTimeout(build, 200);
    }, { passive: true });
  }

  /* ---------------------------------------------------------------
     ГЛАВА 2 — источники знаний до внедрения
     --------------------------------------------------------------- */
  var SPARK = '<svg class="spark spark--tr" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M12 0L13.5 10.5 24 12 13.5 13.5 12 24 10.5 13.5 0 12 10.5 10.5z" fill="currentColor"/></svg>';

  function initBefore() {
    var wrap = $('#before-sources');
    var kinds = { doc: 'документ', table: 'таблица', human: 'человек', system: 'система' };
    // соседние плитки не повторяют цвет — правило фирменной системы
    var tones = ['peri', 'fog', 'candy', 'mint', 'mac', 'ribbon'];
    var spans = ['b-3', '', '', 'b-3', '', ''];

    if (wrap) {
      wrap.innerHTML = DATA.sources.map(function (s, i) {
        return '<article class="tile tile--' + tones[i % tones.length] + ' ' + spans[i] + '" data-kind="' + s.kind + '">' +
          (i % 3 === 0 ? SPARK : '') +
          '<span class="tile__eyebrow">' + esc(kinds[s.kind] || s.kind) + '</span>' +
          '<h3 class="tile__title">' + esc(s.title) + '</h3>' +
          '<p class="tile__text">' + esc(s.note) + '</p>' +
        '</article>';
      }).join('');
    }

    var fam = $('#before-families');
    if (fam) {
      fam.innerHTML = DATA.roleFamilies.map(function (f) {
        return '<li>' + esc(f) + '</li>';
      }).join('');
    }
  }

  /* ---------------------------------------------------------------
     ГЛАВА 3 — из документа в профиль роли
     --------------------------------------------------------------- */
  var rolesState = { lines: [], groups: [], section: null };

  function initRoles() {
    var P = DATA.roleProfile;
    var doc = $('#roles-doc');
    var groups = $('#roles-groups');

    var name = $('#roles-role-name');
    if (name) name.textContent = P.role;

    var docTitle = $('#roles-doc-title');
    if (docTitle) docTitle.textContent = P.documentTitle;

    if (doc) {
      doc.innerHTML = P.documentLines.map(function (l) {
        var html = esc(l.text);
        if (l.mark) html = html.replace(esc(l.mark), '<mark>' + esc(l.mark) + '</mark>');
        return '<p class="doc__line" data-pick="' + l.pick + '">' + html + '</p>';
      }).join('');
    }

    if (groups) {
      groups.innerHTML = P.groups.map(function (g) {
        return '<section class="group" data-group="' + g.id + '">' +
          '<div class="group__head">' +
            '<h3 class="group__title">' + esc(g.title) + '</h3>' +
          '</div>' +
          '<p class="group__note">' + esc(g.note) + '</p>' +
          '<ul class="group__items">' +
            g.items.map(function (it) {
              return '<li class="group__item">' +
                '<span class="group__item-title">' + esc(it.title) + '</span>' +
                '<span class="group__item-meta">' + esc(it.meta) + '</span>' +
              '</li>';
            }).join('') +
          '</ul>' +
        '</section>';
      }).join('');
    }

    rolesState.lines = $$('.doc__line', doc);
    rolesState.groups = $$('.group', groups);
    rolesState.section = $('#roles');

    if (reduced) {
      rolesState.lines.forEach(function (l) { l.classList.add('is-lit'); });
      rolesState.groups.forEach(function (g) { g.classList.add('is-in'); });
    }
  }

  function tickRoles(y, vh) {
    if (reduced || !rolesState.section || !rolesState.lines.length) return;
    var sec = rolesState.section;
    var top = sec.offsetTop - vh * 0.62;
    var prog = clamp((y - top) / (sec.offsetHeight * 0.62), 0, 1);

    var litCount = Math.round(prog * rolesState.lines.length * 1.25);
    rolesState.lines.forEach(function (l, i) { l.classList.toggle('is-lit', i < litCount); });

    var gCount = Math.floor(clamp((prog - 0.22) / 0.6, 0, 1) * (rolesState.groups.length + 0.4));
    rolesState.groups.forEach(function (g, i) { g.classList.toggle('is-in', i < gCount); });
  }

  /* ---------------------------------------------------------------
     ГЛАВА 4 — профиль сотрудника и происхождение данных
     --------------------------------------------------------------- */
  function initPassport() {
    var P = DATA.passport;
    var prov = DATA.provenance;
    var wrap = $('#passport-layers');
    var legend = $('#passport-legend');
    var root = $('.passport');

    var person = $('#passport-person');
    if (person) person.textContent = P.person;

    var cap = $('#passport-caption');
    if (cap) cap.textContent = P.caption;

    if (wrap) {
      wrap.innerHTML = P.layers.map(function (l, i) {
        return '<details class="layer"' + (i === 0 ? ' open' : '') + '>' +
          '<summary class="layer__title">' +
            '<span class="layer__name">' + esc(l.title) + '</span>' +
            '<span class="layer__count">' + l.items.length + '</span>' +
          '</summary>' +
          '<ul class="layer__items">' +
            l.items.map(function (it) {
              return '<li class="pitem" data-src="' + it.src + '">' +
                '<div class="pitem__main">' +
                  '<span class="pitem__title">' + esc(it.title) + '</span>' +
                  '<span class="pitem__meta">' + esc(it.meta) + '</span>' +
                '</div>' +
                '<span class="pitem__src">' + esc((prov[it.src] || {}).short || it.src) + '</span>' +
              '</li>';
            }).join('') +
          '</ul>' +
        '</details>';
      }).join('');
    }

    if (!legend || !root) return;

    var colors = {
      self: 'rgba(217, 214, 255, 0.4)',
      manager: '#7fe9cd',
      hrm: '#ffb777',
      project: '#9ad8ff',
      review: '#8a7bff'
    };

    legend.innerHTML = Object.keys(prov).map(function (k) {
      return '<li>' +
        '<button type="button" class="legend__btn" data-src-filter="' + k + '" aria-pressed="false">' +
          '<span class="legend__swatch" style="background:' + colors[k] + '" aria-hidden="true"></span>' +
          '<span>' + esc(prov[k].label) + '</span>' +
        '</button>' +
      '</li>';
    }).join('');

    var active = '';
    $$('[data-src-filter]', legend).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-src-filter');
        active = active === key ? '' : key;

        $$('[data-src-filter]', legend).forEach(function (b) {
          var on = b.getAttribute('data-src-filter') === active;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        root.classList.toggle('is-filtered', !!active);
        $$('.pitem', wrap).forEach(function (it) {
          it.classList.toggle('is-match', !!active && it.getAttribute('data-src') === active);
        });

        if (active) track('passport_filter', { source: active });
      });
    });
  }

  /* ---------------------------------------------------------------
     ГЛАВА 5 — двусторонний матчинг
     --------------------------------------------------------------- */
  function initMatching() {
    var M = DATA.matching;

    function side(el, data, kicker, kind) {
      if (!el) return;

      var tag = kind === 'project' ? 'Проект' : 'Сотрудник';
      var icon = kind === 'project'
        ? '<svg class="duo__icon" viewBox="0 0 56 56" role="presentation">' +
            '<rect x="10" y="18" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
            '<circle cx="19" cy="27" r="2.5" fill="currentColor"/>' +
            '<path d="M28 27 H44 M39 22 L44 27 L39 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M19 18 V12 M19 36 V42 M10 27 H4 M28 27 H34" fill="none" stroke="currentColor" stroke-width="1" opacity="0.45"/>' +
          '</svg>'
        : '<svg class="duo__icon" viewBox="0 0 56 56" role="presentation">' +
            '<circle cx="34" cy="18" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
            '<path d="M22 40 C28 32 40 32 46 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
            '<path d="M12 27 H24 M17 22 L12 27 L17 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M34 40 V48 M28 44 H40" fill="none" stroke="currentColor" stroke-width="1" opacity="0.45"/>' +
          '</svg>';

      var visual = kind === 'project'
        ? '<span class="duo__tag duo__tag--' + kind + '">' + tag + '</span>' +
          '<span class="duo__icon-wrap" aria-hidden="true">' + icon + '</span>' +
          '<span class="duo__beam duo__beam--' + kind + '" aria-hidden="true"></span>'
        : '<span class="duo__beam duo__beam--' + kind + '" aria-hidden="true"></span>' +
          '<span class="duo__icon-wrap" aria-hidden="true">' + icon + '</span>' +
          '<span class="duo__tag duo__tag--' + kind + '">' + tag + '</span>';

      el.innerHTML =
        '<div class="duo__visual">' + visual + '</div>' +
        '<p class="duo__kicker">' + esc(kicker) + '</p>' +
        '<h3 class="duo__role">' + esc(data.role) + '</h3>' +
        '<ul class="duo__needs">' +
          data.needs.map(function (n, i) {
            return '<li class="duo__need duo__need--' + kind + '">' +
              '<span class="duo__need-mark" aria-hidden="true"></span>' +
              '<span class="duo__need-body">' +
                '<span class="duo__need-title">' + esc(n.title) + '</span>' +
                '<span class="duo__need-text">' + esc(n.text) + '</span>' +
              '</span>' +
            '</li>';
          }).join('') +
        '</ul>';
    }

    side($('#match-project'), M.project, M.project.title, 'project');
    side($('#match-person'), M.person, M.person.title, 'person');

    var total = $('#match-total');
    if (total) total.textContent = M.breakdown.total;

    var cap = $('#match-caption');
    if (cap) cap.textContent = M.breakdown.caption;

    var rows = $('#match-breakdown');
    if (!rows) return;

    rows.innerHTML = M.breakdown.rows.map(function (r) {
      var bar = r.kind === 'bar'
        ? '<span class="brow__track"><i class="brow__fill" style="--v:' + (r.num / 100) + '"></i></span>'
        : '';
      return '<li class="brow" data-kind="' + r.kind + '">' +
        '<span class="brow__label">' + esc(r.label) + '</span>' +
        '<span class="brow__value">' + esc(r.value) + '</span>' +
        bar +
      '</li>';
    }).join('');

    if (reduced) $$('.brow', rows).forEach(function (b) { b.classList.add('is-in'); });
  }

  /* ---------------------------------------------------------------
     ГЛАВА 6 — конструктор команды
     --------------------------------------------------------------- */
  var relLabel = { low: 'низкая', medium: 'средняя', high: 'высокая' };
  var availLabel = {
    available: 'доступен',
    confirm: 'требует подтверждения',
    unavailable: 'занят на другом проекте'
  };

  function initBuilder() {
    var B = DATA.builder;
    var slotsEl = $('#builder-slots');
    var reqsEl = $('#builder-reqs');
    var candsEl = $('#builder-cands');
    var verdictEl = $('#builder-verdict');
    var titleEl = $('#builder-role-title');
    if (!slotsEl || !candsEl) return;

    var projectEl = $('#builder-project');
    if (projectEl) projectEl.textContent = B.project;

    var capEl = $('#builder-caption');
    if (capEl) capEl.textContent = B.caption;

    var guideEl = $('#builder-guide');
    var panelEl = $('.builder__panel');

    var state = { role: 0, picks: {} };

    function updateGuide() {
      if (!guideEl) return;
      var r = B.roles[state.role];
      var picked = state.picks[r.id];
      if (picked) {
        guideEl.textContent = 'Роль закрыта. Выберите следующую или нажмите «Собрать заново».';
        guideEl.classList.remove('is-step-1');
        guideEl.classList.add('is-step-2');
      } else {
        guideEl.textContent = 'Шаг 1 — нажмите роль ниже · Шаг 2 — выберите кандидата справа';
        guideEl.classList.add('is-step-1');
        guideEl.classList.remove('is-step-2');
      }
    }

    function renderSlots() {
      var nextOpen = B.roles.findIndex(function (r) { return !state.picks[r.id]; });

      slotsEl.innerHTML = B.roles.map(function (r, i) {
        var pick = state.picks[r.id];
        var cand = pick ? findCand(r, pick) : null;
        var isActive = i === state.role;
        var isNext = i === nextOpen;
        return '<li>' +
          '<button type="button" class="slot' +
            (isActive ? ' is-active' : '') +
            (cand ? ' is-done' : '') +
            (isNext && !cand ? ' is-next' : '') +
          '" data-slot="' + i + '" aria-pressed="' + (isActive ? 'true' : 'false') + '">' +
            '<span class="slot__main">' +
              '<span class="slot__n">' + (i + 1) + '</span>' +
              '<span class="slot__body">' +
                '<span class="slot__title">' + esc(r.title) + '</span>' +
                '<span class="slot__pick">' + (cand ? esc(cand.name) + ' · ' + esc(cand.role) : 'Кандидат не назначен') + '</span>' +
              '</span>' +
            '</span>' +
            '<span class="slot__cta">' + (isActive ? 'Сейчас выбираем' : (cand ? 'Изменить' : 'Выбрать роль')) + '</span>' +
          '</button>' +
        '</li>';
      }).join('');

      $$('[data-slot]', slotsEl).forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.role = parseInt(btn.getAttribute('data-slot'), 10);
          render();
          if (panelEl && window.matchMedia('(max-width: 1080px)').matches) {
            panelEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
          }
          track('builder_role', { role: B.roles[state.role].id });
        });
      });
    }

    function findCand(role, id) {
      for (var i = 0; i < role.candidates.length; i++) {
        if (role.candidates[i].id === id) return role.candidates[i];
      }
      return null;
    }

    function renderRole() {
      var r = B.roles[state.role];
      if (titleEl) titleEl.textContent = 'Роль ' + (state.role + 1) + ' из ' + B.roles.length + ' · ' + r.title;

      if (reqsEl) {
        reqsEl.innerHTML =
          reqBlock('must', 'Обязательные', r.must) +
          reqBlock('nice', 'Желательные', r.nice) +
          reqBlock('ctx', 'Контекст', r.ctx);
      }

      var picked = state.picks[r.id];

      candsEl.innerHTML =
        '<p class="cands__prompt">Шаг 2 — кого назначите на эту роль?</p>' +
        r.candidates.map(function (c) {
          return '<button type="button" class="cand' + (picked === c.id ? ' is-picked' : '') + '" data-cand="' + c.id + '">' +
            '<span class="cand__top">' +
              '<span class="cand__name">' + esc(c.name) + '</span>' +
              '<span class="cand__score">' + c.skillMatch + '%</span>' +
            '</span>' +
            '<span class="cand__role">' + esc(c.role) + '</span>' +
            '<ul class="cand__facts">' +
              '<li class="cfact" data-tone="' + (c.mandatoryMet ? 'good' : 'warn') + '">' +
                (c.mandatoryMet ? 'Обязательные требования выполнены' : 'Не хватает: ' + esc(c.missing.join(', '))) +
              '</li>' +
              '<li class="cfact" data-tone="career">Карьерная релевантность: ' + relLabel[c.careerRelevance] + '</li>' +
              '<li class="cfact" data-tone="' + (c.availability === 'available' ? 'good' : 'warn') + '">' +
                'Доступность: ' + availLabel[c.availability] +
              '</li>' +
            '</ul>' +
            '<span class="cand__cta">' + (picked === c.id ? 'Назначен на роль' : 'Назначить на роль') + '</span>' +
          '</button>';
        }).join('');

      $$('[data-cand]', candsEl).forEach(function (btn) {
        btn.addEventListener('click', function () {
          pick(r, btn.getAttribute('data-cand'));
        });
      });

      if (picked) showVerdict(findCand(r, picked));
      else hideVerdict();
    }

    function reqBlock(kind, title, items) {
      if (!items || !items.length) return '';
      return '<div class="req" data-req="' + kind + '">' +
        '<span class="req__title">' + esc(title) + '</span>' +
        '<ul class="req__list">' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' +
      '</div>';
    }

    function pick(role, candId) {
      state.picks[role.id] = candId;
      var cand = findCand(role, candId);
      renderSlots();
      renderRole();
      updateGuide();
      trackOnce('builder_interact');
      track('builder_pick', { role: role.id, candidate: candId, tone: cand ? cand.verdict.tone : '' });

      var done = B.roles.every(function (r) { return state.picks[r.id]; });
      if (done) trackOnce('builder_complete');
    }

    function showVerdict(c) {
      if (!verdictEl || !c) return;
      verdictEl.hidden = false;
      verdictEl.setAttribute('data-tone', c.verdict.tone);
      verdictEl.innerHTML =
        '<h4 class="verdict__title">' + esc(c.verdict.title) + '</h4>' +
        '<p class="verdict__text">' + esc(c.verdict.text) + '</p>' +
        '<p class="verdict__dev">Что даёт проект сотруднику: ' + esc(c.developmentValue) + '</p>' +
        (c.risks && c.risks.length
          ? '<ul class="verdict__risks">' + c.risks.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>'
          : '');
    }

    function hideVerdict() {
      if (!verdictEl) return;
      verdictEl.hidden = true;
      verdictEl.innerHTML = '';
      verdictEl.removeAttribute('data-tone');
    }

    function render() {
      renderSlots();
      renderRole();
      updateGuide();
      if (panelEl) panelEl.classList.toggle('is-ready', true);
    }

    var reset = $('#builder-reset');
    if (reset) {
      reset.addEventListener('click', function () {
        state.picks = {};
        state.role = 0;
        render();
        track('builder_reset');
      });
    }

    render();
  }

  /* ---------------------------------------------------------------
     ГЛАВА 7 — внутренний рынок проектов
     --------------------------------------------------------------- */
  function initMarketplace() {
    var M = DATA.marketplace;

    function col(el, data, kind) {
      if (!el) return;
      var mark = kind === 'smart' ? '✓' : '·';
      el.innerHTML =
        '<span class="compare__tag">' + esc(data.tag) + '</span>' +
        '<h3 class="compare__title">' + esc(data.title) + '</h3>' +
        (data.note ? '<p class="compare__note">' + esc(data.note) + '</p>' : '') +
        '<ul class="compare__list">' +
          data.rows.map(function (r) {
            return '<li class="compare__item">' +
              '<span class="compare__mark" aria-hidden="true">' + mark + '</span>' +
              '<span class="compare__text">' + esc(r) + '</span>' +
            '</li>';
          }).join('') +
        '</ul>';
    }

    col($('#market-plain'), M.plain, 'plain');
    col($('#market-smart'), M.smart, 'smart');

    var card = $('#market-card');
    if (!card) return;

    var blockIcons = { fit: '✓', gap: '!', gain: '↗', next: '→' };

    card.innerHTML =
      '<div class="offer__ribbon">' +
        '<span class="offer__kind">Внутренняя вакансия</span>' +
        '<span class="offer__hint">Карточка проекта, на которую сотрудник откликается</span>' +
      '</div>' +
      '<div class="offer__head">' +
        '<div class="offer__titlebox">' +
          '<h3 class="offer__role">' + esc(M.card.role) + '</h3>' +
          '<p class="offer__project">' + esc(M.card.project) + '</p>' +
        '</div>' +
        '<button type="button" class="offer__apply" disabled>Заявить интерес</button>' +
      '</div>' +
      '<dl class="offer__meta">' +
        M.card.meta.map(function (m) {
          return '<div><dt>' + esc(m.label) + '</dt><dd>' + esc(m.value) + '</dd></div>';
        }).join('') +
      '</dl>' +
      '<div class="offer__section">' +
        '<p class="offer__section-title">Что видит сотрудник при отклике</p>' +
        '<div class="offer__blocks">' +
          M.card.blocks.map(function (b) {
            return '<article class="oblock" data-b="' + b.id + '">' +
              '<div class="oblock__head">' +
                '<span class="oblock__icon" aria-hidden="true">' + (blockIcons[b.id] || '•') + '</span>' +
                '<span class="oblock__title">' + esc(b.title) + '</span>' +
              '</div>' +
              '<p class="oblock__text">' + esc(b.text) + '</p>' +
            '</article>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="offer__foot">' +
        '<span class="tiny" style="margin:0">Сотрудник заявляет интерес сам — решение по назначению остаётся за руководителем и HR-командой</span>' +
      '</div>';
  }

  /* ---------------------------------------------------------------
     ГЛАВА 8 — карьерная карта
     --------------------------------------------------------------- */
  function initCareer() {
    var C = DATA.career;
    var svg = $('#career-svg');
    var paths = $('#career-paths');
    var detail = $('#career-detail');

    var from = $('#career-from');
    if (from) from.textContent = C.from;

    var cap = $('#career-caption');
    if (cap) cap.textContent = C.caption;

    if (!svg || !paths || !detail) return;

    var colors = {
      vertical: '#8a7bff',
      expert: '#9ad8ff',
      manager: '#ffb777',
      lateral: '#ffb8e2',
      project: '#7fe9cd'
    };

    var ns = 'http://www.w3.org/2000/svg';
    var startX = 150, startY = 210;
    var endX = 470;
    var ys = [50, 130, 210, 290, 370];

    var frag = document.createDocumentFragment();

    // ствол
    var stem = document.createElementNS(ns, 'path');
    stem.setAttribute('d', 'M40 210 H' + startX);
    stem.setAttribute('class', 'mpath is-on');
    stem.setAttribute('stroke', 'rgba(217, 214, 255, 0.5)');
    frag.appendChild(stem);

    C.paths.forEach(function (p, i) {
      var y = ys[i];
      var d = 'M' + startX + ' ' + startY +
              ' C' + (startX + 110) + ' ' + startY + ', ' + (endX - 130) + ' ' + y + ', ' + endX + ' ' + y;

      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'mpath');
      path.setAttribute('stroke', colors[p.id]);
      path.setAttribute('data-path', p.id);
      frag.appendChild(path);

      var g = document.createElementNS(ns, 'g');
      g.setAttribute('class', 'mnode');
      g.setAttribute('data-node', p.id);

      var circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', endX);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', '6');
      circle.setAttribute('stroke', colors[p.id]);
      g.appendChild(circle);

      var text = document.createElementNS(ns, 'text');
      text.setAttribute('x', endX + 14);
      text.setAttribute('y', y + 4);
      text.textContent = p.kind;
      g.appendChild(text);

      frag.appendChild(g);
    });

    svg.appendChild(frag);

    paths.innerHTML = C.paths.map(function (p, i) {
      return '<button type="button" class="ppath" role="tab" data-career="' + p.id + '"' +
        ' aria-selected="' + (i === 0 ? 'true' : 'false') + '">' +
        '<span class="ppath__kind" style="color:' + colors[p.id] + '">' + esc(p.kind) + '</span>' +
        '<span class="ppath__title">' + esc(p.title) + '</span>' +
        '<span class="ppath__arrow" aria-hidden="true">→</span>' +
      '</button>';
    }).join('');

    function select(id) {
      var p = null;
      for (var i = 0; i < C.paths.length; i++) if (C.paths[i].id === id) p = C.paths[i];
      if (!p) return;

      $$('[data-career]', paths).forEach(function (b) {
        var on = b.getAttribute('data-career') === id;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.style.borderColor = on ? colors[id] : '';
      });

      $$('.mpath[data-path]', svg).forEach(function (el) {
        el.classList.toggle('is-on', el.getAttribute('data-path') === id);
      });
      $$('.mnode', svg).forEach(function (el) {
        el.classList.toggle('is-on', el.getAttribute('data-node') === id);
      });

      detail.innerHTML =
        '<div class="mdetail__head">' +
          '<h3 class="mdetail__title">' + esc(p.title) + '</h3>' +
          '<span class="badge" style="border-color:' + colors[id] + ';color:' + colors[id] + '">' + esc(p.kind) + ' переход</span>' +
        '</div>' +
        '<div class="mdetail__grid">' +
          '<div class="mdetail__col">' +
            '<span class="mdetail__col-title">Требования целевой роли</span>' +
            '<ul>' + p.need.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' +
          '</div>' +
          '<div class="mdetail__col">' +
            '<span class="mdetail__col-title">Развивающая возможность</span>' +
            '<p>' + esc(p.via) + '</p>' +
          '</div>' +
          '<div class="mdetail__col">' +
            '<span class="mdetail__col-title">Чего не хватает сейчас</span>' +
            '<p>' + esc(p.gap) + '</p>' +
          '</div>' +
        '</div>';

      track('career_path', { path: id });
    }

    $$('[data-career]', paths).forEach(function (btn) {
      btn.addEventListener('click', function () { select(btn.getAttribute('data-career')); });
    });

    select(C.paths[0].id);
  }

  /* ---------------------------------------------------------------
     ГЛАВА 9 — skill gap
     --------------------------------------------------------------- */
  function initGap() {
    var G = DATA.gap;
    var wrap = $('#gap-states');

    var target = $('#gap-target');
    if (target) target.textContent = G.target;

    var cap = $('#gap-caption');
    if (cap) cap.textContent = G.caption;

    if (!wrap) return;

    wrap.innerHTML = G.states.map(function (s) {
      if (s.layout === 'chips') {
        return '<section class="gstate gstate--chips" data-tone="' + s.tone + '">' +
          '<h3 class="gstate__label">' + esc(s.label) + '</h3>' +
          '<div class="gstate__chips">' +
            s.items.map(function (it) {
              return '<span class="gchip">' +
                '<span class="gchip__title">' + esc(it.title) + '</span>' +
                '<span class="gchip__meta">' + esc(it.meta) + '</span>' +
              '</span>';
            }).join('') +
          '</div>' +
        '</section>';
      }

      return '<section class="gstate gstate--plan" data-tone="' + s.tone + '">' +
        '<h3 class="gstate__label">' + esc(s.label) + '</h3>' +
        '<ul class="gplan">' +
          s.items.map(function (it) {
            var act = it.action || {};
            return '<li class="gplan__item">' +
              '<div class="gplan__head">' +
                '<span class="gplan__title">' + esc(it.title) + '</span>' +
                '<span class="gplan__meta">' + esc(it.meta) + '</span>' +
              '</div>' +
              '<span class="gaction gaction--' + esc(act.kind || 'course') + '">' + esc(act.label || '') + '</span>' +
            '</li>';
          }).join('') +
        '</ul>' +
      '</section>';
    }).join('');
  }

  /* ---------------------------------------------------------------
     ГЛАВА 10 — цикл развития
     --------------------------------------------------------------- */
  var loopState = { pts: [], steps: [], section: null };

  function initLoop() {
    var steps = $('#loop-steps');
    var svg = $('#loop-svg');
    if (!steps || !svg) return;

    steps.innerHTML = DATA.loop.map(function (s) {
      return '<li class="cstep' + (s.accent ? ' is-key' : '') + '" data-step="' + s.n + '">' +
        '<span class="cstep__n">' + s.n + '</span>' +
        '<span class="cstep__title">' + esc(s.title) + '</span>' +
        '<span class="cstep__text">' + esc(s.text) + '</span>' +
      '</li>';
    }).join('');

    var ns = 'http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox', '0 0 260 260');

    var defs = document.createElementNS(ns, 'defs');
    defs.innerHTML =
      '<linearGradient id="cycle-grad" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#8a7bff"/>' +
        '<stop offset="55%" stop-color="#7fe9cd"/>' +
        '<stop offset="100%" stop-color="#ffb777"/>' +
      '</linearGradient>';
    svg.appendChild(defs);

    var cx = 130, cy = 130, r = 96;

    var track = document.createElementNS(ns, 'circle');
    track.setAttribute('cx', cx); track.setAttribute('cy', cy); track.setAttribute('r', r);
    track.setAttribute('class', 'cycle__track');
    svg.appendChild(track);

    var arc = document.createElementNS(ns, 'circle');
    arc.setAttribute('cx', cx); arc.setAttribute('cy', cy); arc.setAttribute('r', r);
    arc.setAttribute('class', 'cycle__arc');
    arc.setAttribute('transform', 'rotate(-90 ' + cx + ' ' + cy + ')');
    arc.style.setProperty('--len', (2 * Math.PI * r).toFixed(1));
    svg.appendChild(arc);

    DATA.loop.forEach(function (s, i) {
      var a = (-Math.PI / 2) + (i / DATA.loop.length) * Math.PI * 2;
      var pt = document.createElementNS(ns, 'circle');
      pt.setAttribute('cx', (cx + Math.cos(a) * r).toFixed(1));
      pt.setAttribute('cy', (cy + Math.sin(a) * r).toFixed(1));
      pt.setAttribute('r', s.accent ? 8 : 6);
      pt.setAttribute('class', 'cycle__pt' + (s.accent ? ' is-key' : ''));
      pt.setAttribute('data-pt', s.n);
      svg.appendChild(pt);
    });

    loopState.pts = $$('.cycle__pt', svg);
    loopState.steps = $$('.cstep', steps);
    loopState.section = $('#loop');

    if (reduced) {
      var cycle = $('.cycle');
      if (cycle) cycle.classList.add('is-in');
      loopState.pts.forEach(function (p) { p.classList.add('is-on'); });
    }
  }

  function tickLoop(y, vh) {
    if (reduced || !loopState.section) return;
    var sec = loopState.section;
    var top = sec.offsetTop - vh * 0.6;
    var prog = clamp((y - top) / (sec.offsetHeight * 0.75), 0, 1);

    var cycle = $('.cycle');
    if (cycle && prog > 0.05) cycle.classList.add('is-in');

    var n = Math.round(prog * loopState.pts.length * 1.15);
    loopState.pts.forEach(function (p, i) { p.classList.toggle('is-on', i < n); });
  }

  /* ---------------------------------------------------------------
     ГЛАВА 11 — результаты
     --------------------------------------------------------------- */
  function initResults() {
    var wrap = $('#results-list');
    if (!wrap) return;

    var tones = ['peri', 'mint', 'candy', 'mac'];

    wrap.innerHTML = DATA.results.map(function (r, i) {
      return '<article class="rcard tile--' + tones[i % tones.length] + '" data-result="' + r.id + '">' +
        (i % 2 === 0 ? SPARK : '') +
        '<div class="rcard__txt">' +
          '<p class="rcard__kind">' + esc(r.kind) + '</p>' +
          '<h3 class="rcard__title">' + esc(r.title) + '</h3>' +
          '<p class="rcard__note">' + esc(r.note) + '</p>' +
        '</div>' +
        '<div class="rcard__viz">' +
          '<div class="shift' + (r.viz === 'apps' || r.viz === 'people' ? ' shift--text' : '') + '">' +
            '<span class="shift__from">' +
              '<span class="shift__cap">Было</span>' +
              '<span class="shift__val">' + esc(r.from) + '</span>' +
            '</span>' +
            '<span class="shift__arrow" aria-hidden="true">→</span>' +
            '<span class="shift__to">' +
              '<span class="shift__cap">Стало</span>' +
              '<span class="shift__val">' + esc(r.to) + '</span>' +
            '</span>' +
          '</div>' +
          viz(r) +
        '</div>' +
      '</article>';
    }).join('');

    if (reduced) $$('.rcard', wrap).forEach(function (c) { c.classList.add('is-in'); });
  }

  function viz(r) {
    if (r.viz === 'weeks' || r.viz === 'share') {
      var max = r.viz === 'weeks' ? (r.fromNum || 4) : 100;
      var fromCap = r.barFrom || (r.viz === 'weeks' ? r.fromNum + ' нед' : r.fromNum + '%');
      var toCap = r.barTo || (r.viz === 'weeks' ? r.toNum + ' нед' : r.toNum + '%');
      var fromVal = r.viz === 'weeks' ? 1 : r.fromNum / max;
      return '<div class="bars">' +
        bar('from', fromCap, fromVal) +
        bar('to', toCap, r.toNum / max) +
      '</div>';
    }
    var count = r.viz === 'apps' ? 20 : 12;
    var dots = '';
    for (var i = 0; i < count; i++) dots += '<i class="is-on" aria-hidden="true"></i>';
    return '<div class="dots">' + dots + '</div>';
  }

  function bar(kind, cap, v) {
    return '<div class="barline barline--' + kind + '">' +
      '<span class="barline__cap">' + esc(cap) + '</span>' +
      '<span class="barline__track"><i class="barline__fill" style="--v:' + v.toFixed(3) + '"></i></span>' +
    '</div>';
  }

  /* ---------------------------------------------------------------
     ГЛАВА 12 — финал
     --------------------------------------------------------------- */
  function initFinale() {
    var F = DATA.finale;

    var lines = $('#finale-lines');
    if (lines) {
      lines.innerHTML = F.lines.map(function (l) {
        return '<p class="finale__line">' +
          esc(l).replace(/\{([^}]+)\}/g, '<em>$1</em>') +
        '</p>';
      }).join('');
      if (reduced) $$('.finale__line', lines).forEach(function (l) { l.classList.add('is-in'); });
    }

    var summary = $('#finale-summary');
    if (summary) {
      var tones = ['mint', 'peri', 'candy', 'mac'];
      summary.innerHTML = F.summary.map(function (s, i) {
        return '<li class="tile tile--' + tones[i % tones.length] + '">' +
          (i === 0 ? SPARK : '') +
          '<span class="tile__text">' + esc(s) + '</span>' +
        '</li>';
      }).join('');
    }

    var next = $('#finale-next');
    if (next) next.innerHTML = F.next.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
  }

  function initFinaleCanvas() {
    var canvas = $('#finale-canvas');
    if (!canvas || reduced) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, pts = [], raf = 0, visible = false;
    var palette = ['#8a7bff', '#7fe9cd', '#ffb777', '#9ad8ff'];

    function build() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      pts = [];
      var n = w < 700 ? 26 : 48;
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          c: palette[i % palette.length]
        });
      }
    }

    function draw() {
      raf = window.requestAnimationFrame(draw);
      if (!visible || !w) return;

      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 17000) {
            ctx.strokeStyle = 'rgba(206, 200, 255, ' + (0.16 * (1 - d2 / 17000)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 0.75;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    build();
    raf = window.requestAnimationFrame(draw);

    var io = window.IntersectionObserver ? new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
    }, { threshold: 0.01 }) : null;
    if (io) io.observe(canvas);
    else visible = true;

    var rt = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(rt);
      rt = window.setTimeout(build, 200);
    }, { passive: true });
  }

  /* ---------------------------------------------------------------
     ПОДСТАНОВКА ФАКТОВ
     --------------------------------------------------------------- */
  function initFacts() {
    $$('[data-fact]').forEach(function (el) {
      var f = DATA.facts[el.getAttribute('data-fact')];
      if (f && f.value) el.textContent = f.value;
    });
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
      if (e.target.closest('[data-ef-demo-close]')) {
        window.__efCloseDemoForm();
        return;
      }
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

      var focusables = modal.querySelectorAll(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  function initCta() {
    $$('[data-track]').forEach(function (el) {
      if (el.hasAttribute('data-ef-demo-open')) return;
      el.addEventListener('click', function () {
        track('cta_click', { id: el.getAttribute('data-track') });
      });
    });
  }

  /* ---------------------------------------------------------------
     ЕДИНЫЙ SCROLL-ТИК
     --------------------------------------------------------------- */
  function initScroll() {
    var topbar = $('#topbar');
    var progress = $('#topbar-progress');
    var chapters = $$('[data-chapter]');
    var ticking = false;

    function measure() {
      var y = window.scrollY || window.pageYOffset || 0;
      var vh = window.innerHeight || 1;
      var docH = Math.max(document.body.scrollHeight - vh, 1);

      flushReveals(vh);

      if (progress) progress.style.setProperty('--read', clamp(y / docH, 0, 1));
      if (topbar) topbar.classList.toggle('is-stuck', y > 24);

      heroState.fill = clamp(y / (vh * 1.1), 0, 1);

      var mid = y + vh * 0.42;
      for (var i = 0; i < chapters.length; i++) {
        var c = chapters[i];
        var top = c.offsetTop;
        if (mid >= top && mid < top + c.offsetHeight) {
          setActiveChapter(c.id, c.getAttribute('data-chapter-title'));
          break;
        }
      }

      tickRoles(y, vh);
      tickLoop(y, vh);

      // полосы и карточки результатов
      $$('.brow:not(.is-in)').forEach(function (b) {
        if (b.getBoundingClientRect().top < vh * 0.86) b.classList.add('is-in');
      });
      $$('.rcard:not(.is-in)').forEach(function (c) {
        if (c.getBoundingClientRect().top < vh * 0.82) c.classList.add('is-in');
      });
      $$('.finale__line:not(.is-in)').forEach(function (l, i) {
        if (l.getBoundingClientRect().top < vh * 0.88) {
          window.setTimeout(function () { l.classList.add('is-in'); }, i * 140);
        }
      });

      ticking = false;
    }

    function schedule() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(measure);
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.setInterval(schedule, 300);
    measure();
    trackOnce('hero_view');
  }

  /* ---------------------------------------------------------------
     СТАРТ
     --------------------------------------------------------------- */
  function boot() {
    initFacts();
    initPreloader();
    initRail();
    initHeroNodes();
    initVideoScenes();
    initHeroCanvas();
    initBefore();
    initRoles();
    initPassport();
    initMatching();
    initBuilder();
    initMarketplace();
    initCareer();
    initGap();
    initLoop();
    initResults();
    initFinale();
    initFinaleCanvas();
    collectReveals();
    initDemoModal();
    initCta();
    initScroll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
