#!/usr/bin/env bash
set -euo pipefail

echo "FAIL final security-ready acceptance is outside the v0.1 public product claim" >&2
echo "status=final-acceptance-out-of-v0_1-scope" >&2
echo "external_delivery_claim=false" >&2
echo "source_acceptance=use scripts/public_release_readiness_preflight.sh for the current unsigned public beta source gate" >&2
echo "next=use scripts/public_release_readiness_preflight.sh, then scripts/prepare_unsigned_public_beta_release.sh only with the pinned frozen ignored DMG" >&2
exit 1
