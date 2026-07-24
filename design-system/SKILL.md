---
name: emplyflow-design
description: Use this skill to generate well-branded interfaces and assets for EmplyFlow (ЭмплиФлоу), the AI-powered HRM platform for performance reviews, assessment, goal-setting, and motivation. Use for production work, prototypes, marketing pages, decks, or mock screens — anything that needs to look and sound like EmplyFlow.
user-invocable: true
---

# EmplyFlow Design Skill

Read `README.md` in this skill folder for the full system. Key files to explore:

- `README.md` — content fundamentals, visual foundations, iconography
- `colors_and_type.css` — all tokens (colors, type scale, spacing, radii, shadows). Drop this into any new HTML to inherit the brand.
- `assets/logo.png` — primary brush-script wordmark. Never typeset; always used as-image.
- `assets/palette.svg` — canonical 10-color palette source.
- `assets/screenshots/` — reference screenshots of the live site.
- `preview/` — small design-system cards (colors, type, components). Useful as copy-paste building blocks.
- `ui_kits/website/` — full landing-page recreation in React + Babel. Read `components-core.jsx` and `components-sections.jsx` to lift `Nav`, `Hero`, `Button`, `DashedCallout`, `Sparkle`, `ModuleSwitcher`, `StatsSection`, `ImplementationGrid`, `Footer`.

## Brand essentials at a glance

- **Canvas:** Black Rock `#050230` everywhere. Dark mode is the default.
- **Tile system:** rotate cards through Frosted Mint / Periwinkle / Fog / Cotton Candy / Mac-and-Cheese / Blue Ribbon. Never repeat adjacent colors.
- **Primary CTAs:** orange pill (`#FFB777`) in nav, indigo pill (`#4A3BFF`) in body. Always pill-shaped.
- **Signature element:** **dashed pink** (`#FFB8E2`) marker outline around AI / feature callouts. This is unique to EmplyFlow — use it sparingly but prominently.
- **Type:** Manrope, weights 400/500/600/700/800. Tighten tracking on display (-0.03 to -0.045em).
- **Accents:** flat four-point sparkles inside pastel tiles; iridescent 3D placeholders in hero negative space.
- **Voice:** Russian-first (Cyrillic), formal "Вы", imperative-led, quantified, no emoji, no exclamation in headlines.

## When invoked

If the user invokes this skill without further direction, ask what they want to build (prototype, mock, deck, marketing page, in-product screen, etc), ask a few clarifying questions about audience and surface, then act as an expert EmplyFlow designer. Output HTML artifacts (for throwaway / mock work) or production-ready component code (for codebase work), copying assets from this folder rather than reinventing them.

When working from this skill in Claude Code, treat the `colors_and_type.css` and the JSX components in `ui_kits/website/` as the canonical source. They are intentionally small and copy-pasteable.
