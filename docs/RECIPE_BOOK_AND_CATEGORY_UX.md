# Recipe Book & Category UX

Covers the recipe-book view/edit split, recipe icon/rating/difficulty/substitution
surfaces, home-lab staging, and the animated canonical-category picker for
shopping-list items.

## Recipe Book (`frontend/src/pages/Recipes.js`)

- **View vs edit** — clicking a recipe (list row, shelf card, rolodex, slider)
  opens `RecipeViewModal` (`viewingRecipe`); only the pencil button opens the
  `RecipeModal` editor (`selectedRecipe`). The last-viewed recipe id persists
  in `localStorage` (`recipesLastRecipeId`) and re-opens on revisit.
- **List view** — `RecipeListView` rows: clickable icon (opens `RecipeIconPicker`),
  favorite star, pencil edit, add-to-list cart, delete. Scroll container uses
  `.scrollbar-3d` from `frontend/src/styles/scrollbar.css`.
- **Delete** — `handleDeleteRecipe` → `ConfirmModal` (`limbo/modals/ConfirmModal`,
  not `window.confirm`) → `recipesAPI.deleteRecipe` + refresh.

## RecipeViewModal (`frontend/src/components/recipes/RecipeViewModal.js`)

- Read-only sheet: icon, metadata, ingredients, steps, substitutions.
- **Difficulty** — quick PATCH `{ difficulty }` (easy/medium/hard).
- **Rating** — per-user stars via `POST /api/recipes/:id/rate` → upserts into
  `recipe_ratings` (migration 070). Aggregate via `GET /api/recipes/:id/ratings`
  (`{avg, count, mine}`). The `recipes.rating` column (migration 028) is an
  imported/legacy field — do NOT write user ratings there.
- **Icon** — same `RecipeIconPicker` as the list rows.
- **Substitutions** — `frontend/src/utils/ingredientSubstitutions.js`
  (`lookupSubstitutions`) suggests swaps per ingredient, informational only.

## RecipeIconPicker (`frontend/src/components/recipes/RecipeIconPicker.js`)

- Preset food emojis → stores `emoji:X` in `image_url`.
- URL entry or file upload → data URL (≤ 2 MB) in `image_url`.
- `emoji:` prefix convention is rendered by list rows, shelf cards, and the
  view modal (slice off prefix; anything else renders as `<img>`).

## RecipeModal editor (`frontend/src/components/RecipeModal.js`)

- **Shared parsers** — `frontend/src/utils/recipeParsers.js` holds the
  Teachable-style parsing helpers used by both `RecipeModal` and
  `recipes/TeachableRecipe.js` (single source of truth):
  `parseIngredientLine` ("1/2 tsp salt"), `parseMinutesText` ("1h 30m",
  "half hour"), `parseServingsText` ("serves 6", "2-3"),
  `autoFormatFractions` ("1/2" → "½" as you type), `autoFormatTemperature`
  ("350F" → "350°F"), `splitForSuggestion` (autocomplete prefix split),
  `FRACTION_CHIPS` / `UNIT_CHIPS`.
- **Free-text meta row** — Servings / Prep / Cook / Temp are text inputs
  parsed on submit; prefill shows e.g. "15 min". `temperature` is a real
  backend column (PATCH/POST).
- **Icon/photo** — the broken Unsplash auto-detect and raw `imagesAPI`
  upload were removed. `RecipeIconPicker` (emoji presets, URL, file→dataURL)
  is the single picker; "Auto icon" guesses an emoji via `detectIcon()`
  from `utils/categoryDetector.js`. First ingredient added also triggers
  auto icon if nothing is set.
- **URL import** — kept (backend `POST /api/recipes/import` scraper works)
  but tucked behind a collapsible "Import from a recipe URL" section;
  errors render inline instead of `alert()`.
- **Ingredients** — one-line teachable input (`parseIngredientLine`),
  Enter adds, autocomplete via `splitForSuggestion` +
  `getAutocompleteSuggestions`, fraction/unit quick chips, optional/staple/
  notes extras kept, click ✎ rebuilds the editable line.
- **Backdrop** — lightened to `bg-black/25` with a spring `motion.div`
  entrance; same for `EditItemModal.js` (`bg-black/25`).

## Inventory categories & views

- **`INVENTORY_CATEGORIES`** lives in `components/QuickCategoryModal.js`
  and is the single source for the ~29 inventory categories — each entry
  is `{ value, label, icon, color }` where `color` is the Tailwind chip
  classes used by `CategoryView` group headers. `CategoryView` and
  `EnhancedListView` both import it (do NOT re-add per-file icon maps).
- **View modes** — Home Inventory (`backburner/pages/PantryNewV2.js`)
  only allows `list` and `category`; `LocationNavigator` exposes only
  those two and a stale `localStorage.pantryViewMode` falls back to
  `list`. Bulk select-mode lives in list view via
  `selectionMode`/`selectedItems`/`onToggleSelection` props on
  `EnhancedListView`.
