-- Icon file_path rewrite — uploaded icons now live under the persistent
-- /storage volume (storage/icons/) instead of container-local
-- src/public/icons, and are served at /storage/icons/*. Rewrite stored
-- paths so existing rows still resolve.
UPDATE icons
SET file_path = '/storage/icons/' || substring(file_path from '/([^/]+)$')
WHERE file_path LIKE '/icons/%';

-- Category icons may now be uploaded-image paths, not just emoji
ALTER TABLE categories ALTER COLUMN icon TYPE VARCHAR(200);
