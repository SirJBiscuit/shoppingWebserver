#!/bin/bash

# This script is called by the backend to trigger an update
# It runs on the host, not in the container

set -e

LOCK_FILE="/tmp/cloudmc-update.lock"

# Check if update is already running
if [ -f "$LOCK_FILE" ]; then
    echo "Update already in progress"
    exit 1
fi

# Create lock file
touch "$LOCK_FILE"

# Cleanup on exit
trap "rm -f $LOCK_FILE" EXIT

# Run the update script
cd /opt/cloudmc-shop
./update-server.sh

exit 0
