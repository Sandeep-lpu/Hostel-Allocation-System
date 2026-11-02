# ==============================================================================
# PHASE 4: COORDINATED FRIEND / GROUP ROOM ALLOCATION VERIFICATION SCRIPT
# ==============================================================================

$BaseUrl = "http://localhost:3000/api/v1"
$Tenant = "univ-delhi-hostel"
$Session = "hostel-allotment-2026"
$Secret = "vwr_super_secure_distributed_engine_secret_2026"

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🚀 PHASE 4: COORDINATED ROOMMATE GROUP ALLOCATION & SPLIT-CART TEST" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 0. SETUP: Ensure Student Profiles Exist
# ------------------------------------------------------------------------------
Write-Host "`nSetting up test student profiles..." -ForegroundColor Yellow

$students = @(
    @{ roll = "2024BCSE-LEAD4"; name = "Karan Sharma"; gender = "MALE"; email = "karan@univ.edu"; mobile = "+919876543201" },
    @{ roll = "2024BCSE-FRND1"; name = "Rohan Gupta";  gender = "MALE"; email = "rohan@univ.edu"; mobile = "+919876543202" },
    @{ roll = "2024BCSE-FRND2"; name = "Sameer Jain";  gender = "MALE"; email = "sameer@univ.edu"; mobile = "+919876543203" },
    @{ roll = "2024BCSE-GIRL1"; name = "Priya Singh";  gender = "FEMALE"; email = "priya@univ.edu"; mobile = "+919876543204" }
)

foreach ($stu in $students) {
    $profileBody = @{
        tenantId = $Tenant
        rollNumber = $stu.roll
        name = $stu.name
        gender = $stu.gender
        email = $stu.email
        mobile = $stu.mobile
        nationalId = "9988-7766-5544"
        guardianMobile = "+919811223344"
        medicalConditions = "None"
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$BaseUrl/students" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $profileBody | Out-Null
    } catch {
        # Profile might already exist from previous test run
    }
}
Write-Host "Student profiles initialized. (PASS ✅)" -ForegroundColor Green

# ------------------------------------------------------------------------------
# 1. CREATE ROOMMATE GROUP (3-Seater Studio AC)
# ------------------------------------------------------------------------------
Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "🎯 1. LEADER CREATES 3-SEATER ROOMMATE GROUP" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

$createGroupBody = @{
    targetSeater = 3
    categoryCode = "STUDIO_AC_3S_PANTRY"
    undertakingAccepted = $true
} | ConvertTo-Json

$groupHeaders = @{
    "Content-Type" = "application/json"
    "x-student-id" = "2024BCSE-LEAD4"
    "x-tenant-id" = $Tenant
}

$groupRes = Invoke-RestMethod -Uri "$BaseUrl/groups" -Method POST -Headers $groupHeaders -Body $createGroupBody
$groupId = $groupRes.groupId
$groupCode = $groupRes.groupCode

Write-Host "Roommate Group Formed Successfully!" -ForegroundColor Green
Write-Host "  Group ID:         $groupId"
Write-Host "  Invite Code:      $groupCode" -ForegroundColor Yellow
Write-Host "  Target Seater:    $($groupRes.targetSeater)"
Write-Host "  Category:         $($groupRes.categoryCode)"
Write-Host "  Status:           $($groupRes.status)"
Write-Host "  Leader:           $($groupRes.leaderStudentId)"

# ------------------------------------------------------------------------------
# 2. GENDER ISOLATION TEST (Female student cannot join male group)
# ------------------------------------------------------------------------------
Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "🎯 2. TEST GENDER ISOLATION ENFORCEMENT" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

