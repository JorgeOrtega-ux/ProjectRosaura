# Handoff Report: Phase 0 - Survey & Architectural Mapping (Background Workers, Redis Streams, Async Jobs & Security/Permissions)

**Agent**: explorer_survey_async_sec  
**Type**: Hard Handoff (Task Complete)  
**Date**: 2026-08-21T17:38:00Z  
**Target Report**: `f:\htdocs\ProjectRosaura\.agents\explorer_survey_async_sec\report.md`

---

## 1. Observation

Direct observations made during codebase inspection:

1. **Redis Streams & Consumer Groups Architecture**:
   - `scripts/workers/worker_canvas_jobs.py:122-308`: Implements `ResilientStreamConsumer` which connects to streams (`stream:canvas_resizes`, `stream:canvas_resets`, `stream:canvas_draw_image`, `stream:canvas_timelapse_video`), inspects PEL on consumer startup (`xreadgroup` ID `'0'`), executes `xautoclaim` every 30s (`claim_idle_ms=60000..300000`), performs `xack` & `xdel`, tracks delivery count via `xpending_range`, routes failed tasks (> 3 retries) to `stream:dead_letter` and `queue:dead_letter`, and publishes `job_dlq_alert` to `admin:canvas_events`.
   - `scripts/workers/worker_persistence.py:160-285`: Consumes `canvas:*:stream` with group `canvas_workers` and hardcoded consumer `CONSUMER_NAME = "worker-1"`. It only queries `'>'` without checking PEL with `'0'` or running `XAUTOCLAIM`.
   - `scripts/workers/worker_canvas_jobs.py:983-1076`: `thumbnails_thread` polls the Redis Set `canvases:pending_snapshots` every `SYNC_INTERVAL` (10s) via `smembers`.

2. **Thumbnail, Video Timelapse & Signature Pipelines**:
   - `scripts/workers/worker_canvas_jobs.py:802-980` (`process_canvas_image`): Decompresses zlib state, resizes to max 512px WebP quality 80, uploads to S3 `thumbnails/canvas_{uuid}.webp`, checks snapshot quota per tier via `get_max_snapshots_per_tier(owner_tier)` (Free: 10, Pro: 25, Ultra: 100, Master: Unlimited), purges oldest historical snapshots when limit exceeded, generates 2048px PNG archive, freezes active timelapse JSONL `snapshots_timelapse/{uuid}/{snap_uuid}.jsonl` to S3, and records entry in MySQL `canvas_snapshots_history`.
   - `scripts/workers/timelapse_video_renderer.py:50-303` (`render_timelapse_to_mp4`): Parses JSONL events into a memory bytearray board, smoothly interpolates virtual camera on resizes (`zoom_smoothing = 0.15`), feeds raw RGB24 frames to FFmpeg subproces (`-threads 2`, `-pix_fmt yuv420p`, `-preset veryfast`), and terminates deadlocked processes via `kill_process_safely(proc)`.
   - `scripts/workers/worker_canvas_jobs.py:102-120` (`compute_chunk_crc_map`): Slices numpy array in 512x512 quadrants, computes `zlib.crc32(chunk_slice.tobytes()) & 0xffffffff`, and returns 8-character hex signature map.

3. **Security, Constants & Permissions Hierarchy**:
   - `includes/core/System/CanvasPermissionsConstants.php:1-17`: Defines 10 granular constants (`PLACE_PIXELS`, `MANAGE_SETTINGS`, `MANAGE_MEMBERS`, `MANAGE_ROLES`, `ASSIGN_ROLES`, `VIEW_HISTORY`, `MANAGE_RESETS`, `MANAGE_SANCTIONS`, `MANAGE_INVITES`, `CREATE_SNAPSHOTS`).
   - `includes/core/System/SubscriptionPlanConstants.php:1-280`: Defines feature flags (`feat_advanced_roles`, `feat_chat_restriction`, `feat_custom_palettes`, `feat_unlimited_exports`, `feat_inject_templates`, `feat_live_share`, `feat_no_ads`, `feat_download_4k`) and numeric quotas (`max_canvases`, `max_online_canvases`, `max_storage_mb`, `max_snapshots_per_canvas`, etc.). Caches tier list in Redis `KEY_SUBSCRIPTION_TIERS_ALL`.

4. **Authorization & State Transition Vulnerabilities**:
   - `api/services/Canvas/CanvasCoreService.php:74-98` (`generateWsTicket`): Validates only `$isOffline`. Does NOT verify if `$canvas['privacy'] === 'private'` nor check if caller has membership roles (`isMember` / `getMemberRoles`). Contrast with `validateCanvasAccess` (L41-68) which properly validates privacy.
   - `api/services/Canvas/CanvasCoreService.php:1393-1418` (`activateOnline`): Validates `$currentOnlineCount >= $maxOnlineCanvases` without a Redis distributed lock or database row lock, allowing concurrent activations to bypass plan limits.
   - `api/services/Canvas/CanvasCoreService.php:1486-1526` (`deactivateOnline`): Reads Redis state, updates snapshot, and calls `$redis->del("canvas:{$canvasId}:state")` without waiting for `worker_persistence.py` to flush in-flight stream events.
   - `api/services/Canvas/CanvasCoreService.php:1559-1620` (`saveOfflineState`): Does not verify if `is_online_active == 1`, allowing an offline state to overwrite MySQL and delete `canvas:{$canvasId}:state` from Redis while active online users are drawing.
   - `api/services/Canvas/CanvasMediaService.php:591-604` (`exportSnapshotTimelapseVideo`): Tries to execute `timelapse_video_renderer.py` synchronously via `exec()` using a hardcoded Windows path before queuing to Redis Stream.

