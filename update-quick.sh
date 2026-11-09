#!/bin/bash

# CloudMC Shop - Quick Update Script
# Pulls latest code and rebuilds ONLY the requested service.
# Default: frontend only — backend and database keep running (no downtime for API).
#
# Usage:
#   ./update-quick.sh            # frontend only (default)
#   ./update-quick.sh frontend   # same as above
#   ./update-quick.sh backend    # backend only (runs startup migrations on boot)
#   ./update-quick.sh all        # both services

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TARGET="${1:-frontend}"

case "$TARGET" in
  frontend|backend|all) ;;
  *)
    echo -e "${RED}Unknown target: ${TARGET}${NC}"
    echo "Usage: ./update-quick.sh [frontend|backend|all]"
    exit 1
    ;;
esac

cd /opt/cloudmc-shop

echo -e "${CYAN}=== Quick Update (${TARGET}) ===${NC}"

# Pull latest code (stash local edits, fall back to hard reset)
git stash --include-untracked -q 2>/dev/null || true
BEFORE_COMMIT=$(git rev-parse HEAD)
if ! git pull origin main -q; then
    echo -e "${YELLOW}Pull failed, resetting to origin/main...${NC}"
    git fetch origin
    git reset --hard origin/main -q
fi
AFTER_COMMIT=$(git rev-parse HEAD)

if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ]; then
    echo -e "${GREEN}Already up to date (${AFTER_COMMIT:0:7}) — rebuilding anyway${NC}"
else
    echo -e "${GREEN}${BEFORE_COMMIT:0:7} -> ${AFTER_COMMIT:0:7}${NC}"
    git log --oneline --no-decorate "$BEFORE_COMMIT..$AFTER_COMMIT" | head -5
fi

# Save version info (used by /api/system/check-updates)
cat > version.json << EOF
{
  "current": "${AFTER_COMMIT}",
  "previous": "${BEFORE_COMMIT}",
  "updated": "$(date -Iseconds)"
}
EOF

# Export commit history for the changelog viewer — git exists on the host but
# not inside the backend container, which is why /api/changelog reads this file.
git log --no-merges -n 600 --pretty=format:'%H|%ai|%s|%an' > changelog.txt 2>/dev/null || true

# Rebuild only the requested service(s). docker compose recreates a container
# only when its image/config changed — untouched services keep running.
SERVICES=$([ "$TARGET" = "all" ] && echo "frontend backend" || echo "$TARGET")

echo -e "${YELLOW}Rebuilding: ${SERVICES}${NC}"
docker compose up -d --build $SERVICES

# Clear the auto-updater flag if present
rm -f .update-requested 2>/dev/null || true

echo ""
echo -e "${GREEN}Done. ${SERVICES} updated; other containers untouched.${NC}"
docker compose ps
