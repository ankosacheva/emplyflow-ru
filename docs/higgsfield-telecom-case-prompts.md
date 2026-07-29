# Телеком-кейс — видеосцены Higgsfield

Страница: `page101340001.html`. Видео — усиление, а не условие работы страницы:
hero и финал сейчас закрыты Canvas-сценами и градиентами, поэтому подключать
ролики можно поэтапно.

## Инструменты MCP

Проверено в сессии, сервер `user-higgsfield` в состоянии `ready`.

| Задача | Инструмент | Ключевые параметры |
|---|---|---|
| Референс-кадр | `generate_image` | `params.model`, `params.prompt`, `params.aspect_ratio`, `params.count` |
| Видео | `generate_video` | `params.model`, `params.prompt`, `params.duration`, `params.aspect_ratio`, `params.medias[{value, role}]` |
| Подбор модели | `models_explore` | `action:'recommend'` с описанием цели |
| Статус задачи | `job_status` | `job_id` |
| Загрузка файла | `media_upload` → `media_confirm` | роль в `medias[].role`: `start_image` / `end_image` / `image` |
| Импорт по URL | `media_import_url` | возвращает `media_id`, в `medias[].value` нельзя передавать URL |
| Апскейл | `upscale_video` | до 2K/4K |
| Смена пропорций | `reframe` | из 16:9 в 9:16 для мобильных кропов |

Порядок работы: `models_explore(action:'recommend')` → `generate_image` (референс) →
`generate_video` со ссылкой на референс через `medias[].role = start_image` →
проверка кадра → остальные сцены → `upscale_video` → `reframe` для мобильных версий.

## Общий visual direction

```
Premium cinematic abstract enterprise AI environment, deep dark-purple space,
elegant luminous signal waves, translucent speech fragments, abstract employee
profiles, competency indicators, flowing data nodes, soft lavender mint peach and
pink accents, editorial technology aesthetic, realistic depth and materials,
controlled volumetric lighting, subtle telecommunications-inspired network patterns,
elegant slow camera motion, generous negative space in the centre for typography.
```

Общий negative prompt для всех сцен:

```
literal telecom towers, antennas, satellites, cables, cyberpunk city, neon signage,
random readable text, letters, numbers, percentages, charts with values, UI screenshots,
external logos, watermark, close-up human faces, portraits, crowded composition,
oversaturated colours, lens flare spam, glitch artefacts
```

Ограничение: в видео не должно быть интерфейсных текстов, цифр, процентов, отчётов,
названий компетенций, логотипов и CTA. Все данные и подписи — HTML/CSS/SVG-слои.

## Палитра по веткам

| Ветка | Акценты в промпте |
|---|---|
| Оценка руководителей | `deep violet #4a3bff, soft lavender #cec8ff` |
| Обучение | `frosted mint #d5fff3, lavender #cec8ff` |
| Переговоры | `peach #ffb777, cotton candy pink #ffb8e2` |

## Сцены

### 1. `hero-signal` — Hero

| Поле | Значение |
|---|---|
| Файлы | `media/case-telecom/hero-signal.mp4` / `.webm`, постер `media/case-telecom/posters/hero-signal.jpg` |
| Глава | 01, Hero |
| Назначение | Фон под заголовок: один сигнал превращается в сеть диалогов |
| Desktop / mobile | 16:9 и отдельный 9:16 кроп через `reframe` |
| Длительность | 8 с |
| Тип | loop |
| Статус | не сгенерировано |

Prompt:

```
A single luminous voice waveform travels through deep dark-purple space. The wave passes
through a softly glowing spherical core and begins to split into three separate light
lines: violet, mint and peach. Translucent speech fragments and small competency markers
drift around the wave. The camera slowly pulls back and the single line is revealed to be
one of hundreds of parallel light threads forming a calm network. Centre of the frame stays
dark and uncluttered. Elegant slow camera motion, cinematic depth of field, volumetric
lighting, editorial technology aesthetic.
```

### 2. `scale-room` — Ограничения ручного процесса

| Поле | Значение |
|---|---|
| Файлы | `media/case-telecom/scale-room.mp4` / `.webm` |
| Глава | 02, Масштаб |
| Назначение | Ощущение качественного, но ограниченного процесса |
| Длительность | 7 с |
| Тип | one-shot |
| Статус | не сгенерировано |

Prompt:

