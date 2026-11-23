const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * Sound system — Postgres edition.
 *
 * Library: `sounds` rows point at files under storage/sounds/, served
 * statically at /storage/sounds/* alongside the rest of the managed
 * storage system. Every upload is also registered in storage_files so
 * the admin Storage panel tracks usage, quotas, and cleanup like any
 * other stored asset. Categories come from sound_categories +
 * global_category_settings; users pick their own per-category sound in
 * user_sound_preferences — /play-config resolves the effective file for
 * every category in one request.
 */

// Per-category user-preference columns (migration 038).
const PREF_COLUMNS = [
  'check', 'uncheck', 'pop', 'shake', 'notification', 'success',
  'error', 'warning', 'delete', 'add', 'scan', 'voice',
];

const uploadDir = path.join(__dirname, '../../storage/sounds');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // mime is audio/mpeg|wav|ogg|mp4 — test the family, not the extension
    const extOk = /mp3|wav|ogg|m4a/.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = file.mimetype.startsWith('audio/') || /mp3|wav|ogg|m4a|mpeg/.test(file.mimetype);
    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed (mp3, wav, ogg, m4a)'));
    }
  },
});

// GET / — sound library with category display names + global enable state
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.id, s.name, s.category, s.filename, s.file_path, s.file_size,
             s.duration, s.is_default, s.is_active, s.created_at,
             sc.display_name AS category_display,
             u.username AS uploaded_by_username,
             gcs.is_enabled AS category_enabled_globally
      FROM sounds s
      LEFT JOIN sound_categories sc ON s.category = sc.name
      LEFT JOIN users u ON s.uploaded_by = u.id
      LEFT JOIN global_category_settings gcs ON s.category = gcs.category_name
      ORDER BY s.category, s.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sounds:', error);
    res.status(500).json({ error: 'Failed to fetch sounds' });
  }
});

// GET /categories — categories with global enable/default state
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT sc.name, sc.display_name, sc.description,
             COALESCE(gcs.is_enabled, TRUE) AS is_enabled,
             gcs.default_sound_id
      FROM sound_categories sc
      LEFT JOIN global_category_settings gcs ON gcs.category_name = sc.name
      WHERE sc.is_active = TRUE
      ORDER BY sc.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sound categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /upload — admin, multipart {sound, name, category}
