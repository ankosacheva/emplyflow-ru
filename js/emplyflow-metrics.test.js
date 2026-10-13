'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createModel, formatCount } = require('./emplyflow-metrics.js');

const DAY = 24 * 60 * 60 * 1000;
const model = createModel();
const baseline = Date.parse(model.config.baselineDate);
const ids = ['goals', 'reviews360', 'idp'];

function at(iso) {
  return Date.parse(iso);
}

function dateKeyFromUtc(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

test('на baselineDate показаны точные стартовые значения', () => {
  assert.equal(model.valueAt('goals', baseline), 6116);
  assert.equal(model.valueAt('reviews360', baseline), 15279);
  assert.equal(model.valueAt('idp', baseline), 1835);
});

test('до baselineDate значение не растёт', () => {
  const earlier = at('2026-10-12T23:59:59+03:00');
  for (const id of ids) {
    assert.equal(model.valueAt(id, earlier), model.config.metrics.find((m) => m.id === id).initialValue);
  }
});

test('формат чисел с пробелами между тысячами', () => {
  assert.equal(formatCount(6116), '6 116');
  assert.equal(formatCount(15279), '15 279');
  assert.equal(formatCount(1835), '1 835');
  assert.equal(formatCount(999), '999');
});

test('через 1, 7, 30 и 90 суток значения больше стартовых', () => {
  for (const days of [1, 7, 30, 90]) {
    const moment = baseline + days * DAY;
    for (const id of ids) {
      assert.ok(model.valueAt(id, moment) > model.valueAt(id, baseline), id + ' @ ' + days);
    }
  }
});

test('средний прирост за 180 суток близок к 7.5 / 22 / 7.5', () => {
  const days = 180;
  const end = baseline + days * DAY;
  const expected = { goals: 7.5, reviews360: 22, idp: 7.5 };
  for (const id of ids) {
    const avg = (model.valueAt(id, end) - model.valueAt(id, baseline)) / days;
    const err = Math.abs(avg - expected[id]) / expected[id];
    assert.ok(err < 0.1, id + ' avg ' + avg.toFixed(3) + ' err ' + err.toFixed(3));
  }
});

test('на выходных в среднем меньше событий, чем в будни', () => {
  const sums = { weekday: 0, weekend: 0 };
  const counts = { weekday: 0, weekend: 0 };
  let cursor = Date.UTC(2026, 9, 13);
  for (let i = 0; i < 180; i++) {
    const key = dateKeyFromUtc(cursor);
    const weekend = new Date(cursor).getUTCDay() === 0 || new Date(cursor).getUTCDay() === 6;
    const bucket = weekend ? 'weekend' : 'weekday';
    sums[bucket] += model.dailyIncrement('goals', key);
    counts[bucket] += 1;
    cursor += DAY;
  }
  const weekdayAvg = sums.weekday / counts.weekday;
  const weekendAvg = sums.weekend / counts.weekend;
  assert.ok(weekendAvg < weekdayAvg * 0.75, 'weekend ' + weekendAvg + ' weekday ' + weekdayAvg);
});

test('повторный расчёт и второй экземпляр модели совпадают', () => {
  const other = createModel();
  const moment = at('2027-03-18T16:40:12+03:00');
  for (const id of ids) {
    assert.equal(model.valueAt(id, moment), model.valueAt(id, moment));
    assert.equal(model.valueAt(id, moment), other.valueAt(id, moment));
    assert.deepEqual(model.schedule(id, '2026-11-04'), other.schedule(id, '2026-11-04'));
  }
});

test('значение никогда не уменьшается', () => {
  for (const id of ids) {
    let prev = model.valueAt(id, baseline);
    for (let hour = 1; hour <= 24 * 21; hour++) {
      const value = model.valueAt(id, baseline + hour * 60 * 60 * 1000);
      assert.ok(value >= prev, id + ' hour ' + hour + ' ' + value + ' < ' + prev);
      prev = value;
    }
  }
});

test('между событиями значение не меняется и растёт на 1 в момент события', () => {
  const events = model.schedule('goals', '2026-10-14');
  assert.ok(events.length >= 2);
  const first = events[0];
  const second = events[1];
  const mid = first + Math.floor((second - first) / 2);
  assert.ok(mid > first && mid < second);
  assert.equal(model.valueAt('goals', mid), model.valueAt('goals', first));
  assert.equal(model.valueAt('goals', second), model.valueAt('goals', first) + 1);
});

test('полный день после старта даёт ровно суточный прирост', () => {
  const start = at('2026-10-14T00:00:00+03:00');
  const end = at('2026-10-15T00:00:00+03:00');
  for (const id of ids) {
    const inc = model.dailyIncrement(id, '2026-10-14');
    assert.equal(model.schedule(id, '2026-10-14').length, inc);
    assert.equal(model.valueAt(id, end) - model.valueAt(id, start), inc);
  }
});

test('первый неполный день учитывает только события после baseline', () => {
  const partial = createModel({ baselineDate: '2026-10-13T23:00:00+03:00' });
  const start = at('2026-10-13T23:00:00+03:00');
  const morning = at('2026-10-13T10:00:00+03:00');
  const end = at('2026-10-14T00:00:00+03:00');
  assert.equal(partial.valueAt('reviews360', start), 15279);
  assert.equal(partial.valueAt('reviews360', morning), 15279);
  const events = partial.schedule('reviews360', '2026-10-13');
  const counted = events.filter((ts) => ts > start && ts <= end).length;
  assert.ok(counted < events.length);
  assert.equal(partial.valueAt('reviews360', end) - 15279, counted);
});

test('общий коэффициент дня одинаковый, индивидуальный обычно отличается', () => {
  const goals = model.factors('goals', '2026-10-20');
  const reviews = model.factors('reviews360', '2026-10-20');
  const idp = model.factors('idp', '2026-10-20');
  assert.equal(goals.common, reviews.common);
  assert.equal(goals.common, idp.common);
  assert.ok(goals.common >= 0.9 && goals.common <= 1.1);
  assert.ok(goals.metric >= 0.8 && goals.metric <= 1.2);
  let differed = false;
  for (let i = 0; i < 14; i++) {
    const key = dateKeyFromUtc(Date.UTC(2026, 9, 13 + i));
    if (model.factors('goals', key).metric !== model.factors('reviews360', key).metric) differed = true;
  }
  assert.equal(differed, true);
});

test('события чаще днём, чем ночью', () => {
  const buckets = { night: 0, afternoon: 0 };
  let cursor = Date.UTC(2026, 9, 13);
  for (let i = 0; i < 60; i++) {
    const key = dateKeyFromUtc(cursor);
    for (const ts of model.schedule('reviews360', key)) {
      const hour = model.moscowParts(ts).hour;
      if (hour < 6) buckets.night += 1;
      if (hour >= 14 && hour < 18) buckets.afternoon += 1;
    }
    cursor += DAY;
  }
  assert.ok(buckets.afternoon > buckets.night * 8, JSON.stringify(buckets));
});

test('десять лет считаются быстро и остаются монотонными на стыке годов', () => {
  const far = baseline + 3650 * DAY;
  const started = Date.now();
  const value = model.valueAt('goals', far);
  assert.ok(Date.now() - started < 1500);
  assert.ok(value > model.valueAt('goals', baseline + 3649 * DAY));
});
