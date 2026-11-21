# TODO & Completed — shopWebserver (Listzy)

**Go-to tracking file for errors, bugs, tasks, ideas, fixes, and updates.**
The app is complicated — that's fine, this file is the memory. Update it every session:
new problems go under Open, finished work moves to the Completed Log with date + commit.

> Older root .md files (`CURRENT_STATUS.md`, `ISSUES_AND_FIXES.md`, `DEPLOYMENT_LOG.md`,
> `MODERNIZATION_*.md`, `BUG_FIX_PLAN.md`, etc.) are from September sessions — historical only.
> This file supersedes them.

**How to use:** check `Open` sections first, update statuses as you go, and when something
ships move it to the Completed Log (newest first) with the commit hash.

**Deploy convention:** every time we are about to run the update command
(`./update-server.sh`, `update-manual.sh`, or the Admin update path), first produce a
commit message summarizing everything included in that deploy — it doubles as the
release note. No Devin/Windsurf attribution in commits, ever.

---

## 🔴 Open — Bugs / Errors

### 1. Recipe book delete — SECOND bug found (frontend), fix in working tree

- **Symptom:** trash can / delete buttons don't delete the recipe; page looked frozen;
  console showed `Failed to check recipes: 500` and `Delete recipe error:`.
- **Root cause #1 (backend, FIXED + DEPLOYED `efe9c80`):** prod DB is partially migrated
  (see `backend/migrations/098` header) — live FK constraints on `recipes(id)` may be
  `NO ACTION`. DELETE now scans `information_schema` and clears dependents per rule
  (shopping_list_items are unlinked, never deleted).
- **Root cause #2 (frontend, found 2026-11-20):** `RecipeCardSlider`'s flipped-card Delete
  called `onDeleteRecipe(recipe)` — the whole object → `DELETE /api/recipes/[object Object]`
  → Postgres rejects the non-integer id → **500**. This explains delete failing even after
  the backend fix deployed.
- **Fixes applied (uncommitted):**
  - `RecipeCardSlider.js` — back-face Delete now passes `recipe.id`; new trash button on the
    card front (next to the heart)
  - `RecipeRolodex.js` — trash button on the top card face (next to edit/star)
  - `Recipes.js` — `ShelfCard` gets `onDelete` + trash button; `confirmDeleteRecipe` accepts
    id-or-object defensively and shows the real HTTP status in the failure notice;
    `deckView` default changed `rolodex` → `list` (localStorage persistence already existed)
  - `backend/src/routes/recipes.js` — non-numeric `:id` rejected with 400 before the
    transaction (no more misleading 500)
- **Deploy status:** earlier backend fix confirmed live (SW byte-identical); THIS frontend
  fix needs commit → push → Admin update to go live.
- **Next:** retest after deploy + hard refresh. If still failing:
  `docker logs shop_backend --tail 200 | grep "Delete recipe error"`
- **Files:** `backend/src/routes/recipes.js` (DELETE ~line 393), `frontend/src/pages/Recipes.js`,
  `frontend/src/components/recipes/{RecipeCardSlider,RecipeRolodex,RecipeViewModal}.js`.

### 2. `GET /api/recipes/can-make/check` could still 500 on partial-migration DBs

- The null-ingredient crash is fixed (`efe9c80`), and there's a retry that drops the
  `in_recipe_book` filter on `42703` — but if prod lacks `is_public` or the inventory join
  columns, the retry still fails → 500.
- **Hardening plan:** check `information_schema.columns` for optional columns first and build
  the query from what exists; fall back to a plain `inventory.item_name` pantry query on `42703`.
- **File:** `backend/src/routes/recipes.js` (~line 445).

### 3. ~~`GET /api/version` always returns `current: "unknown"`~~ FIXED (uncommitted)

- Was a path bug: `version.js` read `/version.json` inside the container; the file
  lives at `/opt/cloudmc-shop/version.json` (bind mount). Now tries the mounted path
  first, repo root second, and passes through the new `changes` array.

### 6. "Update available" flag stuck ON — FIXED (uncommitted)

- **Symptom:** update button always said an update was available.
- **Root cause:** `autoUpdaterSimple.getCurrentVersion()` ran `git rev-parse HEAD` in
  `/app` (no `.git` → always failed) → fell back to `system_status.current_version`,
  which only `update-server.sh` writes. A manual `git pull && docker-compose up -d
  --build` left the row stale → `update_available` stayed true forever.
- **Fix:** read `git -C /opt/cloudmc-shop` HEAD + `origin/main` from the mounted
  checkout (backend image has git; `safe.directory='*'` handles ownership). Any
  host pull now self-heals the flag every 60s. GitHub API kept as fallback.
- **Also:** `/check-updates` now uses repo HEAD first + real `schema_migrations` diff
  (was scanning the wrong dir for `schema-v*.sql`); `/status` returns `pending` —
  the actual commits the update adds (`git log HEAD..origin/main`).

