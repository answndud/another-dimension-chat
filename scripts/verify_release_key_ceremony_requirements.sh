#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REQ="$ROOT_DIR/RELEASE_KEY_CEREMONY_REQUIREMENTS.md"

grep -q 'evidence requirements only, not a real key ceremony' "$REQ"
grep -q 'does not generate keys, handle private key material, sign artifacts, or approve a release candidate' "$REQ"
grep -q 'Ceremony identifier: `TODO-CEREMONY-ID`' "$REQ"
grep -q 'Key algorithm and command transcript: `TODO-KEY-GENERATION-TRANSCRIPT`' "$REQ"
grep -q 'Public key path and fingerprint: `TODO-PUBLIC-KEY-FINGERPRINT`' "$REQ"
grep -q 'Fingerprint publication channels: `TODO-FINGERPRINT-PUBLICATION-CHANNELS`' "$REQ"
grep -q 'Private key storage location class: `TODO-OFFLINE-STORAGE-CLASS`' "$REQ"
grep -q 'Rotation/revocation plan' "$REQ"
grep -q 'cannot replace real offline custody evidence or a candidate-specific ceremony transcript' "$REQ"
grep -q 'does not create release keys' "$REQ"
grep -q 'does not record a real key ceremony' "$REQ"
grep -q 'RELEASE_KEY_CEREMONY_REQUIREMENTS.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'scripts/verify_release_key_ceremony_requirements.sh' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_key_ceremony_requirements.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'release signing ready|release signing complete|signed artifact verification passed|artifact authenticity proven|release signing key generated|real release key created|release artifacts signed|real key ceremony complete|key ceremony evidence recorded' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/RELEASE_KEY_CEREMONY_REQUIREMENTS.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "key ceremony requirements are not real release signing evidence" >&2
  exit 1
fi

printf 'release key ceremony requirements confirm real ceremony evidence is not recorded\n'
