# Деплой emplyflow.ru на VPS

Runbook для сервера **89.108.70.110** (`cv7817065`): основной сайт (`emplyflow-ru`) и Hub (`emplyflow-competency-hub`) деплоятся **независимо**.

> **Приватные ключи в этот файл не кладём.** Они только на сервере в `/root/.ssh/`.

---

## Сервер

| Параметр | Значение |
|----------|----------|
| IP / hostname | `89.108.70.110` (`cv7817065`) |
| SSH | `ssh root@89.108.70.110` |
| OS | Ubuntu 26.04 |
| Web-root сайта | `/var/www/emplyflow.ru/` |
| Hub (path) | `/var/www/emplyflow.ru/hub/` |
| Hub (поддомен) | `/var/www/hub.emplyflow.ru/` |
| nginx | `/etc/nginx/sites-available/emplyflow.ru`, `hub.emplyflow.ru` |

### Важно: два разных «emplyflow-ru»

| Путь | Что это |
|------|---------|
| `/root/emplyflow-ru` | **Git-клон** — `git pull`, отсюда `deploy-site` |
| `/var/www/emplyflow.ru/` | **Прод** — сюда смотрит nginx `root` |
| `/var/www/emplyflow.ru/emplyflow-ru/` | **Ошибочная вложенная копия** — не деплоить сюда; можно удалить после проверки |

```bash
# nginx должен указывать сюда, не в emplyflow-ru/
grep '^\s*root ' /etc/nginx/sites-available/emplyflow.ru
# → root /var/www/emplyflow.ru;
```

---

## SSH-ключи на сервере

На сервере **два отдельных Deploy Key** — один ключ GitHub = один репозиторий.