---

## 2. Logic Chain

1. **From Observation 4 (`generateWsTicket`)**:
   - `CanvasCoreController::get_ws_ticket` calls `CanvasCoreService::generateWsTicket($userId, $canvasId)`.
   - `generateWsTicket` queries `getById($canvasId)` and only rejects if `$isOffline`.
   - If `$canvas['privacy'] === 'private'`, `generateWsTicket` does not check `$canvas['owner_id']` or `$this->canvasRepository->getMemberRoles(...)`.
   - `generateWsTicket` signs a JWT token with `canvas_id` and returns it.
   - Rust `ws_server` validates the JWT token's signature, expiration, and `canvas_id`, and admits the connection to the room.
   - **Conclusion**: Any authenticated or guest user can join any private online canvas's WebSocket channel by calling `get_ws_ticket`.

2. **From Observation 4 (`activateOnline`)**:
   - `activateOnline` queries `$currentOnlineCount = $this->canvasRepository->countUserOnlineCanvases($userId)`.
   - If two requests are sent concurrently for Canvas A and Canvas B, both read `count = 0` (for a Free plan limit of 1).
   - Both proceed to execute `UPDATE canvases SET is_online_active = 1`.
   - **Conclusion**: A user can exceed their subscription plan quota for online canvases via concurrent activation requests.

3. **From Observation 4 (`saveOfflineState`)**:
   - `saveOfflineState` verifies user permission `PLACE_PIXELS`.
   - It decodes base64, tests gzip magic bytes `\x1f\x8b`, checks byte count against `width * height * 4`, and writes snapshot to MySQL.
   - It executes `$redis->del("canvas:{$canvasId}:state")`.
   - It does not check if `$canvas['is_online_active'] == 1`.
   - **Conclusion**: An offline save request sent to an active online canvas wipes the live Redis buffer for connected WebSocket users and corrupts live drawing state.

4. **From Observation 1 & 2 (Workers & Video Rendering)**:
   - `worker_canvas_jobs.py` handles resizes, resets, thumbnails, and video exports in dedicated threads.
   - `ResilientStreamConsumer` handles consumer group crashes gracefully.
   - `worker_persistence.py` lacks auto-claim and uses a static consumer name.
   - `CanvasMediaService` attempts synchronous `exec()` rendering before queueing, creating web worker thread starvation under load.
   - **Conclusion**: Video rendering must be purely asynchronous, and stream consumer resilience should be standardized across all Python workers.

---

## 3. Caveats

1. **Runtime Execution**: This was a static code survey and architectural analysis. No live load-testing or simulated network failure benchmarks were executed.
2. **Go Microservice**: `api/controllers/Canvas/CanvasCoreController.php:42-86` forwards `get_chunks` to `rosaura_go_service:8080/api/go/canvases/get_chunks`. The Go service's internal implementation was surveyed from `docker/go/main.go` and verified to stream chunk buffers directly.
3. **Third-Party Integrations**: S3/MinIO operations, Stripe webhooks, and Turnstile validations were analyzed from their respective interface points in code.

---

## 4. Conclusion

The background workers and async processing architecture in ProjectRosaura show solid designs (such as `ResilientStreamConsumer` in `worker_canvas_jobs.py`, SIMD/NumPy vectorized matrix manipulation, and IEEE 802.3 CRC32 quadrant hashing). However, there are **6 critical and high-priority logic and security vulnerabilities**:
1. **Critical**: Authorization bypass in `generateWsTicket` allowing unauthorized access to private WebSocket rooms.
2. **High**: Race condition in `activateOnline` permitting evasion of online canvas subscription limits.
3. **High**: In-flight pixel loss during `deactivateOnline` due to premature Redis key deletion.
4. **Medium**: `saveOfflineState` overwriting active online canvas states.
5. **Medium**: Synchronous `exec()` video rendering in web API causing HTTP 504 timeouts.
6. **Low**: Non-resilient static stream consumer in `worker_persistence.py`.

---

## 5. Verification Method

To independently verify all findings:

1. **Verify WebSocket Ticket Authorization Flaw**:
   - Inspect `api/services/Canvas/CanvasCoreService.php:74-98`.
   - Confirm lack of privacy check (`$canvas['privacy']`) and lack of call to `validateCanvasAccess` or `getMemberRoles`.
2. **Verify Online Activation Race Condition**:
   - Inspect `api/services/Canvas/CanvasCoreService.php:1393-1418`.
   - Confirm absence of Redis mutex (`SET NX EX`) or database transaction around `countUserOnlineCanvases` and `UPDATE canvases`.
3. **Verify Offline Save Overwrite on Active Online Canvas**:
   - Inspect `api/services/Canvas/CanvasCoreService.php:1559-1620`.
   - Confirm absence of `is_online_active` check and the unconditional `$redis->del("canvas:{$canvasId}:state")` at L1617.
4. **Verify Synchronous Video Exec**:
   - Inspect `api/services/Canvas/CanvasMediaService.php:591-604`.
   - Confirm presence of `exec($cmd)` with hardcoded Windows Python binary before Redis Stream enqueueing at L643.
5. **Verify Python Stream Resiliency**:
   - Compare `scripts/workers/worker_canvas_jobs.py:122-308` (`ResilientStreamConsumer`) with `scripts/workers/worker_persistence.py:160-285`.
