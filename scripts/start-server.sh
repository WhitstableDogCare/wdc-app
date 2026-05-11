#!/bin/bash
export HOME=/Users/jack
export DATABASE_URL="file:/Users/jack/Library/Application Support/wdc-app/wdc.db"
export SESSION_SECRET="wdc-local-session-secret-2026"
export NODE_ENV=production
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

cd /Users/jack/Developer/wdc-app
exec /usr/local/bin/node /Users/jack/Developer/wdc-app/node_modules/next/dist/bin/next start /Users/jack/Developer/wdc-app -p 3004
