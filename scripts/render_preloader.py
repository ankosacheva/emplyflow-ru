#!/usr/bin/env python3
"""Рендер прелоадера главной: media/preloader.mp4 / .webm / -poster.jpg.

Фон повторяет первый экран сайта: канва Black Rock плюс те же радиальные
подсветки, что у `.ef-hero__bloom` и секционных bloom-слоёв. Никакой сетки и
техно-разметки — только логотип, мягкое свечение и фирменные четырёхлучевые
звёзды.

    python3 scripts/render_preloader.py

Требуются ffmpeg, Pillow и numpy.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
CAVEAT = ROOT / "design-system" / "fonts" / "Caveat-Variable.ttf"
MEDIA = ROOT / "media"

W, H = 1920, 1080
FPS = 30
DURATION = 3.0
FRAMES = int(FPS * DURATION)

BLACK_ROCK = (0x05, 0x02, 0x30)
BLUE_RIBBON = (0x4A, 0x3B, 0xFF)
COTTON_CANDY = (0xFF, 0xB8, 0xE2)
PERIWINKLE = (0xCE, 0xC8, 0xFF)
FROSTED_MINT = (0xD5, 0xFF, 0xF3)
WHITE = (0xFF, 0xFF, 0xFF)


def rgb(color: tuple[int, int, int]) -> np.ndarray:
    return np.array(color, dtype=np.float32) / 255.0


def ease_out(t: float, power: float = 3.0) -> float:
    t = min(max(t, 0.0), 1.0)
    return 1.0 - (1.0 - t) ** power


def fade(t: float, start: float, length: float) -> float:
    if length <= 0:
        return 1.0
    return ease_out((t - start) / length)


# ---------------------------------------------------------------- фон


def build_background() -> np.ndarray:
    """Канва сайта: #050230 плюс индиго/розовая/мятная подсветки."""
    x = np.linspace(0.0, 1.0, W, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, H, dtype=np.float32)[:, None]
    bg = np.broadcast_to(rgb(BLACK_ROCK), (H, W, 3)).copy()

    # (центр x, центр y, радиус x, радиус y, цвет, альфа) — как в CSS-градиентах
    blooms = [
        (0.04, 0.30, 0.62, 1.05, BLUE_RIBBON, 0.42),
        (1.02, 0.04, 0.58, 0.95, COTTON_CANDY, 0.13),
        (0.66, 1.16, 0.70, 0.85, FROSTED_MINT, 0.09),
        (0.50, 0.46, 0.42, 0.62, BLUE_RIBBON, 0.16),
    ]
    for cx, cy, rx, ry, color, alpha in blooms:
        dist = np.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
        weight = (np.clip(1.0 - dist, 0.0, 1.0) ** 1.35) * alpha
        bg = bg + weight[..., None] * rgb(color)[None, None, :]

    return np.clip(bg, 0.0, 1.0)


# ---------------------------------------------------------------- спрайты


def radial_glow(size: int, color: tuple[int, int, int], softness: float) -> np.ndarray:
    """RGBA-спрайт мягкого свечения (аддитивный)."""
    axis = np.linspace(-1.0, 1.0, size, dtype=np.float32)
    xx, yy = np.meshgrid(axis, axis)
    r = np.sqrt(xx**2 + yy**2)
    a = np.exp(-((r / softness) ** 2)) * np.clip(1.0 - r, 0.0, 1.0)
    sprite = np.zeros((size, size, 4), dtype=np.float32)
    sprite[..., :3] = rgb(color)
    sprite[..., 3] = a
    return sprite