| Назначение | Приватный ключ | GitHub Deploy Key |
|------------|----------------|-------------------|
| emplyflow-ru | `/root/.ssh/emplyflow-github` | [emplyflow-ru → Deploy keys](https://github.com/ankosacheva/emplyflow-ru/settings/keys) |
| emplyflow-competency-hub | `/root/.ssh/emplyflow-github-hub` | [emplyflow-competency-hub → Deploy keys](https://github.com/ankosacheva/emplyflow-competency-hub/settings/keys) |

Права:

```bash
chmod 700 /root/.ssh
chmod 600 /root/.ssh/emplyflow-github /root/.ssh/emplyflow-github-hub /root/.ssh/config
```

### `/root/.ssh/config`

```sshconfig
Host github.com
  HostName github.com
  User git
  IdentityFile /root/.ssh/emplyflow-github
  IdentitiesOnly yes

Host github.com-competency-hub
  HostName github.com
  User git
  IdentityFile /root/.ssh/emplyflow-github-hub
  IdentitiesOnly yes
```

Проверка:

```bash
ssh -T git@github.com
ssh -T git@github.com-competency-hub
```

---

## Репозитории на сервере

| Репозиторий | Путь на сервере | Ветка | Clone URL |
|-------------|-----------------|-------|-----------|
| emplyflow-ru | `/root/emplyflow-ru` | `main` | `git@github.com:ankosacheva/emplyflow-ru.git` |
| emplyflow-competency-hub | `/root/emplyflow-competency-hub` | `main` | `git@github.com-competency-hub:ankosacheva/emplyflow-competency-hub.git` |

---

## 1. emplyflow-ru — основной сайт

**Прод:** `https://emplyflow.ru/`  
**GitHub:** https://github.com/ankosacheva/emplyflow-ru

### Что выкладывается

- `git pull` в `/root/emplyflow-ru`
- `rsync` → `/var/www/emplyflow.ru/`
- **Обязательно** `--exclude hub` — Hub деплоится отдельно
- **Не выкладываются:** `.git`, `src/`, `docs/`, `README.md`, `.cursor`

### Первичная настройка (один раз)

```bash
ssh root@89.108.70.110

git clone git@github.com:ankosacheva/emplyflow-ru.git /root/emplyflow-ru
mkdir -p /var/www/emplyflow.ru/hub /var/www/hub.emplyflow.ru

# первый деплой
bash -c '...'  # см. блок «Деплой после push» ниже
```

### Деплой после push в `main` (рекомендуемый способ)

```bash
ssh root@89.108.70.110
deploy-site
```

Если алиас не настроен — полный блок:

```bash
set -e
REPO="/root/emplyflow-ru"
WEBROOT="/var/www/emplyflow.ru"

cd "$REPO"
git pull --ff-only origin main

rsync -av --delete \
  --exclude .git \
  --exclude .gitignore \
  --exclude README.md \
  --exclude AGENTS.md \
  --exclude .cursor \
  --exclude hub \
  --exclude src \
  --exclude docs \
  "$REPO/" "$WEBROOT/"

chown -R www-data:www-data "$WEBROOT" 2>/dev/null || true

echo "OK: $(git log -1 --oneline)"
curl -sI -H 'Host: emplyflow.ru' http://127.0.0.1/ | head -1
curl -sI -H 'Host: emplyflow.ru' http://127.0.0.1/privacy | head -1
curl -sI -H 'Host: emplyflow.ru' http://127.0.0.1/performance-review-dlya-proizvoditelya | head -1
curl -sI -H 'Host: emplyflow.ru' http://127.0.0.1/karyernye-treki-inzhiniring | head -1
curl -sI -H 'Host: emplyflow.ru' http://127.0.0.1/avtomatizatsiya-otsenki-po-keysam-v-telekome | head -1
```

Или скрипт из hub-репозитория (если скопирован на сервер):

```bash
bash /root/emplyflow-competency-hub/scripts/deploy-emplyflow-ru-local.sh
```

### Локально перед push (если правили главную)

```bash
cd /path/to/emplyflow-ru
python3 scripts/bundle_index.py build
git add index.html page94832006.html src/index.template.html
git commit -m "..."
git push origin main
```

Затем на сервере: `deploy-site`.

### Деплой с Mac (альтернатива, не основной путь)

```bash
cd /path/to/emplyflow-ru
git pull

rsync -avz --delete \
  --exclude .git --exclude .gitignore --exclude README.md \
  --exclude hub --exclude src --exclude docs \
  ./ root@89.108.70.110:/var/www/emplyflow.ru/
```

**Важно:** `cd` именно в клон репозитория; цель — `/var/www/emplyflow.ru/`, не `/var/www/emplyflow.ru/emplyflow-ru/`.

---

## 2. emplyflow-competency-hub — Hub

**Прод:** `https://emplyflow.ru/hub/` и `https://hub.emplyflow.ru/`  
**GitHub:** https://github.com/ankosacheva/emplyflow-competency-hub

### Что выкладывается

- Сборка: `node scripts/prerender-hub.mjs` → `dist/hub/`
- `rsync dist/hub/` → **только** `/var/www/emplyflow.ru/hub/`
- `hash-redirect.html` → `/var/www/hub.emplyflow.ru/index.html`
- Корень `/var/www/emplyflow.ru/` (главная) **не трогается**

### Деплой после push в `main`

```bash
ssh root@89.108.70.110
deploy-hub
```

Полный блок:

```bash
set -e
REPO="/root/emplyflow-competency-hub"
HUB="/var/www/emplyflow.ru/hub"
LEGACY="/var/www/hub.emplyflow.ru"

cd "$REPO"
git pull --ff-only origin main
node scripts/prerender-hub.mjs

mkdir -p "$HUB" "$LEGACY"
rsync -av --delete "$REPO/dist/hub/" "$HUB/"
cp "$REPO/hash-redirect.html" "$LEGACY/index.html"

chown -R www-data:www-data "$HUB" "$LEGACY" 2>/dev/null || true

nginx -t && systemctl reload nginx

echo "Hub OK: $(git log -1 --oneline)"
curl -sI -H 'Host: emplyflow.ru' http://127.0.0.1/hub/ | head -1
curl -sI -H 'Host: emplyflow.ru' http://127.0.0.1/ | head -1
```

Или:

```bash
bash /root/emplyflow-competency-hub/scripts/deploy-hub-local.sh
```

### Локально перед push

```bash
node scripts/prerender-hub.mjs   # проверить сборку
git add .
git commit -m "..."
git push origin main
# → deploy-hub на сервере
```

---

## Nginx и ЧПУ (красивые URL)

На проде nginx **не читает** `htaccess`. Правила живут в `/etc/nginx/sites-available/emplyflow.ru` (блоки `location = /slug { try_files ... }`).

### Уже настроенные кейсы

| URL | Файл |
|-----|------|
| `/performance-review-dlya-proizvoditelya` | `page101071766.html` |
| `/avtomatizatsiya-otsenki-po-keysam-v-telekome` | `page101340001.html` |
| `/karyernye-treki-inzhiniring` | `page96490096.html` |
| `/perfomance_review_dlya_proizvoditelya` | редирект → новый slug |
| `/postroenie-sistemy-karyernykh-trekov-dlya-inzhiniringovoy-korporatsii` | редирект → `/karyernye-treki-inzhiniring` |

Модули: `/modul-otsenka-360`, `/modul-karyera-i-razvitie`, `/modul-matritsa-9-box`, `/modul-tselepolaganie`, `/modul-preemstvennost`, `/modul-nematerialnaya-motivatsiya`, `/performance-review-kak-eto-rabotaet` — см. конфиг nginx.

Референс правил Apache: файл `htaccess` в репозитории.

### Когда трогать nginx

| Ситуация | Действие |
|----------|----------|
| Правки HTML/CSS/текст, существующие URL | только `deploy-site` |
| **Новый** красивый URL | добавить `location` в `emplyflow.ru` + `nginx -t && systemctl reload nginx` |

Пример нового кейса:

```nginx
location = /novyj-slug { try_files /pageXXXXXXXX.html =404; }
location = /novyj-slug/ { try_files /pageXXXXXXXX.html =404; }
```

Hub: отдельный vhost `hub.emplyflow.ru` — не смешивать с деплоем сайта.

---

## Алиасы на сервере

Добавить в `/root/.bashrc`:

```bash
alias deploy-site='cd /root/emplyflow-ru && git pull --ff-only origin main && rsync -av --delete --exclude .git --exclude .gitignore --exclude README.md --exclude AGENTS.md --exclude .cursor --exclude hub --exclude src --exclude docs /root/emplyflow-ru/ /var/www/emplyflow.ru/ && git log -1 --oneline'

alias deploy-hub='cd /root/emplyflow-competency-hub && git pull --ff-only origin main && node scripts/prerender-hub.mjs && rsync -av --delete dist/hub/ /var/www/emplyflow.ru/hub/ && cp hash-redirect.html /var/www/hub.emplyflow.ru/index.html && git log -1 --oneline'
```

```bash
source ~/.bashrc
deploy-site   # после push emplyflow-ru
deploy-hub    # после push emplyflow-competency-hub
```

---

## Проверка

### На сервере

```bash
ls -la /var/www/emplyflow.ru/index.html
ls /var/www/emplyflow.ru/page*.html | wc -l   # ожидаемо ~21

curl -sI -H 'Host: emplyflow.ru' http://127.0.0.1/performance-review-dlya-proizvoditelya | head -3
curl -sI -H 'Host: emplyflow.ru' http://127.0.0.1/perfomance_review_dlya_proizvoditelya | head -5  # 301
```

### С Mac (до DNS или через hosts)

```bash
curl -sI -H 'Host: emplyflow.ru' http://89.108.70.110/ | head -1
curl -sI -H 'Host: emplyflow.ru' http://89.108.70.110/hub/ | head -1
```

`/etc/hosts` на Mac (опционально):

```
89.108.70.110  emplyflow.ru
89.108.70.110  www.emplyflow.ru
89.108.70.110  hub.emplyflow.ru
```

---

## SSH с Mac

`~/.ssh/config`:

```sshconfig
Host emplyflow-vps
  HostName 89.108.70.110
  User root
  ServerAliveInterval 60
  ServerAliveCountMax 3
```

```bash
ssh emplyflow-vps
```

> Деплой выполняйте **на сервере** в интерактивной SSH-сессии (`deploy-site` / `deploy-hub`). Длинные one-liner с Mac могут обрываться.

---

## SSL и DNS

1. A-записи в reg.ru:
   ```
   emplyflow.ru  A  89.108.70.110
   www           A  89.108.70.110
   hub           A  89.108.70.110
   ```

2. Certbot:
   ```bash
   apt-get install -y certbot python3-certbot-nginx
   certbot --nginx -d emplyflow.ru -d www.emplyflow.ru -d hub.emplyflow.ru
   ```

Пример nginx с HTTPS: `docs/nginx-emplyflow-hub.conf` (в hub-репозитории).

---

## Уборка после ошибочного деплоя

Если файлы оказались в `/var/www/emplyflow.ru/emplyflow-ru/`:

```bash
cd /var/www/emplyflow.ru/emplyflow-ru
rsync -av ./ /var/www/emplyflow.ru/
# проверить сайт в браузере
rm -rf /var/www/emplyflow.ru/emplyflow-ru
```

Дальше только `deploy-site` → `/var/www/emplyflow.ru/`.

---

## Чеклист

### emplyflow-ru (сайт)
- [ ] Локально: `bundle_index.py build` (если правили главную)
- [ ] Push в `main`
- [ ] `ssh root@89.108.70.110`
- [ ] `deploy-site`
- [ ] `200` на `/`, `/privacy`, кейсы по ЧПУ

### emplyflow-competency-hub (Hub)
- [ ] Push в `main`
- [ ] `ssh root@89.108.70.110`
- [ ] `deploy-hub`
- [ ] `200` на `/hub/`, главная `/` не сломалась

---

## Частые ошибки

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `page101071766.html: No such file` в web-root | rsync в `emplyflow-ru/` внутри web-root | Деплой в `/var/www/emplyflow.ru/`, см. «Уборка» |
| 404 на красивый URL, файл есть | nginx без `location` | Добавить `location` в `emplyflow.ru` |
| Hub пропал после деплоя сайта | rsync без `--exclude hub` | `deploy-hub`, всегда exclude hub |
| `deploy-site` из `/var/www/.../emplyflow-ru` | не git-клон | `cd /root/emplyflow-ru` или алиас |
| `Cannot find module prerender-hub.mjs` | не в каталоге hub-репо | `cd /root/emplyflow-competency-hub` |
| `Permission denied` к GitHub | Deploy Key не добавлен | `cat /root/.ssh/*.pub` → GitHub |

---

## Скрипты (hub-репозиторий)

| Файл | Назначение |
|------|------------|
| `scripts/deploy-emplyflow-ru-local.sh` | Деплой основного сайта |
| `scripts/deploy-hub-local.sh` | Деплой Hub |
| `scripts/server-setup-github-clone.sh` | Первичная настройка git |
| `docs/nginx-emplyflow-hub.conf` | Пример nginx с HTTPS |
