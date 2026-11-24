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

# Same failure safety as update-server.sh — a failed build must not leave
# the placeholder serving :3006 forever. Flag it for the page and try to
# restore the previous stack.
restore_on_fail() {
  code=$?
  [ $code -eq 0 ] && return 0
  echo "fail|6|manual deploy" > maintenance/progress.txt 2>/dev/null || true
  echo -e "\033[0;31mUpdate failed — attempting to restore the previous version...\033[0m"
  ./watchdog.sh --alert "Listzy update FAILED" "Manual deploy failed — restoring the previous version." "warning" 5 2>/dev/null || true
  docker compose -f docker-compose.maintenance.yml down 2>/dev/null || true
  docker compose up -d 2>/dev/null || true
  exit $code
}
trap restore_on_fail EXIT

git stash -q 2>/dev/null || true
BEFORE_COMMIT=$(git rev-parse HEAD)
git pull origin main
AFTER_COMMIT=$(git rev-parse HEAD)

echo -e "${GREEN}${BEFORE_COMMIT:0:7} -> ${AFTER_COMMIT:0:7}${NC}"

# "In this update" notes — baseline is the last DEPLOYED commit
# (version.json "current"), not HEAD: a `git pull` before this script
# leaves BEFORE==AFTER and the list would come out empty.
LAST_DEPLOYED=$(grep -o '"current"[^,}]*' version.json 2>/dev/null | grep -o '[0-9a-f]\{7,\}' | head -1 || true)
NOTES_FROM="$BEFORE_COMMIT"
if [ -n "$LAST_DEPLOYED" ] && [ "$LAST_DEPLOYED" != "$AFTER_COMMIT" ] \
   && git cat-file -e "${LAST_DEPLOYED}^{commit}" 2>/dev/null; then
    NOTES_FROM="$LAST_DEPLOYED"
fi
CHANGES=$(git log --no-merges --pretty=format:'%h %s' "$NOTES_FROM..$AFTER_COMMIT" 2>/dev/null | head -8 || true)
[ -z "$CHANGES" ] && CHANGES=$(git log --no-merges --pretty=format:'%h %s' -8 HEAD 2>/dev/null || true)
CHANGES_JSON=$(printf '%s\n' "$CHANGES" | tr -d '\\"' | awk 'NF{printf "%s\"%s\"", (NR>1?",":""), $0}')
[ -z "$CHANGES_JSON" ] && CHANGES_JSON='"Latest improvements and fixes"'

cat > version.json << EOF
{
  "current": "${AFTER_COMMIT}",
  "previous": "${NOTES_FROM}",
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
./watchdog.sh --alert "Listzy is updating 🔧" "Manual deploy ${BEFORE_COMMIT:0:7} → ${AFTER_COMMIT:0:7} in progress." "hammer" 3 2>/dev/null || true
echo -e "${YELLOW}Swapping in the updating page on :3006...${NC}"
docker compose stop frontend || true
docker compose -f docker-compose.maintenance.yml up -d || true

echo -e "${YELLOW}Building images...${NC}"
docker compose build

echo -e "${YELLOW}Restoring the app...${NC}"
docker compose -f docker-compose.maintenance.yml down || true
docker compose up -d

# Verify end-to-end — a container can "start" then crash-loop and nobody
# would know from compose's exit code alone.
echo -e "${YELLOW}Verifying the app is live...${NC}"
HEALTHY=0
for _ in $(seq 1 60); do
    if curl -fs -o /dev/null --max-time 3 http://localhost:3006/api/health 2>/dev/null; then
        HEALTHY=1
        break
    fi
    sleep 2
done
if [ "$HEALTHY" -eq 0 ]; then
    echo -e "${RED}App did not respond within 2 minutes — treating as a failed update${NC}"
    exit 1   # EXIT trap: flags fail in progress.txt, alerts, restores stack
fi
echo -e "${GREEN}✓ App is responding${NC}"

echo ""
echo -e "${GREEN}Done — ${BEFORE_COMMIT:0:7} -> ${AFTER_COMMIT:0:7}${NC}"
./watchdog.sh --alert "Listzy update complete ✅" "Now running ${AFTER_COMMIT:0:7}." "white_check_mark" 3 2>/dev/null || true
echo -e "${YELLOW}Reminder:${NC} schema changes still need ./update-server.sh (runs migrations)"
