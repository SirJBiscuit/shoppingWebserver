const fs = require('fs');
const path = require('path');
const db = require('./db');

async function migrateV3() {
  try {
    console.log('Running v3 database migrations...');
    
    const schemaPath = path.join(__dirname, 'schema-v3.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await db.query(schema);
    
    console.log('✅ v3 migrations completed successfully!');
    console.log('New features:');
    console.log('  - Tags support for items');
    console.log('  - User item preferences (remembers icon/tag choices)');
    console.log('  - Auto-tagging for existing items');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateV3();
