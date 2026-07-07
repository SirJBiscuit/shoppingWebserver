const fs = require('fs');
const path = require('path');
const db = require('./db');

async function migrateV2() {
  try {
    console.log('Running v2 database migrations...');
    
    const schemaPath = path.join(__dirname, 'schema-v2.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await db.query(schema);
    
    console.log('✅ v2 migrations completed successfully!');
    console.log('New tables created:');
    console.log('  - categories (with 13 default categories)');
    console.log('  - item_metadata (with 40+ common items)');
    console.log('  - images');
    console.log('  - recipes');
    console.log('  - recipe_ingredients');
    console.log('  - pantry_inventory');
    console.log('  - receipts');
    console.log('  - receipt_items');
    console.log('  - store_prices');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateV2();
