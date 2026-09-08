/**
 * Script to download food icons from https://food.getwicked.app
 * and optimize them for use in the app
 * 
 * Usage: node scripts/download-food-icons.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../public/food-icons');
const ICONS_LIST_FILE = path.join(__dirname, '../public/food-icons/icons-list.json');
const BASE_URL = 'https://food.getwicked.app';

// Food items list (from the website)
const foodItems = [
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
  'black-rice-vinegar', 'black-tea', 'black-tea-leaves'
  // Add more items here as needed
];

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created directory: ${OUTPUT_DIR}`);
}

// Download a single image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
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
        // Follow redirect
        downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

// Main download function
async function downloadAllIcons() {
  console.log(`Starting download of ${foodItems.length} food icons...`);
  
  const iconsList = [];
  let successCount = 0;
  let failCount = 0;
  
  for (const item of foodItems) {
    const itemName = item.replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // The image URL pattern (you may need to inspect the actual site to get the correct pattern)
    const imageUrl = `${BASE_URL}/food/${item}/image.png`;
    const filename = `${item}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    try {
      console.log(`Downloading: ${itemName}...`);
      await downloadImage(imageUrl, filepath);
      
      iconsList.push({
        name: itemName,
        slug: item,
        filename: filename,
        category: detectCategory(itemName),
        keywords: generateKeywords(itemName)
      });
      
      successCount++;
      console.log(`✓ Downloaded: ${itemName}`);
      
      // Add small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      failCount++;
      console.error(`✗ Failed to download ${itemName}: ${error.message}`);
    }
  }
  
  // Save icons list as JSON
  fs.writeFileSync(ICONS_LIST_FILE, JSON.stringify(iconsList, null, 2));
  
  console.log('\n=== Download Complete ===');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Icons list saved to: ${ICONS_LIST_FILE}`);
}

// Detect category from item name
function detectCategory(name) {
  const lower = name.toLowerCase();
  
  if (lower.includes('cheese') || lower.includes('milk') || lower.includes('yogurt')) {
    return 'Dairy & Eggs';
  }
  if (lower.includes('beef') || lower.includes('chicken') || lower.includes('pork') || 
      lower.includes('fish') || lower.includes('salmon') || lower.includes('tuna')) {
    return 'Meat & Seafood';
  }
  if (lower.includes('lettuce') || lower.includes('tomato') || lower.includes('pepper') ||
      lower.includes('onion') || lower.includes('carrot') || lower.includes('spinach')) {
    return 'Produce';
  }
  if (lower.includes('bread') || lower.includes('bagel') || lower.includes('baguette')) {
    return 'Bakery & Bread';
  }
  if (lower.includes('pasta') || lower.includes('rice') || lower.includes('grain')) {
    return 'Grains & Pasta';
  }
  if (lower.includes('sauce') || lower.includes('vinegar') || lower.includes('oil')) {
    return 'Condiments & Sauces';
  }
  
  return 'Other';
}

// Generate search keywords from item name
function generateKeywords(name) {
  const words = name.toLowerCase().split(' ');
  const keywords = [...words];
  
  // Add partial matches
  words.forEach(word => {
    if (word.length > 3) {
      keywords.push(word.substring(0, 3));
    }
  });
  
  return [...new Set(keywords)];
}

// Run the script
downloadAllIcons().catch(console.error);
