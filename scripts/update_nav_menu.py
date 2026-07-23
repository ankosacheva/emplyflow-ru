#!/usr/bin/env python3
"""Rename Внедрение/Интеграция -> Внедрение, add Библиотека, even out nav gaps."""

from __future__ import annotations

import re
from pathlib import Path

FILES = [
    Path("page94832006.html"),
    Path("files/page94832006body.html"),
]

W_MODULES = 100
W_ABOUT = 35
W_IMPL = 66
W_LIB = 70
W_PROJECTS = 51
W_NEWS = 52
W_CONTACTS = 57
W_CASES = 42

GAP_1200 = 24
GAP_960 = 20
START_1200 = 319
START_960 = 182
OFFSCREEN = 842

ROLE_ORDER = ["modules", "about", "impl", "lib", "projects", "news", "contacts"]

BLOCKS = {
    "rec1575214531": {
        "top_1200": 28,
        "kind": "header",
        "items": {
            "modules": "176238469561633560",
            "about": "176238469561373030",
            "impl": "176238469561197640",
            "projects": "176238469560885340",
            "news": "176238469560647670",
            "contacts": "176238469560313220",
        },
        "projects_label": "Проекты",
        "new_lib_id": "176999100000000001",
    },
    "rec1556668851": {
        "top_1200": 24,
        "kind": "hero",
        "items": {
            "modules": "176297827949950770",
            "about": "176297827949713500",
            "impl": "176297827949429920",
            "projects": "176297827949141860",
            "news": "176297827948881700",
            "contacts": "176297827948264220",
        },
        "projects_label": "Проекты",
        "new_lib_id": "176999100000000002",
    },
    "rec1575263871": {
        "top_1200": 24,
        "kind": "mobilemenu",
        "items": {
            "modules": "176344774985099490",
            "about": "176344774984687280",
            "impl": "176344774984262520",
            "projects": "176344774983898070",
            "news": "176344774983334480",
            "contacts": "176344774982827990",
        },
        "projects_label": "Кейсы",
        "new_lib_id": "176999100000000003",
        "tops_320": {
            "modules": 55,
            "about": 95,
            "impl": 135,
            "lib": 175,
            "projects": 215,
            "news": 255,
            "contacts": 295,
        },
        "width_320_lib": 230,
    },
}


def pack(start: int, widths: list[int], gap: int) -> list[int]:
    lefts = []
    x = start
    for w in widths:
        lefts.append(x)
        x += w + gap
    return lefts


def role_widths(projects_label: str) -> dict[str, int]:
    return {
        "modules": W_MODULES,
        "about": W_ABOUT,
        "impl": W_IMPL,
        "lib": W_LIB,
        "projects": W_CASES if projects_label == "Кейсы" else W_PROJECTS,
        "news": W_NEWS,
        "contacts": W_CONTACTS,
    }


def extract_css_chunk(style: str, rid: str, eid: str, next_eid: str | None, end_pos: int | None):
    first = style.find(f'#{rid} .tn-elem[data-elem-id="{eid}"]')
    if first < 0:
        raise RuntimeError(f"CSS for {eid} not found in {rid}")
    if next_eid:
        end = style.find(f'#{rid} .tn-elem[data-elem-id="{next_eid}"]')
        if end < 0:
            raise RuntimeError(f"next eid {next_eid} not found after {eid}")
    else:
        assert end_pos is not None
        end = end_pos
    chunk = style[first:end]
    others = set(re.findall(r'data-elem-id="(\d+)"', chunk)) - {eid}
    if others:
        raise RuntimeError(f"CSS chunk for {eid} contains others: {others}")
    if chunk.count("{") != chunk.count("}"):
        raise RuntimeError(f"brace imbalance for {eid}")
    return first, end, chunk


def update_chunk_positions(
    chunk: str,
    eid: str,
    *,
    left_1200: int,
    width: int,
    left_960: int,
    left_640: int,
    left_320: int,
    top_320: int | None = None,
    width_320: int | None = None,
) -> str:
    for half, left in (
        (600, left_1200),
        (480, left_960),
        (320, left_640),
        (160, left_320),
    ):
        chunk = re.sub(
            rf"left:calc\(50% - {half}px \+ \d+px\)",
            f"left:calc(50% - {half}px + {left}px)",
            chunk,
        )
    chunk = re.sub(
        rf'(\[data-elem-id="{eid}"\]\{{[^}}]*?)width:\d+px(;height:20px)',
        rf"\1width:{width}px\2",
        chunk,
        count=1,
    )
    if top_320 is not None:
        pattern = (
            rf'(@media screen and \(max-width:639px\)\{{[^{{}}]*'
            rf'\.tn-elem\[data-elem-id="{eid}"\]\{{)([^}}]*)(\}})'
        )

        def repl(m: re.Match) -> str:
            body = m.group(2)
            body = re.sub(r"top:\d+px", f"top:{top_320}px", body, count=1)
            if width_320 is not None:
                body = re.sub(r"width:\d+px", f"width:{width_320}px", body, count=1)
            return m.group(1) + body + m.group(3)

        chunk, n = re.subn(pattern, repl, chunk, count=1)
        if n != 1 and top_320 is not None:
            # mobilemenu has top in 639 block; header/hero may only have display:none
            pass
    return chunk


