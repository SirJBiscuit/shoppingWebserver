#!/bin/bash

# Check for updates script
# This runs on the host and returns JSON

cd /opt/cloudmc-shop

# Get current commit
CURRENT=$(git rev-parse HEAD 2>&1)
if [ $? -ne 0 ]; then
    echo '{"error": "Failed to get current commit"}'
    exit 1
fi

# Fetch latest
git fetch origin main 2>&1 > /dev/null

# Get remote commit
REMOTE=$(git rev-parse origin/main 2>&1)
if [ $? -ne 0 ]; then
    echo '{"error": "Failed to get remote commit"}'
    exit 1
fi

# Check if updates available
if [ "$CURRENT" != "$REMOTE" ]; then
    HAS_UPDATES="true"
    # Get commit log
    COMMITS=$(git log HEAD..origin/main --oneline --max-count=10 | jq -R -s -c 'split("\n")[:-1]')
else
    HAS_UPDATES="false"
    COMMITS="[]"
fi

# Get short hashes
CURRENT_SHORT=$(echo $CURRENT | cut -c1-7)
REMOTE_SHORT=$(echo $REMOTE | cut -c1-7)

# Output JSON
cat << EOF
{
  "hasUpdates": $HAS_UPDATES,
  "currentCommit": "$CURRENT_SHORT",
  "latestCommit": "$REMOTE_SHORT",
  "commits": $COMMITS,
  "lastChecked": "$(date -Iseconds)"
}
EOF
