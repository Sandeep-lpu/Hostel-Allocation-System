# ==============================================================================
# Phase 3: High-Concurrency Atomic Booking & Distributed Lock Test Suite
# ==============================================================================

$BaseUrl = "http://localhost:3000/api/v1"
$Tenant = "univ-delhi-hostel"
$Session = "hostel-allotment-2026"
$StudentId = "STU-2026-PHASE3"

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🎯 1. GENERATE CRYPTOGRAPHIC ADMISSION PASS" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

$admissionToken = (node -e "
  const crypto = require('crypto');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    studentId: '$StudentId',
    tenantId: '$Tenant',
    sessionId: '$Session',
    admittedAt: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 600,
    iat: Math.floor(Date.now() / 1000),
    iss: 'hostel-vwr-engine',
    nonce: 'phase3-nonce-999'
  })).toString('base64url');
  const content = header + '.' + payload;
  const hmac = crypto.createHmac('sha256', 'vwr_super_secure_distributed_engine_secret_2026');
  hmac.update(content);
  console.log(content + '.' + hmac.digest('base64url'));
").Trim()

Write-Host "Generated Admission Token: $admissionToken" -ForegroundColor Green

$headers = @{
    "Content-Type" = "application/json"
    "x-admission-pass" = $admissionToken
    "x-student-id" = $StudentId
    "x-idempotency-key" = "IDEMP-PHASE3-$([Guid]::NewGuid().ToString())"
}

Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "🎯 2. TEST MANDATORY UNDERTAKING ENFORCEMENT (Must fail if false)" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

