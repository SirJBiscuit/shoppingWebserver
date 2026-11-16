-- Migration 078: VFM display-name renames to match the app's real labels.
UPDATE feature_flags SET feature_name = 'Recipe Book'
  WHERE feature_key = 'recipes';
UPDATE feature_flags SET feature_name = 'Home Inventory'
  WHERE feature_key IN ('kitchen_inventory', 'pantry');
