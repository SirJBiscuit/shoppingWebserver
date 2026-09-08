/**
 * Learn prices from existing user data in the database
 * Creates a learned_prices.json file that the scraper can use
 * 
 * Usage: node scripts/learn-prices-from-db.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'shopuser',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'shopdb',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

const OUTPUT_FILE = path.join(__dirname, '../data/learned_prices.json');

async function learnPricesFromDatabase() {
  console.log('=== Learning Prices from Database ===\n');
  
  try {
    // Query to get average prices for each item from inventory
    const inventoryQuery = `
      SELECT 
        LOWER(TRIM(item_name)) as item_name,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        COUNT(*) as purchase_count
      FROM inventory
      WHERE price IS NOT NULL AND price > 0
      GROUP BY LOWER(TRIM(item_name))
      HAVING COUNT(*) >= 2
      ORDER BY purchase_count DESC
    `;
    
    const result = await pool.query(inventoryQuery);
    
    console.log(`Found ${result.rows.length} items with price data\n`);
    
    // Build learned prices object
    const learnedPrices = {};
    
    result.rows.forEach(row => {
      const itemName = row.item_name;
      const avgPrice = parseFloat(row.avg_price);
      const minPrice = parseFloat(row.min_price);
      const maxPrice = parseFloat(row.max_price);
      const count = parseInt(row.purchase_count);
      
      learnedPrices[itemName] = {
        average: Math.round(avgPrice * 100) / 100,
        min: Math.round(minPrice * 100) / 100,
        max: Math.round(maxPrice * 100) / 100,
        purchaseCount: count,
        lastUpdated: new Date().toISOString()
      };
      
      console.log(`${itemName}: $${avgPrice.toFixed(2)} (${count} purchases, range: $${minPrice.toFixed(2)}-$${maxPrice.toFixed(2)})`);
    });
    
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(learnedPrices, null, 2));
    
    console.log(`\n✓ Saved ${Object.keys(learnedPrices).length} learned prices to ${OUTPUT_FILE}`);
    console.log('\nTop 10 most purchased items:');
    
    const topItems = result.rows.slice(0, 10);
    topItems.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.item_name} - $${parseFloat(row.avg_price).toFixed(2)} (${row.purchase_count} purchases)`);
    });
    
  } catch (error) {
    console.error('Error learning prices:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Also learn from shopping list items
async function learnFromShoppingLists() {
  console.log('\n=== Learning from Shopping Lists ===\n');
  
  try {
    const shoppingQuery = `
      SELECT 
        LOWER(TRIM(item_name)) as item_name,
        AVG(CAST(price AS DECIMAL)) as avg_price,
        COUNT(*) as count
      FROM shopping_list_items
      WHERE price IS NOT NULL AND price != '' AND price != '0'
      GROUP BY LOWER(TRIM(item_name))
      HAVING COUNT(*) >= 1
    `;
    
    const result = await pool.query(shoppingQuery);
    
    console.log(`Found ${result.rows.length} items from shopping lists`);
    
    // Load existing learned prices
    let learnedPrices = {};
    if (fs.existsSync(OUTPUT_FILE)) {
      learnedPrices = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    }
    
    // Merge shopping list data
    result.rows.forEach(row => {
      const itemName = row.item_name;
      const avgPrice = parseFloat(row.avg_price);
      
      if (!learnedPrices[itemName]) {
        learnedPrices[itemName] = {
          average: Math.round(avgPrice * 100) / 100,
          min: Math.round(avgPrice * 100) / 100,
          max: Math.round(avgPrice * 100) / 100,
          purchaseCount: parseInt(row.count),
          source: 'shopping_list',
          lastUpdated: new Date().toISOString()
        };
      }
    });
    
    // Save updated file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(learnedPrices, null, 2));
    
    console.log(`✓ Total learned prices: ${Object.keys(learnedPrices).length}`);
    
  } catch (error) {
    console.error('Error learning from shopping lists:', error);
  }
}

// Run both learning functions
async function main() {
  try {
    await learnPricesFromDatabase();
    await learnFromShoppingLists();
    
    console.log('\n=== Learning Complete ===');
    console.log(`\nYou can now run the food icons scraper with learned prices!`);
    console.log(`node scripts/scrape-all-food-icons.js`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
