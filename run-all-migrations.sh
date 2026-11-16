#!/bin/bash

# Run all pending database migrations.
#
# Delegates to the shared tracked runner inside the backend container —
# each file in backend/migrations/ runs exactly once, recorded in the
# schema_migrations table (the same table server.js uses at boot, so the
# two never double-apply a file). To add a migration: drop a numbered
# .sql file into backend/migrations/ — nothing else to wire up.

cd /opt/cloudmc-shop 2>/dev/null || cd "$(dirname "$0")"

echo "Running pending database migrations..."
docker exec shop_backend node src/database/runMigrations.js \
  || echo "⚠ Migration runner reported failures — check output above"

echo ""
echo "Migrations complete!"
echo ""
echo "Verifying tables..."
docker exec shop_postgres psql -U shopuser -d shopdb -c "\dt" | grep -E "shopping|users|mdl|categories|pantry|feature|beta|schema_migrations" || true

echo ""
echo "Creating admin user if not exists..."
docker exec shop_backend node -e "
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
