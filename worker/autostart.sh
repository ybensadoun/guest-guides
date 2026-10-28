#!/bin/sh
# The guide worker as a macOS launch agent: it starts at login, comes back within 30 s if it stops, keeps the Mac awake
# while it runs (caffeinate) and writes to ~/Library/Logs/guide-worker.log. No Terminal window, no command to type.
#   sh worker/autostart.sh install   set it up and start it (again after moving the folder or installing another node)
#   sh worker/autostart.sh restart   after changing or pulling worker code, or editing worker/.env.local
#   sh worker/autostart.sh status    is it running, and the last lines of its log
#   sh worker/autostart.sh remove    stop it and take it out (back to running it by hand)
set -e
LABEL=com.guestguides.worker
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(dirname "$HERE")
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"; LOG="$HOME/Library/Logs/guide-worker.log"; DOMAIN="gui/$(id -u)"
# The log starts again past 5 MB (the previous one is kept as .1)
roll() { if [ -f "$LOG" ] && [ "$(stat -f %z "$LOG")" -gt 5000000 ]; then mv "$LOG" "$LOG.1"; fi; }
case "$1" in
  install)
    NODE=$(command -v node) || { echo "node not found"; exit 1; }
    CLAUDE=$(command -v claude || true)   # research and translation (RESEARCH=cli in worker/.env.local)
    PATHS="$(dirname "$NODE")"; [ -n "$CLAUDE" ] && PATHS="$PATHS:$(dirname "$CLAUDE")"
    mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"; roll
    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/usr/bin/caffeinate</string><string>-i</string><string>$NODE</string><string>worker/guide-worker.mjs</string></array>
  <key>WorkingDirectory</key><string>$ROOT</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$PATHS:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict></plist>
EOF
    launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
    launchctl bootstrap "$DOMAIN" "$PLIST"
    echo "Installed and started. Log: $LOG" ;;
  restart) roll; launchctl kickstart -k "$DOMAIN/$LABEL" && echo "Restarted." ;;
  status)
    T=$(printf '\t'); launchctl print "$DOMAIN/$LABEL" 2>/dev/null | grep -E "^$T(state|pid|last exit code) =" || echo "Not installed."
    if [ -f "$LOG" ]; then tail -n 15 "$LOG"; fi ;;
  remove)
    launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true; rm -f "$PLIST"
    echo "Removed. To run it by hand: caffeinate -i node worker/guide-worker.mjs" ;;
  *) sed -n 2,8p "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
