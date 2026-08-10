#!/usr/bin/env python3
"""Собирает набор фавиконок и OG-share-картинок EmplyFlow.

Иконка построена вокруг брендового знака: 4-лучевая ромб-звёздочка + wordmark
`emplyflow` (референс — SVG, присланный владельцем). Все размеры рендерятся
из одного SVG-шаблона через cairosvg, чтобы линии оставались чёткими.

OG-картинка — бенто-композиция: бренд-строка сверху + три «UI-мокапа»
модулей платформы (9-box, оценка 360°, performance review), собранные
в цветах и шрифтах дизайн-системы EmplyFlow.

Результат — в images/seo/ и favicon.ico в корне.
"""
from __future__ import annotations

import io
from pathlib import Path

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FONT_SEMIBOLD = ROOT / "design-system" / "fonts" / "Manrope-SemiBold.ttf"
FONT_EXTRABOLD = ROOT / "design-system" / "fonts" / "Manrope-ExtraBold.ttf"
FONT_MEDIUM = ROOT / "design-system" / "fonts" / "Manrope-Medium.ttf"
OUT = ROOT / "images" / "seo"
OUT.mkdir(parents=True, exist_ok=True)

# Дизайн-система EmplyFlow.
BLACK_ROCK = "#050230"
BLACK_ROCK_2 = "#0a0540"
BLUE_RIBBON = "#4a3bff"
BLUE_RIBBON_DEEP = "#3a2cf0"
COTTON_CANDY = "#ffb8e2"
PERIWINKLE = "#cec8ff"
FOG = "#d9d6ff"
FROSTED_MINT = "#d5fff3"
MAC_CHEESE = "#ffb777"
COD_GRAY = "#151515"
WHITE = "#ffffff"

# Путь sparkle-ромба из брендового SVG (24×24 viewbox).
SPARKLE_PATH = "M12 0L13.5 10.5 24 12 13.5 13.5 12 24 10.5 13.5 0 12 10.5 10.5z"

MANROPE_STACK = (
    "Manrope, 'Manrope Fallback', system-ui, -apple-system, "
    "'Segoe UI', Roboto, sans-serif"
)


def _svg_to_png(svg: str, size: int) -> bytes:
    return cairosvg.svg2png(
        bytestring=svg.encode("utf-8"),
        output_width=size,
        output_height=size,
    )


def _svg_to_png_wh(svg: str, w: int, h: int) -> bytes:
    return cairosvg.svg2png(
        bytestring=svg.encode("utf-8"),
        output_width=w,
        output_height=h,
    )


# ---------- FAVICONS ---------------------------------------------------------

def favicon_svg(size: int = 512, include_accent: bool = True) -> str:
    """Квадратная фавиконка: скруглённый Blue Ribbon фон, крупная белая
    sparkle-звёздочка в центре, розовая мини-звёздочка справа сверху как акцент.
    include_accent=False — только основная звёздочка (для 16×16, где акцент
    превращается в шум).
    """
    radius = int(size * 0.22)
    # Основной ромб — 62% от ширины.
    main = int(size * 0.62)
    main_x = (size - main) / 2
    main_y = (size - main) / 2
    accent_svg = ""
    if include_accent:
        acc = int(size * 0.24)
        acc_x = size * 0.66
        acc_y = size * 0.14
        accent_svg = (
            f'<g transform="translate({acc_x:.1f} {acc_y:.1f}) '
            f'scale({acc / 24:.4f})">'
            f'<path d="{SPARKLE_PATH}" fill="{COTTON_CANDY}"/>'
            f"</g>"
        )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">
  <rect width="{size}" height="{size}" rx="{radius}" ry="{radius}" fill="{BLUE_RIBBON}"/>
  <g transform="translate({main_x:.1f} {main_y:.1f}) scale({main / 24:.4f})">
    <path d="{SPARKLE_PATH}" fill="{WHITE}"/>
  </g>
  {accent_svg}
