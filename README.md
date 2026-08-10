# EmplyFlow (emplyflow.ru)

Основной маркетинговый сайт EmplyFlow. Экспорт с Tilda, хостинг на Timeweb VPS.

- Прод: https://emplyflow.ru
- VPS: `212.113.123.95`, web-root `/var/www/emplyflow.ru/`
- Hub (отдельный репозиторий): https://emplyflow.ru/hub/ → `ankosacheva/emplyflow-competency-hub`

## Структура

| Файл / папка | Назначение |
|---|---|
| `index.html` | Главная (самодостаточный бандл: стили/шрифты/картинки внутри) |
| `page94832006.html` | Та же главная (для совместимости со старым DirectoryIndex / nginx) |
| `src/index.template.html` | Редактируемый исходник главной, из него собирается бандл |
| `media/` | Ролик первого экрана: `hero-animation.mp4`, `.webm`, стоп-кадр `-poster.jpg` |
| `page92826026.html` | `/privacy` |
| `page96476846.html` и др. | Кейсы / лендинги |
| `htaccess` | Правила ЧПУ из Tilda (на nginx переписаны в vhost) |
| `css/`, `js/`, `images/`, `files/` | Статика Tilda (прочие страницы) |
| `design-system/` | Каноническая дизайн-система EmplyFlow: токены, шрифты, ассеты, превью и UI-kit |

ЧПУ на nginx (фрагмент):

- `/` → `index.html` (или `page94832006.html`)
- `/privacy` → `page92826026.html`
- `/performance-review-dlya-proizvoditelya` → `page101071766.html`
- `/avtomatizatsiya-otsenki-po-keysam-v-telekome` → `page101340001.html`
- `/karyernye-treki-inzhiniring` → `page96490096.html`
- и остальные rewrite из `htaccess`

Каталог `/hub/` на сервере **не** из этого репозитория — его деплоит Competency Hub.

## Дизайн-система

Перед созданием или изменением блоков используйте `design-system/` как источник истины:

- `design-system/README.md` — визуальные и контентные принципы;
- `design-system/colors_and_type.css` — цвета, типографика, отступы, радиусы, тени и motion-токены;
- `design-system/preview/` — эталонные примеры цветов, типографики и компонентов;
- `design-system/ui_kits/website/` — переиспользуемые реализации блоков сайта;
- `design-system/assets/` — логотип, палитра и референсные скриншоты.

Новые блоки должны использовать существующие токены и паттерны дизайн-системы. Если нужного паттерна нет, сначала расширьте дизайн-систему, затем применяйте его на сайте.

## Как править главную

`index.html` — бандл: разметка лежит JSON-строкой внутри `<script type="__bundler/template">`, шрифты и картинки — base64 в манифесте и подставляются по uuid уже в браузере. Руками такой файл не редактируют, правки идут через исходник:

```bash
python3 scripts/bundle_index.py extract   # бандл -> src/index.template.html (одноразово, если файла нет)
# правим src/index.template.html
python3 scripts/bundle_index.py build     # обратно в index.html + page94832006.html
python3 scripts/bundle_index.py assets    # выгрузить ассеты бандла в src/assets/ (по необходимости)
```

`build` синхронизирует `page94832006.html` и проверяет, что бандл снова парсится. Стили главной живут в `<style>`-блоках внутри `<helmet>` (там же токены дизайн-системы), разметка — в `<x-dc>`, данные секций (модули, кейсы, логотипы) — в `<script type="text/x-dc">` в конце файла.

Первый экран повторяет композицию сайта и собран на токенах дизайн-системы: тёмный canvas Black Rock, центрированный заголовок «HRM-платформа для оценки, целеполагания и мотивации сотрудников», пунктирная плашка «на базе ИИ» (Cotton Candy) правее центра, indigo-пилюля «Что входит в платформу», стеклянная карточка Rusbase справа и три пастельные карточки снизу — Оценка результатов (Frosted Mint), Анализ потенциала (Periwinkle), План развития (Cotton Candy), выровненные по нижнему краю с разной высотой.

`src/` — только исходники, на прод не выкладывается (см. `--exclude src` в блоке деплоя).

### Раздел «Этапы внедрения»

Шесть шагов внедрения — glass-карточки (`.ef-step`) на подсвеченном фоне: у каждой свой акцент из палитры (Blue Ribbon → Mac & Cheese → Frosted Mint → Periwinkle → Cotton Candy → Fog), он задаёт тон стекла `--ef-tint`, свечение `--ef-glow`, кромку сверху, номер шага и стрелку. Колонки идут каскадом со сдвигом вниз, карточки появляются по скроллу через `animation-timeline: view()`, по ним пробегает блик, свечение внутри дышит в разной фазе, на hover карточка приподнимается и светится сильнее. Фоновые пятна — три размытых радиальных градиента (indigo, pink, mint), медленно дрейфуют.

