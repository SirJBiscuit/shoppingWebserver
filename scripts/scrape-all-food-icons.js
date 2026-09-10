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
  
  try {
    await page.goto(BASE_URL, { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });
    
    // Wait a bit for JavaScript to render
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to wait for links, but don't fail if timeout
    try {
      await page.waitForSelector('a[href*="/food/"]', { timeout: 5000 });
    } catch (e) {
      console.log('Timeout waiting for links, trying anyway...');
    }
    
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
    
    if (foodSlugs.length === 0) {
      console.log('No food links found on main page.');
      console.log('The site structure may have changed or requires different selectors.');
      console.log('Falling back to hardcoded list...\n');
      
      // Return a comprehensive hardcoded list as fallback
      return getHardcodedFoodList();
    }
    
    console.log(`Found ${foodSlugs.length} unique food items\n`);
    return foodSlugs;
  } catch (error) {
    console.error('Error scraping main page:', error.message);
    console.log('Using hardcoded food list as fallback...\n');
    return getHardcodedFoodList();
  }
}

// Hardcoded comprehensive food list (fallback)
function getHardcodedFoodList() {
  return [
    'acai-berries', 'acerola-cherries', 'achar-indian-mango-pickle', 'acorn-squash',
    'agave-nectar', 'alfalfa-sprouts', 'almond-butter', 'almond-milk', 'almonds',
    'amaranth', 'amber-nameko-mushrooms', 'american-cheese-slices', 'americano-iced',
    'amla-indian-gooseberry', 'anaheim-pepper', 'anchovies-dried', 'anchovies-fresh',
    'angel-hair-pasta', 'apple-freeze-dried-slices', 'apple-cider-vinegar', 'applesauce',
    'apricot', 'arbol-peppers', 'arctic-char-fillet-raw', 'aronia-berries',
    'artichoke-heart', 'arugula', 'asiago-cheese', 'asparagus', 'avocado',
    'baby-corn', 'bacon-bits', 'bacon-strips-raw', 'baguette', 'balsamic-vinegar',
    'banana', 'banana-overripe', 'banana-pepper', 'barberries', 'basa-fillet-raw',
    'basil', 'basil-dried', 'bay-leaf', 'beef-brisket-raw', 'beef-ribs-raw',
    'beef-roast-raw', 'beef-sausage', 'beef-short-ribs-raw', 'beef-shoulder-raw',
    'beef-sirloin-steak-raw', 'beets', 'belgian-endive', 'black-bean-garlic-sauce',
    'black-beans-canned', 'black-beans-dry', 'black-cardamom', 'black-caviar',
    'black-cod-sablefish-fillet-raw', 'black-gram-sabut-urad', 'black-mustard-seeds',
    'black-olives', 'black-pepper-grinder', 'black-peppercorns', 'black-raspberry',
    'black-rice-vinegar', 'black-tea', 'black-tea-leaves', 'black-truffle',
    'black-eyed-peas-lobia', 'blackberry', 'blackcurrant', 'blackeye-peas-canned',
    'blackeye-peas-dry', 'blue-corn', 'blue-corn-tortillas', 'blue-mussels',
    'blueberries', 'blueberry-freeze-dried', 'blueberry-muffin', 'boba-drink',
    'bocconcini-cheese', 'bok-choy', 'boletus-mushroom', 'boysenberry', 'branzino',
    'bread-crumbs', 'bread-slice', 'breadstick', 'breakfast-sausage-patties',
    'brie-cheese', 'brioche-bread', 'broccoli', 'brown-button-mushroom',
    'brown-chickpeas-kala-chana', 'brown-coconut', 'brown-egg', 'brown-lentils',
    'brown-mustard-seeds', 'brown-rice-bowl', 'brussels-sprouts', 'burrata-cheese',
    'butter', 'butter-lettuce', 'buttermilk', 'butternut-squash', 'cabbage',
    'caesars-mushroom', 'caffe-latte-iced', 'calamansi', 'camembert-cheese',
    'canadian-bacon', 'candy-cap-mushrooms', 'cannellini-beans-canned',
    'cannellini-beans-dry', 'cantaloupe', 'capers', 'caramel-sauce',
    'carolina-reaper-pepper', 'carp-fish', 'carrot', 'cashews', 'catfish-fillet-raw',
    'cauliflower', 'cayenne-pepper', 'cayenne-pepper-powder', 'celeriac-root',
    'celery', 'celery-salt', 'celery-seeds', 'cellophane-glass-noodles',
    'challah-bread', 'cheddar-cheese', 'cheese', 'cherries', 'cherry-freeze-dried',
    'chestnut-mushrooms', 'chicken-breast-raw', 'chicken-drumstick-raw',
    'chicken-thigh-raw', 'chicken-wings-raw', 'chickpeas-canned', 'chickpeas-dry',
    'chili-powder', 'chinese-cabbage', 'chives', 'chocolate-chips', 'chorizo',
    'cilantro', 'cinnamon-sticks', 'clams', 'coconut-milk', 'coconut-oil', 'cod-fillet-raw',
    'coffee-beans', 'collard-greens', 'corn', 'cottage-cheese', 'crab-legs',
    'cranberries', 'cream-cheese', 'cucumber', 'cumin-seeds', 'curry-powder'
  ];
}

