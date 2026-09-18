# Sound System Enhancement Plan

## Current Issues
1. ❌ Can't enable sounds in settings (toggle doesn't work properly)
2. ❌ Can modify volume but changes don't persist
3. ❌ Can't test sounds (play button doesn't work)
4. ❌ Upload works but no feedback on where files are stored
5. ❌ Can't view current sounds properly
6. ❌ No per-widget/function sound assignments
7. ❌ No global admin controls to enable/disable sounds for all users

## Proposed Enhancements

### 1. Database Schema Updates
**New Tables:**
- `global_sound_settings` - Admin-controlled global sound settings
- `sound_categories` - Define all sound categories/events
- `widget_sound_mappings` - Map widgets/functions to sound categories

**Updated Tables:**
- `user_sound_preferences` - Add fields for all sound categories
- `sounds` - Add `file_size`, `duration`, `upload_by` fields

### 2. Sound Categories
```
- check: Item checked off
- uncheck: Item unchecked
- pop: Item added to cart (flying animation)
- shake: Item interaction
- notification: General notifications
- success: Success actions
- error: Error messages
- warning: Warning messages
- delete: Item deleted
- add: Item added
- scan: Barcode scan
- voice: Voice command
```

### 3. Admin Features
- Global enable/disable for all users
- Per-category enable/disable
- Upload sounds to `/backend/public/sounds/`
- View all uploaded sounds with file info
- Set default sounds for each category
- Delete custom sounds (not defaults)
- Test all sounds with volume control

### 4. User Features
- Enable/disable sounds personally
- Adjust volume (0-100%)
- Select preferred sound for each category
- Test sounds before selecting
- See which sound is currently active
- Override admin settings (if allowed)

### 5. File Storage
**Location:** `/backend/public/sounds/`
**Structure:**
```
/backend/public/sounds/
  ├── defaults/
  │   ├── check.mp3
  │   ├── uncheck.mp3
  │   ├── pop.mp3
  │   └── ...
  └── custom/
      ├── user-uploaded-1.mp3
      └── ...
```

### 6. API Endpoints
```
GET    /api/sounds                    - Get all sounds
GET    /api/sounds/categories         - Get all categories
GET    /api/sounds/preferences        - Get user preferences
POST   /api/sounds/upload             - Upload new sound
DELETE /api/sounds/:id                - Delete sound
PUT    /api/sounds/preferences        - Update user preferences
GET    /api/sounds/global             - Get global settings (admin)
PUT    /api/sounds/global             - Update global settings (admin)
```

## Implementation Steps
1. ✅ Create enhanced database migration
2. ✅ Update backend API routes
3. ✅ Create enhanced SoundSettings component
4. ✅ Update soundManager utility
5. ✅ Add sound triggers throughout app
6. ✅ Test all functionality

## Files to Update
- `backend/migrations/038_enhanced_sound_system.sql` (NEW)
- `backend/src/routes/sounds.js` (UPDATE)
- `frontend/src/components/SoundSettings.js` (MAJOR UPDATE)
- `frontend/src/utils/soundEffects.js` (UPDATE)
- `frontend/src/services/soundsAPI.js` (UPDATE)
