#!/bin/bash

# CloudMC Shop - Manual Update (with updating page)
#
# Same result as `git pull && docker-compose up -d --build`, but:
#   - shows the branded "Listzy is updating" page on :3006 while rebuilding
#   - writes the "In this update" notes automatically (git log BEFORE..AFTER
#     into changes.txt + version.json, so the maintenance page, UpdateBanner
#     and /api/version all show what the update adds)
#   - exports changelog.txt + clears update_available like update-server.sh
#
# Does NOT run migrations — use ./update-server.sh when the update ships
# schema changes.

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /opt/cloudmc-shop

echo -e "${CYAN}=== Manual Update (with updating page) ===${NC}"

git stash -q 2>/dev/null || true
BEFORE_COMMIT=$(git rev-parse HEAD)
git pull origin main
AFTER_COMMIT=$(git rev-parse HEAD)

echo -e "${GREEN}${BEFORE_COMMIT:0:7} -> ${AFTER_COMMIT:0:7}${NC}"

# "In this update" notes — same format as update-server.sh
CHANGES=$(git log --no-merges --pretty=format:'%h %s' "$BEFORE_COMMIT..$AFTER_COMMIT" 2>/dev/null | head -8 || true)
CHANGES_JSON=$(printf '%s\n' "$CHANGES" | tr -d '\\"' | awk 'NF{printf "%s\"%s\"", (NR>1?",":""), $0}')
[ -z "$CHANGES_JSON" ] && CHANGES_JSON='"Latest improvements and fixes"'

cat > version.json << EOF
{
  "current": "${AFTER_COMMIT}",
  "previous": "${BEFORE_COMMIT}",
  "updated": "$(date -Iseconds)",
  "changes": [${CHANGES_JSON}]
}
EOF

printf '%s\n' "$CHANGES" | grep . > maintenance/changes.txt 2>/dev/null \
  || echo "Latest improvements and fixes" > maintenance/changes.txt

git log --no-merges -n 600 --pretty=format:'%H|%ai|%s|%an' > changelog.txt 2>/dev/null || true

# DB bookkeeping so the update flag clears (same as update-server.sh)
docker exec -i shop_postgres psql -U shopuser -d shopdb -c \
  "UPDATE system_status SET current_version='${AFTER_COMMIT}', update_available=false, updated_at=CURRENT_TIMESTAMP WHERE id=1" \
  2>/dev/null || true

# Swap in the updating page, build, then bring the real stack back.
# Maintenance container must release :3006 before `up` recreates frontend —
# the gap between down and up is a few seconds (same as update-server.sh).
cp docker-compose.prod.yml docker-compose.yml 2>/dev/null || true
echo -e "${YELLOW}Swapping in the updating page on :3006...${NC}"
docker compose stop frontend || true
docker compose -f docker-compose.maintenance.yml up -d || true

echo -e "${YELLOW}Building images...${NC}"
docker compose build

echo -e "${YELLOW}Restoring the app...${NC}"
docker compose -f docker-compose.maintenance.yml down || true
docker compose up -d

echo ""
echo -e "${GREEN}Done — ${BEFORE_COMMIT:0:7} -> ${AFTER_COMMIT:0:7}${NC}"
echo -e "${YELLOW}Reminder:${NC} schema changes still need ./update-server.sh (runs migrations)"
