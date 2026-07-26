# EmplyFlow repository guidance

## Design system

For every new or modified visual block:

1. Read `design-system/SKILL.md` and the relevant sections of `design-system/README.md`.
2. Treat `design-system/colors_and_type.css` as the canonical source for colors, typography, spacing, radii, shadows, and motion.
3. Reuse patterns from `design-system/preview/` and `design-system/ui_kits/website/` before introducing new ones.
4. Keep UI copy Russian-first, formal, quantified where appropriate, and free of emoji.
5. If a required pattern is missing, add it to the design system before using it in the site.

Do not edit generated `index.html` or `page94832006.html` directly. Edit `src/index.template.html` and rebuild with `python3 scripts/bundle_index.py build`.
