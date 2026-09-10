-- Cleanup Ghost Items
-- Removes inventory records that don't have a corresponding item in the items table

-- First, let's see what we're dealing with
SELECT 
    i.id as inventory_id,
    i.item_id,
    i.user_id,
    i.storage_location,
    i.current_quantity
FROM inventory i
LEFT JOIN items it ON i.item_id = it.id
WHERE it.id IS NULL;

-- Now delete the orphaned records
DELETE FROM inventory
WHERE id IN (
    SELECT i.id
    FROM inventory i
    LEFT JOIN items it ON i.item_id = it.id
    WHERE it.id IS NULL
);

-- Verify cleanup
SELECT COUNT(*) as remaining_ghost_items
FROM inventory i
LEFT JOIN items it ON i.item_id = it.id
WHERE it.id IS NULL;
