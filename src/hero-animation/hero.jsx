/* EmplyFlow homepage hero animation
   Story: source apps (1С, Excel …) appear on the left → a live data stream
   flows into the EmplyFlow desktop app → AI conclusions populate the screen.
   Single scene, driven entirely by `progress` (loop-safe: empty shell at 0 and 1). */

const { SceneStage, Easing, clamp } = window;
const E = Easing;

/* ---------- palette ---------- */
const C = {
  navy: '#050230', navy2: '#0d0848',
  blue: '#4a3bff', pink: '#ffb8e2', peri: '#cec8ff',
  fog: '#d9d6ff', mint: '#d5fff3', orange: '#ffb777',
  cod: '#151515',
};

/* ---------- helpers ---------- */
function seg(p, a, b, ease) {
  ease = ease || E.easeInOutCubic;
  if (b <= a) return p >= b ? 1 : 0;
  return ease(clamp((p - a) / (b - a), 0, 1));
}
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t, tt = t * t, uu = u * u;
  const a = uu * u, b = 3 * uu * t, c = 3 * u * tt, d = tt * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

/* ---------- geometry ---------- */
const HUB = [714, 540];                       // where streams enter the screen
const RAIL_X = 150;
const ICONS = [
  { src: 'icons/1c.png',      label: '1С:ЗУП',            tint: C.orange },
  { src: 'icons/excel.png',   label: 'Excel',             tint: C.mint },
  { src: 'icons/goals.png',   label: 'Цели и KPI',        tint: C.peri },
  { src: 'icons/reviews.png', label: 'Отзывы коллег',     tint: C.pink },
  { src: 'icons/eval360.png', label: 'Оценка 360°',       tint: C.blue },
  { src: 'icons/model.png',   label: 'Модель\nкомпетенций', tint: C.peri },
];
const RAIL_Y = ICONS.map((_, i) => 168 + i * 150);
// control points for each stream so they fan into the hub
function pathPts(iconY) {
  const p0 = [RAIL_X + 58, iconY];
  const p3 = HUB;
  const p1 = [RAIL_X + 320, iconY];
  const p2 = [HUB[0] - 230, HUB[1] + (iconY - HUB[1]) * 0.28];
  return [p0, p1, p2, p3];
}
function pathD(pts) {
  return `M ${pts[0][0]} ${pts[0][1]} C ${pts[1][0]} ${pts[1][1]} ${pts[2][0]} ${pts[2][1]} ${pts[3][0]} ${pts[3][1]}`;
}

/* ================= CONNECTORS (svg) ================= */
function Connectors({ p, out }) {
  const lines = ICONS.map((ic, i) => {
    const pts = pathPts(RAIL_Y[i]);
    const ds = 0.12 + i * 0.03;
    const draw = seg(p, ds, ds + 0.20, E.easeInOutQuad);
    const lineOp = 0.55 * draw * out;

    // streaming dots
    const dots = [];
    const streamOn = draw > 0.85 && p < 0.9;
    if (streamOn) {
      const N = 3;
      for (let k = 0; k < N; k++) {
        let t = ((p - 0.14) * 3.4 + k / N + i * 0.11) % 1;
        if (t < 0) t += 1;
        const [x, y] = bez(pts[0], pts[1], pts[2], pts[3], t);
        const edge = Math.min(t / 0.12, (1 - t) / 0.12, 1);
        dots.push(
          <circle key={k} cx={x} cy={y} r={4.5}
            fill={ic.tint}
            opacity={clamp(edge, 0, 1) * 0.95 * out}
            style={{ filter: `drop-shadow(0 0 7px ${ic.tint})` }} />
        );
      }
    }
    return (
      <g key={i}>
        <path d={pathD(pts)} fill="none" stroke="url(#streamGrad)"
          strokeWidth={2.4} strokeLinecap="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw}
          opacity={lineOp} />
        {dots}
      </g>
    );
  });

  // hub glow node
  const hubA = seg(p, 0.24, 0.42, E.easeOutCubic) * out;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <defs>
        <linearGradient id="streamGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.blue} />
          <stop offset="1" stopColor={C.pink} />
        </linearGradient>
        <radialGradient id="hubGlow">
          <stop offset="0" stopColor={C.blue} stopOpacity="0.9" />
          <stop offset="1" stopColor={C.blue} stopOpacity="0" />
        </radialGradient>
      </defs>
      {lines}
      <circle cx={HUB[0]} cy={HUB[1]} r={70} fill="url(#hubGlow)" opacity={hubA * 0.7} />
      <circle cx={HUB[0]} cy={HUB[1]} r={7} fill={C.fog} opacity={hubA} />
    </svg>
  );
}

