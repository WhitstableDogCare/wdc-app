#!/bin/bash
set -e

cd /Users/jack/Developer/wdc-app

echo "Building..."
npm run build

echo "Restarting server..."
launchctl kickstart -k gui/$(id -u)/com.wdc.app

echo "Done. Server is running."
