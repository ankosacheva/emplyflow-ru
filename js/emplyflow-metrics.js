/**
 * Детерминированная модель прироста метрик EmplyFlow и вывод счётчиков.
 *
 * Суточный прирост:
 *   stochasticRound(baseDailyGrowth × weekdayFactor × commonDayFactor × metricDayFactor)
 *
 * commonDayFactor общий для всех метрик дня, metricDayFactor свой у каждой.
 * Прирост раскладывается на отдельные события внутри суток.
 * Одинаковые дата и время всегда дают одинаковые значения. Math.random не используется.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.EmplyFlowMetrics = api;
    if (typeof document !== 'undefined') api.mount();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;

  function defaultConfig() {
    if (typeof module === 'object' && module.exports) return require('./emplyflow-metrics-config.js');
    return rootConfig();
  }

  function rootConfig() {
    var g = typeof globalThis !== 'undefined' ? globalThis : window;
    return g.EMPLYFLOW_METRICS_CONFIG;
  }

  function hash32(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function unit(key) {
    var a = hash32(key) >>> 0;
    a = (a + 0x6D2B79F5) >>> 0;
    var t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function lerp(range, u) {
    return range[0] + (range[1] - range[0]) * u;
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function dateKey(y, m, d) {
    return y + '-' + pad(m + 1) + '-' + pad(d);
  }

  function parseDateKey(key) {
    var p = key.split('-');
    return { y: +p[0], m: +p[1] - 1, d: +p[2] };
  }

  function addDays(y, m, d, n) {
    var t = new Date(Date.UTC(y, m, d + n));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
  }

  function moscowParts(ms) {
    var shifted = new Date(ms + MOSCOW_OFFSET_MS);
    return {
      y: shifted.getUTCFullYear(),
      m: shifted.getUTCMonth(),
      d: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
      second: shifted.getUTCSeconds(),
      weekday: shifted.getUTCDay(),
    };
  }

  function weekdayOf(y, m, d) {
    return new Date(Date.UTC(y, m, d)).getUTCDay();
  }

  /* hour:00:second по Москве. Секунда внутри часа не бывает 0, чтобы событие не попадало ровно на полночь. */
  function stamp(y, m, d, hour, secondInHour) {
    return Date.UTC(y, m, d, hour, 0, secondInHour) - MOSCOW_OFFSET_MS;
  }

  function pickWeighted(weights, u) {
    var total = 0;
    var i;
    for (i = 0; i < weights.length; i++) total += weights[i];
    var x = u * total;
    for (i = 0; i < weights.length; i++) {
      x -= weights[i];
      if (x < 0) return i;
    }
    return weights.length - 1;
  }

  function stochasticRound(value, key) {
    if (!(value > 0)) return 0;
    var whole = Math.floor(value);
    var frac = value - whole;
    if (frac === 0) return whole;
    return whole + (unit(key) < frac ? 1 : 0);
  }

  function formatCount(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function createModel(overrides) {
    var config = Object.assign({}, defaultConfig(), overrides || {});
    var baselineMs = Date.parse(config.baselineDate);
    var byId = {};
    config.metrics.forEach(function (metric) {
      byId[metric.id] = metric;
    });
    var incrementCache = new Map();
    var scheduleCache = new Map();

    function factorBundle(metricId, key, y, m, d) {
      var weekday = config.weekdayFactor[weekdayOf(y, m, d)];
      var common = lerp(config.ranges.commonDay, unit(config.seed + '|' + key + '|common'));
      var metric = lerp(config.ranges.metricDay, unit(config.seed + '|' + key + '|' + metricId + '|factor'));
      return { weekday: weekday, common: common, metric: metric };
    }

    function dailyIncrement(metricId, key) {
      var cacheKey = metricId + '|' + key;
      if (incrementCache.has(cacheKey)) return incrementCache.get(cacheKey);
      var metric = byId[metricId];
      var parts = parseDateKey(key);
      var factors = factorBundle(metricId, key, parts.y, parts.m, parts.d);
      var expected = metric.baseDailyGrowth * factors.weekday * factors.common * factors.metric;
      var value = stochasticRound(expected, config.seed + '|' + key + '|' + metricId + '|round');
      incrementCache.set(cacheKey, value);
      return value;
    }

    function schedule(metricId, key) {
      var cacheKey = metricId + '|' + key;
      if (scheduleCache.has(cacheKey)) return scheduleCache.get(cacheKey);
      var parts = parseDateKey(key);
      var count = dailyIncrement(metricId, key);
      var events = [];
      var used = {};
      for (var i = 0; i < count; i++) {
        var hour = pickWeighted(config.hourWeights, unit(config.seed + '|' + key + '|' + metricId + '|h|' + i));
        var second = 1 + Math.floor(unit(config.seed + '|' + key + '|' + metricId + '|s|' + i) * 3598);
        var at = stamp(parts.y, parts.m, parts.d, hour, second);
        while (used[at]) at += 1000;
        used[at] = true;
        events.push(at);
      }
      events.sort(function (a, b) { return a - b; });
      scheduleCache.set(cacheKey, events);
      return events;
    }

    function eventsInRange(metricId, y, m, d, fromExclusive, toInclusive) {
      var events = schedule(metricId, dateKey(y, m, d));
      var n = 0;
      for (var i = 0; i < events.length; i++) {
        if (events[i] > fromExclusive && events[i] <= toInclusive) n += 1;
      }
      return n;
    }

    function valueAt(metricId, ms) {
      var metric = byId[metricId];
      if (!metric) return 0;
      if (!(ms > baselineMs)) return metric.initialValue;

      var start = moscowParts(baselineMs);
      var end = moscowParts(ms);
      var total = metric.initialValue;
      var y = start.y;
      var m = start.m;
      var d = start.d;
      var guard = 0;

      while (guard++ < 366 * 40 && !(y === end.y && m === end.m && d === end.d)) {
        var key = dateKey(y, m, d);
        var isBaselineDay = y === start.y && m === start.m && d === start.d;
        if (isBaselineDay) {
          total += eventsInRange(metricId, y, m, d, baselineMs, Number.POSITIVE_INFINITY);
        } else {
          total += dailyIncrement(metricId, key);
        }
        var next = addDays(y, m, d, 1);
        y = next.y;
        m = next.m;
        d = next.d;
      }

      total += eventsInRange(metricId, y, m, d, baselineMs, ms);
      return total;
    }

    function nextEventAfter(ms) {
      var origin = moscowParts(Math.max(ms, baselineMs));
      var best = null;
      for (var day = 0; day < 4; day++) {
        var dt = addDays(origin.y, origin.m, origin.d, day);
        var key = dateKey(dt.y, dt.m, dt.d);
        for (var i = 0; i < config.metrics.length; i++) {
          var events = schedule(config.metrics[i].id, key);
          for (var j = 0; j < events.length; j++) {
            if (events[j] > baselineMs && events[j] > ms && (best === null || events[j] < best)) {
              best = events[j];
            }
          }
        }
        if (best !== null) break;
      }
      return best;
    }

    return {
      config: config,
      baselineMs: baselineMs,
      valueAt: valueAt,
      dailyIncrement: dailyIncrement,
      schedule: function (metricId, key) {
        return schedule(metricId, key).slice();
      },
      factors: function (metricId, key) {
        var parts = parseDateKey(key);
        return factorBundle(metricId, key, parts.y, parts.m, parts.d);
      },
      nextEventAfter: nextEventAfter,
      moscowParts: moscowParts,
    };
  }

  function mount(root) {
    if (typeof document === 'undefined') return null;
    var g = typeof globalThis !== 'undefined' ? globalThis : window;
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = scope.querySelectorAll('[data-ef-metric]');
    if (!nodes.length) return null;

    var signature = Array.prototype.map.call(nodes, function (node) {
      return node.getAttribute('data-ef-metric');
    }).join('|');
    var current = g.__efMetricsController;
    if (current && current.signature === signature && current.connected()) return current;
    if (current) current.stop();

    var model = createModel();
    var reduce = false;
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      reduce = false;
    }
    var duration = (model.config.animation && model.config.animation.durationMs) || 420;
    var timer = 0;
    var stopped = false;

    function paint(node, value, snap) {
      var prev = Number(node.getAttribute('data-ef-value'));
      if (!Number.isFinite(prev)) prev = value;
      node.setAttribute('data-ef-value', String(value));
      var frame = Number(node.getAttribute('data-ef-frame')) || 0;
      if (frame) cancelAnimationFrame(frame);
      var delta = value - prev;
      if (snap || reduce || delta === 0 || delta > 3) {
        node.textContent = formatCount(value);
        node.removeAttribute('data-ef-frame');
        return;
      }
      var from = prev;
      var started = 0;
      function step(now) {
        if (!started) started = now;
        var p = Math.min(1, (now - started) / duration);
        var eased = 1 - Math.pow(1 - p, 3);
        node.textContent = formatCount(from + (value - from) * eased);
        if (p < 1) node.setAttribute('data-ef-frame', String(requestAnimationFrame(step)));
        else node.removeAttribute('data-ef-frame');
      }
      node.setAttribute('data-ef-frame', String(requestAnimationFrame(step)));
    }

    function sync(snap) {
      if (stopped) return;
      var now = Date.now();
      Array.prototype.forEach.call(nodes, function (node) {
        var id = node.getAttribute('data-ef-metric');
        var valueEl = node.querySelector('[data-ef-metric-value]') || node;
        paint(valueEl, model.valueAt(id, now), snap);
      });
      arm(now);
    }

    function arm(now) {
      clearTimeout(timer);
      if (stopped) return;
      var next = model.nextEventAfter(now);
      if (next == null) return;
      var delay = Math.min(Math.max(0, next - now), 2147483647);
      timer = setTimeout(function () { sync(false); }, delay);
    }

    function onVisible() {
      if (document.visibilityState === 'visible') sync(true);
    }

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);

    sync(true);

    var controller = {
      signature: signature,
      connected: function () { return nodes[0] && nodes[0].isConnected; },
      stop: function () {
        stopped = true;
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('pageshow', onVisible);
      },
    };
    g.__efMetricsController = controller;
    return controller;
  }

  function installObserver() {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    var g = typeof globalThis !== 'undefined' ? globalThis : window;
    if (g.__efMetricsObserver) return;
    var scheduled = false;
    g.__efMetricsObserver = new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        mount();
      });
    });
    g.__efMetricsObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (typeof document !== 'undefined') installObserver();

  return {
    createModel: createModel,
    formatCount: formatCount,
    mount: mount,
  };
});
