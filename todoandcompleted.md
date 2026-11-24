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

- **`e8a5857`** — Login typing lag root cause: `BetaPinLayer`'s
  `usePinLayerTick(1000)` ran a 1s interval + capture-phase scroll and
  window-resize bumps **unconditionally, even logged out** — every tick
  re-rendered the whole ~1300-line component (which `return null`s at the
  bottom, so all hooks ran for nothing), and the keyboard-open scroll/
  resize storm hit the same path: each keystroke queued behind a heavy
  re-render → laggy keys + slow keyboard-open. `usePinLayerTick` now takes
  an `enabled` flag skipping all listeners; BetaPinLayer enables it only
  for pin-eligible users and its `document.body` ResizeObserver is gated
  identically. `FlyingItemAnimation` scroll/resize `getBoundingClientRect`
  work now attaches only while an animation is actually live.
- **`53cf4a7`** — Login screen UX + mobile keyboard hardening: full audit
  found no code-level keyboard blocker (inputs, CSS, overlays, global
  listeners, SW all clean), so the fixes target the real weak points —
  label taps now focus their field (`htmlFor`/`useId`), `autoFocus` on the
  first field of each login flow lands inside the tap gesture so the
  keyboard pops on modal open, `inputMode` hints for Android WebViews.
  Login page gains a show/hide password eye, Caps Lock warning, opt-in
  "Remember my username" (localStorage, username only — never credentials),
  spinner in the sign-in button, error shake animation, dead imports
  removed (`Link`, `api`).
- **`bd2b202`** — Separate glyph secret (migration 110): the design drawn on
  each pad is now its own bcrypt credential — `quick_pin` for the bubble pad,
  `quick_glyph` for the glyph pad. `/verify` accepts either hash so a pad
  swap at login never invalidates a secret, and each pad keeps its own
  muscle-memory shape. `POST /pin` takes `which: bubble|glyph` and validates
  chars against that pad's node set; `/status` exposes `glyphSet`/`glyphLen`;
  `/challenge` sends `hasPin`/`hasGlyph` + per-secret lengths. Setup gains a
  "Setting: Bubble PIN | Glyph" picker (each secret saved/replaced
  independently, `PIN set`/`Glyph set` badges, retrace-ghost follows the
  entry pad); the login modal opens on whichever pad actually has a
  credential and gates Sign-in on that pad's expected node count. Glyph
  entry renders the drawing as a connected polyline (`path` prop) so the
  rune-like design is visible while tracing.
