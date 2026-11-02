# ==============================================================================
# Virtual Waiting Room (VWR) Phase 1 - Verification PowerShell Script
# ==============================================================================

$BaseUrl = "http://localhost:3000/api/v1"
$Tenant = "univ-delhi-hostel"
$Session = "hostel-allotment-2026"
$StudentId = "STU-2026-000101"

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🎯 1. STUDENT JOINS QUEUE (STRICT_FIFO mode)" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
$joinBody = @{
    studentId = $StudentId
    tenantId = $Tenant
    sessionId = $Session
    scoringMode = "STRICT_FIFO"
} | ConvertTo-Json

$joinRes = Invoke-RestMethod -Uri "$BaseUrl/waiting-room/join" -Method POST -Body $joinBody -ContentType "application/json"
$joinRes | Format-List

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🎯 2. IDEMPOTENT REFRESH (Same student re-joins - position preserved)" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
$refreshRes = Invoke-RestMethod -Uri "$BaseUrl/waiting-room/join" -Method POST -Body $joinBody -ContentType "application/json"
$refreshRes | Format-List

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🎯 3. QUERY QUEUE STATUS" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
$statusRes = Invoke-RestMethod -Uri "$BaseUrl/waiting-room/status?studentId=$StudentId&tenantId=$Tenant&sessionId=$Session" -Method GET
$statusRes | Format-List

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🎯 4. TEST MERIT-WEIGHTED & FAIR-LOTTERY MODES" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
$meritBody = @{
    studentId = "STU-MERIT-TIER1"
    tenantId = $Tenant
    sessionId = $Session
    scoringMode = "MERIT_WEIGHTED"
    priorityTier = 1
} | ConvertTo-Json
$meritRes = Invoke-RestMethod -Uri "$BaseUrl/waiting-room/join" -Method POST -Body $meritBody -ContentType "application/json"
$meritRes | Format-List

$futureCutoff = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + 60000
$lotteryBody = @{
    studentId = "STU-LOTTERY-PRELOBBY"
    tenantId = $Tenant
    sessionId = $Session
    scoringMode = "FAIR_LOTTERY"
    bookingStartTime = $futureCutoff
} | ConvertTo-Json
$lotteryRes = Invoke-RestMethod -Uri "$BaseUrl/waiting-room/join" -Method POST -Body $lotteryBody -ContentType "application/json"
$lotteryRes | Format-List

Write-Host "`n✅ Verification tests complete." -ForegroundColor Green
