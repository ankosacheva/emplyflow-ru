#!/usr/bin/env python3
"""Собирает набор фавиконок и OG-share-картинок из брендовых ассетов.

Источники:
- images/tild3766-3562-4732-a164-356632343966__180x180.png — брендовый
  значок (розовые звёздочки на индиго Blue Ribbon), уже согласован Tilda-версией.
- design-system/assets/logo.png — эталонный логотип EmplyFlow (960×540)
  на тёмно-фиолетовом Black Rock.

Результат раскладывается в images/seo/ и корень (favicon.ico), плюс
site.webmanifest в корне.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC_MARK = ROOT / "images" / "tild3766-3562-4732-a164-356632343966__180x180.png"
SRC_LOGO = ROOT / "design-system" / "assets" / "logo.png"
FONT_SEMIBOLD = ROOT / "design-system" / "fonts" / "Manrope-SemiBold.ttf"
FONT_MEDIUM = ROOT / "design-system" / "fonts" / "Manrope-Medium.ttf"
OUT = ROOT / "images" / "seo"
OUT.mkdir(parents=True, exist_ok=True)

BLACK_ROCK = (5, 2, 48, 255)
COTTON_CANDY = (255, 184, 226, 255)
FROSTED_MINT = (215, 240, 220, 255)


def save_favicons() -> None:
    mark = Image.open(SRC_MARK).convert("RGBA")
    for size in (16, 32, 48, 96, 192, 512):
        mark.resize((size, size), Image.LANCZOS).save(
            OUT / f"favicon-{size}.png", optimize=True
        )
    mark.resize((180, 180), Image.LANCZOS).save(
        OUT / "apple-touch-icon.png", optimize=True
    )
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_frames = [mark.resize(s, Image.LANCZOS) for s in ico_sizes]
    ico_frames[0].save(
        ROOT / "favicon.ico",
        sizes=ico_sizes,
        append_images=ico_frames[1:],
    )


def _compose_og(width: int, height: int, title_size: int, subtitle_size: int) -> Image.Image:
    """Собирает OG на brand canvas: сверху надпись EmplyFlow (белый Manrope),
    ниже тагайн и подпись. Без наложения logo.png, чтобы не было заметной
    прямоугольной кромки от прежнего рендера."""
    canvas = Image.new("RGBA", (width, height), BLACK_ROCK)
    draw = ImageDraw.Draw(canvas)

    brand_font = ImageFont.truetype(str(FONT_SEMIBOLD), int(height * 0.24))
    title_font = ImageFont.truetype(str(FONT_SEMIBOLD), title_size)
    subtitle_font = ImageFont.truetype(str(FONT_MEDIUM), subtitle_size)

    def center(text: str, y: int, font: ImageFont.FreeTypeFont, fill) -> int:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        draw.text(((width - tw) // 2, y), text, font=font, fill=fill)
        return bbox[3] - bbox[1]

    brand_y = int(height * 0.22)
    bh = center("EmplyFlow", brand_y, brand_font, (255, 255, 255, 255))

    y = brand_y + bh + int(height * 0.09)
    title = "HRM-платформа для оценки, целеполагания и развития"
    subtitle = "оценка 360° · performance review · 9-box · карьерные треки · ИИ"
    th = center(title, y, title_font, (255, 255, 255, 235))
    center(subtitle, y + th + int(height * 0.03), subtitle_font, COTTON_CANDY)
    return canvas


def save_og_images() -> None:
    og = _compose_og(1200, 630, 42, 26)
    og.convert("RGB").save(OUT / "og-image.jpg", quality=88, optimize=True)
    og.save(OUT / "og-image.png", optimize=True)

    sq = _compose_og(1200, 1200, 54, 32)
    sq.convert("RGB").save(OUT / "og-square.jpg", quality=88, optimize=True)


if __name__ == "__main__":
    save_favicons()
    save_og_images()
    print("готово: images/seo/, favicon.ico")
