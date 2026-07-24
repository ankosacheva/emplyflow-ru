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
| `page92826026.html` | `/privacy` |
| `page96476846.html` и др. | Кейсы / лендинги |
| `htaccess` | Правила ЧПУ из Tilda (на nginx переписаны в vhost) |
| `css/`, `js/`, `images/`, `files/` | Статика Tilda (прочие страницы) |

ЧПУ на nginx (фрагмент):

- `/` → `index.html` (или `page94832006.html`)
- `/privacy` → `page92826026.html`
- `/avtomatizatsiya-otsenki-po-keysam-v-telekome` → `page96476846.html`
- и остальные rewrite из `htaccess`

Каталог `/hub/` на сервере **не** из этого репозитория — его деплоит Competency Hub.

## Как править главную

`index.html` — бандл: разметка лежит JSON-строкой внутри `<script type="__bundler/template">`, шрифты и картинки — base64 в манифесте и подставляются по uuid уже в браузере. Руками такой файл не редактируют, правки идут через исходник:

```bash
python3 scripts/bundle_index.py extract   # бандл -> src/index.template.html (одноразово, если файла нет)
# правим src/index.template.html
python3 scripts/bundle_index.py build     # обратно в index.html + page94832006.html
python3 scripts/bundle_index.py assets    # выгрузить ассеты бандла в src/assets/ (по необходимости)
```

`build` синхронизирует `page94832006.html` и проверяет, что бандл снова парсится. Стили главной живут в `<style>`-блоках внутри `<helmet>` (там же токены дизайн-системы), разметка — в `<x-dc>`, данные секций (модули, кейсы, логотипы) — в `<script type="text/x-dc">` в конце файла.

Первый экран собран по дизайн-системе: тёмный canvas Black Rock, заголовок «От данных — к решению» с лавандовым акцентом (Periwinkle), indigo-пилюля основного CTA, пастельные плитки решений и розовая пунктирная обводка (Cotton Candy) на ИИ-блоках.

`src/` — только исходники, на прод не выкладывается (см. `--exclude src` в блоке деплоя).

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

Главная (`index.html`) самодостаточна и работает офлайн. ЧПУ остальных страниц локально без nginx не работают — открывайте `page*.html` напрямую.

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
