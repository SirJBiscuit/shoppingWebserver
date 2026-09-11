# 📊 Smart Price Learning System

## Overview
The price learning system tracks and suggests prices for items to improve shopping efficiency and budget tracking.

## Data Architecture

### Price Storage Levels

1. **User Personal Price** (Priority 1)
   - Stored in `shopping_items.price` field
   - Updated each time the user enters a price for that specific item
   - Most relevant because it reflects the user's actual shopping habits and stores

2. **MDL Product Average** (Priority 2 - Future)
   - Stored in `product_master_data` table
   - Calculated average across all users for that product
   - Useful for new items or items user hasn't bought before
   - Admin can view and manage in MDL admin section

3. **Store-Specific Average** (Priority 3 - Future)
   - Average price for item at specific store
   - Helps when user shops at different stores
   - More accurate than global average

## Current Implementation

### Frontend (NextItemSuggestion.js)
- **Display**: Shows quantity prominently with warning to verify
- **Input Methods**:
  - Suggested price button (if `nextItem.price` exists)
  - Increment/decrement buttons (+/- $0.50, $1, $5)
  - Manual input (collapsed by default)
- **Visual Feedback**: 
  - Large price display
  - Highlighted quantity badge
  - Warning message to verify quantity matches

### Backend (Dashboard.js - handlePriceUpdate)
- Saves price to `shopping_items.price` field
- Updates item in database
- Price is associated with specific quantity

## Data Quality Protection

### Current Safeguards
1. ⚠️ **Visual Warning**: "Make sure this matches what you're buying!"
2. **Quantity Display**: Large, highlighted badge showing exact quantity
3. **Clear Context**: "Price for: X items" label

### Future Safeguards (TODO)
1. **Outlier Detection**: Flag prices that are >2x or <0.5x the average
2. **Confirmation Dialog**: For prices significantly different from last time
3. **Price History**: Show last 3 prices to help user verify
4. **Quantity Mismatch Warning**: Alert if quantity changed since last purchase

## Price Suggestion Logic (Current)

```javascript
// Priority order:
1. User's last price for this item (nextItem.price)
2. No suggestion (user enters manually)

// Future:
1. User's last price for this item
2. User's average for this product (across all lists)
3. MDL product average (all users)
4. Store-specific average
5. Category average
```

## Database Schema

### Current
```sql
shopping_items:
  - price DECIMAL(10,2) -- User's last price for this specific item
```

### Future (MDL Enhancement)
```sql
product_master_data:
  - avg_price DECIMAL(10,2) -- Global average
  - price_count INTEGER -- Number of price entries
  - last_price_update TIMESTAMP

price_history:
  - id SERIAL PRIMARY KEY
  - user_id INTEGER
  - product_id INTEGER
  - store_id INTEGER
  - price DECIMAL(10,2)
  - quantity DECIMAL(10,2)
  - unit VARCHAR(50)
  - created_at TIMESTAMP
```

## User Experience Flow

1. **First Time Buying Item**:
   - No suggested price shown
   - User enters price manually or uses increment buttons
   - Price saved to `shopping_items.price`
   - Message: "First time buying this? Your price will be saved for next time"

2. **Subsequent Purchases**:
   - Blue button shows: "💡 Use Last Price: $X.XX"
   - User can click to auto-fill or adjust with +/- buttons
   - Message: "Your last price: $X.XX • This will update your personal average"

3. **Price Entry**:
   - Large display shows current price
   - Quantity badge is prominent and highlighted
   - Warning reminds user to verify quantity
   - Clear button available to reset

## Admin Features (Future)

### MDL Admin Panel
- View price history for all products
- See outliers and suspicious data
- Manually adjust or remove bad data
- View price trends over time
- Export price data for analysis

### Data Quality Tools
- Flag entries with unusual prices
- Review recent price changes
- Bulk edit/delete bad data
- Set price ranges for products

## API Endpoints (Future)

```
GET  /api/mdl/products/:id/price-history
POST /api/mdl/products/:id/price
GET  /api/mdl/products/:id/price-average
GET  /api/mdl/stores/:id/price-average/:productId
```

## Notes

- Prices are always stored with 2 decimal precision
- Quantity context is critical for accurate price learning
- User-specific data takes precedence over global averages
- Bad data protection is essential for system accuracy
