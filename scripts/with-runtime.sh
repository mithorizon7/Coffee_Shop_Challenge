#!/bin/sh
set -eu

ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
if command -v node >/dev/null 2>&1 && node "$ROOT/scripts/check-runtime.js" >/dev/null 2>&1; then
  exec "$@"
fi

VERSION=22.23.4
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)
    TARGET=linux-x64
    EXT=tar.xz
    SHA=1805bcd35e6815559bd2eb97db438d3fdb0eb3a5e6a977b7c1badca76337e9ce
    ;;
  Darwin-arm64)
    TARGET=darwin-arm64
    EXT=tar.gz
    SHA=c9e1dbc748b33ed2d14f42445191ecaf14c56259c7a9a26d0042c49ec2b66428
    ;;
  *) echo "Unsupported platform. Install a patched Node runtime matching .nvmrc." >&2; exit 1 ;;
esac

RUNTIME="$ROOT/.runtime/node-v$VERSION-$TARGET"
if [ ! -x "$RUNTIME/bin/node" ]; then
  mkdir -p "$ROOT/.runtime"
  STAGING=$(mktemp -d "$ROOT/.runtime/download.XXXXXX")
  trap 'rm -rf "$STAGING"' EXIT HUP INT TERM
  ARCHIVE="node-v$VERSION-$TARGET.$EXT"
  curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
    "https://nodejs.org/dist/v$VERSION/$ARCHIVE" -o "$STAGING/$ARCHIVE"
  if command -v sha256sum >/dev/null 2>&1; then
    ACTUAL=$(sha256sum "$STAGING/$ARCHIVE" | cut -d ' ' -f 1)
  else
    ACTUAL=$(shasum -a 256 "$STAGING/$ARCHIVE" | cut -d ' ' -f 1)
  fi
  [ "$ACTUAL" = "$SHA" ] || { echo "Node runtime checksum mismatch" >&2; exit 1; }
  tar -xf "$STAGING/$ARCHIVE" -C "$STAGING"
  mv "$STAGING/node-v$VERSION-$TARGET" "$RUNTIME"
fi
export PATH="$RUNTIME/bin:$PATH"
node "$ROOT/scripts/check-runtime.js"
exec "$@"