### 4. Stray file: `frontend/src/components/recipes/1795198680605-RecipeViewModal.js`

- Untracked timestamped copy of RecipeViewModal — probably a tool-created backup.
  Decide: delete it or add to `.gitignore`. Not committed.

### 5. Uncommitted local changes (not bugs, just uncommitted)

- `.gitignore` (+ `.github\instructions\codacy.instructions.md` ignore)
- `.github/instructions/codacy.instructions.md` (untracked)
- `shopWebserver.code-workspace` (untracked)

### 7. ntfy — only beta alerts arriving (user-side pushes broken)

- **Likely cause:** prod partial migration — if `ntfy_user_settings` is missing
  `types`/`last_expiry_alert_at` columns, every user-side ntfy query fails silently.
- **Fixes (committed):** migration `101_ntfy_schema_repair.sql` re-asserts the whole
  ntfy schema defensively; `getUserSettings`/`notifyUsers` retry slim queries on
  `42703` so a missing `types` column can't kill user pushes.
- **Verify on prod:** `docker exec -i shop_postgres psql -U shopuser -d shopdb \
  -c "\d ntfy_user_settings"` after deploy.

### 9. Admin "Admin sidebar" rail gets covered by floating UI — FIXED

- **Panel:** the `hidden lg:flex fixed … top-1/3` rail in `BetaPinLayer.js` (~line 2548)
  — inspect (Crosshair), ghost pins (Ghost), admin viewer (MessageSquare),
  hide-controls (PanelRightClose), now + service status (Activity).
- **Bug:** it never consumed `usePanelShift`, so the Admin Viewer (w-96) and
  Active List panel slid in at `right-0` and covered it. Now translates with
  `-panelShift` like every other corner element.
- **Also:** `PropertiesPanel` (AVE w-80 sidebar) now publishes
  `setPanelShift('ave-props', 336)` so floating columns slide left instead of
  hiding under it; `setNavDrawerOpen`/`useNavDrawerOpen` hides the floating
  buttons while the mobile nav drawer is open (they were z-50 above the z-45
  backdrop).

### 10. Service-status feature (admin)

- `GET /api/system/services` (admin): backend self, postgres ping, frontend
  probe, maintenance container state (docker.sock), ntfy reachability, public
  URL (detects Cloudflare via cf-ray), webhook :9000, GitHub API — each with
  status + latency + detail.
- `Admin.js` new **Services** tab → `components/admin/ServiceStatus.js`
  (30s poll, inline Online/Offline/Degraded/Standby badges, overall banner).
- Admin rail **Activity** button shows a live worst-status dot + popover with
  per-service badges; "Details" jumps to Admin › Services.

### 20. Auto-placement API for anchored popups — NEW

- `autoPlacement.js` gained `anchoredPopupPos` + `useAnchoredPopup`:
  positions against an anchor RECT, opens below when it fits, flips above
  when there's more room, clamps in-viewport, and returns `maxHeight` so
  tall pickers cap their scroll region on short screens. Measures the real
  element in a layout pass and recomputes on resize.
- `QuickCategoryPicker` + `QuickIconPicker` migrated: anchored on desktop/
  tablet, **bottom sheet** on mobile (<768px) instead of a floating
  dead-center modal; scroll areas height-capped per side.
- list_type chip only shows for behavioral types ('lab' w/ flask icon) —
  'store'/'general' were noise next to the store dropdown
- Per-list `✕` delete inside the list dropdown rows (role=button span —
  nested `<button>` is invalid HTML; stopPropagation + confirm modal)

### 19. Shopping-list header round 2 — live counts, delete X, meta row

