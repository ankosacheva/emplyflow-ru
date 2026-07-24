/* =============================================================
   EmplyFlow Website — sections below the fold
   ============================================================= */

const { useState: useStateB } = React;

/* ---------- Module switcher ---------- */
const MODULES = [
  {
    id: "pr",
    name: "Performance Review",
    headline: "Анализ эффективности сотрудников и команд",
    features: [
      {
        title: "Оценка результативности сотрудников (Performance Review)",
        body: "Подсчёт суммарного балла как объективной оценки по различным показателям сотрудников: от достижения квартальных целей до результатов оценки 360 и обратной связи от коллег",
        highlighted: true,
      },
    ],
    side: [
      { ic: "clock", title: "Автосоздание матрицы потенциала", body: "Удобная визуализация сотрудников для наглядного восприятия и работы с разными группами (HiPo, низкоэффективные, будущие звёзды, ключевые игроки)" },
      { ic: "ai",    title: "Глубокий анализ и сравнение", body: "AI-аналитика по результатам оценок, ИПР и достижениям с возможностью бенчмаркинга" },
      { ic: "star",  title: "Формирование ТОП", body: "Рейтинги сотрудников и команд для прозрачной мотивации" },
    ],
  },
  { id: "comp",  name: "Оценка компетенций" },
  { id: "goals", name: "Постановка и управление целями" },
  { id: "track", name: "Карьерные треки и планы развития" },
  { id: "tasks", name: "Проекты и задачи" },
  { id: "moti",  name: "Нематериальная мотивация" },
];

const ModuleIcon = ({ kind }) => {
  const props = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "#4a3bff", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" };
  if (kind === "clock") return <svg {...props}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 16 14" /></svg>;
  if (kind === "ai")    return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9 16V8M15 16V8M9 12h6" /></svg>;
  if (kind === "star")  return <svg {...props}><polygon points="12 2 14.6 8.6 21.6 9.2 16.3 13.8 17.9 20.8 12 17 6.1 20.8 7.7 13.8 2.4 9.2 9.4 8.6" /></svg>;
  return null;
};

