#!/usr/bin/env bash
# End-to-end demo: submit a video, watch progress, print the structured recipe.
# Works against a running RecipeReel server (mock mode needs no keys/GPU).
#
#   ./scripts/demo.sh                      # uses http://localhost:8000 + a demo URL
#   BASE=http://host:8000 ./scripts/demo.sh "https://www.youtube.com/watch?v=..."
set -euo pipefail

BASE="${BASE:-http://localhost:8000}"
URL="${1:-https://www.youtube.com/watch?v=demo}"

echo "▶ RecipeReel demo → $BASE"
echo "  meta:" && curl -s "$BASE/api/v1/meta" | python3 -m json.tool

echo "▶ Submitting: $URL"
JOB=$(curl -s -X POST "$BASE/api/v1/recipes" -H 'content-type: application/json' -d "{\"url\":\"$URL\"}")
JOB_ID=$(echo "$JOB" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "  job_id=$JOB_ID"

echo "▶ Progress:"
until :; do
  DATA=$(curl -s "$BASE/api/v1/jobs/$JOB_ID")
  STATUS=$(echo "$DATA" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['status'])")
  STAGE=$(echo "$DATA" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['progress']['stage'],d['progress']['percent'])")
  echo "  [$STATUS] $STAGE"
  [ "$STATUS" = "succeeded" ] && break
  [ "$STATUS" = "failed" ] && { echo "  ERROR:"; echo "$DATA" | python3 -c "import sys,json;print(json.load(sys.stdin)['error'])"; exit 1; }
  sleep 0.7
done

RID=$(curl -s "$BASE/api/v1/jobs/$JOB_ID" | python3 -c "import sys,json;print(json.load(sys.stdin)['recipe_id'])")
echo "▶ Recipe ($RID):"
curl -s "$BASE/api/v1/recipes/$RID" | python3 -m json.tool
