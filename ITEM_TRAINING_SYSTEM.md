# Item Training System

## Overview
The Item Training System allows the app to learn from users and admins over time, building a comprehensive database of items with proper categorization, icons, and metadata.

## How It Works

### 1. **Frequency Tracking**
- Every time a user types an item name, it's tracked in localStorage
- The system counts how many times each item is used
- Different thresholds for admins (3 uses) vs users (5 uses)

### 2. **Smart Prompting**
When an item reaches the threshold:
- **Admins**: Get prompted after 3 uses - their training is added immediately
- **Users**: Get prompted after 5 uses - their training goes to review queue

### 3. **Variation Detection**
The system intelligently detects variations:
- "Bread" vs "Wheat Bread" vs "White Bread"
- "Canned Chicken" vs "Canned Beef"
- Only prompts for variations if they're used frequently enough

### 4. **Training Modal**
Beautiful modal that appears when threshold is met:
- Auto-detects category and icon
- Allows customization of:
  - Item name
  - Category
  - Icon (with picker showing 90+ common food emojis)
  - Preferred unit (lbs, oz, count, etc.)
  - Average price
  - Notes

### 5. **Admin vs User Workflow**

#### **Admin Training:**
✅ Immediate effect
✅ Added directly to `item_preferences` table
✅ Marked as `trained_by_admin = true`
✅ Higher confidence/priority

#### **User Training:**
📝 Goes to review queue
📝 Stored in `item_training_submissions` table
📝 Admin can approve/reject
📝 Once approved, added to database

## Database Schema

### `item_preferences` Table (Enhanced)
```sql
- trained_by_admin BOOLEAN -- Whether admin trained it
- training_frequency INTEGER -- How many times trained/used
- updated_at TIMESTAMP -- Last update time
```

### `item_training_submissions` Table (New)
```sql
- user_id -- Who submitted it
- item_name -- Suggested item name
- category -- Suggested category
- item_icon -- Suggested icon
- preferred_unit -- Suggested unit
- average_price -- Suggested price
- notes -- Additional info
- frequency -- How many times user used it
- status -- pending/approved/rejected
- reviewed_by -- Admin who reviewed
- reviewed_at -- When reviewed
- rejection_reason -- Why rejected (if applicable)
```

## API Endpoints

### `POST /api/item-training/submit`
Submit item training (admin or user)
- Admins: Adds directly to database
- Users: Creates pending submission

### `GET /api/item-training/pending` (Admin Only)
Get all pending user submissions

### `POST /api/item-training/approve/:id` (Admin Only)
Approve a user submission

### `POST /api/item-training/reject/:id` (Admin Only)
Reject a user submission with reason

### `GET /api/item-training/stats`
Get training statistics

## Frontend Integration

### In Dashboard.js (or wherever items are added):
```javascript
import { trackItemUsage, shouldPromptTraining } from '../utils/itemTrainingTracker';
import ItemTrainingModal from '../components/ItemTrainingModal';

// When user adds an item:
const addItem = async () => {
  const itemName = newItemName.trim();
  
  // Track usage
  trackItemUsage(itemName);
  
  // Check if should prompt
  if (shouldPromptTraining(itemName, user.is_admin)) {
    setTrainingItem(itemName);
    setShowTrainingModal(true);
  }
  
  // ... rest of add item logic
};
```

## Benefits

### For the App:
- 📈 Database grows organically over time
- 🎯 Better categorization and suggestions
- 🔍 Learns user preferences
- 🌟 Improves autocomplete and search

### For Admins:
- ⚡ Quick training workflow
- 🎨 Full control over database
- 📊 See what users are adding
- ✅ Review and approve user suggestions

### For Users:
- 🤝 Contribute to improving the app
- 💡 Help others with better suggestions
- 🏆 Feel ownership in the platform
- ⏱️ Faster item entry over time

## Future Enhancements

1. **Machine Learning Integration**
   - Use MDL system to auto-categorize
   - Predict icons based on item name
   - Suggest prices based on historical data

2. **Aisle Training**
   - Let users/admins train aisle locations
   - Build store-specific aisle maps
   - Percentage-based confidence system

3. **Gamification**
   - XP for training items
   - Badges for contributions
   - Leaderboard for top trainers

4. **Bulk Training**
   - Import from receipts
   - Batch approval for admins
   - CSV import/export

## Usage Statistics

The system tracks:
- Total items tracked
- Total items trained
- Items needing training
- Most frequently used items
- Admin vs user trained ratio
- Pending submissions count

## Notes

- Frequency data stored in localStorage (client-side)
- Trained items list stored in localStorage (prevents re-prompting)
- Variation detection uses fuzzy matching
- System respects user preferences (can dismiss prompts)
- Admin training takes precedence over user training
