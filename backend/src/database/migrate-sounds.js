require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');

const migrationPath = path.join(__dirname, '../../migrations/add_sound_system.sql');

async function migrate() {
  try {
    console.log('Connected to database');
    console.log('Running sound system migration...');
    
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    await db.query(migration);
    
    console.log('✅ Sound system migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrate()
  .then(() => {
    console.log('All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
