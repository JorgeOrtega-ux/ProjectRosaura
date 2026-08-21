# Handoff Report: Phase 0 Backend & Database Architectural Survey

**Agent Directory:** `f:\htdocs\ProjectRosaura\.agents\explorer_survey_backend\`  
**Date:** 2026-08-21  
**Status:** COMPLETE (Hard Handoff)  
**Report Artifact:** `f:\htdocs\ProjectRosaura\.agents\explorer_survey_backend\report.md`  

---

## 1. Observation

### Exact File Paths & Code Line Numbers:
1. **`api/services/Canvas/CanvasCoreService.php`**
   - Lines 1409–1416: `countUserOnlineCanvases($userId)` is called without distributed locks or `SELECT ... FOR UPDATE` before updating `is_online_active = 1`.
   - Lines 1502–1525: `deactivateOnline` reads `canvas:{$canvasId}:state` from Redis, uploads to S3, and immediately executes `$redis->del("canvas:{$canvasId}:state")` without pausing WebSocket writes or acquiring a draining lock.
   - Lines 1559–1572: `saveOfflineState` does not verify if the canvas is currently in `online` mode, and line 1617 deletes `canvas:{$canvasId}:state` from Redis.
   - Lines 284–306, 516, 543: `getCanvas` encodes `$canvas['state_base64'] = base64_encode(gzencode($stateRaw, 6))` inside the metadata payload and caches it in Redis under `canvas:{$canvasId}:meta:user:{$userId}` with a 30-day TTL (`CacheConstants::TTL_THIRTY_DAYS`).
   - Line 596: `createCanvas` estimates storage as `$estimatedStorageBytes = max(4096, (int)(($targetW * $targetH * 4) * 0.05))` (5% of raw bytes), whereas lines 1505 and 1599 set `storage_bytes` to `strlen($stateRaw)` (100% of raw uncompressed bytes).

2. **`config/Database/RedisCache.php`**
   - Lines 103–105:
     ```php
     if (!$this->client || defined('SYSTEM_DEGRADED')) {
         return bin2hex(random_bytes(16)); 
     }
     ```
     `acquireLock` generates a fake 32-character random string pretending the lock was acquired when Redis is offline or degraded.

3. **`scripts/workers/worker_persistence.py`**
   - Lines 302–306:
     ```python
     dirty_canvases_bytes = r.smembers("canvases:dirty_states")
     if dirty_canvases_bytes:
         r.delete("canvases:dirty_states")
     ```
     Non-atomic set retrieval and deletion causing potential loss of newly added dirty canvas keys.
   - Lines 208–212: Reconnection attempts to Cassandra executed on every iteration without backoff timer.

4. **`scripts/ws_server/src/lua_scripts.rs`**
   - Lines 58–59:
     ```lua
     redis.call('SETRANGE', KEYS[1], tonumber(ARGV[1]), ARGV[2])
     redis.call('XADD', KEYS[4], '*', 'u', ARGV[6], 'x', ARGV[7], 'y', ARGV[8], 'c', ARGV[9])
     ```
     `SETRANGE` executed on `KEYS[1]` (`canvas:{id}:state`) without checking if the key exists, causing zero-filled sparse byte strings if the key was previously deleted.

5. **`includes/core/Repositories/UserRepository.php`**
   - Lines 585–630: `calculateDynamicUserStorageBytes` calculates user storage by summing uncompressed raw canvas buffers (`width * height * 4`), 50KB per snapshot history record, uploaded template sizes, and avatar sizes.

---

## 2. Logic Chain

1. **Quota Bypass Logic:**
   - *Observation:* `countUserOnlineCanvases` in `CanvasCoreService.php:1409` reads MySQL state without a transaction or lock.
   - *Inference:* Multiple concurrent requests for different canvases by the same user will all observe `currentOnlineCount < limit` simultaneously.
   - *Conclusion:* Subscription limits on active online rooms are bypassable via concurrent requests.

2. **State Destruction & Corruption Logic:**
   - *Observation:* `saveOfflineState` in `CanvasCoreService.php:1559` deletes `canvas:{$canvasId}:state` from Redis without checking `mode`.
   - *Observation:* `SETRANGE` in `lua_scripts.rs:58` auto-allocates null-padded memory up to target offset if the key does not exist.
   - *Inference:* If an offline tab auto-saves or a member calls `saveOfflineState` while a canvas is active online, the Redis state is deleted. The next WebSocket pixel placement triggers `SETRANGE` on an empty key, allocating null bytes up to the pixel offset and destroying the collaborative canvas drawing.
   - *Conclusion:* The absence of mode guardrails creates a high-severity data destruction vulnerability.

3. **Storage Metric Drift Logic:**
   - *Observation:* `createCanvas` records 5% storage byte size in `canvases.storage_bytes` and `users.storage_used_bytes`.
   - *Observation:* `deactivateOnline` and `saveOfflineState` record 100% of raw byte size in `canvases.storage_bytes` and increment `users.storage_used_bytes` by the difference.
   - *Observation:* `worker_canvas_jobs.py` purges snapshots on quota limits without decrementing `users.storage_used_bytes`.
   - *Inference:* As canvases transition between online and offline, or as snapshots are created and pruned, `users.storage_used_bytes` drifts drastically from actual S3/DB footprint.
   - *Conclusion:* User storage quotas will prematurely block users or present inaccurate account metrics.

4. **Cache Staleness Logic:**
   - *Observation:* `getCanvas` caches `$result` (including `state_base64`) under `canvas:{id}:meta:user:{uid}` for 30 days.
   - *Observation:* WebSocket painting modifies `canvas:{id}:state` but does not invalidate `canvas:{id}:meta:user:*`.
   - *Inference:* Subsequent API calls to `getCanvas` return stale drawing state until an administrative update or deactivation occurs.
   - *Conclusion:* Metadata caching must be decoupled from the binary pixel buffer.

---

## 3. Caveats

- **Load Profile Assumptions:** The severity of in-flight pixel loss during `deactivateOnline` is proportional to placement concurrency at the moment of deactivation; during idle periods, data loss is minimal.
- **Go Microservice Chunks Proxy:** `CanvasCoreController::get_chunks` proxies to `http://rosaura_go_service:8080/api/go/canvases/get_chunks` when available, with PHP `CanvasCoreService::getCanvasChunks` acting as fallback. Both rely on Redis `GETRANGE` Lua routines.
- **No Alteration Constraint:** In accordance with the Explorer subagent constraints, no source code files or database structures were modified during this investigation.

