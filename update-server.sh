#!/bin/bash

# CloudMC Shop - Server Update Script
# This script pulls the latest code and rebuilds the application

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Real progress for the maintenance page — the file is bind-mounted into the
# placeholder nginx, and updating.html polls it for "step|total|label".
TOTAL_STEPS=6
CURRENT_STEP="starting up"
progress() { CURRENT_STEP="$2"; echo "$1|$TOTAL_STEPS|$2" > maintenance/progress.txt 2>/dev/null || true; }

# If the script dies mid-update (build error, disk full, OOM), don't leave
# visitors staring at "updating" forever: flag the failure in progress.txt
# (updating.html renders the interrupted state), alert via the watchdog,
# and try to restore the previous stack — old images survive a failed
# build, so `up -d` brings the site back without a rebuild.
restore_on_fail() {
  code=$?
  [ $code -eq 0 ] && return 0
  echo "fail|$TOTAL_STEPS|$CURRENT_STEP" > maintenance/progress.txt 2>/dev/null || true
  echo -e "${RED}Update failed during: $CURRENT_STEP — attempting to restore the previous version...${NC}"
  ./watchdog.sh --alert "Listzy update FAILED" "Failed during: $CURRENT_STEP — restoring the previous version." "warning" 5 2>/dev/null || true
  docker compose -f docker-compose.maintenance.yml down 2>/dev/null || true
  docker compose up -d 2>/dev/null || true
  exit $code
}
trap restore_on_fail EXIT

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  CloudMC Shop - Update Script${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Navigate to project directory
cd /opt/cloudmc-shop

# Stash any local changes
echo -e "${YELLOW}Stashing local changes...${NC}"
git stash

# Pull latest code
echo -e "${YELLOW}Pulling latest code from GitHub...${NC}"
BEFORE_COMMIT=$(git rev-parse HEAD)
git pull origin main

# If pull fails, force reset
if [ $? -ne 0 ]; then
    echo -e "${RED}Pull failed, forcing reset to origin/main...${NC}"
    git fetch origin
    git reset --hard origin/main
fi

# Show what was updated
AFTER_COMMIT=$(git rev-parse HEAD)
if [ "$BEFORE_COMMIT" != "$AFTER_COMMIT" ]; then
    echo -e "${GREEN}✓ Code updated successfully!${NC}"
    echo -e "${CYAN}Recent changes:${NC}"
    git log --oneline --no-decorate "$BEFORE_COMMIT..$AFTER_COMMIT" | head -5
    echo ""
else
    echo -e "${GREEN}✓ Already up to date${NC}"
fi

# Save current commit hash to version file
echo -e "${YELLOW}Saving version information...${NC}"
CURRENT_COMMIT=$(git rev-parse HEAD)

# Notes baseline — the commit that was actually DEPLOYED last (version.json
# "current"), not HEAD: a `git pull` before this script leaves BEFORE==AFTER
# and the "In this update" list would come out empty.
LAST_DEPLOYED=$(grep -o '"current"[^,}]*' version.json 2>/dev/null | grep -o '[0-9a-f]\{7,\}' | head -1 || true)
NOTES_FROM="$BEFORE_COMMIT"
if [ -n "$LAST_DEPLOYED" ] && [ "$LAST_DEPLOYED" != "$CURRENT_COMMIT" ] \
   && git cat-file -e "${LAST_DEPLOYED}^{commit}" 2>/dev/null; then
    NOTES_FROM="$LAST_DEPLOYED"
fi

# What this update adds — shown on the maintenance page, in the update
# banner, and via /api/version. Range is last-deployed..HEAD, JSON-escaped
# for version.json; still-empty range (fresh clone) → newest commits, which
# is always better than the placeholder.
CHANGES=$(git log --no-merges --pretty=format:'%h %s' "$NOTES_FROM..$CURRENT_COMMIT" 2>/dev/null | head -8 || true)
[ -z "$CHANGES" ] && CHANGES=$(git log --no-merges --pretty=format:'%h %s' -8 HEAD 2>/dev/null || true)
CHANGES_JSON=$(printf '%s\n' "$CHANGES" | tr -d '\\"' | awk 'NF{printf "%s\"%s\"", (NR>1?",":""), $0}')
[ -z "$CHANGES_JSON" ] && CHANGES_JSON='"Latest improvements and fixes"'

cat > version.json << EOF
{
  "current": "${CURRENT_COMMIT}",
  "previous": "${NOTES_FROM}",
  "updated": "$(date -Iseconds)",
  "changes": [${CHANGES_JSON}]
}
EOF

# Plain-text copy for the maintenance page while the stack rebuilds
printf '%s\n' "$CHANGES" | grep . > maintenance/changes.txt 2>/dev/null \
  || echo "Latest improvements and fixes" > maintenance/changes.txt

# Export commit history for the changelog viewer — git exists on the host but
# not reliably inside the backend container, which is why /api/changelog
# reads this file. (update-quick.sh already does this; the full script didn't.)
git log --no-merges -n 600 --pretty=format:'%H|%ai|%s|%an' > changelog.txt 2>/dev/null || true

# Copy production config — moved ahead of the DB stamp so compose commands
# below always run against the prod services.
echo -e "${YELLOW}Setting up production configuration...${NC}"
cp docker-compose.prod.yml docker-compose.yml

# Update database with new version — the stack may be down entirely (e.g.,
# this run follows a failed deploy), so start postgres first and treat the
# stamp as best-effort bookkeeping, not a hard gate.
echo -e "${YELLOW}Updating system_status table...${NC}"
CURRENT_STEP="database version stamp"
docker compose up -d postgres 2>/dev/null || true
sleep 4
if ! docker exec -i shop_postgres psql -U shopuser -d shopdb << EOSQL
UPDATE system_status
SET current_version = '${CURRENT_COMMIT}',
    last_successful_update = CURRENT_TIMESTAMP,
    update_available = false,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
EOSQL
then
    echo -e "${RED}⚠ Could not stamp system_status — continuing anyway${NC}"
fi

# Remove update flag file if it exists
if [ -f ".update-requested" ]; then
    echo -e "${YELLOW}Removing update flag file...${NC}"
    rm -f .update-requested
fi

# Push "update started" via the same watchdog channel (best-effort)
./watchdog.sh --alert "Listzy is updating 🔧" "Deploying ${BEFORE_COMMIT:0:7} → ${AFTER_COMMIT:0:7} — users see the updating page for a few minutes." "hammer" 3 2>/dev/null || true

# Hand :3006 to the maintenance placeholder so visitors get the branded
# "Listzy is updating" page instead of a bad gateway while the frontend
# container is down for its rebuild. Separate compose project — the main
# `docker compose down` below must NOT kill it (see compose file header).
progress 1 "Swapping to update mode"
echo -e "${YELLOW}Swapping in the updating page on :3006...${NC}"
docker compose stop frontend || true
docker compose -f docker-compose.maintenance.yml up -d

# Stop containers
progress 2 "Stopping the old version"
echo -e "${YELLOW}Stopping containers...${NC}"
docker compose down

# Rebuild images (placeholder keeps serving :3006 through this whole step)
progress 3 "Building the new version"
echo -e "${YELLOW}Building images...${NC}"
docker compose build

# Swap the placeholder back out and bring the real stack up
progress 4 "Starting the new version"
echo -e "${YELLOW}Restoring the app...${NC}"
docker compose -f docker-compose.maintenance.yml down || true
docker compose up -d

# Wait for containers to be ready
progress 5 "Running database updates"
echo -e "${YELLOW}Waiting for containers to start...${NC}"
sleep 10

# Run pending database migrations — shared tracked runner inside the
# backend container. Each file in backend/migrations/ runs exactly once
# (tracked in schema_migrations), so dropping a new .sql file in and
# pushing is all that's needed — nothing to register here.
echo ""
echo -e "${YELLOW}Running database migrations...${NC}"
if [ -d "backend/migrations" ]; then
    docker exec shop_backend node src/database/runMigrations.js \
        || echo -e "${RED}⚠ Migration runner reported failures — check output above${NC}"
    echo -e "${GREEN}Migrations finished${NC}"
else
    echo -e "${YELLOW}No migrations directory found, skipping...${NC}"
fi

# Check status
progress 6 "Almost done"
echo ""
echo -e "${GREEN}Checking container status...${NC}"
docker compose ps

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Update Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

./watchdog.sh --alert "Listzy update complete ✅" "Now running ${AFTER_COMMIT:0:7}." "white_check_mark" 3 2>/dev/null || true

# Reset for next time — a stale step must never show as live progress.
progress 0 "Waiting for the update to start"
echo ""
echo -e "${CYAN}Access your app at:${NC}"
echo -e "  - Frontend: http://localhost:3006"
echo -e "  - Backend API: http://localhost:3007"
echo -e "  - Production: https://shop.cloudmc.online"
echo ""
echo -e "${YELLOW}To view logs:${NC} docker compose logs -f"
echo -e "${YELLOW}To check status:${NC} ./monitor.sh"
echo ""
