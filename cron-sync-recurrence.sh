#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="ouffydkgqytzjmehtqjr"
FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/sync-recurrence"

curl -fsS -X POST "$FUNCTION_URL" \
  -H 'Content-Type: application/json' \
  -d '{"monthsAhead":12,"referenceDate":"'"$(date +%F)"'"}'
