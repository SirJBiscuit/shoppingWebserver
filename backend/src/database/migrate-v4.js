const fs = require('fs');
const path = require('path');
const db = require('./db');

async function migrateV4() {
  try {
    console.log('Running v4 database migrations...');
    
    const schemaPath = path.join(__dirname, 'schema-v4.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await db.query(schema);
    
    console.log('✅ v4 migrations completed successfully!');
    console.log('New features:');
    console.log('  - Smart cart packing rules system');
    console.log('  - User preferences (dark mode, auto-sort, etc.)');
    console.log('  - Default packing rules (cold last, eggs separate, etc.)');
    console.log('  - Bag organization and packing order');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateV4();
