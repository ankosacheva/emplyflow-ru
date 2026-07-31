# Higgsfield — промпты для инжинирингового кейса

Страница: `page96490096.html`. Медиа складываются в `media/case-engineering/`, постеры — в `media/case-engineering/posters/`.

Страница спроектирована так, что **работает без видео**: hero и ключевые сцены построены на Canvas и SVG. Видео подключается как дополнительный слой через `data-video` и деградирует до постера при `prefers-reduced-motion` и на медленной сети.

## Доступные инструменты MCP

Проверено на сервере `user-higgsfield`: `generate_video` (text-to-video и image-to-video через `medias[].role = start_image / end_image / image`), `generate_image`, `models_explore`, `upscale_video`, `reframe`, `media_upload` / `media_import_url`, `job_status`, `motion_control`. Модели по умолчанию: `kling3_0_turbo` для быстрых text-to-video и анимации одного стартового кадра, `kling3_0` для мультикадровых сцен, `seedance_2_0` при необходимости консистентности.

Рекомендуемая последовательность: `generate_image` для reference frame → `generate_video` с этим кадром в роли `start_image` → `job_status` → скачивание → конвертация в webm/mp4 → постер.

## Общий visual direction

```
Premium cinematic abstract engineering and talent architecture environment, deep dark-purple background #050230, elegant technical blueprint lines, modular project structures, translucent role nodes, verified skill layers, human-centered talent profiles represented as abstract luminous forms, mint peach lavender and soft pink accents, precise editorial motion design, sophisticated enterprise technology aesthetic, subtle volumetric light, controlled camera movement, shallow depth of field, 24fps cinematic motion blur
```

Общий negative prompt для всех сцен:

```
cyberpunk, neon signs, sci-fi HUD, construction company advertisement, hard hats close-up, real machinery photography, readable text, numbers, percentages, charts with labels, logos, watermark, UI buttons, documents with legible content, faces, people, stock photo look, lens flare overload, chromatic aberration, jitter, flicker
```

## Сцены

| Имя | Раздел | Формат | Длительность | Тип | Постер | Статус |
|---|---|---|---|---|---|---|
| `hero-blueprint` | Глава 1 · Hero | desktop 16:9 | 5 с | loop | `posters/hero-blueprint.jpg` | **готово** |
| `hero-blueprint-mobile` | Глава 1 · Hero | mobile 9:16 | 5 с | loop | `posters/hero-blueprint-mobile.jpg` | **готово**, кроп из десктопной версии |
| `scattered-sources` | Глава 2 · До внедрения | desktop 16:9 | 6 с | loop | `posters/scattered-sources.jpg` | разметка подключена, видео ждёт генерации |
| `skill-architecture` | Глава 3 · Оцифровка ролей | desktop 16:9 | 6 с | loop | `posters/skill-architecture.jpg` | разметка подключена, видео ждёт генерации |
| `matching-signal` | Глава 5 · Двойной матчинг | desktop 16:9 | 6 с | loop | `posters/matching-signal.jpg` | разметка подключена, видео ждёт генерации |
| `career-branching` | Глава 8 · Карьерная карта | desktop 16:9 | 7 с | one-shot | `posters/career-branching.jpg` | разметка подключена, видео ждёт генерации |
| `experience-loop` | Глава 10 · Цикл развития | desktop 16:9 | 6 с | loop | `posters/experience-loop.jpg` | разметка подключена, видео ждёт генерации |
| `finale-system` | Глава 12 · Финал | desktop 16:9 | 5 с | loop | `posters/finale-system.jpg` | разметка подключена, видео ждёт генерации |

Модель: `kling3_0_turbo`, генерация через MCP `generate_video`.

### Что выяснилось на практике

Первые формулировки промптов давали **непригодный результат**, и это стоит учитывать при генерации оставшихся сцен:

1. Требование «wide empty center of frame reserved for typography» модель игнорирует — конструкция всё равно занимает центр и левую часть, где стоит заголовок. Работает только явное указание доли кадра: «filling the entire left two thirds of the frame as empty negative space. On the right third only: …».
2. Формулировки про «volumetric light» и «cinematic» дают серо-фиолетовую дымку вместо фирменного `#050230`. Нужно прямо требовать «extremely dark near-black deep purple void, almost pure #050230» и добавлять в негатив «no fog, no grey haze, no bloom filling the frame».
3. «Camera flying through» уводит в аттракцион и ломает читаемость. Для фонового слоя нужен «slow subtle parallax drift, no camera flythrough».

### 1. `hero-blueprint` — использованный промпт

