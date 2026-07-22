# EmplyFlow (emplyflow.ru)

Основной маркетинговый сайт EmplyFlow. Экспорт с Tilda, хостинг на Timeweb VPS.

- Прод: https://emplyflow.ru
- VPS: `212.113.123.95`, web-root `/var/www/emplyflow.ru/`
- Hub (отдельный репозиторий): https://emplyflow.ru/hub/ → `ankosacheva/emplyflow-competency-hub`

## Структура

| Файл / папка | Назначение |
|---|---|
| `page94832006.html` | Главная (DirectoryIndex) |
| `page92826026.html` | `/privacy` |
| `page96476846.html` и др. | Кейсы / лендинги |
| `htaccess` | Правила ЧПУ из Tilda (на nginx переписаны в vhost) |
| `css/`, `js/`, `images/`, `files/` | Статика Tilda |

ЧПУ на nginx (фрагмент):

- `/` → `page94832006.html`
- `/privacy` → `page92826026.html`
- `/avtomatizatsiya-otsenki-po-keysam-v-telekome` → `page96476846.html`
- и остальные rewrite из `htaccess`

Каталог `/hub/` на сервере **не** из этого репозитория — его деплоит Competency Hub.

## Локально

```bash
python3 -m http.server 8080
# http://localhost:8080/page94832006.html
```

ЧПУ локально без nginx не работают — открывайте `page*.html` напрямую.

## Деплой

```bash
rsync -avz --delete \
  --exclude .git --exclude .gitignore --exclude README.md \
  --exclude hub \
  ./ root@212.113.123.95:/var/www/emplyflow.ru/
```

Важно: не затирать `/var/www/emplyflow.ru/hub/` (если rsync с `--delete`, обязательно `--exclude hub`).

После деплоя проверить:

- https://emplyflow.ru/
- https://emplyflow.ru/privacy
- https://emplyflow.ru/hub/ (должен остаться Hub)
