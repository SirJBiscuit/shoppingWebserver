#!/bin/bash

# Run all database migrations in order
echo "Running all database migrations..."

cd /opt/cloudmc-shop

# Get list of all migration files in order
for file in $(ls -1 backend/migrations/*.sql | sort -V); do
  filename=$(basename "$file")
  echo "Running migration: $filename"
  
  # Run migration and capture errors
  docker-compose exec -T postgres psql -U shopuser -d shopdb < "$file" 2>&1 | \
    grep -v "already exists" | \
    grep -v "does not exist, skipping" | \
    grep -v "NOTICE" | \
    grep "ERROR" || true
done

echo "Migrations complete!"
echo ""
echo "Verifying tables..."
docker-compose exec postgres psql -U shopuser -d shopdb -c "\dt" | grep -E "shopping|users|mdl|categories|pantry|feature"

echo ""
echo "Creating admin user if not exists..."
docker-compose exec backend node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const check = await pool.query('SELECT id FROM users WHERE username = \$1', ['guy69']);
    if (check.rows.length === 0) {
      const hash = await bcrypt.hash('cpwe256!', 10);
      await pool.query(
        'INSERT INTO users (username, email, password_hash, is_admin) VALUES (\$1, \$2, \$3, \$4)',
        ['guy69', 'guy69@listzy.app', hash, true]
      );
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists');
    }
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
"

echo ""
echo "Done! Your database is ready."
