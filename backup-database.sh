#!/bin/bash

# Backup the entire database
BACKUP_DIR="/opt/cloudmc-shop/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/shopdb_backup_$TIMESTAMP.sql"

echo "Creating backup directory..."
mkdir -p "$BACKUP_DIR"

echo "Backing up database to: $BACKUP_FILE"
docker-compose exec -T postgres pg_dump -U shopuser shopdb > "$BACKUP_FILE"

echo "Backup complete!"
echo "File: $BACKUP_FILE"
echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Keep only last 10 backups
echo "Cleaning old backups (keeping last 10)..."
ls -t "$BACKUP_DIR"/shopdb_backup_*.sql | tail -n +11 | xargs -r rm

echo "Done!"