def sparkle_sprite(size: int, color: tuple[int, int, int]) -> np.ndarray:
    """Четырёхлучевая звезда дизайн-системы: белое ядро, цветные лучи."""
    axis = np.linspace(-1.0, 1.0, size, dtype=np.float32)
    xx, yy = np.meshgrid(axis, axis)
    r = np.sqrt(xx**2 + yy**2)

    star = np.abs(xx) ** 0.55 + np.abs(yy) ** 0.55
    body = np.clip(1.0 - star, 0.0, 1.0) ** 0.6
    core = np.exp(-((r / 0.2) ** 2))
    halo = np.exp(-((r / 0.6) ** 2)) * 0.26
    alpha = np.clip(body + core * 0.9 + halo, 0.0, 1.0)

    mix = np.clip(r / 0.42, 0.0, 1.0)[..., None]
    rgb_data = rgb(WHITE)[None, None, :] * (1.0 - mix) + rgb(color)[None, None, :] * mix

    sprite = np.zeros((size, size, 4), dtype=np.float32)
    sprite[..., :3] = rgb_data
    sprite[..., 3] = alpha
    return sprite


TILE_SIZE = 288          # финальный размер иконки на кадре 1920×1080
TILE_SUPERSAMPLE = 8     # отрисовка в 8×, затем даунскейл — чёткие края
CAVEAT_WEIGHT = 700      # wght оси variable-шрифта


def _caveat_font(size_px: int) -> ImageFont.FreeTypeFont:
    layout = getattr(ImageFont, "Layout", None)
    kwargs = {"layout_engine": layout.RAQM} if layout else {}
    font = ImageFont.truetype(str(CAVEAT), size_px, **kwargs)
    if hasattr(font, "set_variation_by_axes"):
        font.set_variation_by_axes([CAVEAT_WEIGHT])
    return font


def render_caveat_e_layer(canvas_px: int, target_h: int) -> Image.Image:
    """Буква E шрифтом Caveat — векторная отрисовка в целевом размере."""
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    size_px = max(32, target_h)
    font = _caveat_font(size_px)
    bbox = probe.textbbox((0, 0), "E", font=font)
    height = bbox[3] - bbox[1] or 1
    size_px = max(32, int(size_px * target_h / height))
    font = _caveat_font(size_px)
    bbox = probe.textbbox((0, 0), "E", font=font)
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]

    layer = Image.new("RGBA", (canvas_px, canvas_px), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    x = (canvas_px - width) // 2 - bbox[0]
    y = int(canvas_px * 0.25) - bbox[1]
    draw.text((x, y), "E", font=font, fill=(255, 255, 255, 255))
    return layer.split()[3]


def build_tile(size: int = TILE_SIZE) -> np.ndarray:
    """Иконка EmplyFlow: скруглённый квадрат с градиентом и белой «E»."""
    ss = TILE_SUPERSAMPLE
    big = size * ss

    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, big - 1, big - 1), radius=int(big * 0.27), fill=255
    )

    axis = np.linspace(0.0, 1.0, big, dtype=np.float32)
    xx, yy = np.meshgrid(axis, axis)
    ramp = np.clip((xx + yy) / 2.0, 0.0, 1.0)[..., None]
    top = rgb((0xEC, 0xE8, 0xFF))
    bottom = rgb((0x7C, 0x6B, 0xFF))
    face = top[None, None, :] * (1.0 - ramp) + bottom[None, None, :] * ramp

    letter_layer = render_caveat_e_layer(big, int(big * 0.50))
    letter = np.asarray(letter_layer, dtype=np.float32)[..., None] / 255.0
    face = face * (1.0 - letter) + rgb(WHITE)[None, None, :] * letter

    mask_arr = np.asarray(mask, dtype=np.float32) / 255.0
    rgba = np.zeros((big, big, 4), dtype=np.float32)
    rgba[..., :3] = face
    rgba[..., 3] = mask_arr

    img = Image.fromarray((np.clip(rgba, 0.0, 1.0) * 255).astype(np.uint8), "RGBA")
    img = img.resize((size, size), Image.LANCZOS)
    out = np.asarray(img, dtype=np.float32) / 255.0
    return out


def ring_sprite(size: int, radius: float, thickness: float, color: tuple[int, int, int]) -> np.ndarray:
    axis = np.linspace(-1.0, 1.0, size, dtype=np.float32)
    xx, yy = np.meshgrid(axis, axis)
    r = np.sqrt(xx**2 + yy**2)
    a = np.exp(-(((r - radius) / thickness) ** 2))
    sprite = np.zeros((size, size, 4), dtype=np.float32)
    sprite[..., :3] = rgb(color)
    sprite[..., 3] = a
    return sprite