const ModuleSwitcher = () => {
  const [active, setActive] = useStateB("pr");
  const mod = MODULES.find(m => m.id === active);

  return (
    <section style={{ padding: "100px 40px" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <h2 style={{
          fontFamily: "Manrope, sans-serif", fontWeight: 700,
          fontSize: 64, lineHeight: 1.05, letterSpacing: "-0.03em",
          color: "#fff", textAlign: "center", margin: "0 auto 60px", maxWidth: 1100,
        }}>
          <span style={{ color: "#ffb8e2" }}>Сократите время</span> на рутинные задачи и сосредоточьтесь на стратегии
        </h2>

        <div style={{
          background: "#4a3bff",
          borderRadius: 40,
          padding: 20,
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 20,
          minHeight: 600,
        }}>
          {/* Left: module list */}
          <div style={{ padding: "12px 6px 12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", marginBottom: 28 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.18)", display: "grid", placeItems: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18"/></svg>
              </span>
              <span style={{ fontSize: 18, fontWeight: 600 }}>Модули</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 22 }}>
              {MODULES.map(m => (
                <li key={m.id}>
                  <button onClick={() => setActive(m.id)} style={{
                    background: "transparent", border: 0, padding: 0, cursor: "pointer", textAlign: "left",
                    color: m.id === active ? "#fff" : "rgba(255,255,255,0.55)",
                    fontSize: 17, fontWeight: m.id === active ? 600 : 400,
                    fontFamily: "Manrope, sans-serif",
                  }}>{m.name}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: active module detail */}
          <div style={{ background: "#f3f1ff", borderRadius: 28, padding: "32px 36px", color: "#151515", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ display: "inline-block", padding: "8px 18px", border: "1px solid rgba(21,21,21,.18)", borderRadius: 999, fontSize: 14 }}>
                Модуль {mod.name}
              </div>
              <Button variant="light">Смотреть</Button>
            </div>
            <h3 style={{
              fontSize: 44, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.05,
              color: "#4a3bff", maxWidth: 720, marginBottom: 32,
            }}>
              {mod.headline || mod.name}
            </h3>
            {mod.features && (
              <div style={{
                border: "1.5px dashed #ffb8e2", borderRadius: 20, padding: "20px 22px", marginBottom: 28, maxWidth: 560,
              }}>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{mod.features[0].title}</div>
                <div style={{ fontSize: 14, color: "rgba(21,21,21,0.7)", lineHeight: 1.5 }}>{mod.features[0].body}</div>
              </div>
            )}
            {mod.side && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                {mod.side.map(s => (
                  <div key={s.title}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                      <ModuleIcon kind={s.ic} />
                      <div style={{ fontSize: 17, fontWeight: 700 }}>{s.title}</div>
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(21,21,21,0.66)", lineHeight: 1.5 }}>{s.body}</div>
                  </div>
                ))}
              </div>
            )}
            {!mod.features && (
              <div style={{ color: "rgba(21,21,21,0.55)", fontSize: 14, fontStyle: "italic" }}>
                (Описание модуля — placeholder. Замените содержимым из исходного сайта.)
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- Stats section ---------- */
const StatsSection = () => (
  <section style={{ padding: "80px 40px 100px" }}>
    <div style={{ maxWidth: 1440, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 60, alignItems: "start", marginBottom: 60 }}>
        <h2 style={{
          fontFamily: "Manrope, sans-serif", fontWeight: 700,
          fontSize: 140, lineHeight: 0.95, letterSpacing: "-0.04em",
          color: "#d5fff3", margin: 0,
        }}>ЭмплиФлоу</h2>
        <p style={{ fontSize: 17, lineHeight: 1.5, color: "rgba(255,255,255,.82)", paddingTop: 30 }}>
          Помогаем шагать в ногу со временем и управлять собственным персоналом, сочетая современные технологии AI и анализа данных с инструментами повышения мотивации и вовлечённости сотрудников
        </p>
      </div>
      <p style={{ fontSize: 22, lineHeight: 1.3, color: "#fff", marginBottom: 40, maxWidth: 480 }}>
        Технологическая компания, разрабатывающая решения для направлений оценки и развития компаний среднего и крупного бизнеса
      </p>

      {/* Stat tile grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 1.2fr", gap: 20 }}>
        <StatTile bg="transparent" stroke num="5+" eyebrow="Заказчиков" tone="dark"
          caption={<>на государственном<br />и корпоративном уровне</>} />
        <StatTile bg="#ffb8e2" num=">35" unit="млн ₽" tone="light"
          caption="в год — экономическая окупаемость внедрения нашей платформы для компании" />
        <StatTile bg="#4a3bff" num="500+" unit="млн ₽" tone="dark"
          caption="сэкономили компаниям на автоматизации" />
      </div>
    </div>
  </section>
);

const StatTile = ({ bg, num, unit, eyebrow, caption, tone, stroke }) => (
  <div style={{
    background: bg,
    borderRadius: 32, padding: "32px 30px", minHeight: 260,
    color: tone === "light" ? "#151515" : "#fff",
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    boxShadow: stroke ? "inset 0 0 0 1px rgba(217,214,255,.12)" : "none",
  }}>
    <div>
      <span style={{
        fontFamily: "Manrope, sans-serif", fontWeight: 700,
        fontSize: 96, lineHeight: 0.9, letterSpacing: "-0.04em",
        color: bg === "transparent" ? "#d5fff3" : (tone === "light" ? "#151515" : "#fff"),
      }}>{num}</span>
      {unit && (
        <span style={{
          fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999,
          background: tone === "light" ? "rgba(21,21,21,.08)" : "rgba(255,255,255,.18)",
          color: tone === "light" ? "#151515" : "#fff",
          marginLeft: 10, verticalAlign: "middle", textTransform: "uppercase", letterSpacing: ".06em",
        }}>{unit}</span>
      )}
      {eyebrow && (
        <div style={{ marginTop: 14 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 999,
            background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.7)",
            textTransform: "uppercase", letterSpacing: ".12em",
            border: "1px solid rgba(217,214,255,.22)",
          }}>{eyebrow}</span>
        </div>
      )}
    </div>
    <div style={{
      fontSize: 13, lineHeight: 1.45,
      color: tone === "light" ? "rgba(21,21,21,0.7)" : "rgba(255,255,255,0.78)",
      maxWidth: 280,
    }}>{caption}</div>
  </div>
);

/* ---------- Implementation grid ---------- */
const IMPL = [
  { num: "01", title: "Определение задачи и диагностика", bg: "#4a3bff", tone: "dark" },
  { num: "02", title: "Настройка платформы под структуру компании", bg: "#ffb777", tone: "light" },
  { num: "03", title: "Интеграции с привычными сервисами", bg: "#d5fff3", tone: "light" },
  { num: "04", title: "Внедрение и запуск", bg: "#0a0540", tone: "dark", stroke: true },
  { num: "05", title: "Сопровождение и обучение", bg: "#ffb8e2", tone: "light" },
  { num: "06", title: "Развитие и масштабирование", bg: "#cec8ff", tone: "light" },
];

const ImplementationGrid = () => (
  <section style={{ padding: "60px 40px 120px" }}>
    <div style={{ maxWidth: 1440, margin: "0 auto" }}>
      <h2 style={{
        fontFamily: "Manrope, sans-serif", fontWeight: 700,
        fontSize: 56, lineHeight: 1.05, letterSpacing: "-0.03em",
        color: "#fff", textAlign: "center", margin: "0 auto 60px", maxWidth: 900,
      }}>
        Внедряем платформу в&nbsp;6&nbsp;шагов
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
        {IMPL.map(t => (
          <div key={t.num} style={{
            background: t.bg,
            borderRadius: 32,
            padding: 28,
            minHeight: 280,
            position: "relative",
            color: t.tone === "light" ? "#151515" : "#fff",
            boxShadow: t.stroke ? "inset 0 0 0 1px rgba(217,214,255,.10)" : "none",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <ArrowIcon size={40} strokeWidth={2.2} color={t.tone === "light" ? "#151515" : "#fff"} />
            </div>
            <div>
              <div style={{
                display: "inline-block",
                fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 999,
                background: t.tone === "light" ? "rgba(21,21,21,.08)" : "rgba(255,255,255,.16)",
                marginBottom: 16,
              }}>{t.num}</div>
              <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.02em", maxWidth: 280 }}>{t.title}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- Footer ---------- */
const Footer = () => (
  <footer style={{
    padding: "100px 40px 40px",
    background: "linear-gradient(180deg, #050230 0%, #0a0540 100%)",
    position: "relative",
  }}>
    <div style={{ maxWidth: 1440, margin: "0 auto" }}>
      <h2 style={{
        fontFamily: "Manrope, sans-serif", fontWeight: 700,
        fontSize: 84, lineHeight: 1.04, letterSpacing: "-0.03em",
        color: "#fff", maxWidth: 1000, marginBottom: 40,
      }}>
        Сделайте процессы прозрачными и&nbsp;управляемыми
      </h2>
      <Button variant="indigo" leadingIcon={<RoundArrowIcon />}>Получить демодоступ к платформе</Button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 40, marginTop: 120, alignItems: "end" }}>
        <div style={{ fontSize: 26, color: "#fff", letterSpacing: "-0.01em" }}>headoffice@emplyflow.ru</div>
        <div />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", lineHeight: 1.6, textAlign: "right" }}>
          Общество с ограниченной ответственностью «ЭМПЛИФЛОУ»<br />
          ОГРН: 1237700492479<br />
          ИНН: 7743422816<br />
          КПП: 773301001
        </div>
      </div>

      <div style={{
        fontFamily: "Manrope, sans-serif", fontWeight: 700,
        fontSize: 140, lineHeight: 0.9, letterSpacing: "-0.04em",
        color: "#fff", textAlign: "right", marginTop: 30,
      }}>ЭмплиФлоу</div>

      <div style={{
        marginTop: 40, paddingTop: 24,
        borderTop: "1px solid rgba(217,214,255,.10)",
        display: "flex", justifyContent: "space-between",
        fontSize: 12, color: "rgba(255,255,255,.55)",
      }}>
        <span>Политика конфиденциальности</span>
        <span>© 2026. Все права защищены</span>
        <span>Сайт запустила Молния</span>
      </div>
    </div>
  </footer>
);

Object.assign(window, { ModuleSwitcher, StatsSection, ImplementationGrid, Footer });
