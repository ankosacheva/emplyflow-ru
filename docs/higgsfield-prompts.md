# Higgsfield — промпты для видеосцен кейса Performance Review

## Статус

**Видео сгенерированы и подключены** (коммит `a910a5e`, 28 июля 2026).

В чате «EmplyFlow дизайн система» сначала страница собрана на canvas (`8f77af6`), затем после подключения MCP `user-higgsfield` сгенерированы 7 сцен, закодированы в `media/case-pr/` и встроены в `page101071766.html` через `data-video`. Hero перегенерирован и апскейлен до 1080p (`upscale_video`).

| Сцена | Файлы | Разметка |
|---|---|---|
| `hero-chaos` | mp4/webm 1920×1080 + mobile 1080×1920 | Hero, `data-video-priority` |
| `before-scattered` | mp4/webm | Story «Цели жили порознь» |
| `before-scales` | mp4/webm | Story «Оценкам не доверяли» |
| `before-calendar` | mp4/webm | Story «HR тонул в Excel» |
| `before-hidden` | mp4/webm | Story «Лучших не было видно» |
| `after-converge` | mp4/webm | Глава «После запуска» |
| `final-flow` | mp4/webm | Финал |

**Не сгенерировано:** `after-talentmap` — в разметке не используется (Talent Matrix на SVG/DOM).

Загрузка: `js/emplyflow-case-story.js` → `initVideoScenes()` — один источник desktop/mobile, lazy load ниже первого экрана, poster при `prefers-reduced-motion`.

Первоначальная сборка без Higgsfield (canvas) описана в коммите `8f77af6`; canvas-код удалён в `a910a5e`.

## Общий visual direction

Единый стиль для всех сцен:

```
Cinematic abstract enterprise HR technology environment, dark deep-purple space (#050230),
floating translucent data sheets, subtle spreadsheet grids, employee profile cards,
KPI indicators, soft pink (#FFB8E2) mint (#D5FFF3) peach (#FFB777) and lavender (#CEC8FF)
light accents, premium editorial motion design, controlled slow camera movement,
elegant volumetric lighting, realistic materials mixed with abstract UI elements,
no cyberpunk, no neon, no people in close-up, no readable random text, no third-party logos,
no watermark, seamless loop where possible.
```

Негативный промпт для всех сцен:

```
text, letters, numbers, logos, watermark, ui labels, human faces, cyberpunk, neon signs,
glitch, chromatic aberration, lens flare overload, cluttered composition
```

## Сцены

### 1. `hero-chaos`

- **Раздел:** Глава 1, Hero
- **Loop:** да · **Длительность:** 8–12 с · **Desktop:** 1920×1080 · **Mobile:** 1080×1920
- **Poster:** `media/case-pr/posters/hero-chaos.jpg`

```
Slow forward camera push through a dark deep-purple void filled with dozens of translucent
floating HR documents: spreadsheet sheets with faint grid lines, form cards, email panels,
KPI tiles, employee profile cards. The documents drift at different depths and occasionally
block the camera path. A single small bright pink light spark weaves between them, changing
direction when blocked. Soft volumetric light, premium editorial motion, shallow depth of field,
composition leaves the lower-left third empty for large text overlay.
```

### 2. `before-scattered`

- **Раздел:** Глава 3, сцена «Цели жили порознь»
- **Loop:** да · **Длительность:** 6–8 с

```
Four separate clusters of translucent spreadsheet sheets drifting apart in dark purple space,
no connections between clusters, thin broken light threads between them fading out,
cold lavender accents, slow lateral camera drift, sense of disconnection.
```

### 3. `before-scales`

- **Раздел:** Глава 3, сцена «Оценкам не доверяли»
- **Loop:** да · **Длительность:** 6–8 с

```
Abstract evaluation dials and half-filled circular gauges floating in dark purple space,
each gauge filled to a different level and misaligned with the others, only half of each ring
illuminated in pink, the other half dark, slow rotation, sense of incomplete measurement.
```

### 4. `before-calendar`

- **Раздел:** Глава 3, сцена «HR тонул в Excel»
- **Loop:** да · **Длительность:** 6–8 с

```
A long horizontal timeline of abstract week blocks stretching far into the distance in dark
purple space, dense stacks of translucent spreadsheets piling up above each block, slow camera
travel along the timeline, peach accents, sense of a process taking too long.
```

### 5. `after-converge`

- **Раздел:** Глава 7, «После запуска»
- **Loop:** да · **Длительность:** 8–10 с

```
Scattered translucent data sheets smoothly converge and merge into one clean glowing employee
profile card at the center of a dark purple space, clean light threads connect the incoming
streams, mint and lavender accents, calm confident motion, elegant volumetric lighting,
structured composition, seamless loop.
```

### 6. `after-talentmap`

- **Раздел:** Глава 7, блок Talent Matrix
- **Loop:** да · **Длительность:** 6–8 с

```
Blurred abstract profile particles gradually organize into a clean structured 3x3 grid of
glowing tiles in dark purple space, two tiles highlighted in soft pink, calm settling motion,
premium minimal composition, no text.
```

### 7. `final-flow`

- **Раздел:** Глава 9, финал
- **Loop:** нет (one-shot) · **Длительность:** 5–6 с

```
A bright four-point light spark travels quickly along a clean curved light path through a dark
purple space, passing through several abstract waypoints that light up in sequence, ending in a
calm open bright area, mint and pink accents, cinematic ease-out ending, one-shot.
```

## Требования к выдаче

- Без текста и цифр в кадре — вся типографика делается HTML/CSS-слоями.
- Без логотипов сторонних компаний и водяных знаков.
- Проверять пригодность к бесшовному повтору для всех loop-сцен.
- Экспорт: WebM (VP9) + MP4 (H.264, `-movflags +faststart`), poster — JPEG q≈3.

```bash
ffmpeg -y -i in.mp4 -vf scale=1600:-2 -c:v libx264 -crf 23 -preset slow \
  -pix_fmt yuv420p -movflags +faststart -an media/case-pr/<name>.mp4
ffmpeg -y -i in.mp4 -vf scale=1600:-2 -c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -an media/case-pr/<name>.webm
ffmpeg -y -ss 2 -i in.mp4 -frames:v 1 -vf scale=1600:-2 -q:v 3 media/case-pr/posters/<name>.jpg
```
