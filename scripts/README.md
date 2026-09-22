# Scripts

Various utility scripts for the shopping app.

## Server Maintenance

### server-update.sh

Comprehensive server update and maintenance script.

**Usage:**
```bash
# On the server
cd /opt/cloudmc-shop
sudo ./scripts/server-update.sh
```

**What it does:**
- Updates all system packages (apt update & upgrade)
- Performs full distribution upgrade
- Removes unused packages and cleans cache
- Updates Docker and Docker Compose
- Cleans up Docker images and containers
- Checks disk space and memory usage
- Checks if reboot is required
- Shows running Docker containers
- Prompts to reboot if needed

**When to run:**
- Monthly maintenance
- Before major deployments
- After kernel updates
- When system feels slow

---

## Food Icons Scripts

Scripts to download and optimize 3D food icons from https://food.getwicked.app

## Prerequisites

```bash
npm install puppeteer sharp
```

## Usage

### 1. Learn Prices from Your Database (Optional but Recommended)

Before downloading icons, learn prices from your existing user data:

```bash
node scripts/learn-prices-from-db.js
```

This will:
- Query your inventory and shopping list tables
- Calculate average prices for each item
- Save learned prices to `data/learned_prices.json`
- Use this data for better price estimation

**Note:** Skip this step if you don't have existing data yet. The scraper will use category-based defaults.

### 2. Download All Food Icons with Auto-Categorization

Download ALL food icons from the site with automatic categorization and pricing:

```bash
node scripts/scrape-all-food-icons.js
```

This will:
- Scrape the main page to find ALL food items (100s of items)
- Download each icon using Puppeteer
- Auto-categorize into proper categories
- Estimate prices using learned data or category defaults
- Generate keywords for search
- Save to `public/food-icons/icons-list-complete.json`

### 3. Download Icons (Puppeteer Method - Recommended)

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
