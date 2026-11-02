#!/usr/bin/env bash
# ==============================================================================
# Virtual Waiting Room (VWR) Phase 1 - Verification & Curl Test Suite
# ==============================================================================

BASE_URL="http://localhost:3000/api/v1"
TENANT="univ-delhi-hostel"
SESSION="hostel-allotment-2026"
STUDENT_ID="STU-2026-000101"

echo "========================================================================"
echo "🎯 1. STUDENT JOINS QUEUE (STRICT_FIFO mode)"
echo "========================================================================"
curl -s -X POST "${BASE_URL}/waiting-room/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"${STUDENT_ID}\",
    \"tenantId\": \"${TENANT}\",
    \"sessionId\": \"${SESSION}\",
    \"scoringMode\": \"STRICT_FIFO\"
  }" | jq .

echo ""
echo "========================================================================"
echo "🎯 2. IDEMPOTENT REFRESH (Same student re-joins - position preserved)"
echo "========================================================================"
curl -s -X POST "${BASE_URL}/waiting-room/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"${STUDENT_ID}\",
    \"tenantId\": \"${TENANT}\",
    \"sessionId\": \"${SESSION}\",
    \"scoringMode\": \"STRICT_FIFO\"
  }" | jq .

echo ""
echo "========================================================================"
echo "🎯 3. QUERY QUEUE STATUS"
echo "========================================================================"
curl -s -X GET "${BASE_URL}/waiting-room/status?studentId=${STUDENT_ID}&tenantId=${TENANT}&sessionId=${SESSION}" | jq .

echo ""
echo "========================================================================"
echo "🎯 4. LISTEN TO SERVER-SENT EVENTS (SSE) STREAM (5 seconds sample)"
echo "========================================================================"
timeout 5 curl -N -X GET "${BASE_URL}/waiting-room/stream?studentId=${STUDENT_ID}&tenantId=${TENANT}&sessionId=${SESSION}" || true

echo ""
echo "========================================================================"
echo "🎯 5. TEST FAIR LOTTERY & MERIT WEIGHTED JOINS"
echo "========================================================================"
curl -s -X POST "${BASE_URL}/waiting-room/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"STU-MERIT-TIER1\",
    \"tenantId\": \"${TENANT}\",
    \"sessionId\": \"${SESSION}\",
    \"scoringMode\": \"MERIT_WEIGHTED\",
    \"priorityTier\": 1
  }" | jq .

curl -s -X POST "${BASE_URL}/waiting-room/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"STU-LOTTERY-PRELOBBY\",
    \"tenantId\": \"${TENANT}\",
    \"sessionId\": \"${SESSION}\",
    \"scoringMode\": \"FAIR_LOTTERY\",
    \"bookingStartTime\": $(($(date +%s%N)/1000000 + 60000))
  }" | jq .

echo ""
echo "✅ Test suite complete."
