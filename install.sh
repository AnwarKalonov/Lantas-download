#!/usr/bin/env bash
# Install the newest Lantas release from the public download repository.
#
#   curl -fsSL https://raw.githubusercontent.com/AnwarKalonov/Lantas-download/main/install.sh | bash
#   # or, from a checkout:
#   bash scripts/install.sh
#
# This works around the Gatekeeper prompt for ad-hoc-signed builds by clearing
# the quarantine flag after copying the app. It is not a substitute for a
# Developer ID signature and notarization; a notarized build needs no script.
# Only run it from a source you trust.

set -euo pipefail

REPO="${LANTAS_REPO:-AnwarKalonov/Lantas-download}"
API="https://api.github.com/repos/$REPO/releases/latest"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n  %s\n\n' "$*" >&2; exit 1; }

[ "$(uname -s)" = "Darwin" ] || fail "Lantas is a macOS app. This machine is $(uname -s)."
case "$(uname -m)" in
  arm64) ;;
  *) fail "The current public build is Apple Silicon (arm64). This Mac is $(uname -m)." ;;
esac

command -v curl >/dev/null || fail "curl is required."
command -v hdiutil >/dev/null || fail "hdiutil is required."

say "Finding the newest Lantas release"
JSON="$(curl -fsSL -H 'Accept: application/vnd.github+json' "$API")" || fail "Could not read the release feed."
URL="$(printf '%s' "$JSON" | grep -o 'https://[^"]*\.dmg' | head -1)"
[ -n "$URL" ] || fail "The latest release has no dmg yet."

TMP="$(mktemp -d)"
MOUNT="$TMP/mount"
DMG="$TMP/Lantas.dmg"
mkdir -p "$MOUNT"
cleanup() {
  hdiutil detach "$MOUNT" -quiet >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

say "Downloading $(basename "$URL")"
curl -fL --progress-bar "$URL" -o "$DMG" || fail "Download failed."

say "Opening the disk image"
hdiutil attach "$DMG" -nobrowse -quiet -mountpoint "$MOUNT" || fail "Could not open the dmg."
[ -d "$MOUNT/Lantas.app" ] || fail "The dmg does not contain Lantas.app."

cp -R "$MOUNT/Lantas.app" "$TMP/Lantas.app"
xattr -dr com.apple.quarantine "$TMP/Lantas.app" 2>/dev/null || true

say "Installing to /Applications"
if [ -w /Applications ]; then
  rm -rf "/Applications/Lantas.app"
  cp -R "$TMP/Lantas.app" "/Applications/Lantas.app"
  TARGET="/Applications/Lantas.app"
else
  TARGET="$HOME/Applications/Lantas.app"
  mkdir -p "$HOME/Applications"
  rm -rf "$TARGET"
  cp -R "$TMP/Lantas.app" "$TARGET"
  printf '  /Applications is not writable, so Lantas went to %s\n' "$TARGET"
fi
xattr -dr com.apple.quarantine "$TARGET" 2>/dev/null || true

say "Opening Lantas"
open "$TARGET" || true
printf '\n  If macOS still asks, open System Settings → Privacy & Security and allow Lantas once.\n'
printf '  A Developer ID notarized build does not need this step.\n\n'
