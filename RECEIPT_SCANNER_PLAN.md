# Receipt Scanner Feature

## Overview
Scan grocery receipts with your device camera and automatically extract items to add to kitchen inventory. Uses OCR (Optical Character Recognition) to read receipt text and AI to parse items, quantities, prices, and dates.

## User Flow

```
1. User clicks "Scan Receipt" button
   ↓
2. Camera opens (mobile/tablet)
   ↓
3. User takes photo of receipt
   ↓
4. OCR processes image → Extract text
   ↓
5. AI parses receipt data:
   - Store name
   - Purchase date
   - Items (name, quantity, price)
   - Total amount
   ↓
6. Show preview with detected items
   ↓
7. User reviews/edits items
   ↓
8. User selects storage location for each item
   ↓
9. Items added to inventory with:
   - Bought date (from receipt)
   - Price (from receipt)
   - Store (from receipt)
   - Auto-calculated expiration
   ↓
10. Success! Items now in inventory
```

## Technical Implementation

### Frontend Components

**1. ReceiptScanner.js**
- Camera interface (uses device camera)
- Capture photo button
- Retake option
- Loading state during processing

**2. ReceiptPreview.js**
- Shows captured receipt image
- Displays extracted text
- Lists detected items
- Edit/delete items
- Assign storage locations
- Confirm/cancel buttons

**3. ReceiptItemCard.js**
- Individual item from receipt
- Name, quantity, price
- Storage location dropdown
- Category auto-detection
- Expiration estimate preview
- Remove button

### Backend API

**Endpoint:** `POST /api/inventory/receipt/scan`

**Request:**
```json
{
  "image": "base64_encoded_image",
  "userId": 123
}
```

**Response:**
```json
{
  "success": true,
  "receipt": {
    "store": "Walmart",
    "date": "2026-07-23",
    "total": 45.67,
    "items": [
      {
        "name": "Milk",
        "quantity": 1,
        "unit": "gallon",
        "price": 3.99,
        "category": "Dairy & Eggs",
        "suggestedLocation": "fridge",
        "estimatedExpiry": "2026-07-30"
      },
      {
        "name": "Bread",
        "quantity": 1,
        "unit": "loaf",
        "price": 2.49,
        "category": "Bakery & Bread",
        "suggestedLocation": "pantry",
        "estimatedExpiry": "2026-07-28"
      }
    ]
  },
  "rawText": "WALMART\n07/23/2026\nMILK 1GAL $3.99\nBREAD $2.49\nTOTAL $45.67"
}
```

### OCR Services (Options)

**Option 1: Tesseract.js (Free, Client-Side)**
- Pros: Free, runs in browser, no API costs
- Cons: Slower, less accurate, requires good image quality
- Best for: MVP, testing, offline support

**Option 2: Google Cloud Vision API (Paid)**
- Pros: Very accurate, fast, handles poor quality images
- Cons: Costs money ($1.50 per 1000 images)
- Best for: Production, high accuracy needed

**Option 3: Azure Computer Vision (Paid)**
- Pros: Accurate, good receipt parsing
- Cons: Costs money
- Best for: Enterprise

**Option 4: Receipt-specific APIs**
- Taggun, Veryfi, Mindee
- Pros: Built specifically for receipts, extract structured data
- Cons: More expensive
- Best for: Professional apps

**Recommendation:** Start with **Tesseract.js** for MVP, upgrade to **Google Cloud Vision** for production.

### Receipt Parsing Algorithm

```javascript
function parseReceipt(ocrText) {
  const lines = ocrText.split('\n');
  const receipt = {
    store: null,
    date: null,
    items: [],
    total: null
  };
  
  // 1. Detect store name (usually first few lines)
  const storePatterns = ['WALMART', 'TARGET', 'KROGER', 'SAFEWAY', 'COSTCO'];
  for (const line of lines.slice(0, 5)) {
    for (const store of storePatterns) {
      if (line.toUpperCase().includes(store)) {
        receipt.store = store;
        break;
      }
    }
  }
  
  // 2. Detect date (MM/DD/YYYY or DD/MM/YYYY)
  const dateRegex = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      receipt.date = parseDate(match[0]);
      break;
    }
  }
  
  // 3. Extract items (line with item name and price)
  const itemRegex = /^(.+?)\s+(\d+\.?\d*)\s*\$?(\d+\.\d{2})$/;
  for (const line of lines) {
    const match = line.match(itemRegex);
    if (match) {
      const [_, name, quantity, price] = match;
      receipt.items.push({
        name: cleanItemName(name),
        quantity: parseFloat(quantity) || 1,
        price: parseFloat(price)
      });
    }
  }
  
  // 4. Extract total
  const totalRegex = /TOTAL.*?\$?(\d+\.\d{2})/i;
  for (const line of lines) {
    const match = line.match(totalRegex);
    if (match) {
      receipt.total = parseFloat(match[1]);
      break;
    }
  }
  
  return receipt;
}
```

### Item Enhancement

After parsing, enhance each item with:

```javascript
async function enhanceReceiptItems(items, userId) {
  const enhanced = [];
  
  for (const item of items) {
    // 1. Detect category
    const category = detectCategory(item.name);
    
    // 2. Suggest storage location
    const suggestedLocation = suggestStorageLocation(item.name, category);
    
    // 3. Calculate estimated expiration
    const expiration = await calculateExpiration({
      itemName: item.name,
      storageLocation: suggestedLocation,
      boughtDate: new Date(),
      userId
    });
    
    // 4. Normalize item name
    const normalizedName = normalizeItemName(item.name);
    
    enhanced.push({
      ...item,
      name: normalizedName,
      category,
      suggestedLocation,
      estimatedExpiry: expiration.estimatedExpiryDate,
      expiryConfidence: expiration.confidence
    });
  }
  
  return enhanced;
}
```

