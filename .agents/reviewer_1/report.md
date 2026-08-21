# Technical Review Report: Backend, Databases, Redis & Async Background Workers (R5 Evaluation)

**Reviewer:** Reviewer 1 (Backend, Concurrency, Redis, Databases & Background Workers)  
**Target Document:** `f:\htdocs\ProjectRosaura\.agents\CANVAS_AUDIT_REPORT.md`  
**Authoritative Request:** `f:\htdocs\ProjectRosaura\.agents\ORIGINAL_REQUEST.md`  
**Workspace:** `f:\htdocs\ProjectRosaura`  
**Review Mode:** Strict Read-Only Audit  
**Date:** 2026-08-21  
**Verdict:** **VERDICT: APPROVE**

---

## 1. Executive Summary & Verdict

This review report provides an independent, evidence-based technical assessment of the Master Canvas Diagnostic Report (`CANVAS_AUDIT_REPORT.md`), focusing on:
- **Dimension 1: Backend, Databases, Redis & Concurrency (R1)** — Findings **F-01 through F-08**
- **Dimension 3: Background Workers, Redis Streams & Async Processing (R3)** — Findings **BG-01 through BG-05**

### Summary of Assessment
1. **Citation & Line-Level Accuracy:** 100% of the cited file paths, line number ranges, and code implementations across PHP (`api/services/Canvas/`, `config/Database/`, `includes/core/Repositories/`), Python (`scripts/workers/`), and Rust/Lua (`scripts/ws_server/src/`) were independently verified against the actual repository source code. Zero hallucinated or misquoted references were found.
2. **Reproduction Soundness:** All reproduction protocols and concurrency exploit mechanics (TOCTOU race conditions, Redis sparse buffer allocations, dual-database transaction desynchronization, uncoordinated set deletion) are mathematically, temporally, and logically sound.
3. **Mitigation Technical Viability:** Proposed solutions (distributed Redis mutexes, pessimistic MySQL locking, Redis `EXISTS` guards in Lua scripts, `XAUTOCLAIM`/PEL consumer standardization, non-blocking Redis Stream queues for video jobs) are fully viable within the existing project stack without introducing incompatible external dependencies.
4. **Degradation & Failure Handling:** System resilience models for Redis outages, MySQL saturations, Cassandra cluster disconnects, WebSocket partitions, and background daemon crashes are thoroughly explored and appropriately structured.
5. **Integrity & Compliance:** No integrity violations, facade implementations, hardcoded shortcut hacks, or fabricated metrics were detected.

**Final Verdict:** **VERDICT: APPROVE**

---

## 2. Line-by-Line Codebase Verification Matrix

Every finding in Dimensions 1 and 3 was verified against the repository codebase:

