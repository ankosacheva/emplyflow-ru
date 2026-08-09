#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-8080}"

die() { echo "ERROR: $*" >&2; exit 1; }

test -f index.html || die "нет index.html — запустите из корня репозитория"
if command -v python3 >/dev/null 2>&1; then
  python3 scripts/bundle_index.py build >/dev/null
else
  die "python3 не найден"
fi

if command -v lsof >/dev/null 2>&1 && lsof -ti ":$PORT" >/dev/null 2>&1; then
  echo "Останавливаю процесс на порту $PORT..."
  kill "$(lsof -ti ":$PORT")" 2>/dev/null || true
  sleep 0.5
fi

echo ""
echo "EmplyFlow local dev"
echo "  http://127.0.0.1:$PORT/"
echo "  http://127.0.0.1:$PORT/index.html"
echo ""
echo "Проверка: View Source → data-loader-version=\"video-v1\""
echo "Остановка: Ctrl+C"
echo ""

exec python3 scripts/dev_server.py --port "$PORT" --bind 127.0.0.1