---

## 4. Conclusion

The Backend & Database architecture of the Canvas System possesses robust fundamental building blocks (multi-database MySQL isolation, Cassandra time-series clustering, Predis/Deadpool connection pools, Redis Streams for worker queues). However, it suffers from critical concurrency vulnerabilities and state transition gaps:
1. **Lack of Concurrency Guardrails:** `activateOnline`, `deactivateOnline`, and `saveOfflineState` lack distributed locking and mutual exclusion.
2. **Missing State Invariant Enforcement:** `saveOfflineState` does not reject requests when a canvas is online, allowing active multiplayer room memory destruction.
3. **Data Desynchronization:** Storage byte calculations vary from 5% to 100% depending on lifecycle state, and historical snapshot purges never decrement user storage.
4. **Cache Pollution:** Long-lived Redis metadata caches inadvertently store obsolete binary pixel buffers.

Detailed mitigation steps for each issue are cataloged in `report.md`.

---

## 5. Verification Method

To independently verify all findings:
1. **Codebase Inspection:**
   - Inspect `api/services/Canvas/CanvasCoreService.php` lines 1393–1628.
   - Inspect `config/Database/RedisCache.php` lines 102–115.
   - Inspect `scripts/workers/worker_persistence.py` lines 300–345.
   - Inspect `scripts/ws_server/src/lua_scripts.rs` lines 50–65.
2. **Concurrency Simulation Test (Script):**
   - Run a concurrency test script sending 5 parallel `canvases.activate_online` requests on a Tier 0 account to demonstrate quota bypass.
   - Run a test calling `canvases.save_offline_state` on an active online canvas to confirm `canvas:{id}:state` deletion in Redis.
3. **Storage Calculation Verification:**
   - Create a canvas, check `canvases.storage_bytes` (5% estimation).
   - Deactivate online, check `canvases.storage_bytes` (100% raw buffer).
