# WDC App — Terminal Commands

## Day-to-day

**Restart the production server** (if the app is down but no code changes):
```
launchctl kickstart -k gui/$(id -u)/com.wdc.app
```

**Deploy after code changes** (rebuilds the app and restarts the server):
```
bash scripts/deploy.sh
```

---

## If the server won't start

**Force remove and re-register the server agent:**
```
launchctl bootout gui/$(id -u)/com.wdc.app
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.wdc.app.plist
```

---

## Notes

- The app runs on port 3004 and is available at https://app.whitstabledogcare.co.uk via Cloudflare
- The server starts automatically when you log in — you shouldn't need to do anything after a reboot
- Logs are at ~/Library/Logs/wdc-app.log and ~/Library/Logs/wdc-app-error.log
