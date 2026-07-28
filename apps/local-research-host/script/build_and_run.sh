#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
PROCESS_NAME="CeriseLocalResearchHost"
DISPLAY_NAME="Cerise Local Research Host"
BUNDLE_ID="com.cerisescholar.local-research-host"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
APP_BUNDLE="$DIST_DIR/$DISPLAY_NAME.app"
APP_CONTENTS="$APP_BUNDLE/Contents"
APP_MACOS="$APP_CONTENTS/MacOS"
APP_BINARY="$APP_MACOS/$PROCESS_NAME"

cd "$ROOT_DIR"
pkill -x "$PROCESS_NAME" >/dev/null 2>&1 || true

swift build
BUILD_BINARY="$(swift build --show-bin-path)/$PROCESS_NAME"

rm -rf "$APP_BUNDLE"
mkdir -p "$APP_MACOS"
cp "$BUILD_BINARY" "$APP_BINARY"
cp "$ROOT_DIR/Packaging/Info.plist" "$APP_CONTENTS/Info.plist"
chmod +x "$APP_BINARY"
/usr/bin/xattr -cr "$APP_BUNDLE"
/usr/bin/codesign --force --sign - --identifier "$BUNDLE_ID" "$APP_BUNDLE" >/dev/null
# Documents may be managed by macOS File Provider, which can immediately attach
# Finder metadata that strict code-signature verification rejects.
clear_bundle_metadata() {
  /usr/bin/xattr -d com.apple.FinderInfo "$APP_BUNDLE" >/dev/null 2>&1 || true
  /usr/bin/xattr -d 'com.apple.fileprovider.fpfs#P' "$APP_BUNDLE" >/dev/null 2>&1 || true
}
sleep 0.1
clear_bundle_metadata

open_app() {
  /usr/bin/open -n "$APP_BUNDLE"
}

case "$MODE" in
  run)
    open_app
    ;;
  --debug|debug)
    lldb -- "$APP_BINARY"
    ;;
  --logs|logs)
    open_app
    /usr/bin/log stream --info --style compact --predicate "process == \"$PROCESS_NAME\""
    ;;
  --telemetry|telemetry)
    open_app
    /usr/bin/log stream --info --style compact --predicate "subsystem == \"$BUNDLE_ID\""
    ;;
  --self-test|self-test)
    "$BUILD_BINARY" --self-test
    ;;
  --verify|verify)
    "$BUILD_BINARY" --self-test
    clear_bundle_metadata
    /usr/bin/codesign --verify --deep --strict "$APP_BUNDLE"
    open_app
    sleep 1
    pgrep -x "$PROCESS_NAME" >/dev/null
    echo "LOCAL_HOST_APP_VERIFIED"
    ;;
  *)
    echo "usage: $0 [run|--debug|--logs|--telemetry|--self-test|--verify]" >&2
    exit 2
    ;;
esac