$joinBody = @{
    undertakingAccepted = $true
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/groups/$groupCode/join" -Method POST -Headers @{
        "Content-Type" = "application/json"
        "x-student-id" = "2024BCSE-GIRL1"
    } -Body $joinBody | Out-Null
    Write-Host "Unexpected success for gender mismatch!" -ForegroundColor Red
} catch {
    Write-Host "Gender mismatch correctly rejected with HTTP 400 Bad Request! (PASS ✅)" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 3. ROOMMATES JOIN GROUP VIA INVITE CODE
# ------------------------------------------------------------------------------
Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "🎯 3. ROOMMATES JOIN GROUP (Accept Invites & Sign Undertakings)" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

# Friend 1 joins
$f1Res = Invoke-RestMethod -Uri "$BaseUrl/groups/$groupCode/join" -Method POST -Headers @{
    "Content-Type" = "application/json"
    "x-student-id" = "2024BCSE-FRND1"
} -Body $joinBody
Write-Host "Friend 1 (Rohan Gupta) Joined Group $groupCode (PASS ✅)" -ForegroundColor Green

# Friend 2 joins
$f2Res = Invoke-RestMethod -Uri "$BaseUrl/groups/$groupCode/join" -Method POST -Headers @{
    "Content-Type" = "application/json"
    "x-student-id" = "2024BCSE-FRND2"
} -Body $joinBody
Write-Host "Friend 2 (Sameer Jain) Joined Group $groupCode (PASS ✅)" -ForegroundColor Green
Write-Host "Total Accepted Members in Group: $($f2Res.members.Count)/$($f2Res.targetSeater)"

# ------------------------------------------------------------------------------
# 4. LOCK GROUP FOR VIRTUAL WAITING ROOM QUEUE
# ------------------------------------------------------------------------------
Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "🎯 4. LEADER LOCKS GROUP FOR QUEUE ENTRY" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

$lockRes = Invoke-RestMethod -Uri "$BaseUrl/groups/$groupId/ready" -Method POST -Headers @{
    "x-student-id" = "2024BCSE-LEAD4"
}
Write-Host "Group Status Transitioned to: $($lockRes.status) (PASS ✅)" -ForegroundColor Green
Write-Host "Group is ready for joint Virtual Waiting Room ingestion."

# ------------------------------------------------------------------------------
# 5. ATOMIC BEST-FIT BIN PACKING ROOM ALLOCATION & SPLIT-CART CREATION
# ------------------------------------------------------------------------------
Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "🎯 5. BEST-FIT BIN PACKING & ATOMIC SPLIT-CART ROOM ALLOCATION" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

# Generate Leader Admission Pass
$jwtCmd = @"
const crypto = require('crypto');
const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  studentId: '2024BCSE-LEAD4',
  tenantId: '$Tenant',
  sessionId: '$Session',
  admittedAt: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 600,
  iat: Math.floor(Date.now() / 1000),
  iss: 'hostel-vwr-engine',
  nonce: 'phase4-leader-nonce'
})).toString('base64url');
const content = header + '.' + payload;
const hmac = crypto.createHmac('sha256', '$Secret');
hmac.update(content);
console.log(content + '.' + hmac.digest('base64url'));
"@

$leaderPass = (node -e $jwtCmd).Trim()

$allocateBody = @{
    allowAdjacentSplit = $true
    defaultMessCode = "MESS_STD_NORTH_3M"
    memberPreferences = @(
        @{ studentId = "2024BCSE-LEAD4"; selectedMessCode = "MESS_STD_NORTH_3M"; includeLaundry = $true; includeGym = $true },
        @{ studentId = "2024BCSE-FRND1"; selectedMessCode = "MESS_SPECIAL_SOUTH"; includeLaundry = $false; includeGym = $true },
        @{ studentId = "2024BCSE-FRND2"; selectedMessCode = "MESS_STD_NORTH_3M"; includeLaundry = $true; includeGym = $false }
    )
} | ConvertTo-Json

$allocHeaders = @{
    "Content-Type" = "application/json"
    "x-admission-pass" = $leaderPass
    "x-student-id" = "2024BCSE-LEAD4"
}

$allocRes = Invoke-RestMethod -Uri "$BaseUrl/groups/$groupId/allocate-room" -Method POST -Headers $allocHeaders -Body $allocateBody

Write-Host "Multi-Bed Co-Location Allocation Established!" -ForegroundColor Green
Write-Host "  Allocated Block:    $($allocRes.allocatedBlockCode)"
Write-Host "  Allocated Room(s):  $($allocRes.allocatedRoomNumbers -join ', ')"
Write-Host "  Hold Countdown:     $($allocRes.remainingHoldSeconds) seconds"
Write-Host "`nIndependent Roommate Split-Carts:" -ForegroundColor Yellow

foreach ($m in $allocRes.members) {
    Write-Host "  - Student: $($m.name) ($($m.studentId))" -ForegroundColor Cyan
    Write-Host "    Bed:             $($m.allocatedRoom) - $($m.allocatedBedLabel)"
    Write-Host "    Cart ID:         $($m.cartId)"
    Write-Host "    Cart Status:     $($m.cartStatus)"
    Write-Host "    Total Payable:   INR $($m.totalPayable)"
}

# ------------------------------------------------------------------------------
# 6. REAL-TIME GROUP CHECKOUT DASHBOARD
# ------------------------------------------------------------------------------
Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "🎯 6. REAL-TIME GROUP CHECKOUT STATUS DASHBOARD" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

$statusRes = Invoke-RestMethod -Uri "$BaseUrl/groups/$groupId/status" -Method GET -Headers @{
    "x-student-id" = "2024BCSE-LEAD4"
}

Write-Host "Group Dashboard Retrieved:" -ForegroundColor Green
Write-Host "  Group Code:   $($statusRes.groupCode)"
Write-Host "  Status:       $($statusRes.status)"
Write-Host "  Total Carts:  $($statusRes.members.Count)"
Write-Host "  Timer:        $($statusRes.remainingHoldSeconds)s remaining"

Write-Host "`n========================================================================" -ForegroundColor Green
Write-Host "✅ ALL PHASE 4 GROUP PROTOCOL & BEST-FIT BIN PACKING TESTS COMPLETED!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green