</svg>"""


def save_favicons() -> None:
    def render(size: int, accent: bool) -> Image.Image:
        png = _svg_to_png(favicon_svg(size, include_accent=accent), size)
        return Image.open(io.BytesIO(png)).convert("RGBA")

    for size in (16, 32, 48, 96, 192, 512):
        render(size, accent=size >= 32).save(OUT / f"favicon-{size}.png", optimize=True)
    render(180, accent=True).save(OUT / "apple-touch-icon.png", optimize=True)

    (OUT.parent.parent / "images" / "seo" / "favicon.svg").write_text(
        favicon_svg(512, include_accent=True), encoding="utf-8"
    )

    ico_sizes = [(16, False), (32, True), (48, True)]
    ico_frames = [render(s, a) for s, a in ico_sizes]
    ico_frames[0].save(
        ROOT / "favicon.ico",
        sizes=[(s, s) for s, _ in ico_sizes],
        append_images=ico_frames[1:],
    )


# ---------- OG BENTO ---------------------------------------------------------

def _sparkle(x: float, y: float, size: float, color: str) -> str:
    """SVG-фрагмент со sparkle-ромбом заданного размера и цвета."""
    return (
        f'<g transform="translate({x} {y}) scale({size / 24:.4f})">'
        f'<path d="{SPARKLE_PATH}" fill="{color}"/>'
        f"</g>"
    )


def _card(x: int, y: int, w: int, h: int, bg: str, radius: int = 24) -> str:
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" '
        f'rx="{radius}" ry="{radius}" fill="{bg}"/>'
    )


def _card_9box() -> str:
    """Мини-карточка 9-box: 3×3 сетка с точками-персонами и цветом
    'потенциал/результативность'."""
    x, y, w, h = 60, 260, 340, 330
    parts = [_card(x, y, w, h, PERIWINKLE)]
    # Заголовок
    parts.append(
        f'<text x="{x + 24}" y="{y + 46}" font-family="{MANROPE_STACK}" '
        f'font-weight="700" font-size="24" fill="{BLACK_ROCK}">9-box</text>'
    )
    parts.append(
        f'<text x="{x + 24}" y="{y + 74}" font-family="{MANROPE_STACK}" '
        f'font-weight="500" font-size="15" fill="{BLACK_ROCK}" opacity="0.72">'
        f"матрица талантов</text>"
    )
    # Сетка 3×3 — тонально: слева-внизу тише, справа-вверху ярче.
    grid_x, grid_y = x + 24, y + 100
    cell = 84
    gap = 8
    tone = [
        [FOG, PERIWINKLE, COTTON_CANDY],
        [PERIWINKLE, FROSTED_MINT, COTTON_CANDY],
        [FOG, FROSTED_MINT, MAC_CHEESE],
    ]
    dots_per = [
        [2, 3, 5],
        [1, 4, 3],
        [1, 2, 3],
    ]
    for r in range(3):
        for c in range(3):
            cx = grid_x + c * (cell + gap)
            cy = grid_y + r * (cell + gap)
            parts.append(
                f'<rect x="{cx}" y="{cy}" width="{cell}" height="{cell}" '
                f'rx="12" ry="12" fill="{tone[r][c]}"/>'
            )
            # Точки-персоны
            n = dots_per[r][c]
            for i in range(n):
                dx = cx + 14 + (i % 3) * 20
                dy = cy + 22 + (i // 3) * 20
                parts.append(
                    f'<circle cx="{dx}" cy="{dy}" r="6" fill="{BLACK_ROCK}" '
                    f'opacity="0.72"/>'
                )
    # Подпись под сеткой
    parts.append(
        f'<text x="{grid_x}" y="{grid_y + 3 * cell + 3 * gap + 22}" '
        f'font-family="{MANROPE_STACK}" font-weight="500" font-size="12" '
        f'fill="{BLACK_ROCK}" opacity="0.6">потенциал →</text>'
    )
    return "\n".join(parts)


def _card_360() -> str:
    """Мини-карточка Оценка 360°: горизонтальные шкалы компетенций
    self vs peers."""
    x, y, w, h = 420, 260, 340, 330
    parts = [_card(x, y, w, h, FROSTED_MINT)]
    parts.append(
        f'<text x="{x + 24}" y="{y + 46}" font-family="{MANROPE_STACK}" '
        f'font-weight="700" font-size="24" fill="{BLACK_ROCK}">Оценка 360°</text>'
    )
    parts.append(
        f'<text x="{x + 24}" y="{y + 74}" font-family="{MANROPE_STACK}" '
        f'font-weight="500" font-size="15" fill="{BLACK_ROCK}" opacity="0.72">'
        f"компетенции руководителя</text>"
    )
    labels = ["Стратегия", "Люди", "Клиент", "Результат"]
    self_vals = [0.62, 0.85, 0.70, 0.90]
    peers_vals = [0.80, 0.55, 0.78, 0.66]
    bar_w = 240
    row_y = y + 108
    for i, (lbl, sv, pv) in enumerate(zip(labels, self_vals, peers_vals)):
        ry = row_y + i * 48
        parts.append(
            f'<text x="{x + 24}" y="{ry}" font-family="{MANROPE_STACK}" '
            f'font-weight="600" font-size="13" fill="{BLACK_ROCK}">{lbl}</text>'
        )
        # base track
        parts.append(
            f'<rect x="{x + 24}" y="{ry + 8}" width="{bar_w}" height="10" '
            f'rx="5" fill="{WHITE}" opacity="0.55"/>'
        )
        parts.append(
            f'<rect x="{x + 24}" y="{ry + 8}" width="{int(bar_w * sv)}" height="10" '
            f'rx="5" fill="{BLUE_RIBBON}"/>'
        )
        # peers
        parts.append(
            f'<rect x="{x + 24}" y="{ry + 22}" width="{bar_w}" height="6" '
            f'rx="3" fill="{WHITE}" opacity="0.55"/>'
        )
        parts.append(
            f'<rect x="{x + 24}" y="{ry + 22}" width="{int(bar_w * pv)}" height="6" '
            f'rx="3" fill="{COTTON_CANDY}"/>'
        )
    # legend
    lg_y = y + h - 34
    parts.append(
        f'<rect x="{x + 24}" y="{lg_y}" width="12" height="10" rx="3" '
        f'fill="{BLUE_RIBBON}"/>'
    )
    parts.append(
        f'<text x="{x + 42}" y="{lg_y + 9}" font-family="{MANROPE_STACK}" '
        f'font-weight="500" font-size="12" fill="{BLACK_ROCK}">self</text>'
    )
    parts.append(
        f'<rect x="{x + 96}" y="{lg_y}" width="12" height="10" rx="3" '
        f'fill="{COTTON_CANDY}"/>'
    )
    parts.append(
        f'<text x="{x + 114}" y="{lg_y + 9}" font-family="{MANROPE_STACK}" '
        f'font-weight="500" font-size="12" fill="{BLACK_ROCK}">коллеги</text>'
    )
    return "\n".join(parts)


def _card_review() -> str:
    """Мини-карточка Performance review: карточка сотрудника с оценкой
    и статусом ревью."""
    x, y, w, h = 780, 260, 360, 330
    parts = [_card(x, y, w, h, COTTON_CANDY)]
    parts.append(
        f'<text x="{x + 24}" y="{y + 46}" font-family="{MANROPE_STACK}" '
        f'font-weight="700" font-size="24" fill="{BLACK_ROCK}">Performance review</text>'
    )
    parts.append(
        f'<text x="{x + 24}" y="{y + 74}" font-family="{MANROPE_STACK}" '
        f'font-weight="500" font-size="15" fill="{BLACK_ROCK}" opacity="0.72">'
        f"итог цикла</text>"
    )
    # Профиль
    px, py = x + 24, y + 108
    parts.append(
        f'<circle cx="{px + 28}" cy="{py + 28}" r="28" fill="{BLUE_RIBBON}"/>'
    )
    parts.append(
        f'<text x="{px + 28}" y="{py + 35}" text-anchor="middle" '
        f'font-family="{MANROPE_STACK}" font-weight="700" font-size="20" '
        f'fill="{WHITE}">МК</text>'
    )
    parts.append(
        f'<text x="{px + 72}" y="{py + 22}" font-family="{MANROPE_STACK}" '
        f'font-weight="700" font-size="18" fill="{BLACK_ROCK}">Мария К.</text>'
    )
    parts.append(
        f'<text x="{px + 72}" y="{py + 44}" font-family="{MANROPE_STACK}" '
        f'font-weight="500" font-size="13" fill="{BLACK_ROCK}" opacity="0.7">'
        f"HRBP · IT-департамент</text>"
    )
    # KPI строки
    kpis = [
        ("Достижение целей", 0.92, "+18%"),
        ("Оценка 360°", 0.78, "выше нормы"),
        ("Готовность к росту", 0.85, "H1 2027"),
    ]
    rk = py + 78
    for i, (lbl, prog, note) in enumerate(kpis):
        yy = rk + i * 42
        parts.append(
            f'<text x="{px}" y="{yy}" font-family="{MANROPE_STACK}" '
            f'font-weight="600" font-size="13" fill="{BLACK_ROCK}">{lbl}</text>'
        )
        parts.append(
            f'<text x="{x + w - 24}" y="{yy}" text-anchor="end" '
            f'font-family="{MANROPE_STACK}" font-weight="600" font-size="13" '
            f'fill="{BLACK_ROCK}">{note}</text>'
        )
        parts.append(
            f'<rect x="{px}" y="{yy + 8}" width="{w - 48}" height="8" rx="4" '
            f'fill="{WHITE}" opacity="0.55"/>'
        )
        parts.append(
            f'<rect x="{px}" y="{yy + 8}" width="{int((w - 48) * prog)}" height="8" '
            f'rx="4" fill="{BLUE_RIBBON}"/>'
        )
    # Тег «повышение»
    tg_y = y + h - 44
    parts.append(
        f'<rect x="{x + 24}" y="{tg_y}" width="150" height="30" rx="15" '
        f'fill="{BLACK_ROCK}"/>'
    )
    parts.append(
        f'<text x="{x + 99}" y="{tg_y + 20}" text-anchor="middle" '
        f'font-family="{MANROPE_STACK}" font-weight="700" font-size="12" '
        f'fill="{WHITE}">рекомендовано ↑</text>'
    )
    return "\n".join(parts)


def _bento_header(width: int) -> str:
    """Верхняя строка бенто: sparkle + wordmark слева, тагайн справа."""
    # Sparkle-ромб + wordmark по мотивам присланного SVG.
    parts: list[str] = []
    # Sparkle слева
    parts.append(_sparkle(60, 78, 60, WHITE))
    parts.append(
        f'<text x="140" y="128" font-family="{MANROPE_STACK}" '
        f'font-weight="800" font-size="66" letter-spacing="-1.4" '
        f'fill="{WHITE}">emplyflow</text>'
    )
    # Cotton Candy маленькая звёздочка над "f" — брендовый акцент
    parts.append(_sparkle(width - 128, 60, 24, COTTON_CANDY))
    # Тагайн справа
    parts.append(
        f'<text x="{width - 60}" y="196" text-anchor="end" '
        f'font-family="{MANROPE_STACK}" font-weight="500" font-size="20" '
        f'fill="{FOG}">TMS-платформа для оценки, мотивации и развития персонала</text>'
    )
    return "\n".join(parts)


def og_svg(width: int = 1200, height: int = 630) -> str:
    """Bento-OG: тёмный canvas Black Rock с мягкими радиальными пятнами,
    сверху бренд-строка, снизу три UI-карточки модулей."""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">
  <defs>
    <radialGradient id="glowA" cx="15%" cy="20%" r="45%">
      <stop offset="0%" stop-color="{BLUE_RIBBON}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="{BLUE_RIBBON}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="85%" cy="15%" r="35%">
      <stop offset="0%" stop-color="{COTTON_CANDY}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="{COTTON_CANDY}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowC" cx="60%" cy="90%" r="55%">
      <stop offset="0%" stop-color="{PERIWINKLE}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="{PERIWINKLE}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="{width}" height="{height}" fill="{BLACK_ROCK}"/>
  <rect width="{width}" height="{height}" fill="url(#glowA)"/>
  <rect width="{width}" height="{height}" fill="url(#glowB)"/>
  <rect width="{width}" height="{height}" fill="url(#glowC)"/>

  {_bento_header(width)}

  {_card_9box()}
  {_card_360()}
  {_card_review()}
</svg>"""


def save_og_images() -> None:
    svg = og_svg(1200, 630)
    (OUT / "og-image.svg").write_text(svg, encoding="utf-8")
    png_bytes = _svg_to_png_wh(svg, 1200, 630)
    im = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    im.save(OUT / "og-image.png", optimize=True)
    im.save(OUT / "og-image.jpg", quality=90, optimize=True)

    # Квадратный 1200×1200 — верх с брендом, ниже те же три карточки
    # растянутыми пропорционально.
    sq_svg = og_svg(1200, 1200).replace('viewBox="0 0 1200 630"', 'viewBox="0 0 1200 1200"')
    (OUT / "og-square.svg").write_text(sq_svg, encoding="utf-8")


# ---------- MAIN -------------------------------------------------------------

if __name__ == "__main__":
    save_favicons()
    save_og_images()
    print("готово: images/seo/, favicon.ico")
