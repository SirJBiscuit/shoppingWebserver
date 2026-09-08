/**
 * Complete food icons scraper with automatic categorization and price estimation
 * 
 * This script:
 * 1. Scrapes the main page to get ALL food items
 * 2. Downloads all food icons using Puppeteer
 * 3. Automatically categorizes each item
 * 4. Estimates common prices based on item type
 * 5. Creates a complete database-ready JSON file
 * 
 * Usage: npm install puppeteer
 *        node scripts/scrape-all-food-icons.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  console.error('ERROR: puppeteer module not found!');
  console.error('Please install it with: npm install puppeteer');
  process.exit(1);
}

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../public/food-icons');
const ICONS_LIST_FILE = path.join(__dirname, '../public/food-icons/icons-list-complete.json');
const BASE_URL = 'https://food.getwicked.app';

// Price estimation - will be populated from learned_prices.json if it exists
// Otherwise uses category-based defaults
let PRICE_DATABASE = {};

// Load learned prices from file if it exists
const LEARNED_PRICES_FILE = path.join(__dirname, '../data/learned_prices.json');
try {
  if (fs.existsSync(LEARNED_PRICES_FILE)) {
    PRICE_DATABASE = JSON.parse(fs.readFileSync(LEARNED_PRICES_FILE, 'utf8'));
    console.log(`Loaded ${Object.keys(PRICE_DATABASE).length} learned prices from database`);
  }
} catch (error) {
  console.log('No learned prices found, will use category-based estimates');
}

// Category-based price ranges (fallback when no specific price is known)
const CATEGORY_PRICE_RANGES = {
  'Produce': { min: 0.50, max: 5.00, default: 2.00 },
  'Meat & Seafood': { min: 5.00, max: 30.00, default: 10.00 },
  'Dairy & Eggs': { min: 2.00, max: 8.00, default: 4.00 },
  'Bakery & Bread': { min: 2.00, max: 6.00, default: 3.50 },
  'Grains & Pasta': { min: 1.50, max: 5.00, default: 2.50 },
  'Condiments & Sauces': { min: 2.00, max: 8.00, default: 4.00 },
  'Beverages': { min: 1.00, max: 10.00, default: 4.00 },
  'Frozen Foods': { min: 3.00, max: 10.00, default: 5.00 },
  'Canned & Packaged': { min: 1.00, max: 5.00, default: 2.50 },
  'Snacks & Sweets': { min: 2.00, max: 15.00, default: 5.00 },
  'Other': { min: 1.00, max: 10.00, default: 3.00 }
};

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Download image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(filepath);
        });
        fileStream.on('error', (err) => {
          fs.unlink(filepath, () => {});
          reject(err);
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

// Scrape all food items from main page
async function scrapeAllFoodItems(page) {
  console.log('Scraping main page for all food items...');
  
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Wait for food links to load
  await page.waitForSelector('a[href*="/food/"]', { timeout: 10000 });
  
  // Extract all food item slugs
  const foodSlugs = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/food/"]'));
    const slugs = links
      .map(link => {
        const match = link.href.match(/\/food\/([^/?#]+)/);
        return match ? match[1] : null;
      })
      .filter(slug => slug && slug !== '');
    
    // Remove duplicates
    return [...new Set(slugs)];
  });
  
  console.log(`Found ${foodSlugs.length} unique food items\n`);
  return foodSlugs;
}

// Get image URL from food page
async function getImageUrl(page, slug) {
  const url = `${BASE_URL}/food/${slug}`;
  
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('a[href*="download"]', { timeout: 10000 });
  
  const downloadUrl = await page.evaluate(() => {
    const link = document.querySelector('a[href*="download"]');
    return link ? link.href : null;
  });
  
  if (downloadUrl) {
    return downloadUrl.replace('?download', '');
  }
  
  throw new Error('Download link not found');
}

// Categorize food item
function categorizeFood(name) {
  const lower = name.toLowerCase();
  
  // Dairy & Eggs
  if (lower.match(/cheese|milk|yogurt|cream|butter|egg/)) {
    return 'Dairy & Eggs';
  }
  
  // Meat & Seafood
  if (lower.match(/beef|chicken|pork|turkey|lamb|duck|bacon|sausage|ham|steak|ribs|brisket/)) {
    return 'Meat & Seafood';
  }
  if (lower.match(/fish|salmon|tuna|cod|tilapia|trout|bass|catfish|halibut|sardine|anchov/)) {
    return 'Meat & Seafood';
  }
  if (lower.match(/shrimp|crab|lobster|mussel|oyster|clam|scallop|squid|octopus/)) {
    return 'Meat & Seafood';
  }
  
  // Produce - Vegetables
  if (lower.match(/lettuce|spinach|kale|arugula|cabbage|broccoli|cauliflower|brussels/)) {
    return 'Produce';
  }
  if (lower.match(/carrot|celery|cucumber|zucchini|squash|pumpkin|eggplant|asparagus/)) {
    return 'Produce';
  }
  if (lower.match(/tomato|pepper|onion|garlic|ginger|potato|sweet potato|yam|beet|radish/)) {
    return 'Produce';
  }
  if (lower.match(/mushroom|corn|pea|bean(?!s\s*(canned|dry))/)) {
    return 'Produce';
  }
  
  // Produce - Fruits
  if (lower.match(/apple|banana|orange|lemon|lime|grapefruit|tangerine/)) {
    return 'Produce';
  }
  if (lower.match(/berry|berries|strawberry|blueberry|raspberry|blackberry|cranberry/)) {
    return 'Produce';
  }
  if (lower.match(/grape|melon|watermelon|cantaloupe|honeydew/)) {
    return 'Produce';
  }
  if (lower.match(/peach|pear|plum|apricot|nectarine|cherry|cherries/)) {
    return 'Produce';
  }
  if (lower.match(/mango|pineapple|papaya|kiwi|avocado|coconut/)) {
    return 'Produce';
  }
  
  // Bakery & Bread
  if (lower.match(/bread|baguette|bagel|roll|bun|croissant|muffin|donut|pastry/)) {
    return 'Bakery & Bread';
  }
  if (lower.match(/tortilla|pita|naan|flatbread|brioche|challah/)) {
    return 'Bakery & Bread';
  }
  
  // Grains & Pasta
  if (lower.match(/rice|pasta|noodle|spaghetti|linguine|penne|macaroni|ramen/)) {
    return 'Grains & Pasta';
  }
  if (lower.match(/flour|oat|quinoa|barley|wheat|grain|cereal/)) {
    return 'Grains & Pasta';
  }
  
  // Condiments & Sauces
  if (lower.match(/sauce|salsa|dressing|marinade|gravy/)) {
    return 'Condiments & Sauces';
  }
  if (lower.match(/vinegar|oil|mustard|ketchup|mayo|relish|pickle/)) {
    return 'Condiments & Sauces';
  }
  if (lower.match(/salt|pepper|spice|herb|seasoning|cumin|paprika|oregano|basil|thyme/)) {
    return 'Condiments & Sauces';
  }
  
  // Beverages
  if (lower.match(/coffee|tea|juice|soda|water|latte|espresso|cappuccino|americano/)) {
    return 'Beverages';
  }
  if (lower.match(/drink|beverage|smoothie|shake|boba/)) {
    return 'Beverages';
  }
  
  // Frozen Foods
  if (lower.match(/frozen|ice cream|popsicle|sorbet/)) {
    return 'Frozen Foods';
  }
  
  // Canned & Packaged
  if (lower.match(/canned|can\s|dry\s|dried/)) {
    return 'Canned & Packaged';
  }
  if (lower.match(/beans\s*(canned|dry)|lentils|chickpea/)) {
    return 'Canned & Packaged';
  }
  
  // Snacks & Sweets
  if (lower.match(/chip|cracker|cookie|candy|chocolate|cake|pie/)) {
    return 'Snacks & Sweets';
  }
  if (lower.match(/nut|almond|walnut|cashew|peanut|pecan|pistachio/)) {
    return 'Snacks & Sweets';
  }
  
  return 'Other';
}

// Estimate price based on learned data or category
function estimatePrice(name, category) {
  const lower = name.toLowerCase();
  
  // First, check if we have a learned price for this exact item
  if (PRICE_DATABASE[lower]) {
    return PRICE_DATABASE[lower];
  }
  
  // Second, check for partial matches in learned prices
  for (const [keyword, price] of Object.entries(PRICE_DATABASE)) {
    if (lower.includes(keyword) || keyword.includes(lower)) {
      return price;
    }
  }
  
  // Finally, use category-based default
  const categoryRange = CATEGORY_PRICE_RANGES[category] || CATEGORY_PRICE_RANGES['Other'];
  return categoryRange.default;
}

// Generate keywords
function generateKeywords(name) {
  const words = name.toLowerCase()
    .replace(/[()]/g, '')
    .split(/[\s-]+/)
    .filter(w => w.length > 2);
  
  const keywords = [...words];
  
  // Add partial matches for longer words
  words.forEach(word => {
    if (word.length > 4) {
      keywords.push(word.substring(0, 4));
    }
  });
  
  return [...new Set(keywords)];
}

// Main function
async function scrapeAllFoodIcons() {
  console.log('=== Food Icons Complete Scraper ===\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Step 1: Get all food items
  const foodSlugs = await scrapeAllFoodItems(page);
  
  // Step 2: Download icons and build database
  const iconsList = [];
  let successCount = 0;
  let failCount = 0;
  
  console.log('Starting downloads...\n');
  
  for (let i = 0; i < foodSlugs.length; i++) {
    const slug = foodSlugs[i];
    const itemName = slug.replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    const filename = `${slug}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    try {
      console.log(`[${i + 1}/${foodSlugs.length}] ${itemName}`);
      
      const imageUrl = await getImageUrl(page, slug);
      await downloadImage(imageUrl, filepath);
      
      const stats = fs.statSync(filepath);
      const category = categorizeFood(itemName);
      const estimatedPrice = estimatePrice(itemName, category);
      
      iconsList.push({
        name: itemName,
        slug: slug,
        filename: filename,
        category: category,
        estimatedPrice: estimatedPrice,
        keywords: generateKeywords(itemName),
        imageUrl: imageUrl,
        size: stats.size
      });
      
      successCount++;
      console.log(`  ✓ ${category} - $${estimatedPrice.toFixed(2)}\n`);
      
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      failCount++;
      console.error(`  ✗ ${error.message}\n`);
    }
  }
  
  await browser.close();
  
  // Save complete database
  fs.writeFileSync(ICONS_LIST_FILE, JSON.stringify(iconsList, null, 2));
  
  // Generate category summary
  const categorySummary = iconsList.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n=== Complete ===');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total size: ${(iconsList.reduce((sum, i) => sum + i.size, 0) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`\nCategory breakdown:`);
  Object.entries(categorySummary)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));
  console.log(`\nSaved to: ${ICONS_LIST_FILE}`);
  console.log(`\nNext: Run 'node scripts/optimize-food-icons.js' to compress images`);
}

scrapeAllFoodIcons().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
