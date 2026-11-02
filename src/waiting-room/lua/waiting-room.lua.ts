/**
 * Redis Lua Scripts for Virtual Waiting Room (VWR)
 *
 * Distributed Systems Rationale:
 * Under 10,000+ concurrent requests across clustered backend pods, non-atomic Redis operations
 * (e.g. separate ZPOPMIN followed by SADD) create race conditions leading to over-admission,
 * phantom slots, or leaked capacity if a pod crashes midway.
 * Redis Lua scripts execute atomically in a single thread, guaranteeing zero race conditions.
 */

/**
 * Atomic Admission Batch Script
 *
 * KEYS[1]: vwr:queue:{tenantId}:{sessionId}     (Sorted Set of waiting students)
 * KEYS[2]: vwr:active:{tenantId}:{sessionId}    (Set of currently active shoppers)
 * KEYS[3]: vwr:active:exp:{tenantId}:{sessionId} (Sorted Set for active session TTL tracking)
 *
 * ARGV[1]: maxCapacity (e.g., 500)
 * ARGV[2]: nowEpochSeconds
 * ARGV[3]: sessionTtlSeconds (e.g., 600)
 * ARGV[4]: batchLimit (e.g., 100)
 *
 * Returns: Array of admitted student IDs
 */
export const ATOMIC_ADMIT_BATCH_LUA = `
-- Step 1: Evict expired active users prior to capacity calculation
local expired = redis.call('ZRANGEBYSCORE', KEYS[3], '-inf', ARGV[2])
for _, studentId in ipairs(expired) do
    redis.call('SREM', KEYS[2], studentId)
    redis.call('ZREM', KEYS[3], studentId)
end

-- Step 2: Calculate actual available slots
local currentActive = redis.call('SCARD', KEYS[2])
local maxCapacity = tonumber(ARGV[1])
local availableSlots = maxCapacity - currentActive

if availableSlots <= 0 then
    return {}
end

-- Step 3: Determine batch slice size
local batchLimit = tonumber(ARGV[4])
local toPopCount = availableSlots
if batchLimit and batchLimit > 0 and batchLimit < toPopCount then
    toPopCount = batchLimit
end

-- Step 4: Atomically pop the top N students from the waiting queue
local popped = redis.call('ZPOPMIN', KEYS[1], toPopCount)
local admitted = {}
local expTime = tonumber(ARGV[2]) + tonumber(ARGV[3])

for i = 1, #popped, 2 do
    local studentId = popped[i]
    redis.call('SADD', KEYS[2], studentId)
    redis.call('ZADD', KEYS[3], expTime, studentId)
    table.insert(admitted, studentId)
end

return admitted
`;

/**
 * Active Session Cleanup Script
 * Evicts expired sessions and frees turnstile slots.
 *
 * KEYS[1]: vwr:active:{tenantId}:{sessionId}
 * KEYS[2]: vwr:active:exp:{tenantId}:{sessionId}
 *
 * ARGV[1]: nowEpochSeconds
 *
 * Returns: Array of evicted student IDs
 */
export const CLEANUP_EXPIRED_ACTIVE_LUA = `
local expired = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', ARGV[1])
local evicted = {}

for _, studentId in ipairs(expired) do
    redis.call('SREM', KEYS[1], studentId)
    redis.call('ZREM', KEYS[2], studentId)
    table.insert(evicted, studentId)
end

return evicted
`;

/**
 * Sliding Window Rate Limiter Script
 * Enforces per-student request throttle regardless of shared NAT IP addresses.
 *
 * KEYS[1]: vwr:ratelimit:{tenantId}:{studentId}
 *
 * ARGV[1]: windowMs (e.g., 60000)
 * ARGV[2]: maxRequests (e.g., 60)
 * ARGV[3]: nowMs (current timestamp in milliseconds)
 * ARGV[4]: uniqueRequestId (UUID or timestamp)
 *
 * Returns: { allowed (1 or 0), currentCount, remainingQuota }
 */
export const SLIDING_WINDOW_RATE_LIMIT_LUA = `
local key = KEYS[1]
local windowMs = tonumber(ARGV[1])
local maxRequests = tonumber(ARGV[2])
local nowMs = tonumber(ARGV[3])
local reqId = ARGV[4]

local clearBefore = nowMs - windowMs
redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)

local currentCount = redis.call('ZCARD', key)

if currentCount < maxRequests then
    redis.call('ZADD', key, nowMs, reqId)
    redis.call('PEXPIRE', key, windowMs)
    return { 1, currentCount + 1, maxRequests - currentCount - 1 }
else
    return { 0, currentCount, 0 }
end
`;

/**
 * Revoke / Consume Admission Pass Script
 * Invoked immediately upon successful booking completion.
 *
 * KEYS[1]: vwr:active:{tenantId}:{sessionId}
 * KEYS[2]: vwr:active:exp:{tenantId}:{sessionId}
 * KEYS[3]: vwr:admission:{tenantId}:{sessionId}:{studentId}
 *
 * ARGV[1]: studentId
 *
 * Returns: 1 if revoked, 0 if not active
 */
export const REVOKE_ADMISSION_PASS_LUA = `
local removedFromActive = redis.call('SREM', KEYS[1], ARGV[1])
redis.call('ZREM', KEYS[2], ARGV[1])
redis.call('DEL', KEYS[3])
return removedFromActive
`;
