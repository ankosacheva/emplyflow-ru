// shorts-anim/bits.jsx — EmplyFlow Shorts · reusable visual building blocks
// Exports primitives to window for use by scenes.jsx.
// Loaded after animations.jsx (so window.interpolate / Easing exist).

const EF = {
  navy:  '#050230',
  navy2: '#0a0540',
  indigo:'#4a3bff',
  indigoDeep:'#3a2cf0',
  pink:  '#ffb8e2',
  peri:  '#cec8ff',
  fog:   '#d9d6ff',
  mint:  '#d5fff3',
  orange:'#ffb777',
  cod:   '#151515',
  white: '#ffffff',
};
const FONT = "'Manrope', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// ── tiny helpers ────────────────────────────────────────────────────────────
const KF = (input, output, ease) => window.interpolate(input, output, ease);
// pseudo-random but deterministic shake -> {x,y}
function shake(lt, amp, freq = 22, decay = 6) {
  const d = Math.exp(-lt * decay);
  return {
    x: Math.sin(lt * freq) * amp * d,
    y: Math.cos(lt * freq * 1.3) * amp * 0.7 * d,
  };
}
// deterministic prng
function mulberry(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Camera: animate translate/scale/rotate around centre ────────────────────
function Camera({ x = 0, y = 0, scale = 1, rot = 0, children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      transformOrigin: '50% 50%',
      transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rot}deg)`,
      willChange: 'transform',
    }}>{children}</div>
  );
}

// ── Ambient brand background ────────────────────────────────────────────────
function Bloom({ indigo = 0.55, pink = 0.22, drift = 0 }) {
  return (
    <React.Fragment>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(46% 32% at ${78 + drift}% 14%, rgba(74,59,255,${indigo}) 0%, transparent 64%)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(44% 30% at ${10 - drift}% 86%, rgba(255,184,226,${pink}) 0%, transparent 64%)`,
      }} />
    </React.Fragment>
  );
}

// ── Sparkle (4-point star) with twinkle ─────────────────────────────────────
function Sparkle({ x, y, size = 90, color = EF.pink, lt = 0, phase = 0, spin = 18 }) {
  const tw = 0.55 + 0.45 * Math.sin(lt * 3 + phase);
  const sc = 0.82 + 0.18 * Math.sin(lt * 3 + phase + 1.1);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{
      position: 'absolute', left: x, top: y, opacity: tw,
      transform: `translate(-50%,-50%) scale(${sc}) rotate(${lt * spin + phase * 30}deg)`,
      filter: `drop-shadow(0 0 18px ${color})`,
    }}>
      <path d="M12 0L13.5 10.5 24 12 13.5 13.5 12 24 10.5 13.5 0 12 10.5 10.5z" fill={color} />
    </svg>
  );
}

// ── highlight mark (boxed text) ─────────────────────────────────────────────
function Mark({ children, bg = EF.indigo, color = EF.white, size }) {
  return (
    <span style={{
      background: bg, color, padding: '0.02em 0.16em', borderRadius: 12,
      boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone',
      fontSize: size, lineHeight: 1.08,
    }}>{children}</span>
  );
}

// ── Excel sheet (scene 1) ───────────────────────────────────────────────────
const XL_NAMES = ['Иванов И.', 'Петрова А.', 'Смирнов Д.', 'Кузнецова Е.', 'Попов Р.',
  'Соколова М.', 'Лебедев К.', 'Новикова О.', 'Морозов П.', 'Волкова Н.',
  'Алексеев С.', 'Зайцева Т.', 'Орлов В.', 'Фёдорова Ю.', 'Макаров А.',
  'Громова Л.', 'Киселёв Н.', 'Тарасова В.', 'Беляев О.', 'Щербак И.',
  'Гусев А.', 'Блинова Р.', 'Сорокин Е.', 'Панова К.', 'Дроздов М.',
  'Котова Д.', 'Никитин С.', 'Жукова Л.', 'Поляков Р.', 'Седова Т.'];
