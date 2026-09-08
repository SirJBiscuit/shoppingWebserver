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

// Price estimation database (average US prices)
const PRICE_DATABASE = {
  // Produce
  'apple': 1.50, 'banana': 0.50, 'orange': 1.00, 'lemon': 0.75, 'lime': 0.50,
  'tomato': 1.50, 'potato': 0.75, 'onion': 0.50, 'garlic': 0.30, 'carrot': 0.75,
  'lettuce': 2.00, 'spinach': 3.00, 'broccoli': 2.50, 'cauliflower': 3.00,
  'pepper': 1.50, 'cucumber': 1.00, 'zucchini': 1.50, 'squash': 2.00,
  'avocado': 2.00, 'berries': 4.00, 'strawberry': 4.00, 'blueberry': 5.00,
  'raspberry': 5.00, 'blackberry': 5.00, 'grape': 3.00, 'watermelon': 5.00,
  'melon': 4.00, 'pineapple': 4.00, 'mango': 2.00, 'peach': 2.00, 'pear': 1.50,
  
  // Meat & Seafood
  'beef': 8.00, 'chicken': 5.00, 'pork': 6.00, 'turkey': 6.00, 'lamb': 10.00,
  'fish': 10.00, 'salmon': 12.00, 'tuna': 15.00, 'shrimp': 12.00, 'crab': 20.00,
  'lobster': 30.00, 'bacon': 7.00, 'sausage': 5.00, 'steak': 12.00,
  
  // Dairy
  'milk': 4.00, 'cheese': 5.00, 'butter': 4.00, 'yogurt': 5.00, 'cream': 4.00,
  'egg': 3.00, 'eggs': 3.00,
  
  // Grains & Pasta
  'bread': 3.00, 'rice': 2.00, 'pasta': 2.00, 'noodle': 2.00, 'flour': 3.00,
  'oat': 4.00, 'cereal': 4.00, 'tortilla': 3.00,
  
  // Condiments & Sauces
  'sauce': 3.00, 'vinegar': 3.00, 'oil': 5.00, 'salt': 2.00, 'pepper': 4.00,
  'spice': 4.00, 'herb': 3.00, 'mustard': 3.00, 'ketchup': 3.00, 'mayo': 4.00,
  
  // Beverages
  'coffee': 8.00, 'tea': 5.00, 'juice': 4.00, 'soda': 2.00, 'water': 1.00,
  
  // Canned/Packaged
  'beans': 1.50, 'soup': 2.00, 'can': 2.00,
  
  // Nuts & Seeds
  'almond': 10.00, 'walnut': 12.00, 'cashew': 10.00, 'peanut': 5.00,
  'pecan': 12.00, 'pistachio': 15.00,
  
  // Default
  'default': 3.00
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

// Estimate price
function estimatePrice(name) {
  const lower = name.toLowerCase();
  
  // Check each keyword in price database
  for (const [keyword, price] of Object.entries(PRICE_DATABASE)) {
    if (keyword !== 'default' && lower.includes(keyword)) {
      return price;
    }
  }
  
  return PRICE_DATABASE.default;
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
      const estimatedPrice = estimatePrice(itemName);
      
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
