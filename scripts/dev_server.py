#!/usr/bin/env python3
"""Локальный статический сервер с ЧПУ из htaccess (модули и кейсы)."""

from __future__ import annotations

import argparse
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
HTACCESS = ROOT / "htaccess"

# RewriteRule ^slug$ file.html  → внутренний rewrite
INTERNAL_RE = re.compile(
    r"^RewriteRule\s+\^([A-Za-z0-9_-]+)\$\s+(page[\w.-]+\.html)\b",
    re.I,
)
# RewriteRule ^old/?$ /new [R=301,...] → HTTP redirect
# В htaccess «/?» — литералы slash + quantifier Apache, поэтому «?» экранируем.
REDIRECT_RE = re.compile(
    r"^RewriteRule\s+\^([A-Za-z0-9_-]+)/\?\$\s+(/[A-Za-z0-9_-]+)\s+\[([^\]]*)\]",
    re.I,
)


def load_htaccess_maps() -> tuple[dict[str, str], dict[str, str]]:
    rewrites: dict[str, str] = {}
    redirects: dict[str, str] = {}
    if not HTACCESS.exists():
        return rewrites, redirects
    for raw in HTACCESS.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = REDIRECT_RE.match(line)
        if m and "R=" in m.group(3).upper():
            redirects[m.group(1)] = m.group(2)
            continue
        m = INTERNAL_RE.match(line)
        if m:
            rewrites[m.group(1)] = m.group(2)
    return rewrites, redirects


REWRITES, REDIRECTS = load_htaccess_maps()


def resolve_rewrite(path: str) -> str | None:
    clean = unquote(path).strip("/")
    if not clean:
        return None
    if clean in REWRITES:
        return "/" + REWRITES[clean]
    return None


def resolve_redirect(path: str) -> str | None:
    clean = unquote(path).strip("/")
    if not clean:
        return None
    return REDIRECTS.get(clean)


class RewriteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        target = resolve_redirect(parsed.path)
        if target:
            loc = target
            if parsed.query:
                loc = f"{loc}?{parsed.query}"
            self.send_response(301)
            self.send_header("Location", loc)
            self.end_headers()
            return
        super().do_GET()

    def do_HEAD(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        target = resolve_redirect(parsed.path)
        if target:
            loc = target
            if parsed.query:
                loc = f"{loc}?{parsed.query}"
            self.send_response(301)
            self.send_header("Location", loc)
            self.end_headers()
            return
        super().do_HEAD()

    def translate_path(self, path: str) -> str:
        parsed = urlparse(path)
        rewritten = resolve_rewrite(parsed.path)
        if rewritten:
            path = rewritten
        return super().translate_path(path)

    def log_message(self, fmt: str, *args) -> None:
        if args and isinstance(args[0], str) and re.search(
            r"\.(css|js|png|jpe?g|webp|svg|woff2?|ttf|mp4|webm)(\?|$)", args[0]
        ):
            return
        super().log_message(fmt, *args)


def main() -> None:
    parser = argparse.ArgumentParser(description="EmplyFlow dev server with pretty URLs")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.bind, args.port), RewriteHandler)
    print(f"EmplyFlow dev server: http://{args.bind}:{args.port}/")
    print(f"ЧПУ из htaccess: {len(REWRITES)} rewrite, {len(REDIRECTS)} redirect")
    for slug in (
        "performance-review-dlya-proizvoditelya",
        "avtomatizatsiya-otsenki-po-keysam-v-telekome",
        "karyernye-treki-inzhiniring",
    ):
        print(f"  /{slug}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
