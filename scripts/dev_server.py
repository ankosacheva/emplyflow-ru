#!/usr/bin/env python3
"""Локальный статический сервер с ЧПУ из htaccess (модули и кейсы)."""

from __future__ import annotations

import argparse
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent

# Ключевые rewrite для локальной разработки (см. htaccess).
REWRITES = {
    "modul-otsenka-360": "page102360001.html",
    "modul-karyera-i-razvitie": "page102370002.html",
    "modul-matritsa-9-box": "page102380003.html",
    "modul-tselepolaganie": "page102390004.html",
    "modul-preemstvennost": "page102400005.html",
    "modul-nematerialnaya-motivatsiya": "page102410006.html",
    "performance-review-kak-eto-rabotaet": "page102420007.html",
    "privacy": "page92826026.html",
}


def resolve_rewrite(path: str) -> str | None:
    clean = unquote(path).strip("/")
    if not clean:
        return None
    if clean in REWRITES:
        return "/" + REWRITES[clean]
    return None


class RewriteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path: str) -> str:
        parsed = urlparse(path)
        rewritten = resolve_rewrite(parsed.path)
        if rewritten:
            path = rewritten
        return super().translate_path(path)

    def log_message(self, fmt: str, *args) -> None:
        if args and isinstance(args[0], str) and re.search(r"\.(css|js|png|jpe?g|webp|svg|woff2?|ttf|mp4|webm)(\?|$)", args[0]):
            return
        super().log_message(fmt, *args)


def main() -> None:
    parser = argparse.ArgumentParser(description="EmplyFlow dev server with pretty URLs")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.bind, args.port), RewriteHandler)
    print(f"EmplyFlow dev server: http://{args.bind}:{args.port}/")
    print("ЧПУ модулей: /modul-otsenka-360, /performance-review-kak-eto-rabotaet, …")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
