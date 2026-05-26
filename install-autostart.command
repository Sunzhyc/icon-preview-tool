#!/bin/zsh
set -e

LABEL="com.tiktokfilters.icon-preview-tool"
PLIST_NAME="$LABEL.plist"
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"
TARGET="$LAUNCH_AGENTS/$PLIST_NAME"
RUNTIME_DIR="$HOME/Library/Application Support/TF Icon Preview Tool"

mkdir -p "$LAUNCH_AGENTS"
mkdir -p "$RUNTIME_DIR"
mkdir -p "$RUNTIME_DIR/assets"
cp "$BASE_DIR/index.html" "$BASE_DIR/styles.css" "$BASE_DIR/app.js" "$RUNTIME_DIR/"
cp "$BASE_DIR"/assets/*.png "$RUNTIME_DIR/assets/"
cp "$BASE_DIR/$PLIST_NAME" "$TARGET"

launchctl bootout "gui/$(id -u)" "$TARGET" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$TARGET"
launchctl enable "gui/$(id -u)/$LABEL"
launchctl kickstart -k "gui/$(id -u)/$LABEL"

echo "Icon & Preview Tool is running at http://127.0.0.1:5173/"