/* ================= ICON RAIL ================= */
function IconRail({ p, out }) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {ICONS.map((ic, i) => {
        const s = 0.06 + i * 0.035;
        const a = seg(p, s, s + 0.16, E.easeOutCubic);
        const op = a * out;
        const y = RAIL_Y[i];
        return (
          <div key={i} style={{
            position: 'absolute', left: RAIL_X, top: y,
            transform: `translate(${-50 + (1 - a) * -60}px, -50%) scale(${0.8 + 0.2 * a})`,
            opacity: op, width: 118, textAlign: 'center',
          }}>
            <div style={{
              width: 88, height: 88, margin: '0 auto',
              borderRadius: 22, overflow: 'hidden',
              boxShadow: `0 10px 30px -10px rgba(5,2,48,0.7), 0 0 26px -8px ${ic.tint}`,
            }}>
              <img src={ic.src} alt="" width={88} height={88}
                style={{ display: 'block', width: 88, height: 88, objectFit: 'cover' }} />
            </div>
            <div style={{
              marginTop: 12, color: C.fog, fontFamily: 'Manrope, sans-serif',
              fontSize: 17, fontWeight: 600, lineHeight: 1.15, whiteSpace: 'pre-line',
            }}>{ic.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ================= DESKTOP APP ================= */
const NAV = ['Главная', 'Сотрудники', 'Цели и KPI', 'Оценка 360°', 'Performance Review'];
const WIN = { x: 700, y: 150, w: 1160, h: 790 };

/* ---- infographic primitives ---- */
function Ring({ pct, color, label }) {
  const size = 62, sw = 7, r = (size - sw) / 2, circ = 2 * Math.PI * r;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(21,21,21,0.10)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="16" fontWeight="800" fill={C.cod}>{pct}%</text>
      </svg>
      <div style={{ fontSize: 12.5, color: 'rgba(21,21,21,0.55)', marginTop: 7, fontWeight: 600, maxWidth: 92, lineHeight: 1.2 }}>{label}</div>
    </div>
  );
}

function Spark({ data, color, gid, w = 240, h = 66, marker }) {
  const max = Math.max(...data), min = Math.min(...data), rng = (max - min) || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (w - 6) + 3, h - 8 - ((v - min) / rng) * (h - 20)]);
  const line = pts.map((pt, i) => (i ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1)).join(' ');
  const area = line + ` L ${w - 3} ${h} L 3 ${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.32" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={4} fill={color} stroke="#fff" strokeWidth={2} />
      {marker ? <text x={last[0] - 4} y={last[1] - 10} textAnchor="end" fontSize="13" fontWeight="800" fill={color}>{marker}</text> : null}
    </svg>
  );
}

function NineBox() {
  const cells = Array.from({ length: 9 });
  const hot = 2; // top-right = HiPo / звезда
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 18px)', gridAutoRows: '18px', gap: 3 }}>
      {cells.map((_, i) => (
        <div key={i} style={{
          borderRadius: 4,
          background: i === hot ? C.pink : 'rgba(74,59,255,0.12)',
          boxShadow: i === hot ? `0 0 0 2px ${C.pink}, 0 4px 10px -3px ${C.pink}` : 'none',
        }} />
      ))}
    </div>
  );
}

function StepList() {
  const steps = [['Диагностика навыков', true], ['Развитие лидерства', true], ['Ревью Q3', false]];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {steps.map(([t, done], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 16, height: 16, borderRadius: 999, flex: 'none',
            background: done ? C.blue : 'transparent', border: `2px solid ${C.blue}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 10, fontWeight: 900,
          }}>{done ? '✓' : ''}</span>
          <span style={{ fontSize: 13.5, color: done ? C.cod : 'rgba(21,21,21,0.5)', fontWeight: done ? 600 : 500 }}>{t}</span>
        </div>
      ))}
    </div>
  );
}

