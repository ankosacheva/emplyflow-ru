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

### 1. `hero-signal` — Hero ✅ подключено

| Поле | Значение |
|---|---|
| Файлы | `media/case-telecom/hero-signal.mp4` (739 КБ) / `.webm` (206 КБ), мобильные `hero-signal-mobile.mp4` (466 КБ) / `.webm` (120 КБ) |
| Постеры | `media/case-telecom/posters/hero-signal.jpg`, `hero-signal-mobile.jpg` |
| Глава | 01, Hero |
| Назначение | Фон под заголовок: один сигнал превращается в сеть |
| Desktop / mobile | 1280×720 и вертикальный кроп 720×1280 |
| Длительность | 10 с после сборки цикла (исходник 5 с) |
| Тип | seamless loop |
| Модель референса | `soul_2`, 2K, 16:9, job `b0d8d269-6a30-47fa-97ba-f8c6d9c74f66` |
| Модель видео | `kling3_0_turbo`, 5 с, 16:9, `medias[{role: start_image}]` = job референса, job `cff799b1-ecc4-4540-97bd-d4ee573cdd47` |
| Статус | Принято по чек-листу, подключено на страницу |

Промпт референс-кадра (важно: запрет текста пришлось прописать явным перечислением,
с первой попытки модель нарисовала на фоне случайные буквы и цифры):

```
Completely textless abstract cinematic background. Deep dark navy-purple void (#050230).
In the lower third of the frame, one luminous voice waveform travels from the left, passes
through a soft glowing spherical core, and splits into exactly three smooth light ribbons
that sweep toward the right edge: one deep violet, one frosted mint, one warm peach. Faint
parallel light threads suggest a large calm network far in the background. The entire upper
half of the image is empty dark space with nothing in it. Absolutely no text, no letters,
no numbers, no digits, no glyphs, no symbols, no captions, no labels, no charts, no
interface elements, no logos, no watermark, no human figures. Pure abstract light and
gradient only. Editorial technology aesthetic, volumetric lighting, cinematic depth of
field, elegant restraint.
```

Промпт видео:

```
Slow cinematic camera pull-back. The single luminous signal continues to travel from the
left into the glowing core, and the three coloured light ribbons — violet, mint and peach —
flow smoothly outward to the right, gently undulating. Faint background light threads slowly
multiply into a calm wide network. The upper half of the frame stays empty dark space
throughout. Extremely slow, elegant, seamless looping motion. No text, no numbers, no logos,
no people.
```

Пост-обработка (локально, ffmpeg):

```bash
# бесшовный цикл: прямой проход + реверс, без звука
ffmpeg -i hero.mp4 -filter_complex "[0:v]reverse[r];[0:v][r]concat=n=2:v=1[v]" \
  -map "[v]" -an -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart hero-signal.mp4
ffmpeg -i hero-signal.mp4 -an -c:v libvpx-vp9 -crf 38 -b:v 0 -row-mt 1 hero-signal.webm
# вертикальный кроп под мобильные
ffmpeg -i hero-signal.mp4 -vf "crop=in_h*9/16:in_h:(in_w-in_h*9/16)/2:0,scale=720:1280" \
  -an -c:v libx264 -crf 25 -preset slow -pix_fmt yuv420p -movflags +faststart hero-signal-mobile.mp4
```

Конец исходного клипа заметно ярче начала, поэтому обычный `loop` дал бы рывок —
цикл собран как ping-pong из прямого прохода и реверса.

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

Реализовано для hero в `initHeroVideo()`, остальные сцены подключаются так же.

1. Сложить файлы в `media/case-telecom/` и постеры в `media/case-telecom/posters/`.
2. Разметка — пустой `<video muted playsinline loop preload="none" poster="…">` без
   `<source>`: источник подставляет скрипт по `matchMedia('(max-width: 760px)')`,
   поэтому desktop и mobile ассеты никогда не грузятся одновременно.
3. Загрузка и воспроизведение стартуют по IntersectionObserver, вне вьюпорта — пауза.
4. Если видео не отдало ни одного кадра за 6 секунд или отдало `error`,
   элемент удаляется и включается Canvas-фолбэк.
5. В `prefers-reduced-motion` видео не грузится вообще, остаётся постер.
6. Поверх видео лежит `.hero__scrim` — горизонтальный градиент, который держит
   контраст текста левой колонки независимо от яркости кадра.
