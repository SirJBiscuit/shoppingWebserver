/**
 * Simple icon downloader - uses direct URLs without Puppeteer
 * 
 * Since the food.getwicked.app site requires heavy JavaScript rendering,
 * this script uses a simpler approach with known URL patterns or
 * a manually curated list of direct image URLs.
 * 
 * Usage: node scripts/download-icons-simple.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../public/food-icons');
const ICONS_LIST_FILE = path.join(__dirname, '../public/food-icons/icons-list-complete.json');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Manual mapping of known food items to their direct image URLs
// You can populate this by manually visiting a few pages and copying the URLs
const MANUAL_URLS = {
  // Example format:
  // 'banana': 'https://directus.backend.getwicked.app/assets/UUID/banana.png',
  // Add more as you find them...
};

// Comprehensive food list
const FOOD_ITEMS = [
  'acai-berries', 'banana', 'apple', 'orange', 'strawberry', 'blueberry',
  'avocado', 'tomato', 'carrot', 'broccoli', 'spinach', 'lettuce',
  'chicken-breast-raw', 'beef-sirloin-steak-raw', 'salmon', 'eggs',
  'milk', 'cheese', 'butter', 'bread', 'rice', 'pasta',
  // Add more items as needed
];

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

async function downloadIcons() {
  console.log('=== Simple Icon Downloader ===\n');
  console.log('This script uses direct URLs for known food items.\n');
  
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  
  for (const slug of FOOD_ITEMS) {
    const filename = `${slug}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    // Skip if already exists
    if (fs.existsSync(filepath)) {
      console.log(`✓ ${slug} - Already exists`);
      skippedCount++;
      continue;
    }
    
    // Check if we have a manual URL
    if (MANUAL_URLS[slug]) {
      try {
        console.log(`Downloading ${slug}...`);
        await downloadImage(MANUAL_URLS[slug], filepath);
        successCount++;
        console.log(`  ✓ Downloaded\n`);
      } catch (error) {
        failCount++;
        console.error(`  ✗ Failed: ${error.message}\n`);
      }
    } else {
      console.log(`⚠ ${slug} - No URL mapping found (add to MANUAL_URLS)`);
      skippedCount++;
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Downloaded: ${successCount}`);
  console.log(`Skipped (already exist): ${skippedCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`\nTo add more icons:`);
  console.log(`1. Visit https://food.getwicked.app/food/{item-name}`);
  console.log(`2. Right-click the download button > Copy link address`);
  console.log(`3. Add to MANUAL_URLS in this script`);
  console.log(`4. Run again`);
}

console.log('\n=== ALTERNATIVE APPROACH ===\n');
console.log('The automated scraper is having issues with the JavaScript-heavy site.');
console.log('Here are your options:\n');
console.log('1. MANUAL DOWNLOAD (Recommended for now):');
console.log('   - Visit https://food.getwicked.app');
console.log('   - Browse to each food item you need');
console.log('   - Click the download button');
console.log('   - Save to public/food-icons/');
console.log('   - Name files as: {item-slug}.png (e.g., banana.png)\n');
console.log('2. USE EMOJI ICONS (Current system):');
console.log('   - Your app already has emoji icon detection');
console.log('   - Works well for most items');
console.log('   - No download needed\n');
console.log('3. WAIT FOR SITE FIX:');
console.log('   - The site may update their structure');
console.log('   - Try the scraper again later\n');
console.log('4. CONTACT SITE OWNER:');
console.log('   - Ask for bulk download access');
console.log('   - Or API access to their icon library\n');
console.log('For now, I recommend sticking with emoji icons until we can');
console.log('get reliable access to the 3D icons.\n');

// Uncomment to run the simple downloader
// downloadIcons().catch(console.error);