- **`cd1b60c`** — Dual pad mode (bubble pin ↔ glyph pin, migration 109):
  `quick_glyph_pad` + `quick_pad_mode` columns. Login modal gets a
  **Bubbles | Glyph** chip row — glyph shows the anonymous node pad (N×N
  grid default, pattern-lock style), bubbles show the labeled scatter.
  Account default pad style saved via `POST /mode {padMode}` ("Login opens
  on" chips in setup); device remembers its swap via localStorage. Setup
  arranges each pad independently (tab chips, per-pad dirty dots, separate
  save/reset); node count stays shared across both pads so the same glyph
  is enterable on either. `POST /pad` takes `which: bubble|glyph`;
  `/status` + `/challenge` return `glyphPad`, `padMode`. Same stored
  secret — no second password.
- **`a0ef786`** — Duplicate-bubble swipe fix: `emit` only blocked consecutive
  repeats, so a path wobbling A→B→A re-collected A mid-swipe, and a touchdown
  inside a crowded overlap zone emitted every grazed bubble at once. Now a
  per-swipe `visited` set collects each node at most once per gesture
  (cleared on every new pass — multi-pass glyphs still chain), touchdown
  takes only the nearest bubble, and tap mode clears per press so "3-3"
  glyphs remain possible.
- **`9dd8f7f`** — Node-glyph swipe system: pads are now N nodes (6-25,
  ids `0-9` then `a-z`) instead of exactly 10 digits. The glyph = the
  ordered node sequence the swipe crosses, bcrypt-compared whole — no
  connection/edge tracking. Setup gets a −/+ node stepper, a **Grid**
  preset (Android-style N×N pattern lock) alongside Ring/Spiral/Shuffle,
  grow keeps existing bubble positions, shrink drops the last nodes.
  `POST /pad` accepts 6-25 unique node cells; `POST /pin` validates the
  glyph's chars against the account's own node set so a saved pattern is
  always enterable; saving a pattern auto-persists a dirty layout first.
  No migration — node count is implicit in `quick_pin_pad` length.
- **`684a2fa`** — Swipe-pad bubble offset fix: `motion.button` writes inline
  `transform: scale(...)` which overrode the Tailwind `-translate-x-1/2`
  centering — every bubble's top-left sat on its layout point while the
  collider tested the centre, offsetting hits by +28px/+28px. Centering now
  uses negative margins; hits land exactly on the visible bubbles.
- **`5e3966e`** — Mobile "can't type username in Quick Login" hardening:
  full audit found no focus blocker (input, CSS, overlays, global listeners all
  clean). Real latent crash fixed: `localStorage.getItem('quickLoginPadHide')` in
  the modal's useState initializer throws in storage-blocked browsers/WebViews →
  modal crash → ErrorBoundary fallback → dead login screen. Now try/catch-guarded
  (get + set). Added `autoCapitalize="none"`/`autoCorrect="off"`/`spellCheck`/
  `enterKeyHint` to username/code inputs (QuickLoginModal + Login.js) so mobile
  keyboards stop capitalizing case-sensitive usernames; Beta Access button got
  explicit `type="button"`. If the symptom persists on device, remaining suspects
  are a stale deployed bundle (`res.data.grid.length` crash predates `c956ee3`)
  or a stale SW chunk — verify deployed version.
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

## Quick login — sequence input fix (committed)
- Root cause: verify needs taps in the EXACT sorted position order (tap N must equal the symbol at position N of the secret). The old UI showed "tap the 2nd, 5th, 7th" as one list — tapping them as you spotted them in the grid (e.g. 7th first) silently failed every time with "Incorrect sequence".
- QuickLoginModal.js: step-by-step prompt — "Tap your 2nd symbol — 1 of 3, in this order" — advancing per tap, plus progress dots; full position list kept as a reference line; new Undo button removes just the last tap; taps locked during submit; positions length access hardened (?.length) so a missing field can't crash the modal.
- QuickLoginSetup.js: sequence chips are click-to-remove (was Clear-all only for a mis-tap), added Undo button, and a needsReset banner when the stored sequence can't be decrypted (e.g. after secret rotation).
- quickLogin.js (backend): tryDecryptSeq() wrapper — unreadable quick_seq blob now returns a clear "save a new sequence in Admin -> Security" 400 instead of a 500 on /challenge, /verify and /status (status also reports needsReset).
- /setup now checks rowCount — a non-admin account no longer gets a fake "Quick login enabled" success on a 0-row update.
- /challenge and /code username lookup is now case-insensitive (LOWER = LOWER) — "Guy69" vs "guy69" no longer fails the challenge.

## Service worker — clone-before-stream fix (committed)
- service-worker.js: the status-page nav handler deferred response.clone() inside the async caches.open() callback — by then the body was already streaming to the navigation, throwing "Response body is already used" (uncaught, console noise on every /updating.html-style fetch). Now uses put() which clones synchronously before the response is handed to respondWith.
- put() also swallows cache.put rejections (quota/full) so it can't produce uncaught promise noise.
- Cache bumped to listzy-shell-v8 so the fixed worker activates on next load.

## Recipe book bug-fix pass (committed)
- Recipes.js: "Just a few items away" RecipeCards were missing onEdit — clicking the pencil crashed with "onEdit is not a function". Wired to editRecipe; All-Recipes grid pencil now opens the editor (was opening the read-only viewer).
- recipes.js (backend): GET /:id had no numeric guard, so /recipes/search and /recipes/supported-sites (registered later) were shadowed and 500'd on Postgres 22P02. Numeric-guard + next() lets literals fall through; same guard on PATCH /:id.
- QuickRecipeTemplates.js: handleAddTemplate sent recipe_name / ingredient_name / instructions:[] but POST /recipes expects name / item_name / string instructions — every quick-add created a NULL-name recipe with NULL item_name rows. Fixed payload shape.
- recipes.js: POST /:id/to-shopping-list called ing.item_name.toLowerCase() unguarded — one NULL row 500'd the whole add. Now skips NULL rows. PATCH ingredient re-insert now writes sort_order (was defaulting to 0, scrambling order after edits).
- RecipeViewModal.js: favorite star called the parent's stale-snapshot handler — never visually toggled and always resent the old value. Now patches is_favorite directly through the modal's live patch() helper (updates local override + refetches list).
- RecipeCardSlider.js: image_url values like "emoji:X" (set via RecipeIconPicker) rendered as <img src> broken-image — now renders the emoji text on card fronts and in the zoomed modal.
- Latent dead-code fixes: RecipeIngredientMatcher getAll()->getItems() (the call didn't exist — matcher silently returned empty forever), percentage default, quantity vs amount field reads; RecipeRoutineTracker rank badge got relative positioning + recipe null-guard; RecipeRecommendations null-guards; RecipeRolodex flip normalizes stale index when the deck shrinks; RecipeIconPicker resets url/error on reopen + FileReader error surfaced.
- Removed stray 1795198680605-RecipeViewModal.js editor artifact (byte-identical, untracked).

## Quick login — full-sequence mode + per-tap grid shuffle (committed, migration 105)
- migration 105: users.quick_login_mode TEXT DEFAULT 'partial'.
- quickLogin.js: /status now returns mode; new POST /mode (partial|full, admin); /challenge reads the column — 'full' signs pos = 0..seqLen-1 so the same verify path checks the entire sequence in order, 'partial' keeps 3 random positions. Response includes mode.
- QuickLoginModal.js: challenge.mode === 'full' shows "tap all N symbols in order" hint instead of the positions-needed line; the step prompt already reads correctly for full mode.
- QuickLoginSetup.js: "Login challenge mode" picker — Partial positions (shoulder-surf safe) vs Full sequence (faster, observer could see all).
- Per-tap reshuffle: the login grid renders through a display permutation that re-scatters after EVERY tap, so an observer can't predict where the next tap lands. Taps still submit server-grid indices — verify unchanged. The setup builder grid reshuffles per tap too (same watcher risk while creating the sequence).

## Quick login — stealth cells + reshuffle toggle (committed, migration 106)
- migration 106: users.quick_login_reshuffle BOOLEAN DEFAULT true.
- QuickLoginModal.js: tapped grid cells no longer show ANY selection state (removed highlight border/bg + order badges) — an observer can't tell which tiles were tapped; the progress dots still give count feedback. Per-tap reshuffle now honors challenge.reshuffle from the server (off = layout stays fixed for the whole challenge).
- quickLogin.js: POST /mode now accepts { mode?, reshuffle? } (either or both, COALESCE update, returns current values); /status and /challenge expose reshuffle.
- QuickLoginSetup.js: "Re-shuffle the grid after every tap" checkbox under the mode picker; the sequence-builder grid also honors the pref.

## Quick login — builder keeps a stable grid (committed)
- QuickLoginSetup.js: the sequence-builder grid no longer re-shuffles per tap — it renders a random layout once and stays put while you build (per-tap scatter is a login-challenge feature, not a setup annoyance). Reshuffle checkbox label now says "login grid" to reflect scope.

## Quick login — swipe PIN chain mode + beta tester access (migration 107)
- migration 107: users.quick_pin TEXT (bcrypt), users.quick_pin_len INT.
- quickLogin.js: POST /pin setter (8-64 digits, bcrypt-hashed, verified whole — no plaintext needed unlike the symbol sequence); 'pin' added to quick_login_mode; /challenge pin mode issues a {t:'qlp'} token + pinLen (no grid); /verify gets a qlp branch reusing lockout + ipGuard; disable clears PIN fields; /status exposes pinSet + pinPad; padOrderFor() seeds a per-account digit order via HMAC(uid) so the scattered-ring layout is stable for the owner but unique per account.
- Challenge gate fix: /challenge used to reject accounts without a saved quick_seq before mode branching — a PIN-only account can now challenge; enabled flag counts seq OR pin.
- Beta testers: new isQuickLoginEligible middleware (live is_admin OR is_beta_tester row check — beta flag isn't in the JWT); all management + public lookups widened; issueSession no longer hardcodes isAdmin:true (real flag). QuickLoginSetup also mounts on the user Settings page for eligible accounts — opt-in, password stays default.
- PinPad.js (new): golden-angle scattered-ring numpad — hold+drag (mouse/touch) collects digits per pass, lifts chain passes into one long PIN; live swipe-trail line per pass (clears on lift), vibration tick per digit, hideDigits blank-cell stealth mode (persisted, login modal toggle).
- QuickLoginModal.js: pin mode renders PinPad + bullet counter + undo/clear + sign-in; physical keys (digits/backspace) work too.
- QuickLoginSetup.js: third mode card + PIN chain section (pad, dots, digit count, save/replace), "PIN set" badge, amber hint when pin mode selected without a saved PIN.

## Quick login — draggable custom pad + swipe feel overhaul (migration 108)
- migration 108: users.quick_pin_pad TEXT (JSON [{d,x,y}] percent positions); NULL = seeded golden-angle scatter.
- quickLogin.js: padLayoutFor() seeds the default scatter; validLayout/parseLayout validate stored layouts (all ten digits, 0-100 positions); POST /pad saves a custom layout or resets to seeded on null; /challenge + /status serve stored-else-seeded layout; disable clears the column.
- PinPad.js: segment-based hit testing — the stroke between consecutive pointer events is tested against every bubble, so fast flicks can't skip digits they crossed; multi-digit crossings report in path order. arrange mode lets you drag bubbles anywhere (clamped inside the pad, pointer-captured); spring-in mount, per-digit scale pop, trail with vertex dots that fades on lift instead of vanishing.
- QuickLoginSetup.js: "Arrange bubbles" mode — drag-to-shape layout, Shuffle spots (permutes positions), Reset to seeded, Save layout; "Custom layout" badge + crowding warning when two bubbles sit close enough that a fast swipe could grab both.
- api.js: quickLoginAPI.setPad.

## Swipe pattern — muscle-memory rework (pattern-first UX)
- PinPad: pointer capture on swipe start — a drag drifting outside the pad no longer cancels the pass; touch-action:none on bubbles; proximity magnet (nearest bubble lifts as the pointer approaches); tapMode for tap-to-connect entry; ghost prop renders a dashed guide path with a traveling dot for shape tracing.
- QuickLoginSetup: entry-style chips (Swipe / Tap / Trace a shape); "Trace a shape" suggests a greedy nearest-neighbour path through the bubbles with a looping guide; two-stage confirm — enter the pattern, then repeat it before saving (live match/mismatch feedback); Ring + Spiral layout presets join Shuffle spots.
- QuickLoginModal: pin mode is pattern-first — bubbles anonymous by default (eye toggle to reveal), Swipe/Tap entry toggle, pattern copy; needsSetup from /challenge renders "sign in with password first → Settings → Quick Login" panel instead of a bare error. Fixed challenge handler crashing on pin mode (res.data.grid undefined).
- quickLogin.js: /challenge pin branch returns needsSetup:true + password-first guidance when no PIN is saved.

## Swipe pad — exact-fit collider fix
- PinPad.js: hit radius was ~38px — larger than the 28px bubble — so hovering near a bubble collected it and gap passes grabbed adjacent digits. Now CELL_HIT_PX=30 matches the bubble's actual circle (28px + edge forgiveness); a stroke must cross the bubble to collect. Ambiguous point hits resolve to the nearest bubble (t-then-distance sort), proximity magnet tightens to just past the collider edge.
- QuickLoginSetup.js: crowding warning now fires at true overlap (<20% spacing ≈ bubble diameter), not just near-miss.

## Sound system — full rebuild + element bindings (migration 111)
- sounds.js rewritten Postgres-style end to end (was SQLite db.all/db.get — every endpoint threw); uploads now land in managed storage (storage/sounds/, registered in storage_files so Storage Management tracks them); mp3 MIME filter fixed (audio/mpeg was rejected); delete unlinks the file + registry row with basename+containment guard (Semgrep audit flags the resolve call — heuristic, traversal structurally impossible).
- soundEffects.js rewritten: guarded storage, one shared lazily-resumed AudioContext, synthesized fallback per category so sounds work with zero files; loadPreferences consumes the new /play-config payload.
- soundsAPI.js routes through the shared api client (auth + maintenance handling); getPlayConfig + binding CRUD.
- SoundPanel.js (new admin panel, replaces the modal-hack): master on/off, volume, user-override, per-category enable + default file + preview, library upload/preview/delete via ConfirmModal.
- Element sounds: migration 111 element_sound_bindings (selector, label, event, sound_name OR sound_id→file, enabled). Admin → Sound panel → "Pick element" enters pick mode — hover ring highlights, click captures the selector (its own action is swallowed), assign event + synthesized-or-library sound, preview, save. Bindings apply app-wide.
- SoundBindings.js (new, mounted in the authed shell): one delegated click listener + one mouseover listener (800ms per-binding cooldown) play matching bindings — no per-element listeners; stale selectors fail soft.
- pinLayer.js: selectorFor/describeElement extracted from BetaPinLayer as shared element-ID utils (BetaPinLayer now imports them).
- Known heuristic: Codacy Semgrep audit flags path.resolve in the sound-delete unlink; guarded with basename + path.relative containment — safe.

## Deploy fix — broken lucide icon + maintenance-page failure detection
- KeyboardHide doesn't exist in lucide-react 0.294 — the Docker build died on it mid-update, leaving the placeholder page up with the real stack down (set -e exited before restore). Swapped for ChevronDown; verified every lucide import in the changed files exists in the installed version.
- update-server.sh + update-manual.sh: EXIT trap on failure — writes "fail|N|<step>" to progress.txt, fires a watchdog alert, then auto-restores the previous stack (old images survive a failed build, `up -d` brings the site back without a rebuild).
- updating.html: reads the fail flag → red "Update interrupted" state naming the failed step + restore note; stall detection — identical progress.txt for 5min while mid-update shows an amber "may have stalled" warning instead of an eternal spinner.

## Deploy fix — update dies when stack is already down
- update-server.sh stamped system_status via `docker exec shop_postgres` BEFORE starting anything — after a failed deploy leaves the stack down, that dies instantly under set -e (the new trap caught it and restored, but the update could never run). Prod-config copy now happens BEFORE the stamp, `docker compose up -d postgres` runs first, and the stamp is best-effort (warns and continues instead of killing the deploy). CURRENT_STEP tracks the pre-step stages so failure messages name the real stage.

## Custom keyboard — replaces OS keyboard on touch + mobile fit
- Login.js: pointer:coarse devices get inputMode="none" + readOnly permanently so the OS keyboard can never fire; focusing/tapping a field opens AnimatedKeyboard (it IS the keyboard — auto-opens on page autofocus too); focused field scrolls above the sheet; tapping outside fields/keyboard dismisses it like an OS kb.
- AnimatedKeyboard.js: compact mode under 520px viewport height (landscape phones) — smaller keys/gaps/padding; touch-none + select-none on the sheet; min-w-0 keys so rows shrink cleanly on narrow screens.

## Custom keyboard — mobile fit + OS-keyboard switch key
- AnimatedKeyboard: compact mode now triggers on narrow screens too (width < 400, not just landscape height) — tighter gaps/padding/keys; space bar widened to flex-3 like a real kb; new bottom-row key (Keyboard icon) switches to the device OS keyboard when provided.
- Login.js: preferOS flag — the kb's OS-switch key drops our sheet, makes the field editable, and blur+refocuses so the OS keyboard opens; the form's Keyboard toggle flips back to ours. All OS-suppression conditions go through useCustomKb (isTouch && !preferOS).

## Custom keyboard — floating popout via autoPlacement + key sounds
- AnimatedKeyboard rewritten as a floating window through the autoPlacement Portal (fixed truly = viewport, immune to transformed ancestors — the root cause class behind keys escaping the screen). Drag-handle bar floats it anywhere, every move clamped through placeInViewport so it can never leave the screen; corner grip resizes 280-560px; position+size persist per device in localStorage.
- Key click sounds via soundManager — typing keys play the 'key' synth category (25ms tick), Enter plays 'check', function keys tick; haptic 4ms retained; honors global/user sound prefs and falls back to any uploaded file the admin binds.

## Custom keyboard — docked on phones, qwerty stagger, swipe typing, fold tray, pop glow
- Two shells share one KeyGrid: phones (<=768px via useIsMobile) get a docked bottom sheet where thumbs expect a kb; larger screens keep the floating drag/resize popout.
- Real qwerty stagger — every row totals 10 key-units (letter=1): asdf row indents 0.5 each side, zxcv row gets 1.5-unit shift/backspace, space bar 4.5 units. Symbols layer rebalanced to 10/10/11/8 so keys stay near-letter width.
- Slide-to-type: all key firing delegated to grid pointer handlers (like SoundBindings) — press a key and drag across the board, each char/space key the finger passes over types; function keys only fire on direct touch. Window pointerup/cancel ends the swipe.
- Fold tray: drag the sheet's grabber down (or the popout's chevron) collapses to a slim bar — pull up or tap to unfold; state persists per device in the float key.
- Keys pop UP with a primary-color glow (scale 1.12, ring + sky shadow) when pressed/swiped over instead of pressing down; keys slimmed to h-8/h-10 so the kb sits well under OS-kb height.
- Login.js deselecting fixes: readOnly removed (it caused iOS select/blur weirdness — inputMode="none" alone suppresses the OS kb), field labels no longer dismiss the kb, scrollIntoView only fires on first open (not every field switch).
- Beta access dropdown (uncommitted earlier): BetaAccessModal gains initialMode; the beta button on Login opens an autoPlacement Popup (bottom-sheet on mobile) choosing "Beta tester sign in" vs "New beta tester".

## Recipe book list-mode controls — hang-proofing + button fixes
- Root cause candidate found: api.js axios instance had NO timeout — any stalled backend request pends forever, so control buttons looked dead and the page felt unresponsive. Added timeout: 20000 — hangs now surface as real errors (ECONNABORTED → "took too long" notice) instead of a silent dead page.
- busyIds Set tracks in-flight recipe actions: a row disables its control buttons (opacity drop) while its own request runs — no stacked duplicate PATCH/POST/DELETE calls from impatient taps.
- Silent failures surfaced: toggle-favorite and icon-update errors previously only console.error'd — both now show the notice banner like delete/add already did.
- List-mode row buttons: type="button" added, targets bumped p-1.5→p-2 (~32px), hover backgrounds for real affordance, controls wrapped in a stopPropagation group so taps between buttons don't open the view modal.
- Verified backend already hardened: numeric-id guards on /:id routes, COALESCE PATCH (partial updates safe, sort_order kept), FK-discovering DELETE in a transaction, NULL item_name skip in to-shopping-list, pool clients released in finally.

## Update flow — verified success instead of blind "Almost done"
- update-server.sh + update-manual.sh: after `compose up -d`, polls /api/health through :3006 for up to 2 min. A crash-looping backend no longer looks like a finished update — failure exits 1, which routes through the EXIT trap (fail flag in progress.txt + watchdog alert + stack restore). `compose up -d` in the trap also revives missing containers (the shop_postgres case).
- Script now writes "done|6|Update complete", holds 5s so late pollers see it, then resets to the waiting placeholder.
- updating.html: appProbe() every 4s fetches /api/health — real JSON without the maintenance header = the app is back → reloads straight into it. This is ground truth instead of trusting progress.txt; also catches a successful auto-restore after a failed update, and returns users to the app ~10s faster than the 15s meta-refresh.
- Parses the new done| state ("Finishing up — opening the app shortly…").

## Recipe book rework — select mode, source filters, compact sections
- The "frozen page" on trash/controls turned out to be ConfirmModal: it rendered `fixed inset-0` inside PageTransition's `will-change: transform` wrapper, which becomes a containing block — the near-invisible backdrop ate every click while the dialog rendered off-screen. ConfirmModal now uses autoPlacement ModalPortal; ConfirmDialog + QuickLoginModal wrapped in Portal; the no-bare-fixed-overlay rule is documented in autoPlacement.js.
- List view gains select mode: "Select" button in the list toolbar reveals animated checkboxes (spring-pop check via framer-motion), select-all with indeterminate state, "Delete N" → ConfirmModal → new POST /recipes/bulk-delete. Backend FK-cascade extracted to deleteRecipesCascade shared by single + bulk routes, with an owned-ids filter so a crafted ids array can't cascade other users' rows.
- Source filter chips above the deck (ScrollStrip): All / My recipes / Taught / Premade / HomemadeLab, persisted in localStorage. Classifier: lab = custom-builder|plate-lab|src:lab tags, taught = src:taught, premade = src:premade or source_url, else custom. New creations get stamped (src:taught, src:premade, src:custom fallback in handleCreateRecipe).
- Book gating tightened: GET /recipes + can-make now return the user's own recipes only — public/community recipes need include_public=true (the lab passes it alongside include_staged). Nothing lands in the book unless the user sent or created it.
- Removed: "All Recipes" grid (redundant with the deck), the "Recipe Collection" h2 (page already says My Recipes), and the dead RecipeCard component — its text-gray-900-on-dark-cards was also the black-text report.
- "Just a few items away" is now a compact list — icon + name + "Missing: a, b +N" + List button, click opens the view sheet.

## mdl prices — product DB now actually records them
- mdl_price_history only ever got rows from the admin-only /admin/product/:id/price endpoint — user price submissions never landed there, so the table stayed empty by construction.
- product_master_data.average_price was write-once (COALESCE kept the first value forever) and the priceClean flag was computed but never used.
- /track-item now writes each gate-passed price observation to mdl_price_history (source=track_item) and recomputes average_price from history — the same path the admin endpoint uses.
