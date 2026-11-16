-- Seed released changelog entries for the usability/polish sweep.
-- Idempotent: skips any title that already exists.

INSERT INTO changelog_features (title, description, category, status, released_at, progress, sort_order)
SELECT v.title, v.description, v.category, 'released', NOW(), 100, v.sort_order
FROM (VALUES
  ('Spotlight Tutorial',
   'The guided tour now spotlights the focused element with a dimmed backdrop and anchors its card next to the element instead of floating in the center.',
   'feature', 1),
  ('Visual Editor (AVE) Tools Fixed',
   'The Settings button opens its panel, the grid toggle renders a real overlay with a working size slider, and widget selection plus the properties panel respond correctly.',
   'improvement', 2),
  ('Plate Lab: Units, Calories & Donut Plate',
   'Plate entries support units and optional calorie overrides, and the plate visual is now an animated donut chart.',
   'feature', 3),
  ('Recipes: Searchable List View',
   'Recipes gained a searchable list view, and the app remembers your preferred view and last-opened recipe. The AI generator button was removed.',
   'improvement', 4),
  ('Recipes Floating Button',
   'A floating recipe-book button jumps straight to Recipes and can be toggled from the visual editor.',
   'feature', 5),
  ('Pantry: View Memory & Item Icons',
   'Pantry remembers your chosen view, items show individual icons, and items without a date now show a "No expiry" badge.',
   'improvement', 6),
  ('Shopping List Item Polish',
   'Pill-style labels toggle, a corner delete button, a right-click context menu, and clearer tooltips on every item.',
   'improvement', 7),
  ('Next Item Suggestion Redesign',
   'The "Looking for Next" card was redesigned for readability and quicker aisle scanning.',
   'improvement', 8),
  ('Pin Hover Previews',
   'Hovering map pins, clusters, and deleted-pin ghosts now shows styled preview cards instead of plain tooltips.',
   'feature', 9),
  ('Fix: Pins Layered Under Content',
   'Beta pins now render above page content but below modals, as intended.',
   'fix', 10),
  ('Fix: Floating Buttons on Tablet & Mobile',
   'The active-list and apps floating buttons now work correctly on touch layouts.',
   'fix', 11),
  ('Fix: Update Prompt Cleanup',
   '"Update Now" merged into the changelog badge, and the stale update-available flag now clears properly.',
   'fix', 12),
  ('Fix: Household Eat-Out Inputs',
   'The total-cost and per-item price inputs are wide enough to read and edit comfortably.',
   'fix', 13),
  ('Fix: List Rename No Longer Refreshes Items',
   'Renaming a list merges it in place without refetching its items.',
   'fix', 14)
) AS v(title, description, category, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM changelog_features f WHERE f.title = v.title
);