router.post('/upload', authenticateToken, isAdmin, upload.single('sound'), async (req, res) => {
  try {
    const { name, category } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const filePath = `/storage/sounds/${file.filename}`;
    const result = await db.query(
      `INSERT INTO sounds (name, category, filename, file_path, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, category, file.filename, filePath, file.size, req.user.id]
    );

    // Register in the managed storage system too — the Storage panel
    // tracks usage/quota/cleanup for every stored file, sounds included.
    try {
      await db.query(
        `INSERT INTO storage_files
           (filename, original_name, mime_type, size_bytes, category, path, url, uploaded_by, metadata, tags)
         VALUES ($1, $2, $3, $4, 'sounds', $5, $6, $7, $8, $9)`,
        [
          file.filename, file.originalname, file.mimetype, file.size,
          file.path, filePath, req.user.id,
          JSON.stringify({ kind: 'sound', soundId: result.rows[0].id, soundCategory: category }),
          ['sound', category],
        ]
      );
    } catch (err) {
      // The sounds row is the source of truth — a missing/older
      // storage_files table shouldn't fail the upload itself.
      console.warn('Sound saved but storage_files registration failed:', err.message);
    }
    res.json({ message: 'Sound uploaded successfully', sound: result.rows[0] });
  } catch (error) {
    console.error('Error uploading sound:', error);
    res.status(500).json({ error: 'Failed to upload sound' });
  }
});

// DELETE /:id — admin; default sounds can't be deleted
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const found = await db.query('SELECT * FROM sounds WHERE id = $1', [id]);
    const sound = found.rows[0];

    if (!sound) return res.status(404).json({ error: 'Sound not found' });
    if (sound.is_default) {
      return res.status(400).json({ error: 'Cannot delete default sounds' });
    }

    try {
      const target = path.resolve(uploadDir, path.basename(sound.file_path));
      if (!path.relative(uploadDir, target).startsWith('..')) {
        await fs.unlink(target);
      }
    } catch { /* file already gone — row cleanup still worth doing */ }

    await db.query('DELETE FROM sounds WHERE id = $1', [id]);
    // Keep the storage registry in step — match by the file's own name.
    await db.query("DELETE FROM storage_files WHERE category = 'sounds' AND filename = $1",
      [sound.filename]).catch(() => {});
    res.json({ message: 'Sound deleted successfully' });
  } catch (error) {
    console.error('Error deleting sound:', error);
    res.status(500).json({ error: 'Failed to delete sound' });
  }
});

// GET /preferences — current user's sound preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM user_sound_preferences WHERE user_id = $1',
      [req.user.id]
    );
    res.json(result.rows[0] || { sound_enabled: false, sound_volume: 0.3 });
  } catch (error) {
    console.error('Error fetching sound preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// PUT /preferences — upsert; accepts any subset of pref columns
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { sound_enabled, sound_volume, override_global } = req.body || {};
    const cols = ['sound_enabled', 'sound_volume', 'override_global',
      ...PREF_COLUMNS.map((c) => `${c}_sound_id`)];
    const values = [
      sound_enabled ?? false,
      sound_volume ?? 0.3,
      override_global ?? false,
      ...PREF_COLUMNS.map((c) => req.body[`${c}_sound_id`] ?? null),
    ];
    const setCols = cols.map((c) => `${c} = excluded.${c}`).join(', ');
    await db.query(
      `INSERT INTO user_sound_preferences (user_id, ${cols.join(', ')})
       VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(', ')})
       ON CONFLICT (user_id) DO UPDATE SET ${setCols}`,
      [req.user.id, ...values]
    );
    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating sound preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// GET /play-config — one request: global flags + every category's effective
// file (user choice > category default > built-in synth name).
router.get('/play-config', authenticateToken, async (req, res) => {
  try {
    const [globalRes, catRes, prefRes] = await Promise.all([
      db.query('SELECT * FROM global_sound_settings WHERE id = 1'),
      db.query(`
        SELECT sc.name, COALESCE(gcs.is_enabled, TRUE) AS enabled,
               gcs.default_sound_id, ds.file_path AS default_file
        FROM sound_categories sc
        LEFT JOIN global_category_settings gcs ON gcs.category_name = sc.name
        LEFT JOIN sounds ds ON ds.id = gcs.default_sound_id
        WHERE sc.is_active = TRUE
      `),
      db.query('SELECT * FROM user_sound_preferences WHERE user_id = $1', [req.user.id]),
    ]);

    const prefs = prefRes.rows[0] || {};
    const userFile = {};
    if (PREF_COLUMNS.length) {
      const soundIds = PREF_COLUMNS
        .map((c) => prefs[`${c}_sound_id`])
        .filter(Boolean);
      if (soundIds.length) {
        const files = await db.query(
          'SELECT id, file_path FROM sounds WHERE id = ANY($1)',
          [soundIds]
        );
        const byId = Object.fromEntries(files.rows.map((r) => [r.id, r.file_path]));
        PREF_COLUMNS.forEach((c) => {
          const sid = prefs[`${c}_sound_id`];
          if (sid && byId[sid]) userFile[c] = byId[sid];
        });
      }
    }

    const g = globalRes.rows[0] || { sounds_enabled_globally: true, default_volume: 0.5, allow_user_override: true };
    res.json({
      globallyEnabled: g.sounds_enabled_globally,
      allowUserOverride: g.allow_user_override,
      defaultVolume: g.default_volume,
      userEnabled: prefs.sound_enabled ?? false,
      userVolume: prefs.sound_volume ?? g.default_volume,
      categories: Object.fromEntries(catRes.rows.map((c) => [c.name, {
        enabled: c.enabled,
        file: userFile[c.name] || c.default_file || null,
      }])),
    });
  } catch (error) {
    console.error('Error building play config:', error);
    res.status(500).json({ error: 'Failed to load sound config' });
  }
});

// GET /global — admin: global settings + per-category state
router.get('/global', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [settings, categories] = await Promise.all([
      db.query('SELECT * FROM global_sound_settings WHERE id = 1'),
      db.query(`
        SELECT sc.name, sc.display_name, COALESCE(gcs.is_enabled, TRUE) AS is_enabled,
               gcs.default_sound_id
        FROM sound_categories sc
        LEFT JOIN global_category_settings gcs ON gcs.category_name = sc.name
        WHERE sc.is_active = TRUE ORDER BY sc.name
      `),
    ]);
    res.json({
      settings: settings.rows[0] || { sounds_enabled_globally: true, default_volume: 0.5, allow_user_override: true },
      categories: categories.rows,
    });
  } catch (error) {
    console.error('Error fetching global sound settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /global — admin: {sounds_enabled_globally, default_volume, allow_user_override}
router.put('/global', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { sounds_enabled_globally, default_volume, allow_user_override } = req.body || {};
    await db.query(
      `INSERT INTO global_sound_settings (id, sounds_enabled_globally, default_volume, allow_user_override, updated_by)
       VALUES (1, $1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         sounds_enabled_globally = COALESCE($1, global_sound_settings.sounds_enabled_globally),
         default_volume = COALESCE($2, global_sound_settings.default_volume),
         allow_user_override = COALESCE($3, global_sound_settings.allow_user_override),
         updated_by = $4`,
      [sounds_enabled_globally ?? null, default_volume ?? null, allow_user_override ?? null, req.user.id]
    );
    res.json({ message: 'Global settings updated' });
  } catch (error) {
    console.error('Error updating global sound settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// PUT /categories/:name — admin: {is_enabled, default_sound_id}
router.put('/categories/:name', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name } = req.params;
    const { is_enabled, default_sound_id } = req.body || {};
    await db.query(
      `INSERT INTO global_category_settings (category_name, is_enabled, default_sound_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (category_name) DO UPDATE SET
         is_enabled = COALESCE($2, global_category_settings.is_enabled),
         default_sound_id = COALESCE($3, global_category_settings.default_sound_id)`,
      [name, is_enabled ?? null, default_sound_id ?? null]
    );
    res.json({ message: 'Category updated' });
  } catch (error) {
    console.error('Error updating sound category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// ---------------------------------------------------------------------------
// Element sound bindings — admin picks an element anywhere in the app and
// assigns it a sound. Any authenticated user reads them (playback happens
// client-side via one delegated listener); only admins mutate.
// ---------------------------------------------------------------------------

// Events a delegated DOM listener can actually detect — app-semantic
// triggers (check/uncheck) would need per-feature hooks, not selectors.
const VALID_EVENTS = ['click', 'hover'];

// GET /bindings — all bindings with resolved library file paths
router.get('/bindings', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT b.id, b.selector, b.element_label, b.event, b.sound_name,
             b.sound_id, s.file_path, b.enabled, b.created_at
      FROM element_sound_bindings b
      LEFT JOIN sounds s ON s.id = b.sound_id
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching element sound bindings:', error);
    res.status(500).json({ error: 'Failed to fetch bindings' });
  }
});

// POST /bindings — admin: {selector, element_label, event, sound_name, sound_id}
router.post('/bindings', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { selector, element_label, event = 'click', sound_name, sound_id } = req.body || {};
    if (!selector || typeof selector !== 'string' || selector.length > 400) {
      return res.status(400).json({ error: 'A valid element selector is required' });
    }
    if (!VALID_EVENTS.includes(event)) {
      return res.status(400).json({ error: `event must be one of: ${VALID_EVENTS.join(', ')}` });
    }
    if (!sound_name && !sound_id) {
      return res.status(400).json({ error: 'Pick a sound (category name or library file)' });
    }
    const result = await db.query(
      `INSERT INTO element_sound_bindings (selector, element_label, event, sound_name, sound_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [selector, (element_label || '').slice(0, 300), event, sound_name || null, sound_id || null, req.user.id]
    );
    res.json({ message: 'Binding saved', binding: result.rows[0] });
  } catch (error) {
    console.error('Error saving element sound binding:', error);
    res.status(500).json({ error: 'Failed to save binding' });
  }
});

// PUT /bindings/:id — admin: {event, sound_name, sound_id, enabled}
router.put('/bindings/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { event, sound_name, sound_id, enabled } = req.body || {};
    if (event !== undefined && !VALID_EVENTS.includes(event)) {
      return res.status(400).json({ error: `event must be one of: ${VALID_EVENTS.join(', ')}` });
    }
    const result = await db.query(
      `UPDATE element_sound_bindings SET
         event = COALESCE($1, event),
         sound_name = COALESCE($2, sound_name),
         sound_id = COALESCE($3, sound_id),
         enabled = COALESCE($4, enabled)
       WHERE id = $5 RETURNING *`,
      [event ?? null, sound_name ?? null, sound_id ?? null, enabled ?? null, id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Binding not found' });
    res.json({ message: 'Binding updated', binding: result.rows[0] });
  } catch (error) {
    console.error('Error updating element sound binding:', error);
    res.status(500).json({ error: 'Failed to update binding' });
  }
});

// DELETE /bindings/:id — admin
router.delete('/bindings/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM element_sound_bindings WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Binding not found' });
    res.json({ message: 'Binding deleted' });
  } catch (error) {
    console.error('Error deleting element sound binding:', error);
    res.status(500).json({ error: 'Failed to delete binding' });
  }
});

module.exports = router;
