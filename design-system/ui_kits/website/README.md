# EmplyFlow Website UI Kit

A hi-fidelity recreation of the [emplyflow.ru](https://emplyflow.ru) marketing site.

## Status

**Recreated from screenshots only.** No source code or Figma was provided. As a result:

- Layouts, typography, color, and copy were lifted directly from screenshots and should be visually accurate.
- The decorative **3D iridescent sparkle / arrow renders** in the hero are **placeholders** built from flat SVG. The real site uses bespoke 3D renders — please supply them.
- The **brush-script logo** uses the supplied `assets/logo.png`.
- The customer-portrait photo is a **placeholder block** (we don't have rights to the original asset). Drop a `customer-portrait.jpg` into `assets/` to replace it.
- Component implementations are simplified for visual fidelity, not production parity.

## Files

- `index.html` — the page scaffold. Open this. Pulls in React/Babel and all components below.
- `app.jsx` — all components in one file (Nav, Hero, ModuleSwitcher, Stats, ImplementationGrid, Footer + shared primitives Button, Sparkle, DashedCallout). Kept inline so each component is < 100 lines and easy to copy out.

## What's covered

| Component             | File          | Notes                                                         |
| --------------------- | ------------- | ------------------------------------------------------------- |
| `<Nav>`               | app.jsx       | Sticky top nav with frosted blur                              |
| `<Button>`            | app.jsx       | Pill, three variants (orange, indigo, ghost)                  |
| `<DashedCallout>`     | app.jsx       | Pink dashed-marker badge — the signature brand element        |
| `<Sparkle>`           | app.jsx       | Flat four-point star; size + color props                      |
| `<Hero>`              | app.jsx       | Full hero with mixed-color headline and AI dashed callout     |
| `<CustomerLogos>`     | app.jsx       | Single-row logo wall, wordmark-only (no image rights)         |
| `<ModuleSwitcher>`    | app.jsx       | Side-nav of modules + active-module detail panel              |
| `<StatsSection>`      | app.jsx       | Big wordmark + 3 stat tiles + photo placeholder               |
| `<ImplementationGrid>`| app.jsx       | 6-tile numbered process grid                                  |
| `<Footer>`            | app.jsx       | Final CTA + contact + legal + big wordmark                    |

## How to use

Open `index.html` directly — it works without a server. Edit `app.jsx` to change component implementations; reload to see updates.

## Module cards

Production pattern for the `#platform` section lives in `src/index.template.html` (`.ef-mods`).

Source prototype: `module-cards.source.html` — flagship Performance Review card + bento grid of six modules with product UI mocks.
