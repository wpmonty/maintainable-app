#!/bin/bash
# Async test runner — writes results to disk
cd "$(dirname "$0")"

STATUS_FILE="test-results/_status.json"
RESULTS_FILE="test-results/results.txt"
mkdir -p test-results

echo '{"status":"running","startedAt":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "$STATUS_FILE"

# Run tests, capture all output
npx tsx src/test-parser.ts 2>&1 > "$RESULTS_FILE"
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo '{"status":"done","completedAt":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","resultsPath":"'$(pwd)/$RESULTS_FILE'","exitCode":'$EXIT_CODE'}' > "$STATUS_FILE"
else
  echo '{"status":"done","completedAt":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","resultsPath":"'$(pwd)/$RESULTS_FILE'","exitCode":'$EXIT_CODE',"note":"some tests failed"}' > "$STATUS_FILE"
fi
