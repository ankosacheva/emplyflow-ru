/**
 * Прогнозные счётчики EmplyFlow.
 * Все параметры модели правятся здесь, логика расчёта живёт в emplyflow-metrics.js.
 *
 * В момент baselineDate значения равны initialValue.
 * Часовой пояс фиксированный: Europe/Moscow (UTC+3, без перехода на летнее время).
 */
(function (root, factory) {
  var config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  else root.EMPLYFLOW_METRICS_CONFIG = config;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
    seed: 'emplyflow-metrics-v1',
    timezone: 'Europe/Moscow',
    baselineDate: '2026-10-13T00:00:00+03:00',

    metrics: [
      { id: 'goals', initialValue: 6116, baseDailyGrowth: 7.5, label: 'поставленных целей' },
      { id: 'reviews360', initialValue: 15279, baseDailyGrowth: 22, label: 'заполненных анкет 360°' },
      { id: 'idp', initialValue: 1835, baseDailyGrowth: 7.5, label: 'сформированных ИПР' },
    ],

    /* Пн…вс. Среднее за неделю равно 1, поэтому долгосрочный темп не смещается. */
    weekdayFactor: {
      1: 1.25,
      2: 1.15,
      3: 1.2,
      4: 1.2,
      5: 1.15,
      6: 0.6,
      0: 0.45,
    },

    ranges: {
      commonDay: [0.9, 1.1],
      metricDay: [0.8, 1.2],
    },

    /*
      Веса часов 0–23, Europe/Moscow.
      Ночь почти пустая, пик приходится на 14:00–18:00.
      Выбор часа вероятностный: вес задаёт шанс, а не жёсткое расписание.
    */
    hourWeights: [
      0.015, 0.012, 0.01, 0.01, 0.012, 0.02,
      0.08, 0.14, 0.22,
      0.72, 0.95, 0.88,
      0.48, 0.55,
      1.15, 1.35, 1.42, 1.22,
      0.42, 0.3, 0.22,
      0.1, 0.07, 0.04,
    ],

    /* Одна метрика не тикает чаще, чем раз в этот интервал. Иначе перезагрузка ловит сразу +2 и +3. */
    minEventGapMinutes: 25,

    animation: {
      durationMs: 420,
    },
  };
});