# ---------------------------------------------------------------- композит


def paste(canvas: np.ndarray, sprite: np.ndarray, cx: int, cy: int, opacity: float, additive: bool) -> None:
    if opacity <= 0.002:
        return
    sh, sw = sprite.shape[:2]
    x0, y0 = cx - sw // 2, cy - sh // 2
    sx0, sy0 = max(0, -x0), max(0, -y0)
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(W, x0 + sw - sx0), min(H, y0 + sh - sy0)
    if x1 <= x0 or y1 <= y0:
        return

    chunk = sprite[sy0 : sy0 + (y1 - y0), sx0 : sx0 + (x1 - x0)]
    alpha = chunk[..., 3:4] * opacity
    color = chunk[..., :3]
    target = canvas[y0:y1, x0:x1]
    if additive:
        target += color * alpha
    else:
        target *= 1.0 - alpha
        target += color * alpha


_SCALE_CACHE: dict[tuple[int, int], np.ndarray] = {}


def scaled(sprite: np.ndarray, factor: float) -> np.ndarray:
    """Масштаб с кэшем: шаг 1% незаметен глазу, но экономит минуты рендера."""
    step = int(round(factor * 100))
    if step == 100:
        return sprite
    key = (id(sprite), step)
    cached = _SCALE_CACHE.get(key)
    if cached is None:
        sh, sw = sprite.shape[:2]
        size = (max(2, sw * step // 100), max(2, sh * step // 100))
        img = Image.fromarray((np.clip(sprite, 0.0, 1.0) * 255).astype(np.uint8), "RGBA")
        cached = np.asarray(img.resize(size, Image.LANCZOS), dtype=np.float32) / 255.0
        _SCALE_CACHE[key] = cached
    return cached


SPARKLES = [
    # x, y, размер, цвет, период мерцания, фаза, задержка появления
    (0.140, 0.300, 230, COTTON_CANDY, 3.4, 0.00, 0.30),
    (0.850, 0.245, 186, PERIWINKLE, 3.9, 0.45, 0.45),
    (0.775, 0.755, 132, FROSTED_MINT, 3.2, 0.80, 0.60),
    (0.245, 0.740, 104, PERIWINKLE, 4.3, 0.25, 0.50),
    (0.620, 0.155, 74, COTTON_CANDY, 2.8, 0.60, 0.70),
    (0.915, 0.560, 62, FROSTED_MINT, 3.1, 0.90, 0.80),
]


CENTER = (W // 2, int(H * 0.455))
BAR = (360, 4, int(H * 0.70))


def build_assets() -> dict:
    return {
        "background": build_background(),
        "tile": build_tile(),
        "halo": radial_glow(900, BLUE_RIBBON, 0.42),
        "halo_soft": radial_glow(1300, PERIWINKLE, 0.55),
        "rings": [
            ring_sprite(760, 0.52, 0.045, PERIWINKLE),
            ring_sprite(760, 0.74, 0.05, COTTON_CANDY),
        ],
        "sparkles": {
            (size, color): sparkle_sprite(size, color)
            for _, _, size, color, _, _, _ in SPARKLES
        },
    }


def compose(t: float, assets: dict) -> np.ndarray:
    cx, cy = CENTER
    bar_w, bar_h, bar_y = BAR
    bar_x = cx - bar_w // 2
    canvas = assets["background"].copy()

    breathe = 0.5 + 0.5 * np.sin(2 * np.pi * (t / 4.2))
    paste(canvas, assets["halo_soft"], cx, cy, 0.16 + 0.05 * breathe, True)
    paste(canvas, assets["halo"], cx, cy, 0.26 + 0.08 * breathe, True)

    # Знак уже виден на первом кадре — он же постер, лишнего проявления нет.
    appear = 0.55 + 0.45 * fade(t, 0.0, 0.7)

    for ring_index, ring in enumerate(assets["rings"]):
        phase = (t / 2.6 + ring_index * 0.5) % 1.0
        opacity = 0.20 * (1.0 - phase) ** 1.4 * appear
        paste(canvas, scaled(ring, 0.85 + phase * 0.45), cx, cy, opacity, True)

    for sx, sy, size, color, period, phase, delay in SPARKLES:
        twinkle = 0.55 + 0.45 * np.sin(2 * np.pi * (t / period + phase))
        drift = np.sin(2 * np.pi * (t / (period * 1.7) + phase)) * 6.0
        paste(
            canvas,
            scaled(assets["sparkles"][(size, color)], 0.94 + 0.06 * twinkle),
            int(sx * W),
            int(sy * H + drift),
            0.72 * twinkle * fade(t, delay, 0.9),
            True,
        )

    paste(canvas, assets["tile"], cx, cy, appear, False)

    canvas[bar_y : bar_y + bar_h, bar_x : bar_x + bar_w] += rgb(WHITE) * 0.12
    progress = ease_out(min(1.0, (t + 0.15) / (DURATION * 0.8)), 2.0)
    filled = int(bar_w * progress)
    if filled > 0:
        ramp = np.linspace(0.0, 1.0, filled, dtype=np.float32)[None, :, None]
        fill = rgb(PERIWINKLE)[None, None, :] * (1.0 - ramp) + rgb(COTTON_CANDY)[None, None, :] * ramp
        strip = canvas[bar_y : bar_y + bar_h, bar_x : bar_x + filled]
        canvas[bar_y : bar_y + bar_h, bar_x : bar_x + filled] = strip * 0.15 + fill * 0.85

    # Дизер: без него плавные блумы после H.264/VP9 распадаются на кольца.
    noise = np.random.default_rng(1024 + int(t * 1000)).uniform(-0.7, 0.7, canvas.shape[:2])
    quantized = np.clip(canvas, 0.0, 1.0) * 255.0 + noise[..., None] + 0.5
    return np.clip(quantized, 0.0, 255.0).astype(np.uint8)


def render() -> Path:
    assets = build_assets()
    tmp = Path(tempfile.mkdtemp(prefix="ef-preloader-"))
    for index in range(FRAMES):
        Image.fromarray(compose(index / FPS, assets), "RGB").save(tmp / f"{index:04d}.png")
    return tmp


def encode(frames_dir: Path) -> None:
    MEDIA.mkdir(parents=True, exist_ok=True)
    pattern = str(frames_dir / "%04d.png")

    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error", "-framerate", str(FPS), "-i", pattern,
            "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-tune", "grain",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(MEDIA / "preloader.mp4"),
        ],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error", "-framerate", str(FPS), "-i", pattern,
            "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "30", "-row-mt", "1",
            "-pix_fmt", "yuv420p",
            str(MEDIA / "preloader.webm"),
        ],
        check=True,
    )
    Image.open(frames_dir / "0000.png").save(MEDIA / "preloader-poster.jpg", quality=88, optimize=True)


def preview(times: list[float], out_dir: Path) -> None:
    assets = build_assets()
    out_dir.mkdir(parents=True, exist_ok=True)
    for t in times:
        path = out_dir / f"preview-{t:.2f}.png"
        Image.fromarray(compose(t, assets), "RGB").resize((W // 2, H // 2)).save(path)
        print(path)


def main() -> None:
    if not CAVEAT.exists():
        sys.exit(f"нет {CAVEAT.relative_to(ROOT)} — скачайте Caveat из Google Fonts")

    if len(sys.argv) > 2 and sys.argv[1] == "preview":
        preview([float(v) for v in sys.argv[2].split(",")], Path(sys.argv[3] if len(sys.argv) > 3 else "."))
        return

    if not shutil.which("ffmpeg"):
        sys.exit("нет ffmpeg")

    frames_dir = render()
    try:
        encode(frames_dir)
    finally:
        shutil.rmtree(frames_dir, ignore_errors=True)

    for name in ("preloader.mp4", "preloader.webm", "preloader-poster.jpg"):
        size_kb = (MEDIA / name).stat().st_size / 1024
        print(f"media/{name} — {size_kb:.0f} КБ")


if __name__ == "__main__":
    main()
