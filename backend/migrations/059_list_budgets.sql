-- Migration 059: Per-list budgets + previous-budget suggestions
-- Budget lives on the list itself; older lists act as the suggestion history
-- (most recent budget for the same store, then same list name, then any list).

ALTER TABLE shopping_lists
  ADD COLUMN IF NOT EXISTS budget NUMERIC(10,2) DEFAULT NULL;

COMMENT ON COLUMN shopping_lists.budget IS
  'Trip budget in dollars; feeds previous-budget suggestions for new lists';