- **Quantities** — every inventory surface uses `formatQuantityPlain`
  (`utils/formatQuantity.js`) so `1.00` renders as `1` and fractions
  render as unicode glyphs.

## Home-lab staging (`in_recipe_book`)

- **Migration** `backend/migrations/094_recipe_book_staging.sql` adds
  `recipes.in_recipe_book BOOLEAN DEFAULT TRUE` and backfills `custom-builder`
  / `plate-lab` tagged recipes to FALSE (`tags` is `TEXT[]`, migration 028 —
  `@>` containment works).
- **Backend** `backend/src/routes/recipes.js`:
  - `GET /recipes` excludes staged rows unless `?include_staged=true`.
  - `POST /recipes` accepts `in_recipe_book`.
  - `PATCH /recipes/:id` accepts `in_recipe_book`, `difficulty`, `category`,
    `cuisine`, `tags`, `rating`, `temperature`.
- **Labs** stage with `in_recipe_book: false`:
  - `SmoothieBuilder.js` — saves to "Can Create" (toasts say Can Create,
    not Recipe Book).
  - `PlateLab.js` — same; `saveMealAsRecipe` tags `['plate-lab']`.
  - `CategoryRecipeLab.js` — loads `include_staged=true`; "Send to Recipe
    Book" PATCHes `{ in_recipe_book: true }` for owned creations, copies
    presets via `POST /recipes/:id/copy`.

## Category picker (`frontend/src/components/QuickCategoryPicker.js`)

- Anchored animated popup (Portal + Framer Motion, `rotateX` enter) listing
  the 13 canonical categories from `CANONICAL_CATEGORIES`
  (`utils/categoryDetector.js` — matches the `categories` table).
- Search filter + "detected" quick action via `detectCategory(itemName)`.
- `onSelect` emits the canonical name; `anchor` = `{cx, top, bottom}` from the
  trigger's `getBoundingClientRect()`. `anchor === null`/`undefined` →
  centered modal (mobile fallback).

### Wiring

- **Item rows** (`ItemList.js` → `ItemCard`): amber category chip in the meta
  row next to `StorePriceBadge` opens the picker. `applyCategory` calls
  `onEdit({...item, id, category, category_name, category_icon})` for every
  combined-row id (`item.ids || [item.id]`), then plays `pop`.
- **Add-item form** (`Dashboard.js`): the old `<select>` is replaced by a
  button showing `{icon} {name}` (or "Category") that opens the same picker
  via `addCatAnchor`. Auto-detection while typing the item name still fills
  `newItemCategory`.

## Beta Instant Messaging (`beta_messages`)

- **Migration** `backend/migrations/095_beta_instant_messages.sql` — sender_id,
  recipient_id, body (≤2000), read_at; partial index on unread recipients.
- **Routes** `backend/src/routes/betaMessages.js` at `/api/beta/messages`:
  - `GET /peers` — admins see all `is_beta_tester` users; testers see all admins.
    Each row carries `unread` count + `last_at` for list ordering.
  - `GET /thread/:userId?after=<id>` — thread oldest→newest; `after` makes the
    3 s incremental poll cheap (only new rows).
  - `POST /` `{to, body}` — enforced admin↔tester pairing both directions.
  - `POST /read/:userId` — marks messages from that user read.
- **UI** `frontend/src/components/beta/BetaChat.js` — peer list → thread,
  3 s `?after=` polling, Enter-to-send, unread badges.
  - Admin: "Chat" tab on `AdminBetaDashboard` + Chat radial action on each
    tester card (`BetaTesterManagementCFS`, opens thread modal).
  - Tester: embedded at the top of `ThankYouMessages` (shown in
    DynamicLayout) + registered as `BetaChat` in DynamicLayout's
    `componentMap`.
- Thank-you messages (`beta_thank_you_messages`) remain a separate one-way
  system — don't merge; chat is the two-way channel.

## Home Inventory & Unpack fixes

- **Bug fixed** `backend/src/routes/pantry.js` used `req.user.userId`, but
  `authenticateToken` normalizes to `req.user.id` — every `/api/pantry`
  query filtered on `undefined` and returned nothing. This was the
  "home inventory not loading" cause. `PantryEnhanced` uses `pantryAPI`.
- **Unpack flow** (`/staging` page → `stagingAPI`):
  `POST /staging/from-shopping-list/:listId` moves checked list items into
  `staging_area` (flags `moved_to_staging`), `PUT-away` routes insert into
  `inventory`+`items` (schema.sql; columns via migration 026) then delete
  the staging row. All staging routes correctly use `req.user.id`.

## Gotchas

- `Portal` is exported from `frontend/src/utils/autoPlacement.js` (not
  react-dom directly) — same pattern as `QuickIconPicker`.
- `api` default export in `services/api.js` is the axios instance with auth
  interceptors; named exports like `recipesAPI` wrap it.
- Recipe list rows get `avg_rating` / `rating_count` from the `GET /recipes`
  aggregate subqueries — no extra fetch needed for list stars.
