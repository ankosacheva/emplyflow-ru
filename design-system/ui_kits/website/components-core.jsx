/* =============================================================
   EmplyFlow Website UI Kit — single-file component library
   ============================================================= */

const { useState } = React;

/* ---------- shared primitives ---------- */

const Sparkle = ({ size = 18, color = "#ffffff", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style} aria-hidden="true">
    <path d="M12 0L13.5 10.5 24 12 13.5 13.5 12 24 10.5 13.5 0 12 10.5 10.5z" />
  </svg>
);

const Button = ({ variant = "orange", children, leadingIcon, onClick }) => {
  const base = {
    fontFamily: "Manrope, sans-serif",
    fontSize: 16,
    fontWeight: 500,
    border: 0,
    borderRadius: 999,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    transition: "filter 150ms, transform 120ms",
  };
  const variants = {
    orange: { background: "#ffb777", color: "#151515", padding: "18px 36px" },
    indigo: { background: "#4a3bff", color: "#fff", padding: "12px 36px 12px 14px" },
    ghost:  { background: "transparent", color: "#fff", padding: "14px 28px", boxShadow: "inset 0 0 0 1px rgba(217,214,255,.32)" },
    light:  { background: "#fff", color: "#050230", padding: "12px 24px", fontSize: 15 },
  };
  return (
    <button
      style={{ ...base, ...variants[variant] }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.06)")}
      onMouseOut={(e) => (e.currentTarget.style.filter = "brightness(1.0)")}
      onClick={onClick}
    >
      {leadingIcon}
      <span>{children}</span>
    </button>
  );
};

