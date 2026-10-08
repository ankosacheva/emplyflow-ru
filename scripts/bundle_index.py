#!/usr/bin/env python3
"""Правка главной без ручной работы с 800-КБ бандлом.

`index.html` — самодостаточный бандл: разметка страницы лежит JSON-строкой
внутри `<script type="__bundler/template">`, ассеты (шрифты, картинки) —
base64 в манифесте и подставляются по uuid в рантайме.

    python3 scripts/bundle_index.py extract   # бандл -> src/index.template.html
    python3 scripts/bundle_index.py build     # src/index.template.html + src/bundler-loader.* -> бандл
    python3 scripts/bundle_index.py assets    # выгрузить ассеты в src/assets/

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
TEMPLATE_SRC = ROOT / "src" / "index.template.html"
LOADER_CSS_SRC = ROOT / "src" / "bundler-loader.css"
LOADER_HTML_SRC = ROOT / "src" / "bundler-loader.html"
ASSETS_DIR = ROOT / "src" / "assets"

SEO_TITLE = "EmplyFlow — TMS-платформа: оценка 360°, Performance Review, цели и ИПР"
SEO_DESCRIPTION = (
    "Российская TMS-платформа EmplyFlow: цели и KPI, оценка 360°, Performance Review, "
    "матрица 9-box, карьерные треки, ИПР, кадровый резерв и ИИ-оценка компетенций в едином контуре."
)
SEO_OG_TITLE = "EmplyFlow — TMS-платформа для оценки и развития сотрудников на базе ИИ"
SEO_OG_DESCRIPTION = (
    "От разрозненных таблиц и ручных процессов — к объективным данным и понятным кадровым решениям. "
    "Единый контур: цели, оценка, развитие, карьера, преемственность."
)
SEO_CANONICAL = "https://emplyflow.ru/"
SEO_OG_IMAGE = "https://emplyflow.ru/og-image-emplyflow.jpg"
SEO_OG_IMAGE_ALT = (
    "EmplyFlow — российская TMS-платформа для оценки и развития персонала: "
    "OKR и KPI, оценка 360°, ИИ-ассистент"
)
SEO_TWITTER_IMAGE_ALT = "EmplyFlow — российская TMS-платформа для оценки и развития персонала"

# Серверная оболочка с H1 не привязана к title: её текст меняется отдельным проходом по заголовкам.
SEO_SHELL_H1 = "EmplyFlow — HRM-платформа для оценки и развития сотрудников"
SEO_SHELL_LEAD = (
    "EmplyFlow — HRM-платформа для оценки компетенций, Performance Review, "
    "целей, развития и карьерных треков сотрудников с AI-инструментами."
)

SEO_JSONLD = """<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": "https://emplyflow.ru/#software",
  "name": "EmplyFlow",
  "alternateName": "ЭмплиФлоу",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "Talent Management System (TMS)",
  "operatingSystem": "Web, Cloud, On-premise",
  "inLanguage": "ru-RU",
  "url": "https://emplyflow.ru/",
  "image": "https://emplyflow.ru/og-image-emplyflow.jpg",
  "description": "Российская TMS-платформа для оценки, развития сотрудников и проведения Performance Review на базе ИИ. Объединяет цели и KPI, оценку 360°, матрицу 9-box, карьерные треки, ИПР, кадровый резерв и ИИ-оценку компетенций в едином контуре.",
  "featureList": [
    "Цели и KPI по формату OKR",
    "Оценка 360 градусов",
    "Performance Review",
    "ИИ-оценка компетенций в формате кейс-интервью",
    "Матрица потенциала 9-box",
    "Карьерные треки и индивидуальные планы развития (ИПР)",
    "Кадровый резерв и преемственность",
    "Talent Marketplace: проекты, задачи и внутренние вакансии",
    "Нематериальная мотивация и признание",
    "Аналитика и управленческие отчёты"
  ],
  "audience": {
    "@type": "BusinessAudience",
    "name": "HR-команды среднего и крупного бизнеса"
  },
  "countriesSupported": "RU",
  "publisher": { "@id": "https://emplyflow.ru/#organization" }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://emplyflow.ru/#organization",
  "name": "EmplyFlow",
  "legalName": "Общество с ограниченной ответственностью «ЭМПЛИФЛОУ»",
  "alternateName": "ЭмплиФлоу",
  "url": "https://emplyflow.ru/",
  "logo": "https://emplyflow.ru/logo-emplyflow.png",
  "image": "https://emplyflow.ru/og-image-emplyflow.jpg",
  "description": "Технологическая компания — российский разработчик TMS-платформы для оценки и развития персонала в среднем и крупном бизнесе.",
  "email": "headoffice@emplyflow.ru",
  "taxID": "7743422816",
  "vatID": "7743422816",
  "identifier": [
    { "@type": "PropertyValue", "name": "ОГРН", "value": "1237700492479" },
    { "@type": "PropertyValue", "name": "ИНН",  "value": "7743422816" },
    { "@type": "PropertyValue", "name": "КПП",  "value": "773301001" }
  ],
  "areaServed": { "@type": "Country", "name": "Россия" },
  "knowsLanguage": "ru",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "sales",
    "email": "headoffice@emplyflow.ru",
    "availableLanguage": ["Russian"]
  },
  "award": "Лучший HR-проект года по версии Альфа-Банка и Rusbase",
  "sameAs": [
    "https://vk.ru/emplyflow"
  ]
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://emplyflow.ru/#website",
  "url": "https://emplyflow.ru/",
  "name": "EmplyFlow",
  "inLanguage": "ru-RU",
  "publisher": { "@id": "https://emplyflow.ru/#organization" }
}
</script>"""

SEO_HEAD_BLOCK = "\n".join(
    [
        "<!-- EF_SEO_BEGIN -->",
        f"<title>{SEO_TITLE}</title>",
        f'<meta name="description" content="{SEO_DESCRIPTION}">',
        f'<link rel="canonical" href="{SEO_CANONICAL}">',
        '<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="EmplyFlow">',
        '<meta property="og:locale" content="ru_RU">',
        f'<meta property="og:url" content="{SEO_CANONICAL}">',
        f'<meta property="og:title" content="{SEO_OG_TITLE}">',
        f'<meta property="og:description" content="{SEO_OG_DESCRIPTION}">',
        f'<meta property="og:image" content="{SEO_OG_IMAGE}">',
        f'<meta property="og:image:secure_url" content="{SEO_OG_IMAGE}">',
        '<meta property="og:image:type" content="image/jpeg">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{SEO_OG_IMAGE_ALT}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{SEO_OG_TITLE}">',
        f'<meta name="twitter:description" content="{SEO_OG_DESCRIPTION}">',
        f'<meta name="twitter:image" content="{SEO_OG_IMAGE}">',
        f'<meta name="twitter:image:alt" content="{SEO_TWITTER_IMAGE_ALT}">',
        '<meta name="author" content="ООО «Эмплифлоу»">',
        '<meta name="theme-color" content="#050230">',
        '<meta http-equiv="content-language" content="ru">',
        '<link rel="icon" href="/favicon.ico" sizes="32x32">',
        '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
        '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
        '<link rel="manifest" href="/site.webmanifest">',
        SEO_JSONLD,
        "<!-- EF_SEO_END -->",
    ]
)

SEO_NOSCRIPT_BLOCK = "\n".join(
    [
        "<!-- EF_SEO_NOSCRIPT_BEGIN -->",
        '<main id="ef-seo-shell" style="min-height:100vh;padding:32px;color:#fff;background:#050230;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">',
        f"  <h1>{SEO_SHELL_H1}</h1>",
        f"  <p>{SEO_SHELL_LEAD}</p>",
        "</main>",
        "<!-- EF_SEO_NOSCRIPT_END -->",
    ]
)

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

SEO_HEAD_RE = re.compile(r'<!-- EF_SEO_BEGIN -->.*?<!-- EF_SEO_END -->', re.S)
SEO_NOSCRIPT_RE = re.compile(
    r'<!-- EF_SEO_NOSCRIPT_BEGIN -->.*?<!-- EF_SEO_NOSCRIPT_END -->', re.S
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


def patch_outer_seo(html: str) -> str:
    """Патчит внешний (первичный) head/body бандла.

    Важно: OG/Twitter теги должны присутствовать в исходном HTML без JS,
    иначе соцсети/часть SEO-аудитов их не увидят.
    """

    marker = '<script type="__bundler/template">'
    if marker in html:
        pre, post = html.split(marker, 1)
    else:
        pre, post = html, ""

    # --- head ---
    if "<!-- EF_SEO_BEGIN -->" in pre:
        pre, count = SEO_HEAD_RE.subn(SEO_HEAD_BLOCK, pre, count=1)
        if count != 1:
            sys.exit("не удалось пропатчить EF_SEO в head бандла")
    else:
        # Вставляем рядом с другими meta, до <style>/<title> не принципиально.
        insert_after = re.search(r'(<meta name="theme-color"[^>]*>\s*)', pre, re.I)
        if not insert_after:
            insert_after = re.search(r"(<head[^>]*>\s*)", pre, re.I)
        if not insert_after:
            sys.exit("не найден head для вставки EF_SEO")
        i = insert_after.end(1)
        pre = pre[:i] + SEO_HEAD_BLOCK + "\n" + pre[i:]

    # Удаляем старые <title> вне EF_SEO блока, иначе браузер может взять последний.
    seo_match = SEO_HEAD_RE.search(pre)
    if not seo_match:
        sys.exit("EF_SEO блок не найден после патча head")
    pre_before = pre[: seo_match.start()]
    pre_block = pre[seo_match.start() : seo_match.end()]
    pre_after = pre[seo_match.end() :]
    pre_before = re.sub(r"<title[^>]*>.*?</title>\s*", "", pre_before, flags=re.I | re.S)
    pre_after = re.sub(r"<title[^>]*>.*?</title>\s*", "", pre_after, flags=re.I | re.S)
    pre = pre_before + pre_block + pre_after

    # --- body noscript ---
    if "<!-- EF_SEO_NOSCRIPT_BEGIN -->" in pre:
        pre, count = SEO_NOSCRIPT_RE.subn(SEO_NOSCRIPT_BLOCK, pre, count=1)
        if count != 1:
            sys.exit("не удалось пропатчить EF_SEO_NOSCRIPT в body бандла")
    else:
        body_open = re.search(r"(<body[^>]*>\s*)", pre, re.I)
        if not body_open:
            sys.exit("не найден body для вставки EF_SEO_NOSCRIPT")
        i = body_open.end(1)
        pre = pre[:i] + SEO_NOSCRIPT_BLOCK + "\n" + pre[i:]

    return pre + marker + post if post != "" else pre


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
    html = patch_outer_seo(html)

    BUNDLE.write_text(html, encoding="utf-8")

    # Обратная проверка: бандл должен парситься и отдавать тот же шаблон.
    assert json.loads(get_block(read_bundle(), TEMPLATE_RE, "template")) == template
    print(f"{BUNDLE.name} обновлён — {len(html)} байт")


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
