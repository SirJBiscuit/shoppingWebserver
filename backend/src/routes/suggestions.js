const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/smart-suggestions', async (req, res) => {
  try {
    const suggestions = [];

    const recurringItems = await db.query(
      `SELECT i.*, inv.percentage_left, inv.last_purchased, 
       stats.average_days_between_purchases, stats.preferred_quantity, stats.preferred_unit
       FROM items i
       LEFT JOIN inventory inv ON i.id = inv.item_id AND inv.user_id = $1
       LEFT JOIN item_statistics stats ON i.id = stats.item_id AND stats.user_id = $1
       WHERE i.user_id = $1 AND i.is_recurring = true`,
      [req.user.id]
    );

    for (const item of recurringItems.rows) {
      if (item.last_purchased && item.average_days_between_purchases) {
        const daysSinceLastPurchase = Math.floor(
          (new Date() - new Date(item.last_purchased)) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastPurchase >= item.average_days_between_purchases * 0.8) {
          suggestions.push({
            type: 'recurring',
            item: item.name,
            itemId: item.id,
            reason: `You usually buy this every ${Math.round(item.average_days_between_purchases)} days. Last purchased ${daysSinceLastPurchase} days ago.`,
            quantity: item.preferred_quantity || item.typical_quantity,
            unit: item.preferred_unit || item.typical_unit,
            priority: daysSinceLastPurchase >= item.average_days_between_purchases ? 'high' : 'medium',
          });
        }
      }
    }

    const lowInventory = await db.query(
      `SELECT i.*, inv.percentage_left, inv.current_quantity, inv.unit
       FROM inventory inv
       JOIN items i ON inv.item_id = i.id
       WHERE inv.user_id = $1 AND inv.percentage_left <= 25
       ORDER BY inv.percentage_left ASC`,
      [req.user.id]
    );

    for (const item of lowInventory.rows) {
      suggestions.push({
        type: 'low_inventory',
        item: item.name,
        itemId: item.id,
        reason: `Only ${item.percentage_left}% remaining (${item.current_quantity} ${item.unit})`,
        quantity: item.typical_quantity,
        unit: item.typical_unit,
        priority: item.percentage_left <= 10 ? 'high' : 'medium',
      });
    }

    const frequentItems = await db.query(
      `SELECT i.*, stats.total_purchases, stats.preferred_quantity, stats.preferred_unit,
       stats.last_purchase_date, stats.average_days_between_purchases
       FROM item_statistics stats
       JOIN items i ON stats.item_id = i.id
       WHERE stats.user_id = $1 
       AND stats.total_purchases >= 3
       AND stats.last_purchase_date < CURRENT_TIMESTAMP - INTERVAL '1 day' * stats.average_days_between_purchases
       ORDER BY stats.total_purchases DESC
       LIMIT 10`,
      [req.user.id]
    );

    for (const item of frequentItems.rows) {
      const daysSinceLastPurchase = Math.floor(
        (new Date() - new Date(item.last_purchase_date)) / (1000 * 60 * 60 * 24)
      );

      if (!suggestions.find(s => s.itemId === item.id)) {
        suggestions.push({
          type: 'frequent',
          item: item.name,
          itemId: item.id,
          reason: `You've bought this ${item.total_purchases} times. Last purchase was ${daysSinceLastPurchase} days ago.`,
          quantity: item.preferred_quantity,
          unit: item.preferred_unit,
          priority: 'low',
        });
      }
    }

    suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Enrich with MDL learning + price data — best effort: missing MDL
    // tables/functions degrade to absent fields, never a 500.
    try {
      const keys = [...new Set(suggestions.map(s => s.item.toLowerCase()))];
      if (keys.length > 0) {
        const enrich = await db.query(
          `SELECT LOWER(i.name) AS key,
                  i.average_price AS catalog_price,
                  n.normalized_name AS canonical_name,
                  p.total_times_added, p.prediction_confidence,
                  p.next_predicted_date, p.average_days_between,
                  p.last_price, p.average_price AS mdl_price
           FROM items i
           LEFT JOIN mdl_item_names n ON n.normalized_name = normalize_item_name(i.name)
           LEFT JOIN mdl_user_patterns p ON p.item_name_id = n.id AND p.user_id = $1
           WHERE i.user_id = $1 AND LOWER(i.name) = ANY($2::text[])`,
          [req.user.id, keys]
        );

        const byName = Object.fromEntries(enrich.rows.map(r => [r.key, r]));
        for (const s of suggestions) {
          const e = byName[s.item.toLowerCase()];
          if (!e) continue;
          const price = e.last_price ?? e.mdl_price ?? e.catalog_price;
          if (price != null) {
            s.price = parseFloat(price);
            s.priceSource = e.last_price != null ? 'last_paid'
              : e.mdl_price != null ? 'learned_avg' : 'catalog';
          }
          s.exactName = e.canonical_name || s.item;
          if (e.total_times_added != null) {
            s.mdl = {
              timesAdded: e.total_times_added,
              confidence: e.prediction_confidence,
              nextDue: e.next_predicted_date,
              avgDaysBetween: e.average_days_between,
            };
          }
        }
      }
    } catch (enrichErr) {
      console.warn('Suggestion enrichment skipped:', enrichErr.message);
    }

    res.json(suggestions);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

router.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Search query too short' });
  }

  try {
    const result = await db.query(
      `SELECT DISTINCT ON (LOWER(i.name)) i.*, 
       stats.total_purchases, stats.preferred_quantity, stats.preferred_unit,
       i.average_price, i.preferred_icon as icon, i.category
       FROM items i
       LEFT JOIN item_statistics stats ON i.id = stats.item_id AND stats.user_id = $1
       WHERE i.user_id = $1 AND LOWER(i.name) LIKE LOWER($2)
       ORDER BY LOWER(i.name), stats.total_purchases DESC NULLS LAST
       LIMIT 10`,
      [req.user.id, `%${q}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching items:', error);
    res.status(500).json({ error: 'Failed to search items' });
  }
});

// Purchase advisor — before adding an item, check if the user already has it,
// if it's expiring, or if they just bought it. Returns a verdict + reasons.
router.get('/advise', async (req, res) => {
  const { item } = req.query;
  if (!item || item.trim().length < 2) {
    return res.json({ verdict: 'none', reasons: [] });
  }

  try {
    const name = item.trim();
    const reasons = [];
    let verdict = 'buy';

    // 1. Already in home inventory?
    const inv = await db.query(
      `SELECT i.current_quantity, i.unit, i.percentage_left,
              i.estimated_expiry_date,
              EXTRACT(DAY FROM (i.estimated_expiry_date::timestamp - CURRENT_DATE::timestamp))::INTEGER AS days_until_expiry,
              csl.name AS custom_location_name, i.storage_location
       FROM inventory i
       JOIN items it ON i.item_id = it.id
       LEFT JOIN custom_storage_locations csl ON i.custom_location_id = csl.id
       WHERE i.user_id = $1 AND LOWER(it.name) = LOWER($2) AND i.current_quantity > 0
       ORDER BY i.estimated_expiry_date ASC NULLS LAST
       LIMIT 1`,
      [req.user.id, name]
    );

    if (inv.rows.length > 0) {
      const v = inv.rows[0];
      const loc = v.custom_location_name || v.storage_location;
      if (v.days_until_expiry !== null && v.days_until_expiry <= 0) {
        verdict = 'caution';
        reasons.push(`You have one at home but it expired — buying fresh makes sense.`);
      } else {
        verdict = 'skip';
        let msg = `Already have ${parseFloat(v.current_quantity)} ${v.unit || ''}`.trim();
        if (loc) msg += ` in the ${loc.toLowerCase()}`;
        if (v.days_until_expiry !== null) {
          msg += v.days_until_expiry <= 3 ? `, expires in ${v.days_until_expiry}d` : '';
          if (v.days_until_expiry <= 3) verdict = 'caution';
        }
        reasons.push(msg + '.');
      }
    }

    // 2. Recently bought?
    const recent = await db.query(
      `SELECT purchased_at,
              EXTRACT(DAY FROM (CURRENT_TIMESTAMP - purchased_at::timestamp))::INTEGER AS days_ago
       FROM purchase_history
       WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)
       ORDER BY purchased_at DESC LIMIT 1`,
      [req.user.id, name]
    );

    if (recent.rows.length > 0 && recent.rows[0].days_ago <= 3 && verdict !== 'caution') {
      const days = recent.rows[0].days_ago;
      reasons.push(`Bought ${days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}.`);
      if (verdict === 'buy') verdict = 'caution';
    }

    // 3. Purchase cadence — "usually every N days"
    const stats = await db.query(
      `SELECT s.average_days_between_purchases AS avg_days, s.total_purchases,
              EXTRACT(DAY FROM (CURRENT_TIMESTAMP - s.last_purchase_date::timestamp))::INTEGER AS days_since
       FROM item_statistics s
       JOIN items it ON s.item_id = it.id
       WHERE s.user_id = $1 AND LOWER(it.name) = LOWER($2)`,
      [req.user.id, name]
    );

    if (stats.rows.length > 0 && stats.rows[0].avg_days) {
      const { avg_days, days_since } = stats.rows[0];
      if (verdict === 'buy' && days_since >= avg_days) {
        reasons.push(`Right on schedule — you buy this every ~${Math.round(avg_days)} days.`);
      } else if (verdict === 'buy') {
        reasons.push(`You usually buy this every ~${Math.round(avg_days)} days (last: ${days_since}d ago).`);
      }
    }

    res.json({ verdict, reasons });
  } catch (error) {
    console.error('Advise error:', error);
    res.json({ verdict: 'none', reasons: [] });
  }
});

// Price advisor — batch per-store price intelligence for Smart Suggestions.
// For each item the user has price data on, returns the last + previous price
// at the requested store (trend), plus the cheapest store and the margin.
// ?store=<name> picks the "current" store; ?items=a,b,c optionally limits names.
router.get('/price-advisor', async (req, res) => {
  try {
    const store = (req.query.store || '').trim();
    const names = (req.query.items || '')
      .split(',')
      .map(n => n.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 100);

    let where = 'user_id = $1 AND status = $2';
    const params = [req.user.id, 'approved'];
    if (names.length > 0) {
      params.push(names);
      where += ' AND LOWER(item_name) = ANY($3::text[])';
    }

    // Last two observed prices per item per store — enough for a trend arrow.
    const rows = await db.query(
      `SELECT key, item_name, store_name, price, created_at, rn FROM (
         SELECT LOWER(item_name) AS key, item_name, store_name, price, created_at,
                ROW_NUMBER() OVER (
                  PARTITION BY LOWER(item_name), COALESCE(store_name, '')
                  ORDER BY created_at DESC
                ) AS rn
         FROM price_history
         WHERE ${where}
       ) ranked
       WHERE rn <= 2
       ORDER BY key, store_name, rn`,
      params
    );

    // key -> { byStore: {store: {last, lastAt, prev}} }
    const items = {};
    for (const r of rows.rows) {
      if (!items[r.key]) items[r.key] = { name: r.item_name, byStore: {} };
      const entry = items[r.key];
      const sn = r.store_name || 'Unknown store';
      if (!entry.byStore[sn]) entry.byStore[sn] = {};
      const slot = entry.byStore[sn];
      if (r.rn === 1) {
        slot.last = parseFloat(r.price);
        slot.lastAt = r.created_at;
      } else {
        slot.prev = parseFloat(r.price);
      }
    }

    const advisor = {};
    const norm = (s) => (s || '').toLowerCase();
    for (const [key, entry] of Object.entries(items)) {
      const stores = Object.entries(entry.byStore)
        .map(([name, v]) => ({ store: name, price: v.last, at: v.lastAt, prev: v.prev }))
        .filter(s2 => s2.price != null)
        .sort((a, b) => a.price - b.price);
      if (stores.length === 0) continue;

      const best = stores[0];
      const cur = store
        ? stores.find(s2 => norm(s2.store) === norm(store)) ||
          Object.entries(entry.byStore)
            .filter(([n]) => norm(n) === norm(store))
            .map(([n, v]) => ({ store: n, price: v.last, at: v.lastAt, prev: v.prev }))[0]
        : null;

      const out = {
        best: { store: best.store, price: best.price, at: best.at },
        stores,
      };
      if (cur) {
        out.store = {
          price: cur.price,
          at: cur.at,
          prev: cur.prev != null ? cur.prev : null,
          changePct: cur.prev != null && cur.prev > 0
            ? Math.round(((cur.price - cur.prev) / cur.prev) * 1000) / 10
            : null,
        };
        if (norm(best.store) !== norm(cur.store) && best.price < cur.price) {
          out.store.savesPct = Math.round(((cur.price - best.price) / cur.price) * 1000) / 10;
        }
      }
      advisor[key] = out;
    }

    res.json({ store: store || null, advisor });
  } catch (error) {
    // price_history may not exist on older installs — degrade, never 500.
    console.warn('price-advisor unavailable:', error.message);
    res.json({ store: null, advisor: {} });
  }
});

// Recently-removed list items — powers the quick re-add section in Smart Suggestions.
// Rows come from list_item_removal_log (migration 100), written by DELETE /shopping items.
router.get('/recently-removed', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT ON (LOWER(l.item_name))
         l.item_name, l.quantity, l.unit, l.price, l.category, l.removed_at
       FROM list_item_removal_log l
       WHERE l.user_id = $1
       ORDER BY LOWER(l.item_name), l.removed_at DESC
       LIMIT 30`,
      [req.user.id]
    );

    if (result.rows.length === 0) return res.json([]);

    // Names still sitting on a list need no re-add shortcut.
    const onList = await db.query(
      `SELECT DISTINCT LOWER(sli.item_name) AS name
       FROM shopping_list_items sli
       JOIN shopping_lists sl ON sl.id = sli.shopping_list_id
       WHERE sl.user_id = $1`,
      [req.user.id]
    );
    const onSet = new Set(onList.rows.map(r => r.name));

    res.json(
      result.rows
        .filter(r => !onSet.has(r.item_name.toLowerCase()))
        .sort((a, b) => new Date(b.removed_at) - new Date(a.removed_at))
        .slice(0, 15)
    );
  } catch (error) {
    // Table may not exist pre-migration — degrade to empty, not 500.
    console.warn('recently-removed unavailable:', error.message);
    res.json([]);
  }
});

// Delete item from user's history
router.delete('/:itemId', async (req, res) => {
  try {
    // Delete from items table (this will cascade to item_statistics)
    const result = await db.query(
      `DELETE FROM items WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.itemId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted from history' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