def find_html_elem(html: str, eid: str) -> re.Match:
    pat = (
        rf"<div class='t396__elem tn-elem[^']*'[^>]*data-elem-id='{eid}'[^>]*>"
        rf"\s*<a class='tn-atom' href=\"[^\"]*\">.*?</a>\s*</div>"
    )
    m = re.search(pat, html, re.S)
    if not m:
        raise RuntimeError(f"HTML elem {eid} not found")
    return m


def update_html_elem(
    elem: str,
    *,
    left_1200: int,
    width: int,
    left_960: int,
    left_640: int,
    left_320: int,
    top_1200: int | None = None,
    top_320: int | None = None,
    width_320: int | None = None,
    label: str | None = None,
    href: str | None = None,
) -> str:
    repls = {
        "data-field-left-value": str(left_1200),
        "data-field-width-value": str(width),
        "data-field-left-res-960-value": str(left_960),
        "data-field-left-res-640-value": str(left_640),
        "data-field-left-res-320-value": str(left_320),
    }
    if top_1200 is not None:
        repls["data-field-top-value"] = str(top_1200)
    if top_320 is not None:
        repls["data-field-top-res-320-value"] = str(top_320)
    if width_320 is not None:
        repls["data-field-width-res-320-value"] = str(width_320)
    for attr, val in repls.items():
        if re.search(rf'{attr}="[^"]*"', elem):
            elem = re.sub(rf'{attr}="[^"]*"', f'{attr}="{val}"', elem, count=1)
        elif attr.startswith("data-field-left-res") or attr.startswith("data-field-top-res") or attr.startswith("data-field-width-res"):
            # insert before closing of opening tag if missing
            elem = re.sub(r"(\s*)(/?>)", rf' {attr}="{val}"\1\2', elem, count=1)
    if label is not None:
        elem = re.sub(
            r'(<span class="tn-atom__button-text">)[^<]*(</span>)',
            rf"\1{label}\2",
            elem,
            count=1,
        )
    if href is not None:
        elem = re.sub(
            r"(<a class='tn-atom' href=\")[^\"]*(\")",
            rf"\1{href}\2",
            elem,
            count=1,
        )
    return elem


def make_lib_from_template(
    template: str,
    *,
    rid: str,
    old_id: str,
    new_id: str,
    left_1200: int,
    width: int,
    left_960: int,
    left_640: int,
    left_320: int,
    top_1200: int,
    top_320: int | None,
    width_320: int | None,
) -> str:
    elem = template
    elem = elem.replace(old_id, new_id)
    # class token tn-elem__{recnum}{old} -> new
    elem = elem.replace(f"tn-elem__{rid[3:]}{old_id}", f"tn-elem__{rid[3:]}{new_id}")
    elem = update_html_elem(
        elem,
        left_1200=left_1200,
        width=width,
        left_960=left_960,
        left_640=left_640,
        left_320=left_320,
        top_1200=top_1200,
        top_320=top_320,
        width_320=width_320,
        label="Библиотека",
        href="https://emplyflow.ru/hub/",
    )
    return elem


def positions_for(cfg: dict, widths: dict[str, int]):
    wlist = [widths[r] for r in ROLE_ORDER]
    pos1200 = dict(zip(ROLE_ORDER, pack(START_1200, wlist, GAP_1200)))
    kind = cfg["kind"]
    if kind == "header":
        pos960 = dict(zip(ROLE_ORDER, pack(START_960, wlist, GAP_960)))
        pos640 = dict(pos960)
        pos320 = dict(pos960)
    elif kind == "hero":
        pos960 = {r: pos1200[r] + OFFSCREEN for r in ROLE_ORDER}
        pos640 = dict(pos960)
        pos320 = dict(pos960)
    else:
        pos960 = {r: pos1200[r] + OFFSCREEN for r in ROLE_ORDER}
        pos640 = dict(pos960)
        pos320 = {r: 31 for r in ROLE_ORDER}
    return pos1200, pos960, pos640, pos320