```
Extremely dark near-black deep purple void, almost pure #050230 background filling the entire left two thirds of the frame as empty negative space. On the right third only: a delicate abstract engineering blueprint made of very thin pale lavender construction lines, a few small translucent empty nodes glowing softly with mint highlights, and faint connection threads slowly drawing themselves upward into the structure. Extremely minimal, sparse, high contrast between the black emptiness and the fine luminous linework. Slow subtle parallax drift, no fast motion, no camera flythrough, no bright fog, no grey haze, no glow filling the frame. Premium restrained enterprise aesthetic, no cyberpunk, no readable text, no numbers, no logos, no people, no reflective floor
```

Подключение: `<video id="hero-video">` в hero, источники подставляет `initHeroVideo()` по ширине экрана, слева кадр уходит в фон через `mask-image`, Canvas-слой связей приглушается до 0.4. При `prefers-reduced-motion` видео не грузится, остаётся постер.

### 2. `scattered-sources`

```
Abstract translucent document planes drifting in separate depth layers inside deep purple space, spreadsheet grids, certificate cards, project lists and technical drawing fragments floating disconnected from each other, each layer lit differently so no single viewpoint can see them all at once, very slow parallax drift, cold isolated composition, no legible text, muted lavender and pale blue accents, quiet unresolved atmosphere
```

### 3. `skill-architecture`

```
Fragments of abstract technical document planes dissolving into precise structured layers, each layer forming a clean geometric grid of small luminous nodes representing skills, experience, certifications and access levels, layers stacking with mechanical precision and locking into alignment, violet core light with mint verification highlights, architectural drafting aesthetic, controlled elegant motion, no readable text
```

### 4. `matching-signal`

```
A single luminous project node on the left emitting structured requirement pulses across deep purple space, several abstract talent profile forms on the right responding with different signal intensities, hard constraint filters visualized as thin geometric gates that some signals pass and others do not, matching connections brightening into stable mint lines, a separate peach line rising to indicate career relevance for the profile, precise symmetrical composition, calm analytical motion
```

### 5. `career-branching`

```
A single vertical luminous line slowly branching into five distinct paths inside deep purple space, expert path deepening downward into dense structure, managerial path widening into connected nodes, lateral path curving sideways into an adjacent grid, project path forming short bright segments, each branch unfolding softly and remaining open-ended, no ladder imagery, peach and lavender accents, spacious hopeful composition, gentle blooming motion
```

### 6. `experience-loop`

```
An abstract human profile form entering a modular project structure, the structure completing itself as the form participates, then a new translucent experience layer detaching from the finished structure and returning to the profile, the profile becoming denser and brighter, new connection points opening around it toward previously unreachable nodes, seamless circular motion, soft blue experience accents on violet base, calm continuous loop
```

### 7. `finale-system`

```
A complete engineering blueprint fully populated with luminous connected role nodes, the static schematic gradually turning into a living breathing system with gentle pulses travelling along the structure, career trajectories remaining visible as open branching lines extending beyond the frame, wide calm composition with generous empty space at the bottom for a call to action, warm confident lighting, slow steady camera pull back
```

## Ограничения для всех сцен

В видео не должно быть: процентов, названий должностей, любого текста, отчётов, логотипа EmplyFlow, интерфейсных кнопок, реальных документов, персональных данных, лиц. Все тексты и показатели реализованы в HTML/CSS/SVG поверх видео.

## Постпродакшн

1. Скачать результат по ссылке из `job_status`.
2. Конвертация: `ffmpeg -i in.mp4 -c:v libvpx-vp9 -crf 34 -b:v 0 -an out.webm` и `ffmpeg -i in.mp4 -c:v libx264 -crf 24 -preset slow -an -movflags +faststart out.mp4`.
3. Постер: `ffmpeg -i in.mp4 -ss 00:00:01 -frames:v 1 -q:v 3 posters/<name>.jpg`.
4. Положить в `media/case-engineering/`, имя без расширения указать в `data-video` соответствующего блока.

## Подключение на странице

Разметка и `initVideoScenes()` в `js/emplyflow-engineering-case.js` уже подключены для всех сцен. Hero использует `data-video-priority` для немедленной загрузки; остальные главы — ленивая загрузка через `IntersectionObserver`. Пока mp4/webm отсутствуют, показывается poster.

## Статус MCP (2026-07-31)

Сессия Higgsfield в cloud-agent среде истекла: `balance`, `generate_image`, `job_status`, `show_generations` возвращают «session expired». `generate_video` отвечает на валидацию, но `models_explore` возвращает пустой список — генерация недоступна до повторной авторизации коннектора в Cursor (Settings → MCP → Higgsfield: удалить и добавить заново). Ошибка «localhost» при OAuth обычно означает, что callback не доходит до Cursor Desktop — авторизацию нужно делать локально, не в cloud agent.
