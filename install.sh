#!/bin/sh
# Installs moth. Usage:
#   curl -fsSL https://raw.githubusercontent.com/nikolasgioannou/moth/main/install.sh | sh
#
# Environment:
#   MOTH_VERSION      tag to install, e.g. v0.2.0. Defaults to the latest release.
#   MOTH_INSTALL_DIR  where to put the binary. Defaults to ~/.local/bin.
set -eu

REPO="nikolasgioannou/moth"
INSTALL_DIR="${MOTH_INSTALL_DIR:-$HOME/.local/bin}"

fail() { printf 'moth: %s\n' "$1" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found"; }

need uname
need mkdir
if command -v curl >/dev/null 2>&1; then
  fetch() { curl -fsSL "$1"; }
  download() { curl -fsSL -o "$2" "$1"; }
elif command -v wget >/dev/null 2>&1; then
  fetch() { wget -qO- "$1"; }
  download() { wget -qO "$2" "$1"; }
else
  fail "either curl or wget is required"
fi

os=$(uname -s)
arch=$(uname -m)
case "$os" in
  Darwin) os=darwin ;;
  Linux) os=linux ;;
  *) fail "unsupported operating system: $os. Windows binaries are on the releases page." ;;
esac
case "$arch" in
  arm64 | aarch64) arch=arm64 ;;
  x86_64 | amd64) arch=x64 ;;
  *) fail "unsupported architecture: $arch" ;;
esac

# A glibc binary cannot load on musl at all: the ELF interpreter it names is not
# there, and the loader's error names a file rather than the cause. Alpine has no
# ldd of its own, so musl announces itself on stderr when ldd is run bare.
libc=""
if [ "$os" = linux ]; then
  if ldd --version 2>&1 | grep -qi musl || ldd 2>&1 | grep -qi musl; then
    libc="-musl"
  fi
fi
asset="moth-$os-$arch$libc"

version="${MOTH_VERSION:-}"
if [ -z "$version" ]; then
  version=$(fetch "https://api.github.com/repos/$REPO/releases/latest" |
    sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -1)
  [ -n "$version" ] || fail "could not determine the latest release. Set MOTH_VERSION to install a specific tag."
fi

base="https://github.com/$REPO/releases/download/$version"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

printf 'moth: downloading %s %s\n' "$asset" "$version"
download "$base/$asset" "$tmp/$asset" || fail "could not download $base/$asset"

# Verify against the checksums published with the release, when they are present.
if download "$base/SHA256SUMS" "$tmp/SHA256SUMS" 2>/dev/null; then
  expected=$(grep " $asset\$" "$tmp/SHA256SUMS" | awk '{print $1}')
  if [ -n "$expected" ]; then
    if command -v shasum >/dev/null 2>&1; then
      actual=$(shasum -a 256 "$tmp/$asset" | awk '{print $1}')
    elif command -v sha256sum >/dev/null 2>&1; then
      actual=$(sha256sum "$tmp/$asset" | awk '{print $1}')
    else
      actual=""
    fi
    if [ -n "$actual" ] && [ "$actual" != "$expected" ]; then
      fail "checksum mismatch for $asset; refusing to install"
    fi
  fi
fi

mkdir -p "$INSTALL_DIR"
chmod +x "$tmp/$asset"
mv "$tmp/$asset" "$INSTALL_DIR/moth"

printf 'moth: installed %s to %s/moth\n' "$version" "$INSTALL_DIR"

# The musl build links against libstdc++ and libgcc, which Alpine does not ship.
# Without them the loader fails with a wall of relocation errors naming symbols.
if [ -n "$libc" ] && ! "$INSTALL_DIR/moth" --version >/dev/null 2>&1; then
  printf 'moth: the binary will not start. On Alpine, run: apk add libstdc++\n' >&2
fi
case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) printf 'moth: %s is not on your PATH; add it to use "moth" directly\n' "$INSTALL_DIR" ;;
esac