function InsightCard({ a, eyebrow, title, body, accent, badge, graphic }) {
  return (
    <div style={{
      flex: 1, background: '#fff', borderRadius: 20, padding: '18px 20px 18px',
      boxShadow: '0 18px 40px -22px rgba(5,2,48,0.45)',
      border: `1px solid ${accent}55`,
      opacity: a, alignSelf: 'flex-start',
      transform: `translateY(${(1 - a) * 26}px) scale(${0.97 + 0.03 * a})`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 5, height: '100%', background: accent }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(21,21,21,0.45)' }}>{eyebrow}</div>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: '#fff', background: accent, borderRadius: 999, padding: '3px 10px', flex: 'none' }}>{badge}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.cod, letterSpacing: '-0.02em', marginTop: 10, lineHeight: 1.12 }}>{title}</div>
      <div style={{ fontSize: 15, color: 'rgba(21,21,21,0.62)', marginTop: 7, lineHeight: 1.3 }}>{body}</div>
      <div style={{ marginTop: 14 }}>{graphic}</div>
    </div>
  );
}

function Desktop({ p, out }) {
  const bScale = 1 + 0.004 * Math.sin(p * Math.PI * 2);
  const empA = seg(p, 0.40, 0.52, E.easeOutCubic) * out;      // employee card
  const glow = seg(p, 0.40, 0.56, E.easeOutCubic) * out;      // receiving-data glow
  const ins = [
    seg(p, 0.54, 0.67, E.easeOutCubic) * out,
    seg(p, 0.62, 0.75, E.easeOutCubic) * out,
    seg(p, 0.70, 0.83, E.easeOutCubic) * out,
  ];

  const cx = WIN.x, cy = WIN.y, cw = WIN.w, ch = WIN.h;
  const contentX = cx + 232;

  return (
    <div style={{
      position: 'absolute', left: cx, top: cy, width: cw, height: ch,
      transform: `scale(${bScale})`, transformOrigin: '50% 50%',
    }}>
      {/* window shell */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 26,
        background: 'linear-gradient(160deg, rgba(232,230,255,0.96), rgba(214,210,255,0.92))',
        border: '1px solid rgba(255,255,255,0.55)',
        boxShadow: '0 40px 120px -30px rgba(5,2,48,0.75)',
        backdropFilter: 'blur(10px)', overflow: 'hidden',
      }}>
        {/* receiving-data glow from the left edge */}
        <div style={{
          position: 'absolute', left: 0, top: 0, width: 320, height: '100%',
          background: `radial-gradient(60% 50% at 0% 50%, ${C.blue}44, transparent 70%)`,
          opacity: glow,
        }} />

        {/* header */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 64,
          borderBottom: '1px solid rgba(21,21,21,0.08)',
        }}>
          <div style={{ position: 'absolute', left: 24, top: 0, height: 64, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: C.blue, boxShadow: `0 0 14px -2px ${C.blue}` }} />
            <span style={{ fontWeight: 800, fontSize: 19, color: C.cod, letterSpacing: '-0.01em' }}>EmplyFlow</span>
          </div>
          <div style={{
            position: 'absolute', left: 232, top: 14, width: 360, height: 36, borderRadius: 999,
            background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(21,21,21,0.08)',
            display: 'flex', alignItems: 'center', padding: '0 16px',
            color: 'rgba(21,21,21,0.4)', fontSize: 14,
          }}>Поиск сотрудника…</div>
          <div style={{ position: 'absolute', right: 24, top: 0, height: 64, display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="img/hr.png" alt="" style={{ width: 30, height: 30, borderRadius: 999, objectFit: 'cover', objectPosition: '50% 30%' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.cod }}>HR Директор</span>
          </div>
        </div>

        {/* sidebar */}
        <div style={{ position: 'absolute', top: 64, left: 0, bottom: 0, width: 232, padding: '18px 14px', borderRight: '1px solid rgba(21,21,21,0.06)' }}>
          {NAV.map((n, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 14px',
              borderRadius: 12, marginBottom: 4, width: 'fit-content', maxWidth: '100%',
              background: i === 0 ? '#fff' : 'transparent',
              boxShadow: i === 0 ? '0 6px 16px -10px rgba(5,2,48,0.5)' : 'none',
              color: i === 0 ? C.cod : 'rgba(21,21,21,0.55)',
              fontWeight: i === 0 ? 700 : 500, fontSize: 15, whiteSpace: 'nowrap',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: i === 0 ? C.blue : 'rgba(21,21,21,0.25)' }} />
              {n}
            </div>
          ))}
        </div>
      </div>

      {/* ---- content (transient) ---- */}
      {/* employee card + HR infographics */}
      <div style={{
        position: 'absolute', left: contentX - cx, top: 96, width: cw - (contentX - cx) - 28,
        background: '#fff', borderRadius: 22, padding: '20px 24px',
        boxShadow: '0 18px 40px -22px rgba(5,2,48,0.4)',
        display: 'flex', alignItems: 'center', gap: 22,
        opacity: empA, transform: `translateY(${(1 - empA) * 20}px)`,
      }}>
        {/* identity */}
        <div style={{ flex: 'none', width: 232, display: 'flex', gap: 16, alignItems: 'center' }}>
          <img src="img/anna.png" alt="" style={{
            width: 88, height: 88, borderRadius: 20, flex: 'none',
            objectFit: 'cover', objectPosition: '50% 16%',
            boxShadow: '0 8px 20px -8px rgba(5,2,48,0.5)',
          }} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.cod, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Анна<br />Петрова</div>
            <div style={{ fontSize: 13.5, color: 'rgba(21,21,21,0.55)', marginTop: 6 }}>Руководитель проекта</div>
            <div style={{
              display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 800,
              color: '#12a150', background: 'rgba(18,161,80,0.12)', borderRadius: 999, padding: '3px 10px',
            }}>Потенциал: ВЫСОКИЙ</div>
          </div>
        </div>
        {/* divider */}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(21,21,21,0.08)', flex: 'none' }} />
        {/* metrics */}
        <Ring pct={86} color={C.blue} label="Выполнение целей" />
        <Ring pct={78} color={C.pink} label="Вовлечённость" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: C.cod, letterSpacing: '-0.02em', lineHeight: 1 }}>4,3</div>
          <div style={{ fontSize: 15, color: C.orange, letterSpacing: '2px', marginTop: 2 }}>★★★★☆</div>
          <div style={{ fontSize: 12.5, color: 'rgba(21,21,21,0.55)', marginTop: 5, fontWeight: 600 }}>Оценка 360°</div>
        </div>
        {/* trend */}
        <div style={{ flex: 1, minWidth: 190, paddingLeft: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12.5, color: 'rgba(21,21,21,0.55)', fontWeight: 600 }}>Динамика результатов</span>
            <span style={{ fontSize: 12.5, color: '#12a150', fontWeight: 800 }}>+14%</span>
          </div>
          <Spark gid="annaTrend" color={C.blue} w={220} h={62} data={[42, 50, 47, 58, 64, 61, 72, 80]} />
        </div>
      </div>

      {/* insight cards */}
      <div style={{
        position: 'absolute', left: contentX - cx, top: 336, width: cw - (contentX - cx) - 28,
        display: 'flex', gap: 20, alignItems: 'flex-start',
      }}>
        <InsightCard a={ins[0]} eyebrow="AI-рекомендация" badge="AI"
          title="Кадровый резерв" accent={C.pink}
          body="Потенциал высокий — рекомендована в резерв компании."
          graphic={<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NineBox />
            <div style={{ fontSize: 13, color: 'rgba(21,21,21,0.6)', fontWeight: 600 }}>9-box: A2<br /><span style={{ color: C.pink, fontWeight: 800 }}>Звезда команды</span></div>
          </div>} />
        <InsightCard a={ins[1]} eyebrow="План развития" badge="ИПР"
          title="Готовый ИПР" accent={C.blue}
          body="Уделите внимание развитию лидерских навыков."
          graphic={<StepList />} />
        <InsightCard a={ins[2]} eyebrow="Внимание" badge="90%"
          title="Риск перегрузки" accent={C.orange}
          body="Достигнуто 90% годовых целей — контролируйте нагрузку."
          graphic={<Spark gid="riskTrend" color={C.orange} w={230} h={58} marker="90%" data={[38, 45, 52, 60, 66, 74, 83, 92]} />} />
      </div>
    </div>
  );
}

