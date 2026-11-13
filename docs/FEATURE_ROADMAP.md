# CloudMC Shop — Feature Roadmap

Curated from the user's Nov 12 2026 request. Ordered by expected delivery value.

## Bugs (Immediate)

- **Changelog update UX** — `update_available` shows in changelog but there's no "Update" button/CTA to trigger `update-server.sh` (`.update-requested` flag flow via `autoUpdaterSimple.js`).
- **Edit item menu positioning** — menu should open near the clicked item or auto-scroll into view.
- **Icon picker UX** — same footprint as edit item menu, capped organized icon grid, no full-screen backdrop dim, 3D animated scrollbar.
- **Custom icons** — dedicated icon storage location + size requirements; "custom icon" section inside the edit item icon picker.
- **Quick icon picker** — clicking the item's icon in the list opens a compact searchable animated picker (possible custom icon API).

## High-Value Features

### Per-List Budgets
- Save budget per shopping list; remember previous budgets per list/store.
- Inline suggestion: "last time you budgeted $X — use it?" with opt-out.
- `previous-budget` API endpoint.
- Related MDL fields: store, typical spend, items-per-trip.

### Homemade Lab Framework (`f1`)
Reusable animated selection-interface API powering:
- **Spice Lab** (exists — `backend/src/routes/spices.js`)
- **Mix/Blend Lab** — blend recipes (pesto, tzatziki, guacamole, sour-cream-onion dip, spaghetti sauce) with have/missing ingredients cross-referenced against home inventory
- **Meal Lab / Smoothie Lab** — recipes from available resources
- **Plate Lab** — balanced-diet system
- Sidebar: `Homemade Lab` → lab submenus

### Spice UX Overhaul
- Have/missing toggle grid with at-a-glance missing indicators
- Mobile multi-select (avoid endless scrolling)
- Saved blends; alternate/substitution suggestions; omit ingredients in blends
- Draggable spice overlay on recipe cards

### Shopping-List MDL (`f5`)
- Learn list names per store → autofill/recommend names (opt-out setting)
- Common items, brands, quantities, purchase timing per store
- Price comparison across stores; store nicknames
- Inline badges for margins/items/brands/preferences
- Admin data views; per-feature disable settings

### Changelog Admin (`f4`)
- Edit/hide unreleased features; release dates; beta-only toggle
- Priority inline badges; drag-to-sort; fancy scrollbar for long lists
- Release animations; bulk-release compresses patch notes
- Notify beta testers + users on release

## Medium

- **MDL auto-categorization** — product database auto-assigns categories from item/ingredient names.
- **Recipe Card Carousel/Rolodex** — flip-book rotation UI; integrates teachable recipe.
- **Teachable Recipe** — step-by-step quick recipe capture.

## Low / Later

- **Plate system** — food groups, calories, protein/fat/carb %, per-household-member tracking, recommendations + substitutions.
- **Smoothie Lab** — smoothies from on-hand resources.

## Notes

- Blend base-ingredient display (e.g., bbq rub → bbq sauce) is an open design question: show as missing ingredient vs. blend-type recipe.
- Icon picker should reuse the Lab animated-interface style where feasible (3D scrollbar, compact overlays).
