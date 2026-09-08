# Food Icons Scripts

Scripts to download and optimize 3D food icons from https://food.getwicked.app

## Prerequisites

```bash
npm install puppeteer sharp
```

## Usage

### 1. Download Icons (Puppeteer Method - Recommended)

Downloads all food icons using Puppeteer to render JavaScript:

```bash
node scripts/download-food-icons-puppeteer.js
```

This will:
- Launch headless Chrome browser
- Navigate to each food page and wait for JavaScript to render
- Extract download links from the rendered page
- Download 400x400 PNG images to `public/food-icons/`
- Create `public/food-icons/icons-list.json` with metadata
- Categorize icons automatically
- Generate search keywords
- Show progress with file sizes

**Note:** First run will download Chromium (~170MB) for Puppeteer.

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
