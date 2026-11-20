#!/bin/bash

# CloudMC Shop — downtime watchdog
#
# Runs on the HOST (not in a container) so it can alert even when the app,
# the database, or the tunnel is dead. Checks the public URL first, then
# the local frontend port to tell apart:
#   public down + local down  → the app itself is down (admin problem)
#   public down + local up    → Cloudflare/tunnel side is down (provider
#                               problem — the admin can't fix it, users wait)
#
# Alert topic comes from .ntfy-watchdog.json — written by the backend every
# time the admin saves ntfy settings, so this works with the DB down too.
#
# Install (one line of cron):
#   * * * * * /opt/cloudmc-shop/watchdog.sh >> /tmp/listzy-watchdog.log 2>&1
#
# Also usable by deploy scripts to send a one-off ping:
#   ./watchdog.sh --alert "Title" "Message body" "tag1,tag2"

cd /opt/cloudmc-shop 2>/dev/null || exit 0

PUBLIC_URL="${WATCHDOG_URL:-https://shop.cloudmc.online}"
LOCAL_URL="${WATCHDOG_LOCAL:-http://localhost:3006}"
STATE_FILE="/tmp/listzy-watchdog-state"
CFG_FILE=".ntfy-watchdog.json"
NTFY_BASE="${NTFY_BASE_URL:-https://ntfy.sh}"

load_config() {
    TOPIC=""; ENABLED="false"; DOWNTIME="true"
    [ -f "$CFG_FILE" ] || return 1
    eval "$(sed -n 's/.*"topic": *"\([^"]*\)".*/TOPIC=\1/p; s/.*"enabled": *\([a-z]*\).*/ENABLED=\1/p; s/.*"downtime": *\([a-z]*\).*/DOWNTIME=\1/p' "$CFG_FILE")"
    [ -n "$TOPIC" ]
}

send_ntfy() { # title, message, tags, priority
    [ "$ENABLED" = "true" ] || return 0
    curl -sf -m 8 -X POST "${NTFY_BASE}/${TOPIC}" \
        -H "Title: $1" \
        -H "Tags: ${3:-listzy}" \
        -H "Priority: ${4:-4}" \
        -d "$2" >/dev/null 2>&1
}

# ---- one-off alert mode (deploy scripts etc.) ----
if [ "$1" = "--alert" ]; then
    load_config || exit 0
    send_ntfy "${2:-Listzy}" "${3:-}" "${4:-listzy}" "${5:-3}"
    exit 0
fi

# ---- health check mode (cron) ----
load_config || exit 0

# Planned downtime — maintenance page is up or an update is running.
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^shop_maintenance$' \
   || [ -f /tmp/cloudmc-update.lock ] || [ -f .update-requested ]; then
    exit 0
fi

NOW=$(date +%s)
PREV=$(cat "$STATE_FILE" 2>/dev/null || echo "ok")
[ "$DOWNTIME" != "true" ] && exit 0

public_ok() { curl -sf -o /dev/null -m 10 "$PUBLIC_URL"; }
local_ok()  { curl -sf -o /dev/null -m 5  "$LOCAL_URL"; }

if public_ok; then
    if [ "$PREV" != "ok" ]; then
        send_ntfy "Listzy is back up ✅" "The site is reachable again (was: ${PREV})." "white_check_mark" 3
    fi
    echo "ok" > "$STATE_FILE"
    exit 0
fi

# Public URL failed — is it us or the provider?
if local_ok; then
    STATE="provider_down"
    send_first="Listzy unreachable (provider side) 📡"
    msg="The app is up locally but the public URL isn't responding — likely a Cloudflare/tunnel outage. That side is outside the admin's control; it comes back on its own. Users see the 'can't reach' page meanwhile."
else
    STATE="app_down"
    send_first="Listzy is DOWN 🚨"
    msg="Both the public URL and the local frontend (:3006) are failing — the app itself is down. Check: docker compose ps / docker compose logs -f in /opt/cloudmc-shop"
fi

if [ "$PREV" != "$STATE" ]; then
    send_ntfy "$send_first" "$msg" "rotating_light" 5
fi
echo "$STATE" > "$STATE_FILE"
