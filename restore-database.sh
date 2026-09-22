#!/bin/bash

# Restore database from backup
BACKUP_DIR="/opt/cloudmc-shop/backups"

if [ -z "$1" ]; then
  echo "Usage: ./restore-database.sh <backup-file>"
  echo ""
  echo "Available backups:"
  ls -lh "$BACKUP_DIR"/shopdb_backup_*.sql 2>/dev/null || echo "No backups found"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will ERASE the current database and restore from backup!"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "Dropping existing database..."
docker-compose exec -T postgres psql -U shopuser -d postgres -c "DROP DATABASE IF EXISTS shopdb;"

echo "Creating new database..."
docker-compose exec -T postgres psql -U shopuser -d postgres -c "CREATE DATABASE shopdb OWNER shopuser;"

echo "Restoring from backup..."
docker-compose exec -T postgres psql -U shopuser -d shopdb < "$BACKUP_FILE"

echo "Restore complete!"
echo "Restarting backend..."
docker-compose restart backend

echo "Done!"
