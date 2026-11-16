# Beta Pin & Feedback Viewer System

Global beta feedback overlay. Beta testers pin notes anywhere on any page;
admins triage pins and chat with testers through an in-viewport viewer panel.

## Pieces

- **`backend/migrations/074_beta_pins.sql`** — `beta_pins`,
  `beta_feedback_replies`, `mdl_review_queue.notes` (advisory comment trail).
- **`backend/migrations/075_beta_polls_private_pins.sql`** —
  `beta_feature_polls` + `beta_feature_poll_votes`, `beta_pins.is_private`.
- **`backend/src/routes/betaPins.js`** — mounted at `/api/beta/pins` in `server.js`.
- **`backend/src/routes/betaPolls.js`** — mounted at `/api/beta/polls` in `server.js`.
- **`backend/src/routes/betaFeedback.js`** — added `GET/POST /:id/reply` +
  `GET /:id/replies` (threaded tester↔admin conversation; `admin_response`
  still exists for the one-shot reply).
- **`frontend/src/components/beta/BetaPinLayer.js`** — mounted in `App.js`
  inside `<Router>` next to `AdminToolbar`. Uses `useLocation` for `page_path`,
  `useAuth` for role (`is_admin`/`is_beta_tester`). Renders for those roles only.

## Severity badges (tester-chosen)

| Key        | Label         | Color              |
| ---------- | ------------- | ------------------ |
| `critical` | Big priority  | red `#ef4444`      |
| `annoying` | Annoying      | orange `#f97316`   |
| `minor`    | Low           | yellow `#eab308`   |
| `weird`    | Acts weird    | magenta `#d946ef`  |

## Pin lifecycle

`open → in_progress → fixed` plus `hidden` (kept, invisible to testers) and
`removed` (bulk-delete state; hard delete also available).

## Endpoints

```text
POST   /api/beta/pins                      {pagePath, x, y, severity, note, isPrivate?}
GET    /api/beta/pins?page=&mine=          pins on a page (non-admin: live + own,
                                           is_private=FALSE always)
PATCH  /api/beta/pins/:id                  author: note/severity while open
                                           admin: also isPrivate / adminNote
GET    /api/beta/pins/admin/all?status=&page=   all pins + per-page counts
POST   /api/beta/pins/admin/:id/status     {status, adminNote?}
POST   /api/beta/pins/admin/bulk           {ids, action: hide|remove|fixed|open|private|unprivate}
DELETE /api/beta/pins/admin/:id            hard delete

GET    /api/beta/polls                     open + recently-resolved polls, tallies,
                                           caller's vote
POST   /api/beta/polls/:id/vote            {vote: yes|no, note?} — one vote/user,
                                           changeable while open
GET    /api/beta/polls/admin/all           all polls, tallies, voter notes
POST   /api/beta/polls/admin               {title, description?} create poll
POST   /api/beta/polls/admin/:id/status    {status: open|planned|released|declined}
DELETE /api/beta/polls/admin/:id           delete poll
```

## Frontend behavior

- **Drop mode** — floating `+` button → crosshair overlay → click drops pin
  → popup picks severity + writes note. Esc cancels. Coords stored as
  viewport % (`x_pct`/`y_pct`), markers are `position: fixed`.
- **Layering** — pins within ~2.5% on both axes cluster into one marker with
  a count badge; clicking fans out a list to pick the right pin.
- **Admin tools** — right-click any pin → context menu (view, edit note,
  make private/public, in progress, fixed, hide, remove). Eye toggle
  shows/hides all markers (persisted in `localStorage.betaPinsVisible`).
- **Private pins** — admins check "Private" on the pin form (or use the
  context menu / detail card) to leave reminder pins only admins can see.
  Testers never receive them in any query.
- **Viewer panel** — chat icon slides in a right panel on any page:
  - **Pins tab** — per-page chips (click to navigate), checkbox multi-select,
    bulk fixed/open/hide/remove, full pin list with author + time + status.
  - **Messages tab** — recent `beta_feedback` items; expand a thread to see
    `beta_feedback_replies` and reply inline.
  - **Polls tab** — create feature polls, watch live yes/no tallies with
    voter notes, mark planned/released/declined, or reopen.
- **Tester polls popover** — chart button (testers) lists open polls with
  thumbs up/down voting, live counts, and a % "want it" readout. Votes are
  advisory — they gauge interest, they don't decide releases.
- **Pin detail card** — shows severity, status, private badge, author, time,
  admin note. Admins can edit note/severity inline, toggle privacy, and set
  status.

## Advisory votes (MDL review feed)

`confirmPending`/`denyPending` in `mdlQuality.js` no longer auto-approve or
auto-reject — they append `{kind, user_id, note, at}` to
`mdl_review_queue.notes` and bump counters for the admin to weigh. Status
changes come from admin action or organic resubmission of the same name by a
distinct user (`quarantine()` → `CONFIRM_THRESHOLD`).
