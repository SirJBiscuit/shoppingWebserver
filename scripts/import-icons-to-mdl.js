/**
 * Import scraped food icons into the MDL (Massive Data List) system
 * 
 * This script:
 * 1. Reads icons-list-complete.json
 * 2. Imports all products into product_master_data table
 * 3. Sets up initial price data
 * 4. Makes icons available throughout the app
 * 
 * Usage: node scripts/import-icons-to-mdl.js
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

const ICONS_FILE = path.join(__dirname, '../public/food-icons/icons-list-complete.json');

async function importIconsToMDL() {
  console.log('=== Importing Food Icons to MDL System ===\n');
  
  // Check if icons file exists
  if (!fs.existsSync(ICONS_FILE)) {
    console.error(`Error: ${ICONS_FILE} not found!`);
    console.error('Please run: node scripts/scrape-all-food-icons.js first');
    process.exit(1);
  }
  
  // Load icons data
  const iconsData = JSON.parse(fs.readFileSync(ICONS_FILE, 'utf8'));
  console.log(`Loaded ${iconsData.length} products from icons file\n`);
  
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  
  try {
    for (const product of iconsData) {
      try {
        // Check if product already exists
        const existingProduct = await pool.query(
          'SELECT id FROM product_master_data WHERE slug = $1',
          [product.slug]
        );
        
        if (existingProduct.rows.length > 0) {
          // Update existing product
          await pool.query(`
            UPDATE product_master_data SET
              product_name = $1,
              category = $2,
              average_price = $3,
              icon_image_url = $4,
              icon_filename = $5,
              keywords = $6,
              updated_at = CURRENT_TIMESTAMP
            WHERE slug = $7
          `, [
            product.name,
            product.category,
            product.estimatedPrice,
            product.imageUrl,
            product.filename.replace('.png', '.webp'), // Use optimized version
            product.keywords,
            product.slug
          ]);
          
          updated++;
          console.log(`✓ Updated: ${product.name}`);
        } else {
          // Insert new product
          const result = await pool.query(`
            INSERT INTO product_master_data (
              product_name, slug, category,
              average_price, default_price_low, default_price_high,
              icon_image_url, icon_filename,
              keywords, times_purchased
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0)
            RETURNING id
          `, [
            product.name,
            product.slug,
            product.category,
            product.estimatedPrice,
            product.estimatedPrice * 0.8, // 20% below average
            product.estimatedPrice * 1.2, // 20% above average
            product.imageUrl,
            product.filename.replace('.png', '.webp'),
            product.keywords
          ]);
          
          // Add initial price history entry
          await pool.query(`
            INSERT INTO mdl_price_history (product_id, price, source)
            VALUES ($1, $2, 'initial_import')
          `, [result.rows[0].id, product.estimatedPrice]);
          
          imported++;
          console.log(`✓ Imported: ${product.name} ($${product.estimatedPrice.toFixed(2)})`);
        }
      } catch (error) {
        skipped++;
        console.error(`✗ Failed to import ${product.name}:`, error.message);
      }
    }
    
    console.log('\n=== Import Complete ===');
    console.log(`Imported: ${imported}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total in MDL: ${imported + updated}`);
    
    // Show category breakdown
    const categoryStats = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM product_master_data
      GROUP BY category
      ORDER BY count DESC
    `);
    
    console.log('\nCategory breakdown:');
    categoryStats.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count}`);
    });
    
    // Show sample products
    console.log('\nSample products:');
    const samples = await pool.query(`
      SELECT product_name, category, average_price, icon_filename
      FROM product_master_data
      ORDER BY RANDOM()
      LIMIT 5
    `);
    
    samples.rows.forEach(row => {
      console.log(`  ${row.product_name} (${row.category}) - $${parseFloat(row.average_price).toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

importIconsToMDL().catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});