// Get image URL from food page
async function getImageUrl(page, slug) {
  const url = `${BASE_URL}/food/${slug}`;
  
  try {
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    
    // Wait for page to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try multiple selectors
    const downloadUrl = await page.evaluate(() => {
      // Try different selectors for the download link
      let link = document.querySelector('a[href*="download"]');
      if (!link) link = document.querySelector('a[href*="directus"]');
      if (!link) link = document.querySelector('a[href*="assets"]');
      if (!link) {
        // Try to find any link with .png
        const allLinks = Array.from(document.querySelectorAll('a'));
        link = allLinks.find(a => a.href.includes('.png'));
      }
      
      return link ? link.href : null;
    });
    
    if (downloadUrl) {
      // Remove ?download parameter if present
      return downloadUrl.replace('?download', '');
    }
    
    // If still not found, try to construct URL from slug
    // The pattern is: https://directus.backend.getwicked.app/assets/{uuid}/{slug}.png
    throw new Error('Download link not found on page');
    
  } catch (error) {
    throw new Error(`Failed to get image URL: ${error.message}`);
  }
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
  
  // Step 2: DOWNLOAD PHASE - Just get the images fast
  console.log('=== PHASE 1: Downloading Images ===\n');
  console.log('Priority: Getting all icons downloaded first\n');
  
  const downloadResults = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < foodSlugs.length; i++) {
    const slug = foodSlugs[i];
    const itemName = slug.replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    const filename = `${slug}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    // Skip if already downloaded
    if (fs.existsSync(filepath)) {
      console.log(`[${i + 1}/${foodSlugs.length}] ${itemName} - ✓ Already exists`);
      downloadResults.push({ slug, itemName, filename, success: true, existing: true });
      successCount++;
      continue;
    }
    
    let retries = 2;
    let success = false;
    let imageUrl = null;
    
    while (retries > 0 && !success) {
      try {
        console.log(`[${i + 1}/${foodSlugs.length}] ${itemName}${retries < 2 ? ' (retry)' : ''}`);
        
        imageUrl = await getImageUrl(page, slug);
        await downloadImage(imageUrl, filepath);
        
        successCount++;
        console.log(`  ✓ Downloaded\n`);
        success = true;
        
        downloadResults.push({ slug, itemName, filename, imageUrl, success: true });
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        retries--;
        if (retries === 0) {
          failCount++;
          console.error(`  ✗ ${error.message}\n`);
          downloadResults.push({ slug, itemName, filename, success: false, error: error.message });
        } else {
          console.log(`  ⚠ ${error.message}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }
  
  await browser.close();
  
  console.log('\n=== PHASE 1 Complete ===');
  console.log(`Downloaded: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  
  // Step 3: METADATA PHASE - Process all downloaded images
  console.log('\n=== PHASE 2: Processing Metadata ===\n');
  
  const iconsList = [];
  
  for (const result of downloadResults) {
    if (!result.success) continue;
    
    try {
      const filepath = path.join(OUTPUT_DIR, result.filename);
      const stats = fs.statSync(filepath);
      const category = categorizeFood(result.itemName);
      const estimatedPrice = estimatePrice(result.itemName, category);
      
      iconsList.push({
        name: result.itemName,
        slug: result.slug,
        filename: result.filename,
        category: category,
        estimatedPrice: estimatedPrice,
        keywords: generateKeywords(result.itemName),
        imageUrl: result.imageUrl || '',
        size: stats.size
      });
      
      console.log(`✓ ${result.itemName} - ${category} - $${estimatedPrice.toFixed(2)}`);
    } catch (error) {
      console.error(`✗ Failed to process ${result.itemName}: ${error.message}`);
    }
  }
  
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
