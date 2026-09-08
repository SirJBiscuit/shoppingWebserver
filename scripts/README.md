# Food Icons Scripts

Scripts to download and optimize 3D food icons from https://food.getwicked.app

## Prerequisites

```bash
npm install sharp
```

## Usage

### 1. Download Icons

Downloads all food icons from the Wicked Food Collection:

```bash
node scripts/download-food-icons.js
```

This will:
- Download 400x400 PNG images to `public/food-icons/`
- Create `public/food-icons/icons-list.json` with metadata
- Categorize icons automatically
- Generate search keywords

### 2. Optimize Icons

Converts PNG to WebP and resizes to 200x200:

```bash
node scripts/optimize-food-icons.js
```

This will:
- Convert all PNG files to WebP format
- Resize from 400x400 to 200x200
- Save optimized images to `public/food-icons/optimized/`
- Update `icons-list.json` with WebP filenames
- Show compression statistics

### 3. Expected Results

- **Original size**: ~400KB per icon (400x400 PNG)
- **Optimized size**: ~20-40KB per icon (200x200 WebP)
- **Compression**: ~90% smaller
- **Total for 100 icons**: ~2-4MB instead of ~40MB

## Integration

After running both scripts, the icons can be used in the app:

1. **Database Migration**: Create `food_icon_library` table
2. **Seed Data**: Import `icons-list.json` into database
3. **Update Components**: Modify IconPicker and InventoryCard to use real images
4. **API Endpoint**: Create `/api/food-icons` to serve icon list

## Notes

- Icons are free to use from https://food.getwicked.app
- WebP format provides better compression than PNG
- Lazy loading recommended for performance
- Consider CDN for production deployment