Браузеры без scroll-driven анимаций просто показывают карточки статично, а при `prefers-reduced-motion: reduce` выключаются дрейф, пульсация и блик.

### Ролик первого экрана

Под кнопкой стоит зацикленный ролик: данные из 1С:ЗУП, Excel, целей и KPI, отзывов коллег, оценки 360° и модели компетенций стягиваются в профиль сотрудника, дальше появляются рекомендации ИИ — кадровый резерв, готовый ИПР, риск перегрузки.

| Что | Где |
|---|---|
| Файлы для сайта | `media/hero-animation.mp4` (1600×900, ~450 КБ), `.webm`, `-poster.jpg` |
| Исходник анимации (DC-компонент) | `src/hero-animation/` — `hero.jsx`, `animations-v2.jsx`, `support.js`, `Hero Animation.dc.html`, `icons/`, `img/` |

Фон ролика совпадает с canvas Black Rock, поэтому он вставлен без рамки, с растворением верхнего края. Играет как `autoplay muted loop playsinline`; на экранах до 700 px и при `prefers-reduced-motion` вместо видео показывается стоп-кадр — мелкий текст внутри ролика там всё равно не читается.

Пересобрать файлы для сайта из нового рендера (`Hero Animation.mp4`):

```bash
ffmpeg -y -i "Hero Animation.mp4" -vf scale=1600:-2 -c:v libx264 -crf 23 -preset slow \
  -pix_fmt yuv420p -movflags +faststart -an media/hero-animation.mp4
ffmpeg -y -i "Hero Animation.mp4" -vf scale=1600:-2 -c:v libvpx-vp9 -crf 31 -b:v 0 -row-mt 1 -an media/hero-animation.webm
ffmpeg -y -ss 4.7 -i "Hero Animation.mp4" -frames:v 1 -vf scale=1600:-2 -q:v 3 media/hero-animation-poster.jpg
```

## Адаптив / мобильное меню

На iPad/планшетах меню раньше открывалось пустым светлым блоком: пункты были сверстаны только для ≤639px.  
Фикс: `css/emplyflow-responsive.css` + настройки NLM-попапа в `page94832006.html` (тёмный fullscreen-фон, вертикальный список на ≤1199px).

## Формы заявок (демо / получить доступ)

Попап «Получить доступ» — **обычная HTML-форма** (не Tilda Forms).  
Отправка только в **Google Sheet + email** через Apps Script, как у Hub. Не зависит от подписки Tilda и их `forms.tildacdn.com`.

| Что | Где |
|---|---|
| Разметка формы | `partials/ef-lead-form.html` (встроена в страницы) |
| Стили | `css/emplyflow-demo-form.css` |
| Клиентский JS | `js/emplyflow-site-leads.js` |
| Endpoint | `window.EMPLYFLOW_LEAD_ENDPOINT` на страницах с формой |
| Apps Script (шаблон) | `docs/google-apps-script-site-leads.js` |
| Почта уведомлений | `headoffice@emplyflow.ru` (`NOTIFY_EMAIL` в Apps Script) |

Сейчас endpoint указывает на **тот же Web App**, что и Hub (`HUB_LEAD_ENDPOINT`). Чтобы письма шли на `headoffice@emplyflow.ru`:

1. Откройте Google Sheet → Apps Script проекта заявок Hub/сайта.
2. Поставьте `NOTIFY_EMAIL = 'headoffice@emplyflow.ru'` (можно через запятую добавить запасной адрес).
3. Deploy → Manage deployments → Edit → **New version** → Deploy.

Либо задеплойте отдельный скрипт из `docs/google-apps-script-site-leads.js` и подставьте новый `/exec` URL в `EMPLYFLOW_LEAD_ENDPOINT`.

Поле `source` в таблице: `site_demo_popup` (попап на главной), `site_demo` (прочие формы сайта), плюс источники Hub (`nav`, `case`, …).

## Локально

```bash
python3 -m http.server 8080
# http://localhost:8080/   или   http://localhost:8080/index.html
```

Главная (`index.html`) самодостаточна и работает офлайн. Локально ЧПУ кейсов и модулей поднимает `scripts/dev_server.sh` (читает `htaccess`):

```bash
PORT=8899 ./scripts/dev_server.sh
# http://127.0.0.1:8899/performance-review-dlya-proizvoditelya
```

## Деплой

```bash
rsync -avz --delete \
  --exclude .git --exclude .gitignore --exclude README.md \
  --exclude hub --exclude src \
  ./ root@212.113.123.95:/var/www/emplyflow.ru/
```

Важно: не затирать `/var/www/emplyflow.ru/hub/` (если rsync с `--delete`, обязательно `--exclude hub`).

После деплоя проверить:

- https://emplyflow.ru/
- https://emplyflow.ru/privacy
- https://emplyflow.ru/hub/ (должен остаться Hub)