```
An abstract meeting space rendered as a single softly lit table of light in a dark violet
void. Around it, a long queue of faint abstract profile silhouettes waits, extending far
into the distance. A grid of empty time slots slowly fills with soft blocks until the space
feels dense and constrained. The lit table stays exactly the same size while the queue grows.
Slow, heavy camera movement. No faces, no furniture detail, no readable text.
```

### 3. `branch-assessment` — Ветка оценки

| Поле | Значение |
|---|---|
| Файлы | `media/case-telecom/branch-assessment.mp4` / `.webm` |
| Глава | 04, ветка 1 |
| Длительность | 6 с |
| Тип | loop |
| Статус | не сгенерировано |

Prompt:

```
A stream of translucent speech fragments flows through a violet analytical field. Fragments
connect to a vertical column of small glowing indicator nodes, one by one, with precise
measured motion. The connected fragments assemble into a clean structured block of light.
Deep violet and soft lavender accents, calm structural grid in the background, restrained
camera drift.
```

### 4. `branch-learning` — Ветка обучения

| Поле | Значение |
|---|---|
| Файлы | `media/case-telecom/branch-learning.mp4` / `.webm` |
| Глава | 05, ветка 2 |
| Длительность | 6 с |
| Тип | loop |
| Статус | не сгенерировано |

Prompt:

```
A loose scatter of disconnected light fragments gradually reorganises into an ordered
sequence: fragments align, links grow between them, and a clear ascending trajectory forms.
The structure keeps accumulating detail as it grows. Frosted mint and lavender accents,
soft organic growth motion, feeling of development rather than examination.
```

### 5. `branch-negotiation` — Ветка переговоров

| Поле | Значение |
|---|---|
| Файлы | `media/case-telecom/branch-negotiation.mp4` / `.webm` |
| Глава | 06, ветка 3 |
| Длительность | 6 с |
| Тип | loop |
| Статус | не сгенерировано |

Prompt:

```
Two opposing light signals approach each other through dark space. They collide, slow down,
push back and change direction. Small sharp pulses break off at each contact point. The
warmer signal alternately intensifies and cools, shifting the emotional temperature of the
exchange. Peach and cotton-candy pink accents, faster and more dynamic camera than the other
scenes, tense pauses between impacts.
```

### 6. `segmentation-map` — Сегментация

| Поле | Значение |
|---|---|
| Файлы | `media/case-telecom/segmentation-map.mp4` / `.webm` |
| Глава | 06, сцена 5 |
| Длительность | 7 с |
| Тип | one-shot |
| Статус | не сгенерировано |

Prompt:

```
A single glowing profile marker sits alone in dark violet space. The camera pulls back
rapidly and hundreds, then thousands of similar points appear. The points drift and settle
into distinct soft clusters by pattern, forming a living competency map. Abstract points
only, no personal data, no faces, no labels. Wide sweeping camera pull-back, cinematic scale.
```

### 7. `finale-network` — Финал

| Поле | Значение |
|---|---|
| Файлы | `media/case-telecom/finale-network.mp4` / `.webm` |
| Глава | 10, Финал |
| Длительность | 8 с |
| Тип | loop |
| Статус | не сгенерировано |

Prompt:

```
Three coloured light lines — violet, mint and peach — converge back into a single glowing
core. From the core, signals distribute outward into a large, calm, evenly structured
network that fills the frame. The network settles into a stable confident rhythm. Generous
empty space in the lower half of the frame for typography. Slow cinematic camera, balanced
composition, quiet resolution.
```

## Чек-лист приёмки кадра

Перед подключением каждой сцены проверить:

- стиль и палитра совпадают с остальными сценами;
- HTML-текст поверх читается, центр композиции спокойный;
- нет случайных букв, цифр и подписей;
- нет сторонних логотипов и watermark;
- нет лиц крупным планом;
- нет буквальных телеком-вышек, антенн и кабелей;
- нет избыточного киберпанка;
- движение камеры медленное, склейка пригодна для loop.

## Подключение к странице

1. Сложить файлы в `media/case-telecom/` и постеры в `media/case-telecom/posters/`.
2. В hero и финале заменить `<canvas>` на `<video>` с `poster`, `muted`, `playsinline`,
   `preload="none"` и парой источников WebM + MP4.
3. Оставить Canvas как фолбэк, если видео не загрузилось.
4. Останавливать воспроизведение вне вьюпорта через IntersectionObserver.
5. В `prefers-reduced-motion` показывать только постер.
6. Не заливать исходное разрешение: подготовить desktop и mobile версии,
   мобильный кроп получать через `reframe`.