const ArrowIcon = ({ size = 24, color = "currentColor", strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7" />
    <path d="M7 7h10v10" />
  </svg>
);

const RoundArrowIcon = () => (
  <span style={{ width: 36, height: 36, borderRadius: 999, background: "#fff", color: "#4a3bff", display: "grid", placeItems: "center" }}>
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
    </svg>
  </span>
);

const DashedCallout = ({ children, size = "lg" }) => {
  const sizes = {
    lg: { padding: "14px 30px", fontSize: 44, borderRadius: 999, borderWidth: 2 },
    md: { padding: "10px 22px", fontSize: 22, borderRadius: 999, borderWidth: 2 },
    block: { padding: "18px 22px", fontSize: 17, borderRadius: 18, borderWidth: 1.5 },
  };
  return (
    <span style={{
      display: "inline-block",
      border: `${sizes[size].borderWidth}px dashed #ffb8e2`,
      padding: sizes[size].padding,
      borderRadius: sizes[size].borderRadius,
      fontSize: sizes[size].fontSize,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "#fff",
      lineHeight: 1.1,
    }}>{children}</span>
  );
};

/* Decorative hand-drawn arrow scribble for the dark canvas */
const HandArrow = ({ style }) => (
  <svg width="80" height="100" viewBox="0 0 80 100" fill="none" style={style} aria-hidden="true">
    <path d="M65 8 C 60 15, 55 24, 48 30 C 40 36, 30 38, 18 42" stroke="rgba(217,214,255,0.22)" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="0" fill="none" />
    <path d="M14 38 L 18 42 L 16 48" stroke="rgba(217,214,255,0.22)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

/* Iridescent sparkle placeholder for the hero 3D objects */
const IridescentStar = ({ size = 140, style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 0 24px rgba(74,59,255,.55))", ...style }} aria-hidden="true">
    <defs>
      <linearGradient id="iri-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffb8e2" />
        <stop offset="35%" stopColor="#cec8ff" />
        <stop offset="70%" stopColor="#4a3bff" />
        <stop offset="100%" stopColor="#050230" />
      </linearGradient>
      <linearGradient id="iri-hi" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>
    <path fill="url(#iri-grad)" d="M50 4 L54 44 L96 50 L54 56 L50 96 L46 56 L4 50 L46 44 Z" />
    <path fill="url(#iri-hi)" opacity="0.5" d="M50 4 L54 44 L96 50 L60 48 Z" />
  </svg>
);

/* ---------- Nav ---------- */
const Nav = () => (
  <header style={{
    position: "sticky", top: 0, zIndex: 50,
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    background: "rgba(5,2,48,0.55)",
    borderBottom: "1px solid rgba(217,214,255,0.06)",
  }}>
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
      <div style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", color: "#fff" }}>ЭмплиФлоу</div>
      <nav style={{ display: "flex", gap: 28 }}>
        {["Модули системы", "О нас", "Внедрение/Интеграция", "Проекты", "Новости", "Контакты"].map(l => (
          <a key={l} href="#" style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>{l}</a>
        ))}
      </nav>
      <Button variant="orange">Получить доступ</Button>
    </div>
  </header>
);

/* ---------- Hero ---------- */
const Hero = () => (
  <section style={{ position: "relative", padding: "80px 40px 120px", overflow: "hidden" }}>
    {/* radial bloom */}
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(40% 60% at 8% 30%, rgba(74,59,255,0.35) 0%, transparent 60%)", pointerEvents: "none" }} />
    {/* decorative scribbles */}
    <HandArrow style={{ position: "absolute", top: 80, left: 320, opacity: 0.7 }} />
    <HandArrow style={{ position: "absolute", top: 260, left: 580, transform: "rotate(180deg)", opacity: 0.6 }} />

    {/* iridescent objects */}
    <IridescentStar size={220} style={{ position: "absolute", left: 220, bottom: 60, transform: "rotate(-8deg)" }} />
    <IridescentStar size={150} style={{ position: "absolute", right: 220, top: 380 }} />

    <div style={{ maxWidth: 1440, margin: "0 auto", position: "relative" }}>
      <h1 style={{
        fontFamily: "Manrope, sans-serif", fontWeight: 700,
        fontSize: 84, lineHeight: 1.02, letterSpacing: "-0.03em",
        color: "#fff", maxWidth: 1100,
      }}>
        HRM-платформа для оценки,<br />
        целеполагания и мотивации<br />
        сотрудников <DashedCallout size="lg">на базе ИИ</DashedCallout>
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 40, marginTop: 80, alignItems: "end" }}>
        <div style={{ maxWidth: 540, marginLeft: 260 }}>
          <p style={{ fontSize: 18, lineHeight: 1.5, color: "rgba(255,255,255,0.78)" }}>
            Хотите выстроить прозрачные процессы оценки и продвижения сотрудников? Узнать больше об их потенциале и уровне компетенции? Используйте возможности нашего решения!
          </p>
          <div style={{ marginTop: 28 }}>
            <Button variant="indigo" leadingIcon={<RoundArrowIcon />}>Что входит в платформу</Button>
          </div>
        </div>

        {/* Glass award card */}
        <div style={{
          background: "rgba(217,214,255,0.06)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(217,214,255,0.22)",
          borderRadius: 28, padding: "26px 28px",
          maxWidth: 280, color: "#fff",
        }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <Sparkle size={20} color="#ffb777" />
            <Sparkle size={14} color="#ffb8e2" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Лучший проект</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.62)", marginTop: 8, lineHeight: 1.4 }}>
            в сфере HR по версии Rusbase в 2024 году
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ---------- Customer logos ---------- */
const CustomerLogos = () => {
  const logos = [
    { name: "Ростелеком", color: "#fff" },
    { name: "Транспортные инновации Москвы", color: "#fff" },
    { name: "Yandex Cloud", color: "#fff" },
    { name: "novadial", color: "#fff" },
    { name: "GdeTech", color: "#fff" },
  ];
  return (
    <section style={{ padding: "40px 40px 60px" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32, flexWrap: "wrap", opacity: 0.85 }}>
        {logos.map(l => (
          <div key={l.name} style={{
            color: l.color, fontFamily: "Manrope, sans-serif", fontWeight: 600, fontSize: 22,
            letterSpacing: "-0.02em",
          }}>{l.name}</div>
        ))}
      </div>
    </section>
  );
};

Object.assign(window, { Sparkle, Button, ArrowIcon, RoundArrowIcon, DashedCallout, HandArrow, IridescentStar, Nav, Hero, CustomerLogos });