const XL_ROWS = (() => {
  const r = mulberry(7);
  return XL_NAMES.map((n) => ({
    n,
    a: (3.1 + r() * 1.8).toFixed(1),
    b: Math.round(62 + r() * 37) + '%',
    c: Math.round(2 + r() * 4) + '/6',
    d: (2.8 + r() * 2.0).toFixed(1),
    e: (3.2 + r() * 1.6).toFixed(1),
  }));
})();
function ExcelSheet({ scroll = 0 }) {
  const cols = '2fr .85fr .85fr .85fr .85fr 1fr';
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#eef1f7', overflow: 'hidden' }}>
      {/* title bar */}
      <div style={{
        height: 92, background: '#1f7a4d', color: '#fff', display: 'flex', alignItems: 'center',
        gap: 22, padding: '0 30px', fontSize: 30, fontWeight: 700, fontFamily: MONO,
      }}>
        <span style={{ width: 20, height: 20, borderRadius: 99, background: 'rgba(255,255,255,.5)' }} />
        Performance_Review_2026_FINAL_v7(2).xlsx
      </div>
      {/* column header */}
      <div style={{ display: 'grid', gridTemplateColumns: cols, background: '#d7deea', borderBottom: '3px solid #b9c4d6' }}>
        {['Сотрудник', '360', 'KPI', 'Цели', 'Комп.', 'Итог'].map((h, i) => (
          <div key={i} style={{ padding: '20px 22px', fontSize: 30, fontWeight: 700, color: '#3b475c', fontFamily: MONO, borderRight: '1px solid #c3ccdb' }}>{h}</div>
        ))}
      </div>
      {/* scrolling rows */}
      <div style={{ transform: `translateY(${-scroll}px)`, willChange: 'transform', fontFamily: MONO }}>
        {XL_ROWS.concat(XL_ROWS).map((row, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: cols,
            background: i % 2 ? '#f6f8fc' : '#fff', borderBottom: '1px solid #d3dae6',
          }}>
            <div style={cellS('#1f2b3e', 600)}>{row.n}</div>
            <div style={cellS()}>{row.a}</div>
            <div style={cellS()}>{row.b}</div>
            <div style={cellS()}>{row.c}</div>
            <div style={cellS()}>{row.d}</div>
            <div style={cellS()}>{row.e}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
const cellS = (color = '#46536a', weight = 400) => ({
  padding: '18px 22px', fontSize: 29, color, fontWeight: weight,
  borderRight: '1px solid #e0e6f0', whiteSpace: 'nowrap', overflow: 'hidden',
});

// ── Mac-style cursor ────────────────────────────────────────────────────────
function Cursor({ x, y, size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{
      position: 'absolute', left: x, top: y, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.45))',
      transform: 'translate(-10%,-6%)',
    }}>
      <path d="M5 2l14 11-6 1 4 7-3 1-4-7-5 4z" fill="#fff" stroke="#1f2b3e" strokeWidth="1.2" />
    </svg>
  );
}

// ── File card (scene 2) ─────────────────────────────────────────────────────
function FileCard({ tab, color, rows, style }) {
  return (
    <div style={{
      position: 'absolute', width: 420, background: '#fff', borderRadius: 22, overflow: 'hidden',
      boxShadow: '0 40px 70px -22px rgba(0,0,0,.62)', border: '1px solid rgba(0,0,0,.06)',
      ...style,
    }}>
      <div style={{ height: 66, display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', color: '#fff', fontSize: 24, fontWeight: 700, fontFamily: MONO, background: color }}>
        <span style={{ width: 16, height: 16, borderRadius: 99, background: 'rgba(255,255,255,.55)' }} />{tab}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.3fr .6fr .6fr', background: i % 2 ? '#f7f9fc' : '#fff' }}>
          {r.map((c, j) => (
            <div key={j} style={{ padding: '12px 18px', fontSize: 21, fontFamily: MONO, color: '#51607a', borderBottom: '1px solid #eef1f7', borderRight: '1px solid #eef1f7', whiteSpace: 'nowrap', overflow: 'hidden' }}>{c}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ChatBubble({ who, text, style }) {
  return (
    <div style={{
      position: 'absolute', background: '#fff', color: '#1f2b3e', fontSize: 32, fontWeight: 600,
      padding: '24px 30px', borderRadius: '26px 26px 26px 8px', boxShadow: '0 30px 60px -18px rgba(0,0,0,.55)',
      maxWidth: 620, lineHeight: 1.3, ...style,
    }}>
      <span style={{ display: 'block', fontSize: 22, color: '#8a96ab', fontWeight: 700, marginBottom: 6 }}>{who}</span>
      {text}
    </div>
  );
}

function DeadlineChip({ style }) {
  return (
    <div style={{
      position: 'absolute', display: 'inline-flex', alignItems: 'center', gap: 14,
      background: '#ff5a6e', color: '#fff', fontSize: 32, fontWeight: 800, padding: '20px 32px',
      borderRadius: 999, boxShadow: '0 0 60px -6px rgba(255,90,110,.85)', whiteSpace: 'nowrap', ...style,
    }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      Дедлайн сегодня
    </div>
  );
}

Object.assign(window, {
  EF, FONT, MONO, KF, shake, mulberry,
  Camera, Bloom, Sparkle, Mark, ExcelSheet, Cursor, FileCard, ChatBubble, DeadlineChip,
});
