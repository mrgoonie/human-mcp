#!/bin/bash

# Usage: ./send-discord.sh 'Your message here'
# Note: Remember to escape the string

# Load environment variables from .env file
if [[ -f .env ]]; then
    echo "Loading .env file..."
    set -a  # automatically export all variables
    source .env
    set +a  # turn off automatic export
    echo "✅ Environment loaded, DISCORD_WEBHOOK_URL=$(echo ${DISCORD_WEBHOOK_URL:0:50}...)"
else
    echo "Warning: .env file not found"
fi

message="$1"
    
if [[ -z "$DISCORD_WEBHOOK_URL" ]]; then
    echo "⚠️  Discord notification skipped: DISCORD_WEBHOOK_URL not set"
    exit 1
fi

# Prepare message for Discord (Discord markdown supports \n)
discord_message="$message"

# Discord embeds for richer formatting
payload=$(cat <<EOF
{
"embeds": [{
    "title": "🤖 Claude Code Session Complete",
    "description": "$discord_message",
    "color": 5763719,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "footer": {
        "text": "DevPocket API • $(basename "$(pwd)")"
    },
    "fields": [
        {
            "name": "⏰ Session Time",
            "value": "$(date '+%H:%M:%S')",
            "inline": true
        },
        {
            "name": "📂 Project",
            "value": "$(basename "$(pwd)")",
            "inline": true
        }
    ]
}]
}
EOF
)

curl -s -X POST "$DISCORD_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$payload" >/dev/null 2>&1

if [[ $? -eq 0 ]]; then
    echo "✅ Discord notification sent"
else
    echo "❌ Failed to send Discord notification"
    exit 1
fi