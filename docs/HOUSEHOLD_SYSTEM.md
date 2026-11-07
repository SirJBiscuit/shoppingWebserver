# Household Member Catalog

Track each person in the household: profile, health stats, food tier lists, traits, chores, and water intake — feeds shopping decisions.

## Tables (migration `047_household_members.sql`)

- `household_members` — profile: name, relationship, avatar_emoji, color, date_of_birth, gender, height_cm, activity_level, diet_type, allergies (text[]), daily_calorie_target (nullable → auto-computed), water_goal_oz, notes
- `household_member_health_logs` — weight_kg, body_fat_pct, muscle_pct history
- `household_member_water_logs` — amount_oz per entry, summed for "today"
- `household_member_food_prefs` — food_name + preference (like/dislike) + tier (S–F) + calories_per_serving/serving_unit. `UNIQUE(member_id, food_name)` → POST upserts.
- `household_member_traits` — category: like / dislike / pet_peeve / habit + free-text description
- `household_member_chores` — title, frequency (daily/weekly/monthly), xp_value, last_completed_at

## API (`/api/household`, `backend/src/routes/household.js`)

| Route | Purpose |
| --- | --- |
| `GET /` | members + computed stats + today's water + chore count |
| `POST /` | create member (optional `weight_kg` seeds first health log) |
| `GET /:id` | full detail: stats, food_prefs, traits, chores, water_today_oz, health_history |
| `PUT /:id`, `DELETE /:id` | update / remove (cascades child rows) |
| `POST /:id/health` | log weight/body-fat/muscle |
| `POST /:id/water` | `{ amount_oz }` → returns `water_today_oz` |
| `POST /:id/foods` | upsert food pref `{ food_name, preference, tier, calories_per_serving, serving_unit }` |
| `DELETE /foods/:prefId` | remove food pref |
| `POST /:id/traits` | `{ category, description }` |
| `DELETE /traits/:traitId` | remove trait |
| `POST /:id/chores` | `{ title, frequency, xp_value }` |
| `POST /chores/:id/complete` | stamp `last_completed_at` |
| `DELETE /chores/:id` | remove chore |
| `GET /:id/random-food` | weighted random liked food (S=6× … F=1× weight) |
| `GET /shopping-guide` | per-member calorie target + buy/avoid lists + household totals. **Declared before `/:id` in the router — keep it there.** |
| `GET /check-item?name=X` | which members like/dislike an item — for shopping-list badges |

## Computed stats (`computeStats`)

- **age** — from `date_of_birth`
- **BMI** + category (underweight <18.5, healthy <25, overweight <30, obese ≥30) + ideal weight range
- **BMR** — Mifflin–St Jeor: `10w + 6.25h − 5a + (5 | −161 | −78)` by gender
- **TDEE** — BMR × activity factor (1.2 sedentary → 1.9 very_active)
- **calorie_target** — explicit `daily_calorie_target` else TDEE
- **water_goal_oz** — explicit else half body weight (lbs) in oz

## Frontend

- `pages/Household.js` — list view (member cards + Shopping Guide banner) → detail view with tabs: Overview (stats + 🎲 random food), Foods (S–F tier list + dislikes), Traits, Chores, Water/Health
- `components/HouseholdMemberModal.js` — shared-pattern add/edit modal (imperial inputs → metric storage)
- `services/householdAPI.js` — API client
- Route `/household`; sidebar seeded by migration 047 (`Users` icon) + fallback in `Sidebar.js`

## Shopping integration hooks

`GET /shopping-guide` gives household daily/weekly calories and per-member buy/avoid lists. `GET /check-item` can badge list items ("⚠️ Sam dislikes this") — wire into Dashboard when wanted.