| ID | Stated Severity | Claimed Location in Master Report | Verified Location in Codebase | Verification Status | Technical Confirmation Details |
|---|---|---|---|---|---|
| **F-01** | **CRÍTICA** | `CanvasCoreService.php:1403-1450` | `api/services/Canvas/CanvasCoreService.php:1403-1450` | **CONFIRMED** | `countUserOnlineCanvases` is called at L1409 without lock or transaction; `UPDATE canvases SET mode='online', is_online_active=1` occurs at L1448. Classic Check-Then-Act race. |
| **F-02** | **CRÍTICA** | `CanvasCoreService.php:1559-1628` | `api/services/Canvas/CanvasCoreService.php:1559-1628` | **CONFIRMED** | `saveOfflineState` executes `$redis->del("canvas:{$canvasId}:state")` at L1617 and updates `canvas_snapshots` without checking if `$canvas['is_online_active'] == 1` or `$canvas['mode'] === 'online'`. |
| **F-03** | **CRÍTICA** | `CanvasCoreService.php:1486-1557`<br>`lua_scripts.rs:58-60` | `api/services/Canvas/CanvasCoreService.php:1486-1557`<br>`scripts/ws_server/src/lua_scripts.rs:58-60` | **CONFIRMED** | In `deactivateOnline`, PHP reads snapshot, deletes `canvas:{id}:state` at L1516, then emits pub/sub at L1518. In `lua_scripts.rs` L58, `SETRANGE` on missing key creates sparse null buffer up to requested offset. In-flight stream events between get and del are permanently lost. |
| **F-04** | **ALTA** | `CanvasCoreService.php:596,1505`<br>`UserRepository.php:585-630`<br>`worker_canvas_jobs.py:854-883` | `api/services/Canvas/CanvasCoreService.php:596,1505-1514`<br>`includes/core/Repositories/UserRepository.php:585-630`<br>`scripts/workers/worker_canvas_jobs.py:854-883` | **CONFIRMED** | `createCanvas` estimates storage at 5% ($W \times H \times 4 \times 0.05$); `deactivateOnline` and `saveOfflineState` compute 100% of buffer bytes; `calculateDynamicUserStorageBytes` computes 100% + 50KB/snapshot; `worker_canvas_jobs.py` purges S3 snapshots without decrementing `users.storage_used_bytes`. |
| **F-05** | **ALTA** | `CanvasCoreService.php:284-306, 516, 543` | `api/services/Canvas/CanvasCoreService.php:284-306, 516, 543` | **CONFIRMED** | `getCanvas` caches the entire payload including `state_base64` (L516) into `canvas:{id}:meta:user:{userId}` with `TTL_THIRTY_DAYS` (L543). Real-time pixel mutations in Redis do not invalidate this metadata key. |
| **F-06** | **MEDIA** | `CanvasCoreService.php:1446-1450, 1508-1514, 1603-1612` | `api/services/Canvas/CanvasCoreService.php:1446-1450, 1508-1514, 1603-1612` | **CONFIRMED** | Dual MySQL database connections (`db_canvases` and `db_identity`) are updated sequentially without 2PC or compensating transactions; failures between calls cause permanent quota/state skew. |
| **F-07** | **MEDIA** | `RedisCache.php:103-105` | `config/Database/RedisCache.php:103-105, 125-127` | **CONFIRMED** | `acquireLock` returns `bin2hex(random_bytes(16))` when `$this->client` is null or `SYSTEM_DEGRADED` is defined. Callers believe mutex is acquired when no locking occurred (dangerous fail-open). |
| **F-08** | **BAJA** | `worker_persistence.py:116-138, 208-212` | `scripts/workers/worker_persistence.py:116-138, 208-212, 265-268` | **CONFIRMED** | On Cassandra exception, `cassandra_session` is set to `None` (L267), and the loop re-invokes `connect_cassandra()` on every iteration (L208) with zero backoff or sleep timer. |
| **BG-01** | **ALTA** | `worker_persistence.py:302-306` | `scripts/workers/worker_persistence.py:302-306` | **CONFIRMED** | Non-atomic `dirty_canvases_bytes = r.smembers("canvases:dirty_states")` followed by `r.delete("canvases:dirty_states")`. Any concurrent `SADD` occurring in the interval is lost. |
| **BG-02** | **ALTA** | `worker_persistence.py:160-285` | `scripts/workers/worker_persistence.py:160-285` | **CONFIRMED** | `worker_persistence.py` queries streams solely with `'>'` and never calls `XAUTOCLAIM` or queries PEL (`id='0'`). Crashes between `XREADGROUP` and `XACK` abandon pending pixel entries permanently. |
| **BG-03** | **MEDIA** | `CanvasMediaService.php:591-604` | `api/services/Canvas/CanvasMediaService.php:591-604` | **CONFIRMED** | `exportSnapshotTimelapseVideo` executes `@exec($cmd)` synchronously on the web thread searching Windows Python paths, blocking PHP-FPM for 30–60s and triggering HTTP 504. |
| **BG-04** | **MEDIA** | `timelapse_video_renderer.py:1-315`<br>`worker_canvas_jobs.py:102-120` | `scripts/workers/timelapse_video_renderer.py:1-315`<br>`scripts/workers/worker_canvas_jobs.py:102-120` | **CONFIRMED** | Uncompressed RGB24 frame streaming for 4K video generates ~746 MB/s data volume across stdin pipe; `compute_chunk_crc_map` performs NumPy array slicing on 512x512 quadrants. |
| **BG-05** | **BAJA** | `worker_persistence.py:208-212` | `scripts/workers/worker_persistence.py:208-212` | **CONFIRMED** | Identical root cause to F-08: lack of exponential backoff on Cassandra driver re-instantiation in background persistence thread. |

---

## 3. Evaluation of Reproduction Protocols & Concurrency Mechanics

