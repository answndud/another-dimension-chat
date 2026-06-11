#!/usr/bin/env bash
set -euo pipefail

echo "FAIL final security-ready acceptance is outside the v0.1 public product claim" >&2
echo "status=final-acceptance-out-of-v0_1-scope" >&2
echo "external_delivery_claim=false" >&2
echo "next=use scripts/public_beta_gap_acceptance_once.sh for the current unsigned public beta claim" >&2
exit 1
