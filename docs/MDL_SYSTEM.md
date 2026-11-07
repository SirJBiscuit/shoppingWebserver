# MDL (Machine Data Learning) System

Learns from every item added to a shopping list: names, prices, cadence, stores, aisles, locations — feeds predictions back into the app.

## History — why data was lost

- Migrations `035/039/040/041_mdl` were **never in `runMigrations()`** → tables didn't exist on the live DB.
- Migration `040` had **invalid expression-based `UNIQUE` constraints** (`COALESCE` inside `CREATE TABLE`) → whole migration failed even when run manually. Fixed by moving them to `CREATE UNIQUE INDEX`.
- `/api/mdl` had no `track-item`/`suggestions`/`price`/`location` endpoints, and nothing in the frontend called tracking.

All three are fixed. Migrations now run at backend startup: `035 → 039 → 040 → 041_mdl → 048`.

## Tables

- `mdl_item_names` — registry of every item name ever seen (+ `image_url`/`thumbnail_url` from 048)
- `mdl_user_item_history` — every add event (time-of-day, day-of-week, season, qty, price, store, location, was_suggestion)
- `mdl_user_patterns` — per-user aggregates: totals, avg/min/max price, avg days between, next_predicted_date, confidence
- `mdl_location_prices` — state-level price averages across users
- `mdl_user_preferences` — key/value prefs (e.g. last active list)
- `product_master_data` — product catalog (grows organically via track-item)
- `mdl_price_history`, `user_product_preferences` — product price points + user overrides
- Aisle learning: `mdl_aisle_reports`, `mdl_location_aisles`, `mdl_category_aisles`, `store_locations`, `user_store_layouts`
- `mdl_training_queue`, `item_training_submissions` — training pipeline

## API (`/api/mdl`, `src/routes/mdl.js`)

| Route | Purpose |
| --- | --- |
| `POST /track-item` | Core write path: registry → history → pattern upsert → prediction update → catalog seed → location price agg |
| `GET /patterns/:itemName` | User's pattern for an item |
| `GET /suggestions` | Predicted-due items (next_predicted_date ≤ today+2, confidence ≥ 0.2) |
| `GET /price/:itemName` | Best estimate: personal avg → location avg → catalog |
| `GET/POST /location` | User location for location-aware pricing |
| `GET /search`, `GET /product/:id`, `GET /categories`, `GET /popular` | Product catalog |
| `GET/POST /preferences*` | Key/value user prefs |
| `GET /aisle/:item/:store`, `POST /aisle/report` | Aisle prediction + reporting |
| `GET/POST /stores*` | Store locations |
| `POST /backups/run`, `GET /backups` | **Admin**: trigger/list backups |

## Tracking in the app

`Dashboard.js` fires `trackItem()` (fire-and-forget, never blocks UI):

- `addItem` → `{ itemName, price, quantity, unit, store, listId, icon, userTyped: true }`
- `addSuggestion` → same + `wasSuggestion: true, userTyped: false`

Frontend helpers live in `frontend/src/api/mdl.js`.

## Auto-backup (`src/services/mdlBackup.js`)

- Runs ~30s after backend boot, then **every 24h**
- Exports all MDL/training/product tables to `backend/backups/mdl/mdl-backup-<timestamp>.json`
- Keeps last **14** backups (`MDL_BACKUP_RETENTION_DAYS`, `MDL_BACKUP_DIR` env overrides)
- Logs to `mdl_backup_log` table; admin routes: `POST /api/mdl/backups/run`, `GET /api/mdl/backups`

## Images → MDL

`POST /api/images/upload` auto-links when tagged:

- `image_type=mdl_product` + `related_id=<product id>` → `product_master_data.icon_image_url`
- `image_type=mdl_item` + `related_id=<item_name id>` → `mdl_item_names.image_url`/`thumbnail_url`

Note: `images.js` previously used `req.user.userId` (auth sets `.id`) — every upload failed with null user_id. Fixed; uploads now work and MDL linking is non-fatal.
