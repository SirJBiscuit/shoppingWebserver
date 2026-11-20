# TODO & Completed — shopWebserver (Listzy)

**Go-to tracking file for errors, bugs, tasks, ideas, fixes, and updates.**
The app is complicated — that's fine, this file is the memory. Update it every session:
new problems go under Open, finished work moves to the Completed Log with date + commit.

> Older root .md files (`CURRENT_STATUS.md`, `ISSUES_AND_FIXES.md`, `DEPLOYMENT_LOG.md`,
> `MODERNIZATION_*.md`, `BUG_FIX_PLAN.md`, etc.) are from September sessions — historical only.
> This file supersedes them.

**How to use:** check `Open` sections first, update statuses as you go, and when something
ships move it to the Completed Log (newest first) with the commit hash.

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

---

## 🟡 Open — Tasks / Verify

- [ ] Retest recipe delete on live site (see bug #1)
- [ ] Confirm migration `100_list_item_removal_log` ran: `docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d list_item_removal_log"`
- [ ] Verify "Previously removed — tap to re-add" section shows items (needs migration 100)
- [ ] Verify smart suggestions show price / exact name / MDL training data + 3d scrollbar
- [ ] Fix or accept Codacy warnings: `SmartSuggestionsContent` (15 params, NLOC 55),
      smart-suggestions route (NLOC 124)
- [x] Fix `/api/version` path bug (bug #3) — done in update-detection work
- [ ] After deploy: verify update flag clears itself (admin manual pull path) and the
      UpdateBanner/changelog/maintenance page show real commit subjects

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