/* ================= SCENE ================= */
function FlowScene(props) {
  const p = clamp(props.progress || 0, 0, 1);
  const out = 1 - seg(p, 0.90, 1.0, E.easeInOutCubic);
  const bloom = 0.35 + 0.25 * (0.5 - 0.5 * Math.cos(p * Math.PI * 2));

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.navy, overflow: 'hidden', fontFamily: 'Manrope, sans-serif' }}>
      {/* ambient bloom top-left */}
      <div style={{
        position: 'absolute', left: -200, top: -220, width: 900, height: 900,
        background: `radial-gradient(circle, ${C.blue}33, transparent 62%)`, opacity: bloom,
      }} />
      <div style={{
        position: 'absolute', right: -160, bottom: -260, width: 800, height: 800,
        background: `radial-gradient(circle, ${C.pink}22, transparent 62%)`, opacity: bloom * 0.8,
      }} />

      <Connectors p={p} out={out} />
      <Desktop p={p} out={out} />
      <IconRail p={p} out={out} />
    </div>
  );
}

/* ================= ROOT ================= */
function HeroPiece() {
  return React.createElement(SceneStage, {
    width: 1920, height: 1080,
    scenes: window.OM_SCENES,
    playback: window.OM_PLAYBACK,
    bg: C.navy,
  }, { Flow: FlowScene });
}
window.HeroPiece = HeroPiece;
