#!/usr/bin/env python3
"""Правка главной без ручной работы с 800-КБ бандлом.

`index.html` — самодостаточный бандл: разметка страницы лежит JSON-строкой
внутри `<script type="__bundler/template">`, ассеты (шрифты, картинки) —
base64 в манифесте и подставляются по uuid в рантайме.

    python3 scripts/bundle_index.py extract   # бандл -> src/index.template.html
    python3 scripts/bundle_index.py build     # src/index.template.html + src/bundler-loader.* -> бандл
    python3 scripts/bundle_index.py assets    # выгрузить ассеты в src/assets/

`build` также синхронизирует `page94832006.html` (старый DirectoryIndex).
"""

from __future__ import annotations

import base64
import gzip
import json
import re
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUNDLE = ROOT / "index.html"
MIRROR = ROOT / "page94832006.html"
TEMPLATE_SRC = ROOT / "src" / "index.template.html"
LOADER_CSS_SRC = ROOT / "src" / "bundler-loader.css"
LOADER_HTML_SRC = ROOT / "src" / "bundler-loader.html"
ASSETS_DIR = ROOT / "src" / "assets"

TEMPLATE_RE = re.compile(
    r'(<script type="__bundler/template">)(.*?)(</script>)', re.S
)
MANIFEST_RE = re.compile(
    r'(<script type="__bundler/manifest">)(.*?)(</script>)', re.S
)
LOADER_CSS_RE = re.compile(
    r'/\* EF_LOADER_CSS_BEGIN \*/.*?/\* EF_LOADER_CSS_END \*/', re.S
)
LOADER_HTML_RE = re.compile(
    r'<!-- EF_LOADER_HTML_BEGIN -->.*?<!-- EF_LOADER_HTML_END -->', re.S
)

EXT_BY_MIME = {
    "image/svg+xml": "svg",
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
    "text/javascript": "js",
    "font/ttf": "ttf",
    "font/woff2": "woff2",
}


def read_bundle() -> str:
    return BUNDLE.read_text(encoding="utf-8")


def get_block(html: str, pattern: re.Pattern[str], label: str) -> str:
    match = pattern.search(html)
    if not match:
        sys.exit(f"не найден блок {label} в {BUNDLE.name}")
    return match.group(2)


def extract() -> None:
    template = json.loads(get_block(read_bundle(), TEMPLATE_RE, "template"))
    TEMPLATE_SRC.parent.mkdir(parents=True, exist_ok=True)
    TEMPLATE_SRC.write_text(template, encoding="utf-8")
    print(f"{TEMPLATE_SRC.relative_to(ROOT)} — {len(template)} символов")


def patch_loader(html: str) -> str:
    if not LOADER_CSS_SRC.exists() or not LOADER_HTML_SRC.exists():
        sys.exit(
            f"нет {LOADER_CSS_SRC.relative_to(ROOT)} или "
            f"{LOADER_HTML_SRC.relative_to(ROOT)}"
        )

    css = LOADER_CSS_SRC.read_text(encoding="utf-8").strip()
    markup = LOADER_HTML_SRC.read_text(encoding="utf-8").strip()
    indented_css = "\n    ".join(css.splitlines())

    html, css_count = LOADER_CSS_RE.subn(
        f"/* EF_LOADER_CSS_BEGIN */\n    {indented_css}\n    /* EF_LOADER_CSS_END */",
        html,
        count=1,
    )
    html, html_count = LOADER_HTML_RE.subn(
        f"<!-- EF_LOADER_HTML_BEGIN -->\n  {markup}\n  <!-- EF_LOADER_HTML_END -->",
        html,
        count=1,
    )
    if css_count != 1 or html_count != 1:
        sys.exit("не удалось пропатчить loader в бандле")
    return html


def build() -> None:
    if not TEMPLATE_SRC.exists():
        sys.exit(f"нет {TEMPLATE_SRC.relative_to(ROOT)}, сначала extract")

    template = TEMPLATE_SRC.read_text(encoding="utf-8")
    html = read_bundle()

    # Экранируем как исходный бандлер: JSON плюс закрывающие теги, иначе
    # строка внутри <script> оборвётся на первом же </script> шаблона.
    payload = json.dumps(template, ensure_ascii=False).replace("</", "<\\u002F")

    html, count = TEMPLATE_RE.subn(
        lambda m: f"{m.group(1)}\n{payload}\n  {m.group(3)}", html, count=1
    )
    if count != 1:
        sys.exit("не удалось заменить template в бандле")

    html = patch_loader(html)

    BUNDLE.write_text(html, encoding="utf-8")
    MIRROR.write_text(html, encoding="utf-8")

    # Обратная проверка: бандл должен парситься и отдавать тот же шаблон.
    assert json.loads(get_block(read_bundle(), TEMPLATE_RE, "template")) == template
    print(f"{BUNDLE.name} и {MIRROR.name} обновлены — {len(html)} байт")


def assets() -> None:
    manifest = json.loads(get_block(read_bundle(), MANIFEST_RE, "manifest"))
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    for uuid, entry in manifest.items():
        raw = base64.b64decode(entry["data"])
        if entry.get("compressed"):
            try:
                raw = gzip.decompress(raw)
            except OSError:
                raw = zlib.decompress(raw)
        ext = EXT_BY_MIME.get(entry["mime"], "bin")
        (ASSETS_DIR / f"{uuid}.{ext}").write_bytes(raw)
    print(f"{len(manifest)} ассетов -> {ASSETS_DIR.relative_to(ROOT)}")


COMMANDS = {"extract": extract, "build": build, "assets": assets}

if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command not in COMMANDS:
        sys.exit(f"использование: {Path(__file__).name} {'|'.join(COMMANDS)}")
    COMMANDS[command]()