## UI Design

### Receipt Scanner Button
```jsx
<button className="receipt-scanner-btn">
  📷 Scan Receipt
</button>
```

**Placement:**
- Floating action button (bottom right)
- In "Add Item" modal as alternative method
- In toolbar next to "+ Add Item"

### Camera Interface
```
┌─────────────────────────────────────┐
│  ← Back                    Flash 🔦 │
├─────────────────────────────────────┤
│                                     │
│                                     │
│         [Camera Preview]            │
│                                     │
│     [Receipt alignment guide]       │
│                                     │
│                                     │
├─────────────────────────────────────┤
│          [Capture Button]           │
│     Retake        Use Photo         │
└─────────────────────────────────────┘
```

### Receipt Preview
```
┌─────────────────────────────────────┐
│  Receipt from Walmart               │
│  July 23, 2026                      │
├─────────────────────────────────────┤
│  ✓ Milk - $3.99                     │
│    1 gallon → Fridge                │
│    Expires: Jul 30 (7 days)         │
│                                     │
│  ✓ Bread - $2.49                    │
│    1 loaf → Pantry                  │
│    Expires: Jul 28 (5 days)         │
│                                     │
│  ✓ Eggs - $4.99                     │
│    12 count → Fridge                │
│    Expires: Aug 13 (21 days)        │
│                                     │
│  ✗ TAX - $0.87 (removed)            │
├─────────────────────────────────────┤
│  Total: $45.67                      │
│  Items: 3 of 4 selected             │
│                                     │
│  [Cancel]  [Add to Inventory]       │
└─────────────────────────────────────┘
```

## Database Schema

No new tables needed! Uses existing:
- `inventory` - Items added from receipt
- `inventory_history` - Track receipt scans
- `default_expiration_times` - For expiration calculation

Add optional column:
```sql
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS receipt_id VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;
```

## Features

### Basic (MVP)
- ✅ Take photo of receipt
- ✅ OCR text extraction
- ✅ Parse items, prices, date
- ✅ Preview and edit items
- ✅ Add to inventory

### Advanced
- 🔄 Bulk edit (select multiple items)
- 🔄 Auto-categorization
- 🔄 Store detection
- 🔄 Duplicate detection (already have this item?)
- 🔄 Receipt history (view past scans)
- 🔄 Receipt image storage
- 🔄 Export receipts (for taxes/budgeting)

### Future Enhancements
- 📸 Scan multiple receipts at once
- 🤖 AI-powered item matching (fuzzy matching)
- 💰 Budget tracking (spending by category)
- 📊 Shopping trends (which stores, how often)
- 🔔 Reorder alerts (running low on frequently bought items)
- 🎯 Smart suggestions (based on purchase history)

## Error Handling

**Poor Image Quality:**
- Show tips: "Hold camera steady", "Ensure good lighting"
- Allow retake
- Manual entry fallback

**OCR Fails:**
- Show raw text for manual review
- Allow manual item entry
- Save image for later processing

**Parsing Errors:**
- Show detected items + raw text
- Allow manual correction
- Learn from corrections

## Privacy & Security

- ✅ Receipt images stored securely (encrypted)
- ✅ OCR processing can be done client-side (Tesseract.js)
- ✅ No receipt data sent to third parties (if using Tesseract)
- ✅ User can delete receipt images anytime
- ✅ Receipt data tied to user account (not shared)

## Testing Checklist

- [ ] Test with various receipt formats
- [ ] Test with different stores
- [ ] Test with poor lighting
- [ ] Test with crumpled receipts
- [ ] Test with faded receipts
- [ ] Test with handwritten receipts
- [ ] Test with thermal receipts (fade over time)
- [ ] Test on different devices (phone, tablet)
- [ ] Test camera permissions
- [ ] Test offline mode

## Implementation Steps

1. **Install Dependencies**
   ```bash
   npm install tesseract.js
   npm install react-webcam
   ```

2. **Create Components**
   - ReceiptScanner.js
   - ReceiptPreview.js
   - ReceiptItemCard.js

3. **Add Backend Endpoint**
   - POST /api/inventory/receipt/scan
   - Receipt parsing logic
   - Item enhancement

4. **Integrate with Inventory**
   - Add "Scan Receipt" button
   - Connect to inventory API
   - Show success message

5. **Test & Iterate**
   - Test with real receipts
   - Improve parsing accuracy
   - Handle edge cases

## Success Metrics

- ✅ 80%+ OCR accuracy
- ✅ 90%+ item detection rate
- ✅ < 5 seconds processing time
- ✅ < 10% manual corrections needed
- ✅ Users scan 50%+ of receipts

## Cost Estimation

**Using Tesseract.js (Free):**
- $0 per scan
- Unlimited scans

**Using Google Cloud Vision:**
- $1.50 per 1000 scans
- 100 scans/month = $0.15/month
- 1000 scans/month = $1.50/month
- 10,000 scans/month = $15/month

**Recommendation:** Start free with Tesseract.js, upgrade if accuracy is insufficient.