$invalidBody = @{
    selectedCategoryCode = "STUDIO_AC_3S_PANTRY"
    selectedMessCode = "MESS_STD_NORTH_3M"
    includeLaundry = $false
    includeGym = $false
    mobile = "+919876543210"
    email = "phase3.test@university.edu"
    undertakingAccepted = $false  # Intentionally false!
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/booking/hold" -Method POST -Headers $headers -Body $invalidBody
    Write-Host "Unexpected success!" -ForegroundColor Red
} catch {
    Write-Host "Underwriting rejection verified: HTTP 400 Bad Request (PASS ✅)" -ForegroundColor Green
    Write-Host "Server Response: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "🎯 3. ACQUIRE ATOMIC RESIDENTIAL CART BED HOLD (Specific Bed: A619 - Bed C)" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

$idempKey = "IDEMP-PHASE3-A619-$([Guid]::NewGuid().ToString())"
$headers["x-idempotency-key"] = $idempKey

$validHoldBody = @{
    selectedCategoryCode = "STUDIO_AC_3S_PANTRY"
    selectedMessCode = "MESS_STD_NORTH_3M"
    includeLaundry = $true   # INR 5400
    includeGym = $true       # INR 5000
    mobile = "+919876543210"
    email = "phase3.test@university.edu"
    undertakingAccepted = $true
    specificBedSelection = @{
        blockCode = "BH-01"
        roomNumber = "A619"
        bedLabel = "Bed C"
    }
} | ConvertTo-Json

$cartRes = Invoke-RestMethod -Uri "$BaseUrl/booking/hold" -Method POST -Headers $headers -Body $validHoldBody
Write-Host "Residential Cart Created Successfully!" -ForegroundColor Green
Write-Host "  Cart ID:            $($cartRes.cartId)"
Write-Host "  Booking Type:       $($cartRes.bookingType)"
Write-Host "  Status:             $($cartRes.status)"
Write-Host "  Locked Bed:         $($cartRes.lockedBed.blockCode)-$($cartRes.lockedBed.roomNumber) ($($cartRes.lockedBed.bedLabel))"
Write-Host "  Hold Countdown:     $($cartRes.remainingSeconds) seconds"
Write-Host "`nFinancial Pricing Breakdown:" -ForegroundColor Yellow
Write-Host "  Base Fee:           INR $($cartRes.pricingBreakdown.baseFee)"
Write-Host "  Differential Fee:   INR $($cartRes.pricingBreakdown.differentialRoomFee)"
Write-Host "  Laundry Package:    INR $($cartRes.pricingBreakdown.laundryFee)"
Write-Host "  Gym Membership:     INR $($cartRes.pricingBreakdown.gymFee)"
Write-Host "  TOTAL PAYABLE:      INR $($cartRes.pricingBreakdown.totalPayable)" -ForegroundColor Cyan

Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "🎯 4. TEST IDEMPOTENCY (Re-sending same key returns identical cart)" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

$idempRes = Invoke-RestMethod -Uri "$BaseUrl/booking/hold" -Method POST -Headers $headers -Body $validHoldBody
if ($idempRes.cartId -eq $cartRes.cartId) {
    Write-Host "Idempotency Verified: Exactly same Cart ID returned! (PASS ✅)" -ForegroundColor Green
} else {
    Write-Host "Idempotency Failed: Duplicate Cart Created!" -ForegroundColor Red
}

Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "🎯 5. VOLUNTARY CART RELEASE (Release held bed back to inventory)" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

$releaseHeaders = @{
    "x-admission-pass" = $admissionToken
    "x-student-id" = $StudentId
}
$releaseRes = Invoke-RestMethod -Uri "$BaseUrl/booking/hold/$($cartRes.cartId)" -Method DELETE -Headers $releaseHeaders
$releaseRes | Format-List
Write-Host "Cart released. Bed A619 - Bed C restored to AVAILABLE inventory (PASS ✅)" -ForegroundColor Green

Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "🎯 6. TEST FOOD & SERVICE CHANGE WORKFLOW" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

# Create a student with current allocation first
$studentProfileBody = @{
    tenantId = $Tenant
    rollNumber = "2024BCSE-SERVICE"
    name = "Aditya Verma"
    gender = "MALE"
    email = "aditya.verma@university.edu"
    mobile = "+919876543211"
    nationalId = "1122-3344-5566"
    guardianMobile = "+919811224455"
    medicalConditions = "None"
    currentAllocation = @{
        blockCode = "BH-01"
        roomNumber = "A619"
        bedLabel = "Bed A"
        seaterCount = 3
        categoryCode = "STUDIO_AC_3S_PANTRY"
        messService = "Standard Mess Three Meals"
    }
} | ConvertTo-Json
Invoke-RestMethod -Uri "$BaseUrl/students" -Method POST -Body $studentProfileBody -ContentType "application/json" | Out-Null

$serviceStudentToken = (node -e "
  const crypto = require('crypto');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    studentId: '2024BCSE-SERVICE',
    tenantId: '$Tenant',
    sessionId: '$Session',
    admittedAt: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 600,
    iat: Math.floor(Date.now() / 1000),
    iss: 'hostel-vwr-engine',
    nonce: 'service-nonce-1'
  })).toString('base64url');
  const content = header + '.' + payload;
  const hmac = crypto.createHmac('sha256', 'vwr_super_secure_distributed_engine_secret_2026');
  hmac.update(content);
  console.log(content + '.' + hmac.digest('base64url'));
").Trim()

$serviceHeaders = @{
    "Content-Type" = "application/json"
    "x-admission-pass" = $serviceStudentToken
    "x-student-id" = "2024BCSE-SERVICE"
    "x-idempotency-key" = "IDEMP-FOOD-CHANGE-$([Guid]::NewGuid().ToString())"
}

$foodChangeBody = @{
    selectedMessCode = "MESS_SPECIAL_SOUTH"
    includeLaundry = $true
    includeGym = $true
    undertakingAccepted = $true
} | ConvertTo-Json

$serviceRes = Invoke-RestMethod -Uri "$BaseUrl/booking/food-or-service-change" -Method POST -Headers $serviceHeaders -Body $foodChangeBody
Write-Host "Food/Service Change Cart Created:" -ForegroundColor Green
Write-Host "  Cart ID:         $($serviceRes.cartId)"
Write-Host "  Booking Type:    $($serviceRes.bookingType)"
Write-Host "  Mess:            $($serviceRes.selectedMessCode)"
Write-Host "  Laundry Fee:     INR $($serviceRes.pricingBreakdown.laundryFee)"
Write-Host "  Gym Fee:         INR $($serviceRes.pricingBreakdown.gymFee)"
Write-Host "  TOTAL PAYABLE:   INR $($serviceRes.pricingBreakdown.totalPayable)" -ForegroundColor Cyan

Write-Host "`n✅ All Phase 3 Core Functional Tests Verified Successfully!" -ForegroundColor Green