- `lists[].item_count` now syncs from `items` on every change — the
  dropdown count is live instead of stale until page change (with a guard
  so a stale `items` array isn't stamped onto a newly selected list)
- `X` delete button next to the list dropdown (confirm still goes through
  deleteList's existing ConfirmModal flow)
- Counter chip → right-aligned `checked/total` progress pill (bigger,
  colored, titled); pencil is a bordered "Rename list" button; the
  `list_type` chip moved from the store row into this meta row
- `⋮` icon button is now a labeled "List actions" button — users were
  missing it entirely
- "Add Items to Your List" → "Add items" + clearer subtitle

### 18. Admin quick login (shoulder-surf resistant) — NEW

- Symbol challenge: admin sets an 8-12 symbol sequence (Admin → Security);
  each login sends a fresh shuffled 4×4 grid + 3 random POSITIONS of the
  sequence — watching the screen teaches a watcher only a few taps on a
  layout that won't exist next time
- Backup codes: 10 generated codes, bcrypt-hashed, burn on use — dead the
  second they're typed in front of anyone
- Server-verified only: challenge positions+grid signed into a 2-min JWT,
  AES-256-GCM encrypted sequence (partial checks need positions), 5 fails
  → 15-min lockout shared by both methods; admin-only (is_admin on every
  endpoint, generic errors so no admin enumeration)
- Login page: "Quick Access" button → QuickLoginModal (grid/code tabs)
- Migration 102; future idea: authenticator/TOTP as a third method

### 17. Updating page showed the PREVIOUS release's notes — FIXED

- `/changes.txt` fell into the SW's cache-first branch → once cached,
  every deploy served last release's list. `cache: 'no-store'` on the
  page's fetch can't help — the SW never reached the network.
- `.txt` now bypasses the SW like `/api` does; cache v5 → v6 flushes the
  stale entry.

### 16. Shopping-list header button overload — FIXED

- Store row: badge is now the menu trigger — `Kroger - Lex ▾` opens
  Change store / Configure aisles / My Stores (4 elements → 1)
- Action row: `New List · Shortcuts · Learn Prices` left; view toggles
  `Sort · Hide` right-aligned; `Recover completed lists` + `Delete this
  list` moved into a `⋮` overflow menu (danger off the click path)
- Shared `headerMenu` state + outside-click close; menus animated like
  CustomDropdownList

### 15. ERR_TOO_MANY_REDIRECTS on down.html during deploys — FIXED

- `/down.html?code=X` is itself a navigation; during a deploy it also got a
  5xx, and the SW redirected it to itself forever → browser killed it.
- Status pages now have their own navigate branch: never redirect, serve
  network-or-cached-copy, and never store a maintenance-marked response
  under a status-page key. SW cache bumped v4 → v5.

### 14. Services panel — false "offline" readings + rail overlap — FIXED

- **Frontend "degraded":** probe hit `:3006`, but container nginx listens on
  `:80` (`3006:80` is host-side). Fixed to `http://frontend:80`.
- **Maintenance "Offline":** was misleading — it only runs during deploys;
  now always reports `standby` ("idle — only serves during deploys").
- **Public URL "offline":** probed `shop.cloudmc.online`, which isn't the
  live domain. Now tries Host header first (the domain the admin actually
  used), then `PUBLIC_URL`/`FRONTEND_URL` env, then both known domains.
- **Webhook "offline":** binds host loopback by design — a container can't
  reach it. Now reports `unknown` with a hint to check
  `systemctl status shop-webhook`.
- **Rail overlap:** the admin rail was `top-1/3` fixed — outside the corner
  stack — so the app column grew into it. Rail + restore tab are now stack
  members (`adminrail`/`restoretab` via `useCornerStack`), bottom-anchored
  above the beta stack; `FloatingButtons` offsets all three. Guaranteed no
  overlap at any height. Watch for feedback loops: a stack must never read
  its own published height.
- `svcWorst` ignores `standby`/`unknown` (normal states) — only
  down/degraded dim the rail dot.

### 13. UpdateBanner UX rework

- Moved from top-center bar (covered the toolbar) to a **bottom-center card**
  (`bottom-20` mobile / `bottom-6` desktop) — clears toolbar + corner stacks.
- **"Read update"** button → dispatches `listzy:open-changelog`; Dashboard
  listens and opens `ChangelogViewer` (navigates home first if needed).
- **X now collapses to a pill** (gradient chip with pulsing dot) pinned at the
  same spot — the persistent reminder the user asked for; tapping re-expands.
  Dismissal is per-build (`listzy_update_dismissed` = build hash), so the NEXT
  deploy earns the full card again. Hides while the mobile nav drawer is open.

### 12. "Latest improvements and fixes" placeholder everywhere — FIXED

- **Root cause:** update command is `git pull && ./update-server.sh` — the pull
  ran BEFORE the script captured `BEFORE_COMMIT`, so `BEFORE..AFTER` was empty
  and `changes`/`changes.txt` fell back to the placeholder.
- **Fix (all 3 scripts):** notes baseline is `version.json` `"current"` — the
  last *deployed* commit (`git cat-file -e` validated) — so the range is always
  "everything since the last deploy". Still-empty → `git log -8 HEAD` real
  subjects, never the placeholder unless git itself fails.
- **UX:** down.html palette changed from alarm-red to muted plum/violet (same
  family as updating.html, distinguishable but calm). SW cache bumped v3→v4 so
  clients actually fetch the new page.

### 11. UpdateBanner showed generic text instead of commit messages — FIXED

- Banner fired on the new build hash but `fetchUpdateNotes` only read
  `version.json` `changes` — absent on any deploy that ran before the script
  wrote them (or a plain `docker-compose up` rebuild) → generic fallback.
- Now falls back to `/api/changelog` newest commit subjects (`hash + message`)
  so the popup always names real changes when available.

### 8. ntfy — downtime/offline alerts (admin topic)

- `watchdog.sh` (host cron `* * * * *`) pings public URL then localhost:3006 to
  distinguish **app down** vs **Cloudflare/provider down** → sends admin ntfy alert.
- Topic read from `.ntfy-watchdog.json` (gitignored) — written by backend whenever the
  admin saves ntfy settings, so it works with the DB/backend dead. Respects the new
  `downtime` admin toggle type.
- Skips during maintenance (shop_maintenance up, update lock, or `.update-requested`).
- `--alert` mode wired into `update-server.sh`/`update-manual.sh` → deploy start/finish pings.
- **Host setup still needed:** `crontab -e` →
  `* * * * * /opt/cloudmc-shop/watchdog.sh >> /tmp/listzy-watchdog.log 2>&1`

---

## 🟡 Open — Tasks / Verify

- [ ] Retest recipe delete on live site (see bug #1)

- [ ] Retest recipe delete on live site (see bug #1)
- [ ] Confirm migration `100_list_item_removal_log` ran: `docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d list_item_removal_log"`
- [ ] Verify "Previously removed — tap to re-add" section shows items (needs migration 100)
- [ ] Verify smart suggestions show price / exact name / MDL training data + 3d scrollbar
- [ ] Fix or accept Codacy warnings: `SmartSuggestionsContent` (15 params, NLOC 55),
      smart-suggestions route (NLOC 124)
- [x] Fix `/api/version` path bug (bug #3) — done in update-detection work
- [ ] After deploy: verify update flag clears itself (admin manual pull path) and the
      UpdateBanner/changelog/maintenance page show real commit subjects
- [ ] ntfy: verify user-side test push + feature_release/broadcast reach non-beta users
      (was silently broken — see bug #7)
- [ ] ntfy: install watchdog.sh in host crontab (bug #8); verify admin `downtime`
      toggle writes `.ntfy-watchdog.json` with `downtime:false` when off

---

## 💡 Ideas / Backlog

- In-stock inline badge on list items showing home-inventory count (partially done in
  `ItemList.js` — verify)
- Consider consolidating the September .md files into this one and deleting them
- `emoji:` icon scheme works everywhere now, but icons could be normalized at write time

---

## 📌 Project notes — how things work (don't re-learn this)

- **Deploy does NOT happen on `git push`.** Update path: Admin UI → `POST /api/system/run-update-script`
  → host webhook `shop-webhook.service` (`webhook-server.js`, port 9000) → `update-server.sh`
  → `git pull` + `docker compose build` + `docker compose up -d` + `runMigrations.js`.
- Live host: `/opt/cloudmc-shop` on `cup2cup`. Containers: `shop_frontend` (:3006),
  `shop_backend` (:3007), `shop_postgres` (db `shopdb`, user `shopuser`, host port 5433).
  During rebuild a maintenance page takes :3006 (`docker-compose.maintenance.yml`).
- **Prod DB is partially migrated** — always write defensive SQL: `ADD COLUMN IF NOT EXISTS`,
  retry on `42703`, check `information_schema` when schema state matters.
- **Migrations:** `backend/migrations/NNN_name.sql`, auto-run at backend start AND by the
  update script; each runs once, tracked in `schema_migrations`. Next number after 100 = 101.
- **Service worker** (`frontend/public/service-worker.js`): cache-first for static assets,
  navigation fallback to cached `/index.html`, failed network with no cache → synthetic
  `504 Offline` response (that 504 in the console is the SW working, not the server).
- **Frontend conventions:** API calls via `frontend/src/services/api.js` (`recipesAPI`, etc.)
  — NOT `frontend/src/api/*` (that's a separate dir for mdl/suggestions/etc.).
- **Use `ConfirmModal`, never `window.confirm`** (project rule).
- Recipe delete flow: `Recipes.js` `handleDeleteRecipe` → `deleteTarget` → `ConfirmModal` →
  `confirmDeleteRecipe` → `DELETE /api/recipes/:id`. Both trash buttons (card + view modal)
  go through this same path.
- Codacy: run `codacy_cli_analyze` after every file edit (`.windsurfrules`).
- **Status pages (`frontend/public/*.html`, SW-served on nav failures):**
  `updating.html` = deploy in progress (marked by `X-Listzy-Maintenance` from the
  maintenance nginx, shows changes.txt notes); `down.html` = server answered with
  an error — `?code=` shows 500/502/404 etc., "admin is working on it";
  `offline.html` = no answer at all — explains it may be the user's internet OR
  Cloudflare/hosting down (outside the admin's control, just wait).
  The canonical files live in `frontend/public/` — the maintenance container
  mounts `updating.html` from there so there's ONE copy. SW cache is
  `listzy-shell-v3`; bump it whenever these files change materially.
- **ONE update UX for users: the `UpdateBanner` popup only.** The server-side
  "Update Now" button was removed from `ChangelogViewer` (2026-11-20) and the
  Dashboard badge no longer flips to "Update Available" — it just shows the version.
  `/api/system/status` still returns `update_available`/`pending` for diagnostics
  (Admin page + changelog info section); `/update/request` still exists for admins
  via API, there is just no in-app button for it.
- **"What changed" update notes (added `17821ba`):** commit messages ARE the notes —
  the update scripts capture `git log BEFORE..AFTER` and distribute it:
  - `version.json` `changes[]` → `/api/version` → `UpdateBanner` shows up to 3 lines
  - `maintenance/changes.txt` → mounted into the maintenance nginx → `updating.html`
    renders the "In this update" list while the stack rebuilds
  - `/api/system/status` `pending[]` (`git log HEAD..origin/main` via the mounted repo)
    → `ChangelogViewer` "Update Available" section
  - `changelog.txt` (600-line `%H|%ai|%s|%an` export) → `/api/changelog` for the viewer
  - Caveat: a manual `git pull && docker-compose up -d --build` writes none of these
    files — detection still self-heals (repo HEAD), but "what it adds" stays generic
    and NO maintenance page shows (users get a brief 502). Use `./update-manual.sh`
    instead — same simple rebuild, but swaps in the updating page and writes all
    the notes files automatically. (No migrations — schema changes still need
    `./update-server.sh`.)

---

## ✅ Completed log (newest first)

- **2026-11-20 `3699ee3`** — Recipe delete second bug: slider passed recipe object not
  id (`DELETE /api/recipes/[object Object]` → 500). Trash buttons added to all card
  faces (slider front/back, rolodex top, shelf/grid/list), deck default `list`,
  backend 400 on non-numeric id. **Pushed 2026-11-20.**
- **2026-11-20 `17821ba` (pushed)** — Update detection overhaul (bug #6):
  - `autoUpdaterSimple.js`: git HEAD/origin-main from mounted repo → flag self-heals
    after ANY host pull; tracks `pending` commits; `getStatus()` for `/status`.
  - `system.js`: `/check-updates` uses repo HEAD + real migration diff + `pending`;
    `/status` returns `update_available` + `pending` from the live checker.
  - `version.js`: mounted path first; serves `changes` array.
  - `update-server.sh` + `update-quick.sh`: write `changes` into version.json +
    `changelog.txt` export + `maintenance/changes.txt`.
  - `maintenance/updating.html` + `changes.txt` mount: shows "In this update" list.
  - `UpdateBanner.js`: shows what the update adds (up to 3 lines from version.json).
  - `ChangelogViewer.js`: "Update Available" section lists pending commits.
- **2026-11-20** — Verified `efe9c80` deployed to listzy.app: live `service-worker.js`
  byte-identical to local. Recipe-delete fix is live; awaiting user retest.
- **2026-11-18 `526acfa`** — `RecipeCard` renders `emoji:` icons as glyph instead of broken
  `<img src>` (kills `ERR_UNKNOWN_URL_SCHEME` console noise).
- **2026-11-18 `efe9c80`** — Big batch, 11 files:
  - Smart suggestions: price + source, canonical MDL name, MDL training stats,
    `scrollbar-3d`, "Previously removed — tap to re-add" section
    (`SmartSuggestions.js`, `Dashboard.js`, `api/suggestions.js`,
    `backend/src/routes/suggestions.js` + new `GET /recently-removed`)
  - `backend/src/routes/shopping.js` — item delete logs to `list_item_removal_log`
    (best-effort, never blocks the delete)
  - `backend/migrations/100_list_item_removal_log.sql` — removal history table
  - `backend/src/routes/recipes.js` — resilient DELETE (dynamic FK cleanup) +
    can-make null-ingredient fix
  - `Recipes.js` — inline notice banner replaces `alert()`/silent failures
  - `service-worker.js` — `.catch` → `504 Offline` instead of unhandled FetchEvent rejection
  - `NtfyPanel.js`, `ItemList.js` — earlier approved work
- **2026-11-18 `277ea1d`** — Seamless updates: SW offline shell + UpdateBanner prompt +
  maintenance page on :3006 during rebuild.
- **2026-09 `e79b755`** — Item icon uploads + toast rewrite, recipe book crashes,
  backend 500 degradation, schema-repair migration 098.
- **2026-09 `d0681a1`** — ntfy slide-out panel + push send log (migration 099).
- **2026-09 `5a41350`** — Searchable categories, anchored icon picker, ntfy alerts,
  hidable widgets.

## Categories unified + inventory icon picker fix (current)

- [x] Canonical category set expanded 13 -> 29 across all three sources (`frontend/src/utils/categoryDetector.js`, `backend/src/utils/categories.js`, `backend/src/utils/canonicalCategory.js`) so every category feature offers the full set the Home Inventory picker has: Seasoning & Spices, Baking Supplies, Alcohol, Health & Medical, Baby & Kids, Pet Supplies, Cleaning, Laundry, Paper & Plastic, Tools & Hardware, Garden & Outdoor, Automotive, Office & School, Electronics, Holiday & Seasonal. `Other` still sorts last (order 29)
- [x] Alias maps updated in all three files so legacy/free-text labels resolve to the finer-grained canonicals (`spices`/`seasoning` -> Seasoning & Spices, `baking` -> Baking Supplies, `alcohol`/`beer`/`wine` -> Alcohol, `pet` -> Pet Supplies, `medical`/`health` -> Health & Medical, `laundry` -> Laundry, `paper` -> Paper & Plastic, etc.) instead of collapsing into broad buckets
- [x] Fixed inventory list icon button (`EnhancedListView` + `CategoryView`) — it opened the **category** popup; now opens `onIconChange` -> inventory `IconPicker` (writes `item_icon` via `inventoryAPI.updateItem`)
- [x] `CategoryView` kept a category-change affordance — small category-icon chip beside the item name opens the category picker (icon button = icon picker, chip = category)
- [x] `PantryNewV2` wires `iconPickerItem` state + `handleApplyIcon` and renders `IconPicker` alongside `QuickCategoryModal`
- [x] eslint: 0 errors on all edited files; Codacy clean (only pre-existing warnings)

## Persistent interactable affordance (current)

- [x] New `.tap-target` utility in `index.css` — permanent faint blue ring at rest, brighter ring + grow on hover, shrink on press. For controls that don't look like buttons (emoji icons, chips, `role="button"` spans)
- [x] `.tap-affordance` now keeps the faint ring after the pulse ends instead of vanishing — "still looks interactable" after the hint settles
- [x] Global `[role="button"] { cursor: pointer }` so non-button click targets get the pointer cursor
- [x] Applied `tap-target` to ambiguous triggers: inventory item-icon button, category-type badge, favorite stars (list + category views), shopping-list item icon, per-list delete X in the list dropdown
- [x] Missing `type="button"`/`title` added to the favorite-star buttons while there
- [x] eslint: 0 errors; Codacy: only pre-existing warnings

## Unified category system + custom categories + icon upload + tutorial fix (current)

- [x] Single source of truth: `frontend/src/utils/categories.js` — one list ({value, label, icon, color, shopping_order}) feeds every picker. `INVENTORY_CATEGORIES` (QuickCategoryModal) and `CANONICAL_CATEGORIES` (categoryDetector) are both derived from it — can't drift
- [x] Shopping stores the label ('Dairy & Eggs'), inventory stores the key ('dairy_eggs') — same list, each system keeps its own write format
- [x] 'Fridge' + 'Food' categories added everywhere; backend CANONICAL lists updated (aliases: food->Food, fridge/refrigerated->Fridge)
- [x] Custom user categories: `POST /api/categories` upserts into the shared `categories` table; boot + post-create registry in `utils/categories.js` keeps custom names out of 'Other' on the write path
- [x] "+ New category" inline creator (name + emoji) in BOTH QuickCategoryPicker (shopping) and QuickCategoryModal (inventory); DB rows merge into pickers at open via `mergeDbCategories`
- [x] Custom icon upload ported into inventory `IconPicker`: shared `utils/iconUpload.js` extracted from QuickIconPicker (normalize <=128x128, auto downscale/cover-crop, real progress), custom-icons strip + upload button
- [x] Tutorial: ONBOARDING_VERSION v3->v4 (spotlight tour never bumped -> returning users never auto-saw it); spotlight overlay is now pointer-events-none during focused steps so clicks pass through to the highlighted element instead of instantly skipping the tour (card stays pointer-events-auto)
- [x] eslint/node --check clean; Codacy run on every edited file (only pre-existing warnings)

## Walkthrough tutorial + floating button restyle (committed)
- Onboarding: removed the tutorial card and mode-select screen — one spotlight walkthrough (12 steps) that teaches both the buttons AND the app flow: list → shop and check off → Unpack → Home Inventory → Recipe Book / Homemade Lab → suggestions loop back. Each step spotlights the real control; clicks pass through during focused steps.
- FloatingButtons: side-by-side corner layout (app column sits one button-width inside the beta/admin column, same baseline, snaps back to the corner when empty); Active List is now green (emerald gradient); retired the unused buttonColor widget prop.
- Note: Onboarding.js uses CRLF line endings — sed/script edits must be EOL-aware.

## Smart Suggestions rework (planned, next)
- Custom backend API for suggestions (MDL-trained: purchase history, prices, categories, inventory, item shortcuts).
- 3D scrollbar for long lists, interactable-icon convention, tiny buttons, hide integration.
- Previously-removed quick re-add.
- Price advisor: previous store prices, price changes, cross-store margins — UX options: inline hover badge / compact widget in looking-for-next / expandable detail box.

## Price advisor — built (committed)
- `GET /api/suggestions/price-advisor?store=&items=` — batch per-store intel: last + previous price at the active store (trend %), cheapest store + savings %, other-store price chips. Window query over price_history, degrades to {} if table missing.
- SmartSuggestions: tapping a suggestion's price badge expands a price-intel box (store price + date, trend arrow vs last visit, "Cheapest: store (save X%)", other-store chips). AdvisorBox hoisted to module scope; badge uses tap-target convention.
- Dashboard: advisor fetched with suggestions, keyed by item name; works with existing hide/MDL/removed-items systems.
- Still open from the rework list: item icons on suggestion rows, tighter Item Shortcut/inventory cross-feed.

## Tutorial v5 — floating demo walkthrough (committed)
- Rewrote Onboarding as a no-dim demo tour: animated fake cursor glides to each element and pulses a tap, soft ring highlights the control, small floating tooltip box anchored beside it (reuses anchoredPopupPos).
- Click/tap anywhere continues; ESC/X skips; arrows navigate. Chooser on open: Quick tour (7 stops) / Full tour (12) / Skip + don't-show-again. Skip hint auto-closes in 6s.
- Steps unchanged (flow teaching incl. Unpack → Inventory → Homemade Lab); version bumped v4 → v5 so everyone sees the new style once.

## Tutorial 3D + opt-out API + suggestion polish (committed)
- 3D animation layer: chooser + step boxes enter with rotateX perspective flips; step emoji does a rotateY spin; demo cursor tilts and pulses an isometric "floor tap" ellipse. All gated on prefers-reduced-motion. Fixed framer-motion transform clobbering Tailwind centering (positioning moved to static wrappers).
- Custom API for the opt-out checkbox: POST /users/onboarding now accepts {never}; GET returns it — "don't show automatically" follows the account across devices (migration 103 adds users.onboarding_never).
- Smart Suggestions richer rows: item icon (emoji or uploaded image), category chip, and "Have X unit" badge from Home Inventory — the enrich query now joins inventory + preferred_icon/category.

## Tutorial v5.1 — pointing polish + autoplay (committed)
- Connector line draws itself from the tutorial box edge to the element center (animated SVG path + target dot) so it is obvious what each box explains.
- Spotlight upgraded: primary ring + a second breathing halo ring pulsing around the element.
- Click-anywhere removed: stray clicks now just flash the Next button; advancing is via Next/Back/ESC/arrows.
- Autoplay "video" mode: Play/Pause button in the box footer auto-advances (3.5s + 1.4s per bullet) with a top progress bar — watches like a video.

## Maintenance page real progress bar (committed)
- update-server.sh writes "step|6|label" to maintenance/progress.txt at each deploy phase (swap → stop → build → start → migrations → almost done), mounted read-only into the placeholder nginx.
- updating.html polls /progress.txt every 2s — swaps the indeterminate slider for a real fill % + "Building the new version — step 3 of 6" label; falls back to the slider when the file is absent or at step 0. Script resets the file to waiting after completion.
- update-quick.sh doesn't swap the placeholder — no progress there (by design).

## Icon overlap fix + updating page fit + down.html fix (committed)
- Add-item icon: framer-motion was clobbering the Tailwind -translate-y-1/2 so the emoji sat low over the input — centering is now a motion value (y:'-50%'); uploaded-image icons render as <img> instead of raw URL text.
- updating.html: card capped at viewport height; "In this update" list scrolls in a compact 3d-styled scrollbar (168px).
- down.html after deploy: SW now arms a 12-minute deploy window when it sees the maintenance header — 5xx/unreachable navs during the gap keep showing updating.html instead of the error page. Cache bump v7.

## Smart Suggestions rework — chips + ghosts + proactive autocomplete (committed)
- Changelog: removed the "Update Available" banner block + dead state; categorizeCommit now uses an ordered rule table (conventional prefixes first, then free-form content: fix/perf/docs/feat/chore) so total/features/bug-fixes/performance counts reflect the real mixed message style.
- A — Chips under "Looking for Next": SmartSuggestions rewritten as a compact horizontal chip strip (icon + name + price badge + "+" add, amber "have" dot, dashed re-add chips for removed items). Price badge expands the advisor inline; tapping the name expands reason/quantity/MDL training. Editor id "smart-suggestions" + hide widget preserved; AdvisorBox/helpers extracted to components/PriceAdvisor.js.
- B — Ghost rows in the list: ItemList accepts ghostItems/onGhostAdd; up to 2 faded dashed rows appear inside their canonical category, the rest collect under a trailing "💡 Suggested" group (all trailing in flat mode). Tap → addSuggestion.
- C — Proactive autocomplete: AutocompleteInput proactiveItems prop — on focus before typing, the dropdown shows "Suggested for you" (top suggestions, icon + 'suggested' tag); normal search unchanged.

## Batch: qty stepper API, pins auto-complete, interactable system, admin context panel (committed)
- QuantityStepper (new components/QuantityStepper.js): animated -/+ with directional number slide + press-shrink + ripple; learns preferred qty via learnQuantity (localStorage) + server preferred_quantity through the update path. Replaces both steppers in ItemList (inline + mobile menu).
- Pins: fixed pins leave the page markers + default admin queue; queue shows them only via the 'fixed' filter chip; marking the last actionable pin fixed closes the pin panel.
- Interactable indicator system (utils/interactable.js + index.css): useRipple() hook injects .ripple-ink at tap point; .tap-fill (filled pill affordance), .input-field:hover tint, ripple/tap CSS reusable anywhere. Wired into QuantityStepper.
- AdminContextPanel (new, mounted in App.js): admins right-click any element -> pin a bug anchored to that element (selector + offset), element info, copy selector/text, session-hide, select widget in layout editor, admin nav, reload. Skips when another handler preventDefault'd, inside inputs/own panel.
- Looking-for-Next: current item icon opens QuickIconPicker -> saves item_icon + learns icon.
- MDL product database: category quick-edit popover gets a search box; SizeUnitFields preset-chip wall replaced with free-text size + shared searchable unit popup (CustomDropdownList + custom units).
- updating.html: indeterminate pulse bar replaced with a conic swirl ring; real progress bar stays and hides the ring when progress.txt data arrives.

## Batch: suggestion icons, sidebar rail, list/category mode, shortcuts rework (committed)
- Smart suggestions: removed items now keep their trained icon (dictionary join) and show ×N removal count; "Removed (n)" chip expands into a dedicated Previously-removed strip; suggestion chips show a ×N times-added badge; re-add passes icon/category back to the list.
- Sidebar: desktop/tablet minimize arrow collapses to a 72px icon rail (labels hidden, badges -> dots, tooltips kept); persisted in localStorage; also in the sidebar right-click menu; content spacer shrinks with it.
- Active list: List mode is now default; List/Groups segmented toggle sits next to the Labels pill; header Show/Hide button stays in sync; choice persists in itemListViewMode.
- Item shortcuts icon memory: rows now merge the trained /items dictionary (preferred_icon) into picks + catalog so user-set icons come back; prefs endpoint limit raised 50->500.
- Item shortcuts tabs: new Templates tab — save the staged tray as a named template, one-tap "Add all" drops everything onto the list (with MDL tracking), delete per card; old sets behavior renamed Saved Templates (stage-to-tray).
- For You tab: inline explanation of the four feeds (due/recurring/low/frequent), ? info popover, and a reset button that re-pulls predictions; tray gets a save-as-template button.
- '/' typed as first char in the add-item input opens Item Shortcuts (global '/' hotkey already existed).

## Deploy-crash -> updating page redirect (committed)
- api.js: maintenance detector on BOTH axios layers (shared api instance + default axios for inventoryAPI et al). Any API response with X-Listzy-Maintenance or a text/html body redirects to /updating.html and returns a never-settling promise so callers can't .map() the HTML and crash.
- ErrorBoundary.js: on crash, if __listzyDeploy is set or a /api/system/status probe comes back with the maintenance header / text/html, it swaps to updating.html instead of "Oops something went wrong".
- index.js: SW update() rejection (maintenance serves HTML for service-worker.js -> MIME SecurityError) is now caught and retried on the next 60s tick instead of an uncaught console error.

## Security hardening pass (committed)
- server.js: /api/auth strict limiter — 30 failed attempts per 15min/IP, successful logins don't count (stops password spraying without locking real users out).
- server.js: CORS was wide open (reflects any origin) — now an allowlist (listzy.app + localhost dev), extendable via CORS_ORIGINS env; origin-less requests (curl, server-to-server) still pass.
- server.js: slow-request defense — keepAliveTimeout 65s, headersTimeout 66s, requestTimeout 60s kills stalled/slowloris-style connections.
- auth.js: failed logins log username + IP so brute-force waves are visible in container logs.
- maintenance/nginx.conf (prev commit): nosniff / DENY framing / no-referrer / permissions-policy on the deploy placeholder.

## ipGuard — auto IP banning + ntfy alerts (committed, migration 104)
- services/ipGuard.js: 10 failures inside 10min -> 24h ban; failures counted from failed logins (/auth/login), admin quick-login + backup code, and 404s on unknown /api paths. Exploit probes (/.env, wp-admin, .php, cmd=, union select) -> instant ban. Bans persisted to ip_bans table + restored on boot; LAN/loopback/docker ranges are never bannable so the proxy can't lock the site out.
- Banned IPs get 403 on every /api path via banMiddleware mounted before all routes.
- ntfy notifyAdmin on each new ban ("IP blocked — brute force detected", priority 4).
- Admin API /api/admin/security: GET /bans, POST /bans {ip, reason?, hours?}, DELETE /bans/:ip.
