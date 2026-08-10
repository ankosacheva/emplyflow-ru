#!/usr/bin/env python3
"""Дополняет head страниц сайта отсутствующими SEO-тегами.

Что добавляем:
- <meta name="description"> (зеркалирует og:description, если пустой — берём фолбэк)
- <meta name="keywords"> (см. `PAGES`)
- twitter:card + twitter:title + twitter:description + twitter:image
- <link rel="icon" href="/favicon.ico">
- <link rel="manifest" href="/site.webmanifest">
- <meta name="theme-color" content="#050230">
- og:site_name + og:locale, если отсутствуют

Существующие корректные теги не переписываем — только добираем недостающее.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SITE_NAME = "EmplyFlow"
LOCALE = "ru_RU"
THEME = "#050230"
DEFAULT_OG_IMAGE = "https://emplyflow.ru/images/seo/og-image.jpg"

# Каждый URL → keywords и (при необходимости) переопределение title/description.
PAGES: dict[str, dict[str, str]] = {
    "modul-otsenka-360/index.html": {
        "keywords": (
            "оценка 360 градусов, оценка 360, оценка компетенций, "
            "opinion 360, HR-платформа, EmplyFlow"
        ),
    },
    "modul-karyera-i-razvitie/index.html": {
        "keywords": (
            "индивидуальный план развития, ИПР, карьерные треки, карьерные маршруты, "
            "развитие персонала, HR-платформа, EmplyFlow"
        ),
    },
    "modul-matritsa-9-box/index.html": {
        "keywords": (
            "матрица талантов, 9 box grid, 9-box, оценка потенциала, кадровый резерв, "
            "HR-аналитика, EmplyFlow"
        ),
    },
    "modul-tselepolaganie/index.html": {
        "keywords": (
            "целеполагание, каскадирование целей, OKR, KPI, SMART-цели, "
            "управление по целям, EmplyFlow"
        ),
    },
    "modul-preemstvennost/index.html": {
        "keywords": (
            "кадровый резерв, преемственность, succession planning, "
            "ключевые позиции, готовность преемников, EmplyFlow"
        ),
    },
    "modul-nematerialnaya-motivatsiya/index.html": {
        "keywords": (
            "нематериальная мотивация, благодарности сотрудникам, recognition, "
            "поощрение персонала, вовлечённость, EmplyFlow"
        ),
    },
    "performance-review-kak-eto-rabotaet/index.html": {
        "keywords": (
            "performance review, оценка результативности, ревью сотрудников, "
            "цикл оценки, KPI, self review, 360, EmplyFlow"
        ),
    },
    "page101340001.html": {
        "keywords": (
            "оценка по кейсам, ассессмент, кейс-интервью, оценка руководителей, "
            "телеком, EmplyFlow"
        ),
    },
    "page101071766.html": {
        "keywords": (
            "performance review, AI, оценка сотрудников, кейс EmplyFlow, "
            "производитель детского питания, автоматизация HR"
        ),
    },
    "page96490096.html": {
        "keywords": (
            "карьерные треки, внутренняя мобильность, поиск экспертов, "
            "инжиниринговая компания, HR-платформа, EmplyFlow"
        ),
    },
    "page96476846.html": {
        "keywords": (
            "автоматизация оценки, кейс EmplyFlow, телеком, оценка руководителей, "
            "оценка по кейсам"
        ),
        "og_description_fallback": (
            "Как крупнейший российский телеком автоматизировал оценку руководителей "
            "по бизнес-кейсам на платформе EmplyFlow: единый сценарий, объективные "
            "результаты и экономия времени HR."
        ),
    },
}


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def find_meta(html: str, name: str, attr: str = "name") -> str | None:
    m = re.search(
        rf'<meta\s+{attr}=["\']{re.escape(name)}["\'][^>]*content=["\']([^"\']*)["\']',
        html,
        re.I,
    )
    return m.group(1) if m else None


def has_tag(html: str, pattern: str) -> bool:
    return re.search(pattern, html, re.I) is not None


def build_extra_head(
    html: str,
    canonical: str,
    keywords: str,
    og_description_fallback: str | None,
) -> str:
    og_title = find_meta(html, "og:title", "property") or SITE_NAME
    og_desc = find_meta(html, "og:description", "property") or ""
    if not og_desc and og_description_fallback:
        og_desc = og_description_fallback
    og_image = find_meta(html, "og:image", "property") or DEFAULT_OG_IMAGE

    parts: list[str] = []
    if not has_tag(html, r'<meta\s+name=["\']description["\']'):
        parts.append(f'<meta name="description" content="{og_desc}">')
    if not has_tag(html, r'<meta\s+name=["\']keywords["\']'):
        parts.append(f'<meta name="keywords" content="{keywords}">')
    if not has_tag(html, r'<meta\s+name=["\']twitter:card["\']'):
        parts.append('<meta name="twitter:card" content="summary_large_image">')
    if not has_tag(html, r'<meta\s+name=["\']twitter:title["\']'):
        parts.append(f'<meta name="twitter:title" content="{og_title}">')
    if not has_tag(html, r'<meta\s+name=["\']twitter:description["\']'):
        parts.append(f'<meta name="twitter:description" content="{og_desc}">')
    if not has_tag(html, r'<meta\s+name=["\']twitter:image["\']'):
        parts.append(f'<meta name="twitter:image" content="{og_image}">')
    if not has_tag(html, r'<meta\s+property=["\']og:site_name["\']'):
        parts.append(f'<meta property="og:site_name" content="{SITE_NAME}">')
    if not has_tag(html, r'<meta\s+property=["\']og:locale["\']'):
        parts.append(f'<meta property="og:locale" content="{LOCALE}">')
    if not has_tag(html, r'<meta\s+name=["\']theme-color["\']'):
        parts.append(f'<meta name="theme-color" content="{THEME}">')
    if not has_tag(html, r'<link\s+rel=["\']manifest["\']'):
        parts.append('<link rel="manifest" href="/site.webmanifest">')
    if not has_tag(html, r'<link\s+rel=["\'][^"\']*icon["\'][^>]*href=["\']/favicon\.ico'):
        parts.append('<link rel="icon" href="/favicon.ico" sizes="any">')
    return "\n".join(parts)


def process_page(rel_path: str, cfg: dict[str, str]) -> None:
    path = ROOT / rel_path
    html = read(path)
    canonical_m = re.search(
        r'<link\s+rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']',
        html,
        re.I,
    )
    if not canonical_m:
        print(f"skip {rel_path}: canonical link не найден")
        return
    canonical_url = canonical_m.group(1)
    # приводим http:// к https:// (Tilda оставила старые ссылки)
    fixed_canonical = canonical_url
    if fixed_canonical.startswith("http://emplyflow.ru"):
        fixed_canonical = "https://emplyflow.ru" + fixed_canonical[len("http://emplyflow.ru") :]
        html = html.replace(canonical_m.group(0), canonical_m.group(0).replace(canonical_url, fixed_canonical))

    # og:url тоже
    og_url_m = re.search(r'<meta\s+property=["\']og:url["\'][^>]*content=["\']([^"\']+)["\']', html, re.I)
    if og_url_m and og_url_m.group(1).startswith("http://emplyflow.ru"):
        old = og_url_m.group(0)
        html = html.replace(old, old.replace(og_url_m.group(1), "https://" + og_url_m.group(1)[len("http://") :]))

    extra = build_extra_head(
        html,
        fixed_canonical,
        cfg.get("keywords", ""),
        cfg.get("og_description_fallback"),
    )
    if not extra:
        print(f"{rel_path}: уже полный")
        return

    canonical_tag_m = re.search(
        r'(<link\s+rel=["\']canonical["\'][^>]*>)',
        html,
        re.I,
    )
    if canonical_tag_m:
        replacement = canonical_tag_m.group(1) + "\n" + extra
        html = html.replace(canonical_tag_m.group(0), replacement, 1)
    else:
        head_m = re.search(r'</head>', html, re.I)
        html = html[: head_m.start()] + extra + "\n" + html[head_m.start() :]

    write(path, html)
    print(f"{rel_path}: добавлено {extra.count('<meta') + extra.count('<link')} тегов")


def main() -> None:
    for rel, cfg in PAGES.items():
        process_page(rel, cfg)


if __name__ == "__main__":
    main()
