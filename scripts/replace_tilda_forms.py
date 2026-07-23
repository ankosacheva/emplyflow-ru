#!/usr/bin/env python3
"""Replace Tilda Zero Form elems with native EmplyFlow HTML lead form."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORM_HTML = (ROOT / "partials/ef-lead-form.html").read_text(encoding="utf-8").strip()

# Pages that contain Zero Block form with EmplyFlow demo receivers
TARGETS = [
    ROOT / "page94832006.html",
    ROOT / "page92627706.html",
    ROOT / "files/page94832006body.html",
    ROOT / "files/page92627706body.html",
]

CSS_LINK = '<link rel="stylesheet" href="css/emplyflow-demo-form.css" />'
JS_MARK = "emplyflow-site-leads.js"
ENDPOINT_SNIPPET = (
    "<script>window.EMPLYFLOW_LEAD_ENDPOINT='https://script.google.com/macros/s/"
    "AKfycbwPSsRtsDOqa1U-d65K_bEtECTYT7F1RHJgwEvnZLSs83N_Fc0ZXfZaB3zljpsr9w-H/exec';</script>"
    f'<script src="js/{JS_MARK}" charset="utf-8"></script>'
)

# Zero-form export ends with: <!--googleon: all--> </div>
FORM_ELEM_RE = re.compile(
    r"<div class='t396__elem tn-elem[^']*'[^>]*data-elem-type='form'[^>]*>"
    r".*?"
    r"<!--googleon: all-->\s*</div>",
    re.S,
)


def keep_position_attrs(open_tag: str) -> str:
    """Rebuild open tag as html elem, keep layout attrs, drop form receivers."""
    # change type form -> html
    tag = open_tag.replace("data-elem-type='form'", "data-elem-type='html'")
    # remove receivers
    tag = re.sub(r"\s*data-field-receivers-value=\"[^\"]*\"", "", tag)
    # remove form-only style knobs that are unused now (safe to keep too)
    return tag


def replace_form_in_text(text: str) -> tuple[str, int]:
    count = 0

    def repl(m: re.Match) -> str:
        nonlocal count
        count += 1
        open_only = re.match(r"<div[^>]*>", m.group(0)).group(0)
        new_open = keep_position_attrs(open_only)
        form = FORM_HTML
        if count > 1:
            form = form.replace('id="ef-lead-form"', f'id="ef-lead-form-{count}"', 1)
        source = "site_demo_popup" if "rec1572865321" in text or count == 1 else "site_demo"
        form = form.replace(
            'data-ef-lead-source="site_demo_popup"',
            f'data-ef-lead-source="{source}"',
            1,
        )
        return f"{new_open}<div class='tn-atom'>{form}</div></div>"

    return FORM_ELEM_RE.subn(repl, text)


def ensure_assets(text: str, is_full_page: bool) -> str:
    if "emplyflow-demo-form.css" not in text:
        if re.search(r"</head\s*>", text, re.I):
            text = re.sub(
                r"</head\s*>",
                CSS_LINK + "</head>",
                text,
                count=1,
                flags=re.I,
            )
        else:
            text = CSS_LINK + "\n" + text

    if JS_MARK not in text:
        if re.search(r"</body\s*>", text, re.I):
            text = re.sub(
                r"</body\s*>",
                ENDPOINT_SNIPPET + "</body>",
                text,
                count=1,
                flags=re.I,
            )
        else:
            text = text.rstrip() + "\n" + ENDPOINT_SNIPPET + "\n"
    return text


def main() -> None:
    for path in TARGETS:
        if not path.exists():
            print("skip missing", path)
            continue
        original = path.read_text(encoding="utf-8")
        text, n = replace_form_in_text(original)
        if n == 0:
            print("NO FORM REPLACED", path)
            continue
        text = ensure_assets(text, is_full_page=path.suffix == ".html" and "body" not in path.name)
        path.write_text(text, encoding="utf-8")
        print(f"updated {path.name}: replaced {n} form(s), delta {len(text)-len(original):+d}")


if __name__ == "__main__":
    main()