def process_file(path: Path) -> bool:
    html = path.read_text(encoding="utf-8")
    original = html

    for rid, cfg in BLOCKS.items():
        if f'id="{rid}"' not in html:
            print(f"  skip missing {rid} in {path}")
            continue

        items = cfg["items"]
        widths = role_widths(cfg["projects_label"])
        pos1200, pos960, pos640, pos320 = positions_for(cfg, widths)
        tops_320 = cfg.get("tops_320", {})

        sm = re.search(rf'(<div id="{rid}".*?<style>)(.*?)(</style>)', html, re.S)
        if not sm:
            raise RuntimeError(f"no style for {rid}")
        style = sm.group(2)

        css_order = ["contacts", "news", "projects", "impl", "about", "modules"]
        eids = [items[r] for r in css_order]

        modules_eid = items["modules"]
        modules_first = style.find(f'#{rid} .tn-elem[data-elem-id="{modules_eid}"]')
        rest = style[modules_first + 10 :]
        mnext = re.search(
            rf'#{rid} \.tn-elem\[data-elem-id="(?!{modules_eid})\d+"\]', rest
        )
        if not mnext:
            raise RuntimeError(f"cannot find CSS end for modules in {rid}")
        modules_end = modules_first + 10 + mnext.start()

        replacements = []
        impl_template_chunk = None
        impl_end = None

        for i, role in enumerate(css_order):
            eid = items[role]
            if role == "modules":
                start, end, chunk = modules_first, modules_end, style[modules_first:modules_end]
            else:
                start, end, chunk = extract_css_chunk(style, rid, eid, eids[i + 1], None)

            new_chunk = update_chunk_positions(
                chunk,
                eid,
                left_1200=pos1200[role],
                width=widths[role],
                left_960=pos960[role],
                left_640=pos640[role],
                left_320=pos320[role],
                top_320=tops_320.get(role),
            )
            if role == "impl":
                impl_template_chunk = chunk
                impl_end = end
            replacements.append((start, end, new_chunk, role))

        lib_id = cfg["new_lib_id"]
        lib_css = impl_template_chunk.replace(items["impl"], lib_id)
        lib_css = update_chunk_positions(
            lib_css,
            lib_id,
            left_1200=pos1200["lib"],
            width=W_LIB,
            left_960=pos960["lib"],
            left_640=pos640["lib"],
            left_320=pos320["lib"],
            top_320=tops_320.get("lib"),
            width_320=cfg.get("width_320_lib"),
        )

        replacements.sort(key=lambda x: x[0], reverse=True)
        for start, end, new_chunk, role in replacements:
            if role == "impl":
                style = style[:start] + new_chunk + lib_css + style[end:]
            else:
                style = style[:start] + new_chunk + style[end:]

        html = html[: sm.start(2)] + style + html[sm.end(2) :]

        # HTML elements: update existing, insert library after Внедрение
        for role in ROLE_ORDER:
            if role == "lib":
                continue
            eid = items[role]
            m = find_html_elem(html, eid)
            label = "Внедрение" if role == "impl" else None
            new_elem = update_html_elem(
                m.group(0),
                left_1200=pos1200[role],
                width=widths[role],
                left_960=pos960[role],
                left_640=pos640[role],
                left_320=pos320[role],
                top_320=tops_320.get(role),
                label=label,
            )
            html = html[: m.start()] + new_elem + html[m.end() :]

            if role == "impl":
                # re-find updated impl and insert library after it
                m2 = find_html_elem(html, eid)
                lib_html = make_lib_from_template(
                    m2.group(0),
                    rid=rid,
                    old_id=eid,
                    new_id=lib_id,
                    left_1200=pos1200["lib"],
                    width=W_LIB,
                    left_960=pos960["lib"],
                    left_640=pos640["lib"],
                    left_320=pos320["lib"],
                    top_1200=cfg["top_1200"],
                    top_320=tops_320.get("lib"),
                    width_320=cfg.get("width_320_lib"),
                )
                html = html[: m2.end()] + lib_html + html[m2.end() :]

        print(f"  updated {rid}")

    if html == original:
        print(f"No changes in {path}")
        return False
    path.write_text(html, encoding="utf-8")
    print(f"Wrote {path} ({len(html) - len(original):+d} bytes)")
    return True


def verify(path: Path) -> None:
    html = path.read_text(encoding="utf-8")
    print(f"\nVERIFY {path}:")
    print("  old label:", html.count("Внедрение/Интеграция"))
    print(
        "  Внедрение spans:",
        len(re.findall(r'<span class="tn-atom__button-text">Внедрение</span>', html)),
    )
    print(
        "  Библиотека spans:",
        len(re.findall(r'<span class="tn-atom__button-text">Библиотека</span>', html)),
    )
    print("  hub links:", html.count("https://emplyflow.ru/hub/"))
    for rid, cfg in BLOCKS.items():
        print(f"  {rid} lib id:", cfg["new_lib_id"] in html)
        # show left positions from CSS
        style_m = re.search(rf'<div id="{rid}".*?<style>(.*?)</style>', html, re.S)
        if not style_m:
            continue
        style = style_m.group(1)
        for role, eid in {**cfg["items"], "lib": cfg["new_lib_id"]}.items():
            m = re.search(
                rf'\.tn-elem\[data-elem-id="{eid}"\]\{{[^}}]*left:calc\(50% - 600px \+ (\d+)px\)[^}}]*width:(\d+)px',
                style,
            )
            if m:
                print(f"    {role}: left={m.group(1)} width={m.group(2)}")


def main() -> None:
    for f in FILES:
        print("Processing", f)
        process_file(f)
        verify(f)


if __name__ == "__main__":
    main()
