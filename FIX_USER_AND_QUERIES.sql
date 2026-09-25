-- Fix User ID Issue and Query Errors
-- Run this to fix the backend crashes

-- 1. Check if user ID 2 exists
SELECT id, username, email FROM users WHERE id = 2;

-- 2. If user doesn't exist, check what users DO exist
SELECT id, username, email FROM users ORDER BY id;

-- 3. Fix: Ensure user ID 2 exists (or create it)
-- If you're logged in as a different user, we need to either:
-- A) Create user ID 2, OR
-- B) Update your session to use the correct user ID

-- Option A: Create missing user (if needed)
INSERT INTO users (id, username, email, password_hash, created_at)
VALUES (2, 'admin', 'admin@shop.local', '$2b$10$dummy.hash.for.now', NOW())
ON CONFLICT (id) DO NOTHING;

-- Option B: Check your actual user ID
-- Look at your token or session to see what user_id you're using

-- 4. Fix MDL preferences table structure
-- The error suggests the query is passing a string where it expects an integer
-- Check the mdl_user_preferences table structure
\d mdl_user_preferences;

-- 5. If mdl_user_preferences doesn't exist, create it
CREATE TABLE IF NOT EXISTS mdl_user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(255) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);

-- 6. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mdl_preferences_user_key 
ON mdl_user_preferences(user_id, preference_key);

-- 7. Verify shopping_lists table
\d shopping_lists;

-- 8. Check if there are any orphaned shopping lists
SELECT sl.id, sl.user_id, sl.name 
FROM shopping_lists sl 
LEFT JOIN users u ON sl.user_id = u.id 
WHERE u.id IS NULL;

-- 9. Delete orphaned shopping lists (if any)
DELETE FROM shopping_lists 
WHERE user_id NOT IN (SELECT id FROM users);

-- 10. Verify all is good
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM shopping_lists) as total_lists,
    (SELECT COUNT(*) FROM shopping_list_items) as total_items;
