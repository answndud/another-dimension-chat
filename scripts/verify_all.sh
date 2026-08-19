#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
case "${1:---focused}" in
  --focused) exec scripts/verify_light.sh ;;
  --release) exec scripts/verify_full.sh --release ;;
  *) echo "사용법: $0 [--focused|--release]" >&2; exit 2 ;;
esac
