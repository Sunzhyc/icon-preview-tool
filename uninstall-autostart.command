#!/bin/zsh
set -e

LABEL="com.tiktokfilters.icon-preview-tool"
PLIST_NAME="$LABEL.plist"
TARGET="$HOME/Library/LaunchAgents/$PLIST_NAME"

launchctl bootout "gui/$(id -u)" "$TARGET" >/dev/null 2>&1 || true
rm -f "$TARGET"

echo "Icon & Preview Tool auto-start has been removed."