### 3.1. Mathematical & Concurrency Soundness of F-01 (Online Slot Quota Bypass)
- **Mechanics:** The Check-Then-Act window $\Delta t = t_{UPDATE} - t_{SELECT}$ in `activateOnline` spans network latency, user plan query, snapshot retrieval from S3 or blank buffer generation, and Redis cache priming. Under typical load, $\Delta t \in [30\text{ ms}, 120\text{ ms}]$.
- **Concurrent Request Simulation:** When $N$ requests arrive within $\Delta t$, all $N$ requests execute `SELECT count(*) ...` while `is_online_active = 0` for all candidate canvases. All $N$ evaluations evaluate `currentOnlineCount < maxOnlineCanvases` as true. Consequently, $N$ records are transitioned to `is_online_active = 1`.
- **Verdict:** Highly realistic, reproducible in any multi-threaded HTTP test (curl, k6, autocannon).

### 3.2. Soundness of F-03 (SETRANGE Sparse Buffer Corruption)
- **Redis Specification Mechanics:** RFC / Redis core command definition for `SETRANGE key offset value`:
  > *"If the key does not exist, the string is created and considered as empty string. The offset can be larger than the current string size, in which case the string is padded with zero-bytes to fit."*
- **Application Context:** If a canvas of $512 \times 512$ is deactivated (`DEL canvas:C:state`), and a lagging WebSocket client sends a pixel at coordinate $(256, 256)$, offset is $((256 \times 512) + 256) \times 4 = 525,312$ bytes.
- **Corrupted State:** Redis allocates a buffer of $525,316$ bytes where bytes $0 \dots 525,311$ are `0x00` (black/transparent zeroed pixels), completely obliterating the rest of the canvas.
- **Verdict:** Flawless technical demonstration of a subtle, catastrophic Redis edge case.

### 3.3. Soundness of BG-01 (`SMEMBERS` + `DELETE` Race Condition)
- **Concurrency Analysis:**
  - Thread A (Worker): Calls `SMEMBERS canvases:dirty_states` $\to$ receives set $\{C_1, C_2\}$.
  - Thread B (WebSocket / Persistence Loop): Receives pixel for $C_3$, executes `SADD canvases:dirty_states C_3`.
  - Thread A (Worker): Calls `DELETE canvases:dirty_states` $\to$ deletes key containing $\{C_1, C_2, C_3\}$.
  - Result: $C_3$ is never flushed to S3/MySQL until another pixel is painted on $C_3$. If no more pixels are placed, $C_3$'s modifications remain volatile in Redis RAM and are lost on restart.
- **Verdict:** Standard Redis atomicity violation; reproduction script and analysis are mathematically sound.

---

## 4. Technical Viability Assessment of Proposed Mitigations

### 4.1. Distributed Mutex & Database Transaction for `activateOnline` (F-01)
- **Proposed Solution:** Wrap activation in `RedisCache::executeWithLock("user:{$userId}:online_activation_lock", 5, ...)` combined with `SELECT ... FOR UPDATE` in PDO transaction.
- **Viability:**
  - `RedisCache::executeWithLock` already exists in `config/Database/RedisCache.php` (L146-160).
  - MySQL InnoDB engine natively supports `FOR UPDATE` row-level locks on primary key `id`.
  - Zero external packages required. Lock timeout of 5 seconds prevents deadlocks.

### 4.2. Lua Script `EXISTS` Guard in `ws_server` (F-03)
- **Proposed Solution:**
  ```lua
  if redis.call('EXISTS', KEYS[1]) == 0 then
      return {'CANVAS_INACTIVE_ERROR', '0', '0'}
  end
  ```
- **Viability & Rust Compatibility:**
  - Evaluated against `scripts/ws_server/src/actions.rs` L842: `let results: Vec<Vec<String>> = pipe.query_async(&mut redis_conn).await.unwrap_or_default();`.
  - Rust deadpool_redis deserializes Lua tables as `Vec<String>`. Returning `{'CANVAS_INACTIVE_ERROR', '0', '0'}` adheres to the 3-element tuple structure expected by `actions.rs`, preventing type deserialization panics.

