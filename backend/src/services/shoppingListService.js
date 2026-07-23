// Optimized Shopping List Service
// Handles all list operations with caching, pagination, and performance optimizations

const db = require('../database/db');
const listCache = require('./listCache');

class ShoppingListService {
  
  // Get user's lists with counts (uses materialized view for performance)
  async getUserLists(userId, includeCompleted = false) {
    const cacheKey = `lists:${userId}:${includeCompleted}`;
    
    try {
      const query = `
        SELECT 
          sl.id,
          sl.name,
          sl.store_name,
          sl.status,
          sl.created_at,
          sl.updated_at,
          COALESCE(lic.item_count, 0) as item_count,
          COALESCE(lic.purchased_count, 0) as purchased_count,
          COALESCE(lic.total_cost, 0) as total_cost
        FROM shopping_lists sl
        LEFT JOIN list_item_counts lic ON sl.id = lic.list_id
        WHERE sl.created_by = $1
          AND ($2 = true OR sl.status = 'active')
        ORDER BY sl.created_at DESC
        LIMIT 100
      `;
      
      const result = await db.query(query, [userId, includeCompleted]);
      return result.rows;
    } catch (error) {
      console.error('Error getting user lists:', error);
      throw error;
    }
  }

  // Get single list with items (with caching)
  async getListWithItems(userId, listId, options = {}) {
    const { 
      limit = 100, 
      offset = 0,
      includeDeleted = false 
    } = options;

    // Check cache first
    const cached = listCache.get(userId, listId);
    if (cached && offset === 0 && limit === 100) {
      return cached;
    }

    try {
      // Get list details
      const listQuery = `
        SELECT 
          sl.*,
          COALESCE(lic.item_count, 0) as item_count,
          COALESCE(lic.purchased_count, 0) as purchased_count,
          COALESCE(lic.total_cost, 0) as total_cost
        FROM shopping_lists sl
        LEFT JOIN list_item_counts lic ON sl.id = lic.list_id
        WHERE sl.id = $1 AND sl.created_by = $2
      `;
      
      const listResult = await db.query(listQuery, [listId, userId]);
      
      if (listResult.rows.length === 0) {
        return null;
      }

      const list = listResult.rows[0];

      // Get items with pagination
      const itemsQuery = `
        SELECT 
          sli.*,
          i.preferred_icon,
          i.preferred_category
        FROM shopping_list_items sli
        LEFT JOIN items i ON i.item_name = sli.item_name AND i.user_id = $1
        WHERE sli.list_id = $2
          AND ($3 = true OR sli.deleted_at IS NULL)
        ORDER BY 
          sli.purchased ASC,
          sli.aisle_number ASC NULLS LAST,
          sli.category ASC,
          sli.created_at DESC
        LIMIT $4 OFFSET $5
      `;
      
      const itemsResult = await db.query(itemsQuery, [
        userId, 
        listId, 
        includeDeleted,
        limit,
        offset
      ]);

      const response = {
        ...list,
        items: itemsResult.rows,
        pagination: {
          limit,
          offset,
          hasMore: itemsResult.rows.length === limit
        }
      };

      // Cache if it's the first page
      if (offset === 0 && limit === 100) {
        listCache.set(userId, listId, response);
      }

      return response;
    } catch (error) {
      console.error('Error getting list with items:', error);
      throw error;
    }
  }

  // Create new list
  async createList(userId, listData) {
    const { name, store_name } = listData;
    
    try {
      const query = `
        INSERT INTO shopping_lists (name, store_name, created_by, status)
        VALUES ($1, $2, $3, 'active')
        RETURNING *
      `;
      
      const result = await db.query(query, [name, store_name || null, userId]);
      
      // Invalidate user's lists cache
      listCache.invalidateUser(userId);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating list:', error);
      throw error;
    }
  }

  // Update list
  async updateList(userId, listId, updates) {
    const { name, store_name, status } = updates;
    
    try {
      const query = `
        UPDATE shopping_lists
        SET 
          name = COALESCE($1, name),
          store_name = COALESCE($2, store_name),
          status = COALESCE($3, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND created_by = $5
        RETURNING *
      `;
      
      const result = await db.query(query, [
        name,
        store_name,
        status,
        listId,
        userId
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      // Invalidate cache
      listCache.invalidate(userId, listId);
      listCache.invalidateUser(userId);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating list:', error);
      throw error;
    }
  }

  // Add item to list (batch support)
  async addItems(userId, listId, items) {
    const itemsArray = Array.isArray(items) ? items : [items];
    
    if (itemsArray.length === 0) {
      return [];
    }

    try {
      // Verify list ownership
      const listCheck = await db.query(
        'SELECT id FROM shopping_lists WHERE id = $1 AND created_by = $2',
        [listId, userId]
      );

      if (listCheck.rows.length === 0) {
        throw new Error('List not found or access denied');
      }

      // Batch insert items
      const values = [];
      const placeholders = [];
      let paramIndex = 1;

      itemsArray.forEach((item, index) => {
        const offset = index * 9;
        placeholders.push(
          `($${paramIndex + offset}, $${paramIndex + offset + 1}, $${paramIndex + offset + 2}, ` +
          `$${paramIndex + offset + 3}, $${paramIndex + offset + 4}, $${paramIndex + offset + 5}, ` +
          `$${paramIndex + offset + 6}, $${paramIndex + offset + 7}, $${paramIndex + offset + 8})`
        );
        
        values.push(
          listId,
          item.item_name,
          item.quantity || 1,
          item.unit || '',
          item.price || null,
          item.category || '',
          item.item_icon || '',
          item.aisle_number || null,
          item.notes || ''
        );
      });

      paramIndex += itemsArray.length * 9;

      const query = `
        INSERT INTO shopping_list_items 
          (list_id, item_name, quantity, unit, price, category, item_icon, aisle_number, notes)
        VALUES ${placeholders.join(', ')}
        RETURNING *
      `;

      const result = await db.query(query, values);

      // Invalidate cache
      listCache.invalidate(userId, listId);

      return result.rows;
    } catch (error) {
      console.error('Error adding items:', error);
      throw error;
    }
  }

  // Update item
  async updateItem(userId, listId, itemId, updates) {
    try {
      // Verify ownership
      const checkQuery = `
        SELECT sli.id 
        FROM shopping_list_items sli
        JOIN shopping_lists sl ON sli.list_id = sl.id
        WHERE sli.id = $1 AND sl.id = $2 AND sl.created_by = $3
      `;
      
      const check = await db.query(checkQuery, [itemId, listId, userId]);
      
      if (check.rows.length === 0) {
        throw new Error('Item not found or access denied');
      }

      // Build dynamic update query
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        return null;
      }

      values.push(itemId);

      const query = `
        UPDATE shopping_list_items
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await db.query(query, values);

      // Invalidate cache
      listCache.invalidate(userId, listId);

      return result.rows[0];
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  // Delete item (soft delete)
  async deleteItem(userId, listId, itemId) {
    try {
      const query = `
        UPDATE shopping_list_items sli
        SET deleted_at = CURRENT_TIMESTAMP
        FROM shopping_lists sl
        WHERE sli.id = $1 
          AND sli.list_id = $2
          AND sl.id = $2
          AND sl.created_by = $3
        RETURNING sli.*
      `;

      const result = await db.query(query, [itemId, listId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Item not found or access denied');
      }

      // Invalidate cache
      listCache.invalidate(userId, listId);

      return result.rows[0];
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  // Get cache stats (for monitoring)
  getCacheStats() {
    return listCache.getStats();
  }
}

module.exports = new ShoppingListService();