### 4.3. Atomic Key Rotation for `canvases:dirty_states` (BG-01)
- **Proposed Solution:** Use `r.rename("canvases:dirty_states", processing_key)` or Lua script to atomically rotate the set.
- **Viability:**
  - Redis `RENAME` is an $O(1)$ atomic operation.
  - While worker processes `processing_key`, any incoming `SADD` safely creates a fresh `canvases:dirty_states` set.
  - Zero loss of dirty canvas IDs.

### 4.4. `ResilientStreamConsumer` Standardization (BG-02)
- **Proposed Solution:** Integrate `xautoclaim` with `min_idle_time=30000` ms into `worker_persistence.py`.
- **Viability:**
  - `worker_canvas_jobs.py` already includes an operational reference implementation of `ResilientStreamConsumer` (L122-260).
  - `redis-py` has native support for `xautoclaim` (Redis 6.2+).
  - Guarantees at-least-once delivery for pixel events to Cassandra.

### 4.5. Asynchronous Timelapse Video Rendering (BG-03)
- **Proposed Solution:** Enqueue video export requests into `stream:canvas_timelapse_video` and let `VideoThread` in `worker_canvas_jobs.py` process them asynchronously.
- **Viability:**
  - Removes blocking `@exec` from PHP-FPM web workers.
  - Client polls status or receives Pub/Sub notification upon S3 upload completion.
  - Completely eliminates HTTP 504 Gateway Timeouts.

---

## 5. Robustness of System Degradation and Failure Scenarios

Section 6 of `CANVAS_AUDIT_REPORT.md` details 5 failure scenarios. Reviewer 1 validates the following:
1. **Redis Downtime (Scenario A):**
   - Correctly flags the dangerous fail-open behavior in `RedisCache::acquireLock` (F-07).
   - Prescribes returning `false` / raising exceptions so that critical sections fail-closed rather than executing without concurrency locks.
2. **MySQL Connection Saturation (Scenario B):**
   - Recommends connection timeouts (3s) and HTTP 503 responses with `Retry-After` headers.
   - Workers back off exponentially to avoid thundering herd on database reboot.
3. **Apache Cassandra Cluster Outage (Scenario C):**
   - Fixes the tight loop reconnect storm (F-08 / BG-05) by applying cooldown timers.
   - Leverages Redis Streams as a reliable buffer with `MAXLEN ~ 100000` to prevent Redis RAM exhaustion during Cassandra recovery.
4. **Python Worker Crash / Restart (Scenario E):**
   - Correctly diagnoses why `worker_canvas_jobs.py` survives restarts (PEL recovery) while `worker_persistence.py` leaves orphaned entries (BG-02).

---

## 6. Adversarial Stress-Testing & Integrity Assessment

### 6.1. Adversarial Challenge Findings
- **Assumption Tested: What if a user rapidly flips a canvas between online and offline?**
  - Under current code: `activateOnline` and `deactivateOnline` can run concurrently for the same canvas. `activateOnline` could initialize Redis while `deactivateOnline` deletes it, leaving MySQL in `mode = 'online'` but Redis with no buffer.
  - The report's proposed per-canvas lock (`canvas:{id}:mode_transition_lock`) and MySQL row locks directly mitigate this edge case.
- **Assumption Tested: What if Cassandra remains down for 24 hours?**
  - Redis memory could grow indefinitely if streams are not trimmed. The report explicitly specifies `MAXLEN` bounding on `canvas:{id}:stream`, preserving in-memory stability.

### 6.2. Integrity & Compliance Attestation
- [x] **No Hardcoded Test Bypasses:** Verified.
- [x] **No Dummy / Facade Implementations:** Verified.
- [x] **No Bypassed Core Requirements:** All 4 original requirements (R1, R2, R3, R4) and deliverable R5 are thoroughly addressed.
- [x] **Strict Read-Only Compliance:** Application source code was not modified during the audit.
- [x] **Accurate Line Citations:** Every referenced line range across all components matches production code.

---

## 7. Conclusion

The Master Canvas Diagnostic Report (`CANVAS_AUDIT_REPORT.md`) represents an exceptionally thorough, technically rigorous, and actionable architectural audit. Dimensions 1 (Backend/Redis/Concurrency) and 3 (Background Workers/Streams/Async) are characterized with surgical precision and supported by sound mathematical models and reproducible proofs of concept.

**FINAL VERDICT:** **VERDICT: APPROVE**
