# Architectural Survey & Audit: Backend & Database Systems (Canvas Engine)

**Target Workspace:** `f:\htdocs\ProjectRosaura`  
**Audit Dimension:** Backend Architecture, MySQL Relational Storage, Cassandra NoSQL History, Redis State & Pub/Sub Layer, Lifecycle Transitions  
**Date:** 2026-08-21  

---

## 1. Executive Architectural Overview

The Canvas subsystem in ProjectRosaura operates as a hybrid real-time stateful collaborative painting engine. It bridges three distinct tiers of data storage and processing:
1. **Relational Tier (MySQL / InnoDB):** Manages metadata, room settings, access control (RBAC), invitations, chat logs, user storage tracking (`db_canvases` and `db_identity`).
2. **In-Memory & Cache Tier (Redis):** Stores active online uncompressed binary RGBA buffers (`canvas:{id}:state`), rate-limiting/cooldown tracking, pub/sub synchronization channels (`admin:canvas_events`, `canvas:sync_events`), and pending task queues.
3. **High-Throughput Time-Series Tier (Apache Cassandra NoSQL):** Captures granular placement history per pixel coordinate (`canvas_pixel_history`) and distributed chat messages (`canvas_chat_messages`).
4. **Object Storage Tier (S3 / MinIO):** Stores compressed active state snapshots (`active_snapshots/canvas_{id}.bin`), timelapse event streams (`timelapses/canvas_{id}_active.jsonl`), and historical snapshots.

```
+---------------------------------------------------------------------------------------------------+
|                                          CLIENTS (Browser)                                        |
+---------------------------------------------------------------------------------------------------+
             | (REST HTTP / JWT)                                     | (WebSocket TCP:8765)
             v                                                       v
+-----------------------------+                           +-------------------------------------+
|   PHP Backend Application   |                           |    Rust WebSocket Server (ws_server)|
| (Controllers, Services,     |                           | (actions.rs, handlers.rs, db.rs,    |
|  Repositories, Middlewares) |                           |  lua_scripts.rs, helpers.rs)        |
+-----------------------------+                           +-------------------------------------+
        |                 |                                             |
        | (PDO / SQL)     | (Predis)                                    | (Deadpool Redis / SETRANGE)
        v                 v                                             v
+------------------+  +-------------------------------------------------------------------------------+
| MySQL (InnoDB)   |  | Redis Server                                                                  |
| - db_canvases    |  | - canvas:{id}:state (Raw RGBA binary buffer: width * height * 4 bytes)        |
| - db_identity    |  | - canvas:{id}:config (Hash: cooldown, lock status)                            |
| - db_telemetry   |  | - canvas:{id}:stream (Redis Stream: pixel placement log)                     |
+------------------+  | - admin:canvas_events (PubSub: administrative state events)                  |
                      | - canvases:dirty_states / pending_snapshots / force_resets                    |
                      +-------------------------------------------------------------------------------+
                                          |                                         |
                       (XREADGROUP Stream)|                      (smembers / S3 Put)|
                                          v                                         v
                      +-------------------------------------------------------------------------------+
                      | Python Background Workers (worker_persistence.py, worker_canvas_jobs.py)      |
                      +-------------------------------------------------------------------------------+
                                          |                                         |
                                          v (CQL Batch Insert)                      v (boto3 PutObject)
                      +--------------------------------------+   +------------------------------------+
                      | Apache Cassandra (db_canvases_nosql) |   | S3 / MinIO Object Storage          |
                      | - canvas_pixel_history               |   | - active_snapshots/canvas_{id}.bin |
                      | - canvas_chat_messages               |   | - snapshots_archive/{uuid}/...     |
                      +--------------------------------------+   +------------------------------------+
```

---

## 2. Component Mapping & Codebase Inventory

### 2.1. Backend Controllers (`api/controllers/Canvas/`)
| Controller | File Path | Responsibilities |
|---|---|---|
| `CanvasCoreController` | `api/controllers/Canvas/CanvasCoreController.php` | Handles core REST endpoints: `get`, `get_chunks`, `create`, `update`, `delete`, `downgrade`, `get_ws_ticket`, `activate_online`, `deactivate_online`, `save_offline_state`, `toggleChat`. |
| `CanvasAccessController` | `api/controllers/Canvas/CanvasAccessController.php` | Access control: `leave`, `join_via_invite`, `list_invites`, `generate_invite`, `revoke_invite`, `request_access`, `approve_request`, `reject_request`, `get_pending_requests`. |
| `CanvasSettingsController` | `api/controllers/Canvas/CanvasSettingsController.php` | Configuration endpoints: `resize`, `get_resize_settings`, `update_resize_settings`, `get_reset_settings`, `update_reset_settings`, `reset_now`, `create_snapshot`, `snapshot_status`, custom roles and permissions CRUD. |
| `CanvasMediaController` | `api/controllers/Canvas/CanvasMediaController.php` | Snapshot gallery, snapshot details, likes, privacy toggles, timelapse MP4 video export dispatch. |
| `CanvasAssetController` | `api/controllers/Canvas/CanvasAssetController.php` | Custom palette CRUD, user template upload/deletion, audio sprite generation. |
| `CanvasChatRestrictionController` | `api/controllers/Canvas/CanvasChatRestrictionController.php` | Canvas room moderation sanctions (mutes, bans, suspensions). |

### 2.2. Backend Services (`api/services/Canvas/`)
| Service | File Path | Key Responsibilities |
|---|---|---|
| `CanvasCoreService` | `api/services/Canvas/CanvasCoreService.php` | Orchestrates metadata retrieval (`getCanvas`), chunk extraction (`getCanvasChunks`), canvas creation/deletion, and state transitions (`activateOnline`, `deactivateOnline`, `saveOfflineState`). |
| `CanvasSettingsService` | `api/services/Canvas/CanvasSettingsService.php` | Executes in-memory matrix resampling for canvas resizing (`resizeCanvas`), manual resets (`resetCanvasNow`), snapshot queueing (`createSnapshot`), and role administration. |
| `CanvasLockManager` | `api/services/Canvas/CanvasLockManager.php` | Evaluates owner subscription tier limits (max canvases, max online rooms, allowed dimensions, custom palettes) and applies `is_subscription_locked`. |
| `CanvasAccessService` | `api/services/Canvas/CanvasAccessService.php` | Permission verification, role hierarchies, invite code generation/redemption, access request approval workflow. |
| `CanvasMediaService` | `api/services/Canvas/CanvasMediaService.php` | Snapshots historical gallery metadata, S3 URL resolution, likes aggregation, and timelapse status. |
| `CanvasAssetService` | `api/services/Canvas/CanvasAssetService.php` | User custom palettes and template metadata management. |
| `CanvasViewService` | `api/services/Canvas/CanvasViewService.php` | Server-rendered view hydration and presentation layer data collation for canvas views. |

### 2.3. Repositories & Database Managers (`includes/core/` & `config/Database/`)
| Component | File Path | Responsibilities |
|---|---|---|
| `CanvasRepository` | `includes/core/Repositories/CanvasRepository.php` | CRUD for MySQL `db_canvases`, S3 active snapshot reading/writing (`getSnapshot`, `saveSnapshot`), cache invalidation dispatch. |
| `UserRepository` | `includes/core/Repositories/UserRepository.php` | User profile management, storage quota tracking (`updateStorageUsed`, `calculateDynamicUserStorageBytes`). |
| `SubscriptionRepository` | `includes/core/Repositories/SubscriptionRepository.php` | Subscription tiers, Stripe customer mapping. |
| `TelemetryRepository` | `includes/core/Repositories/TelemetryRepository.php` | Cassandra telemetry logging (`api_latency`, `websocket_events`, `client_events`). |
| `DatabaseManager` | `config/Database/DatabaseManager.php` | MySQL PDO connection manager supporting multiple connection contexts (`db_canvases`, `db_identity`, `db_advertisements`, `db_telemetry`). |
| `RedisCache` | `config/Database/RedisCache.php` | Predis client wrapper, distributed locking (`acquireLock`, `releaseLock`, `executeWithLock`), and cache invalidation. |
| `CassandraManager` | `config/Database/CassandraManager.php` | Cassandra driver connection manager connecting to keyspace `db_canvases_nosql`. |
| `CacheInvalidator` | `includes/core/System/CacheInvalidator.php` | Centralized Redis cache eviction for users, canvases, member roles, and public feeds. |

---

## 3. Database & Cache Schemas

### 3.1. Relational Database: MySQL (`docker/mysql/init/db_canvases.sql`)
- `canvases`:
  - Primary key: `id` (INT AUTO_INCREMENT), Unique: `uuid` (VARCHAR(36)).
  - Mode & State: `mode` ENUM('offline', 'online') NOT NULL DEFAULT 'offline', `is_online_active` TINYINT(1) DEFAULT 0, `is_subscription_locked` TINYINT(1) DEFAULT 0, `locked_reasons` JSON.
  - Dimensions & Storage: `size` VARCHAR(20) DEFAULT '64', `storage_bytes` BIGINT(20) DEFAULT 0.
  - Limits & Cooldowns: `max_participants` INT(11) DEFAULT 10, `cooldown_pixels_batch` INT(11) DEFAULT 5, `cooldown_seconds` INT(11) DEFAULT 10, `allow_chat` TINYINT(1) DEFAULT 0.
  - Aggregates: `favorites_count` INT(11) DEFAULT 0, `members_count` INT(11) DEFAULT 0, `total_pixels` BIGINT(20) DEFAULT 0, `total_messages` BIGINT(20) DEFAULT 0.
- `canvas_snapshots`:
  - `canvas_id` INT PRIMARY KEY (FK `canvases.id` ON DELETE CASCADE).
  - `s3_key` VARCHAR(255) DEFAULT NULL (Points to `active_snapshots/canvas_{id}.bin`).
  - `snapshot_data` LONGBLOB DEFAULT NULL (Fallback database BLOB storage).
  - `last_updated` TIMESTAMP ON UPDATE CURRENT_TIMESTAMP.
- `canvas_snapshots_history`:
  - `id` INT AUTO_INCREMENT PRIMARY KEY, `snapshot_uuid` VARCHAR(36) UNIQUE.
  - `canvas_id` INT (FK `canvases.id` ON DELETE CASCADE), `file_path` VARCHAR(255), `timelapse_path` VARCHAR(255), `privacy` ENUM('public', 'private').
- `canvas_members`, `canvas_roles`, `canvas_permissions`, `canvas_role_permissions`, `canvas_user_roles`: Role-based access control per room.
- `canvas_protections`: Rectangular protected bounding boxes (`x1, y1, x2, y2, protected_by, expires_at`).
- `canvas_reset_settings` & `canvas_resize_settings`: Automated cron configurations.
- `canvas_invites` & `canvas_access_requests`: Room access authorization queues.
- `canvas_chat_messages`, `canvas_chat_reports`, `canvas_sanctions`: Moderated chat messaging storage.

### 3.2. NoSQL Database: Apache Cassandra (`docker/cassandra/init/db_canvases_nosql.cql`)
- `canvas_pixel_history`:
  - Partition Key: `((canvas_id, x, y))`
  - Clustering Key: `placed_at DESC`
  - Columns: `canvas_id int, x int, y int, placed_at timestamp, user_id int, color_hex text`
  - Purpose: Microsecond-precision historical provenance of every pixel placed on every coordinate.
- `canvas_chat_messages`:
  - Partition Key: `canvas_id`
  - Clustering Key: `created_at DESC, uuid ASC`
  - Columns: `canvas_id int, created_at timestamp, uuid text, user_id int, message text, attachments text, file_size bigint, visibility text, deleted_by text, delete_reason text, reply_to text, reply_to_username text, reply_to_message text`

### 3.3. In-Memory Key Schema: Redis
| Key Pattern | Type | Content / Structure | Lifecycle / Invalidation |
|---|---|---|---|
| `canvas:{id}:state` | String (Binary) | Uncompressed raw RGBA byte buffer (`width * height * 4` bytes). | Created on `activateOnline` or first WebSocket connection; modified via `SETRANGE`; deleted on `deactivateOnline` or `saveOfflineState`. |
| `canvas:{id}:config` | Hash | `cooldown_batch`, `cooldown_seconds`, `is_subscription_locked`. | Set on `activateOnline`/`getCanvas`; deleted on `deactivateOnline`. |
| `canvas:{id}:stream` | Stream | Pixel placement log entries: `(u, x, y, c, type)`. | Added by WebSocket `PAINT_PIXEL_LUA`; consumed, acknowledged, and trimmed by `worker_persistence.py`. |
| `canvas:{id}:protected_areas` | String (JSON) | Array of `{x1, y1, x2, y2, protected_by}` objects. | Synced on room init; invalidated when protections change. |
| `canvas:{id}:freeze_lock` | String ("1") | Indicates canvas is frozen. | Checked on pixel place; deleted on unfreeze. |
| `canvas:{id}:resize_lock` | String ("1") | Lock during dimension change (TTL 60s). | Set during `resizeCanvas`; deleted when resize finishes. |
| `canvas:{id}:snapshot_lock` | String ("1") | Lock during snapshot archiving (TTL 300s). | Set in `createSnapshot`; deleted in `worker_canvas_jobs.py`. |
| `canvas:{id}:user:{uid}:cooldown` | Hash | `b` (balance), `t` (last placement timestamp), `mb` (max batch). | Updated on every pixel placement via token bucket algorithm in Lua. |
| `canvas:online_counts` | Hash | Map of `canvas_id -> count` of active WebSocket connections. | Synced every 5s by `sync_online_counts` in `ws_server`. |
| `canvas:{uuid}:thumbnail_version` | String (Timestamp) | Cache-busting timestamp for web thumbnails. | Updated by Python thumbnail worker upon rendering new WebP. |
| `canvases:dirty_states` | Set | Set of `canvas_id`s with modified state in Redis. | Added on pixel stream ACK; popped by `worker_persistence.py`. |
| `canvases:pending_snapshots` | Set | Set of `canvas_id`s needing thumbnail rendering. | Added on save/paint; processed by `worker_canvas_jobs.py`. |
| `canvases:force_snapshots` | Set | Set of `canvas_id`s requesting manual snapshot history archive. | Added by `createSnapshot`; processed by `worker_canvas_jobs.py`. |
| `canvases:force_resets` | Set | Set of `canvas_id`s requesting forced reset. | Added by `resetCanvasNow`; processed by `worker_canvas_jobs.py`. |
| `admin:canvas_events` | Pub/Sub | Event broadcast: `canvas_mode_changed`, `canvas_cleared`, `canvas_resize_completed`, `canvas_locked`. | Published by PHP and Python; subscribed by Rust `ws_server`. |
| `canvas:sync_events` | Pub/Sub | Cross-node WebSocket broadcast synchronization. | Published and subscribed by Rust `ws_server` instances. |

---

## 4. State Lifecycle & Transition Trace

### 4.1. Transition: Offline -> Online (`activateOnline`)
```
[Client POST /canvases.activate_online]
  -> CanvasCoreController::activate_online()
    -> CanvasCoreService::activateOnline(userId, canvasId)
      1. Fetch canvas from MySQL (db_canvases.canvases).
      2. Verify ownership: (int)canvas['owner_id'] === userId.
      3. Verify tier quota: countUserOnlineCanvases(userId) < planLimits['max_online_canvases'].
      4. Load snapshot: canvasRepository->getSnapshot(canvasId).
         - S3 getObject(active_snapshots/canvas_{id}.bin) -> gzuncompress.
         - If null, allocate blank 4-byte RGBA buffer: str_repeat(chr(0)*4, w*h).
      5. Redis writes:
         - SET canvas:{canvasId}:state <raw_binary_buffer>
         - HMSET canvas:{canvasId}:config cooldown_batch, cooldown_seconds, is_subscription_locked
         - PUBLISH admin:canvas_events {"type":"canvas_mode_changed","canvas_id":id,"mode":"online","is_online_active":1}
      6. MySQL write:
         - UPDATE canvases SET mode='online', is_online_active=1, last_online_at=NOW() WHERE id=?
      7. Typesense upsert (if public).
      8. CacheInvalidator::canvas(canvasId) & userCanvasList(userId).
```

### 4.2. Transition: Online -> Offline (`deactivateOnline`)
```
[Client POST /canvases.deactivate_online]
  -> CanvasCoreController::deactivate_online()
    -> CanvasCoreService::deactivateOnline(userId, canvasId)
      1. Fetch canvas and verify ownership.
      2. Redis read: stateRaw = redis->get("canvas:{canvasId}:state").
      3. If stateRaw exists:
         - canvasRepository->saveSnapshot(canvasId, stateRaw):
           gzcompress(stateRaw) -> S3 putObject(active_snapshots/canvas_{id}.bin)
           UPSERT canvas_snapshots (canvas_id, s3_key, NULL).
         - Storage recalculation:
           newSizeBytes = strlen(stateRaw) [RAW UNCOMPRESSED BYTES]
           oldSizeBytes = canvas['storage_bytes']
           diffBytes = newSizeBytes - oldSizeBytes
           userRepository->updateStorageUsed(owner_id, diffBytes)
           UPDATE canvases SET storage_bytes = newSizeBytes WHERE id = ?
      4. Redis cleanup:
         - DEL canvas:{canvasId}:state
         - DEL canvas:{canvasId}:config
         - PUBLISH admin:canvas_events {"type":"canvas_mode_changed","canvas_id":id,"mode":"offline","is_online_active":0}
      5. MySQL write:
         - UPDATE canvases SET mode='offline', is_online_active=0 WHERE id=?
      6. Typesense delete document.
      7. CacheInvalidator::canvas(canvasId) & userCanvasList(userId).
```

### 4.3. Transition: Offline Save (`saveOfflineState`)
```
[Client POST /canvases.save_offline_state]
  -> CanvasCoreController::save_offline_state()
    -> CanvasCoreService::saveOfflineState(userId, canvasId, stateBase64)
      1. Verify ownership or place_pixels permission.
      2. Decode base64: rawBinary = base64_decode(stateBase64).
      3. Gzip check: if starts with \x1f\x8b, decompress via @gzdecode().
      4. Strict dimension check: strlen(rawBinary) === targetW * targetH * 4.
      5. canvasRepository->saveSnapshot(canvasId, rawBinary).
      6. Storage recalculation:
         newSizeBytes = strlen(rawBinary)
         UPDATE canvases SET storage_bytes = newSizeBytes WHERE id = ?
         userRepository->updateStorageUsed(owner_id, diffBytes)
      7. Redis cleanup:
         - DEL canvas:{canvasId}:state
         - SADD canvases:pending_snapshots canvasId
         - CacheInvalidator::canvas(canvasId)
```

### 4.4. Active State Streaming & Extraction (`getCanvasChunks`)
```
[Client POST /canvases.get_chunks]
  -> CanvasCoreController::get_chunks()
    -> Proxies to Go microservice (or executes CanvasCoreService::getCanvasChunks fallback)
      - Extracts requested 512x512 quadrants from uncompressed RGBA state in Redis via Redis Lua script:
        For each quadrant (cx, cy):
          Calculates startX = cx * 512, startY = cy * 512.
          Iterates rows: offset = ((startY + y) * boardW + startX) * 4.
          GETRANGE canvas:{id}:state offset (offset + rowLen - 1).
          Concatenates rows into chunk buffer -> base64_encode(gzencode(chunkBuffer, 1)).
```

### 4.5. Background Persistence & Snapshot Archiving (`worker_persistence.py`)
```
[Loop every 5 seconds]
  1. Scan Redis keys `canvas:*:stream`.
  2. For each active stream:
     - XREADGROUP group="canvas_workers" consumer="worker-1" count=5000 block=1000.
     - Extract pixel events: (u, x, y, c).
     - Cassandra BatchStatement:
       INSERT INTO canvas_pixel_history (canvas_id, x, y, placed_at, user_id, color_hex).
     - Append to local active timelapse NDJSON: `storage/timelapses/canvas_{id}_active.jsonl`.
     - XACK & XDEL processed message IDs from Redis Stream.
     - SADD canvases:dirty_states canvas_id.
     - Increment MySQL aggregate: UPDATE canvases SET total_pixels = total_pixels + count.
  3. Flush dirty canvases to S3:
     - smembers("canvases:dirty_states") -> delete("canvases:dirty_states").
     - For each canvas_id:
       Fetch Redis state: r.get(f"canvas:{canvas_id}:state").
       Compress: zlib.compress(canvas_bytes).
       S3 upload: active_snapshots/canvas_{id}.bin.
       UPSERT canvas_snapshots in MySQL.
       SADD canvases:pending_snapshots canvas_id.
       Upload active timelapse JSONL to S3: timelapses/canvas_{id}_active.jsonl.
```

---

## 5. Concurrency, Locking & Failure Modes Catalog

### 5.1. Findings Summary Matrix

| ID | Finding Title | Severity | Component Affected | Root Cause Category |
|---|---|---|---|---|
| **F-01** | Subscription Quota Bypass via Concurrent `activateOnline` | **CRITICAL** | `CanvasCoreService.php:1409` | Missing concurrency lock / race condition |
| **F-02** | Active Online State Destruction via Unchecked `saveOfflineState` | **CRITICAL** | `CanvasCoreService.php:1559` | Logic vulnerability / missing state check |
| **F-03** | In-Flight Pixel Loss & Sparse Key Corruption on `deactivateOnline` | **CRITICAL** | `CanvasCoreService.php:1502` / `lua_scripts.rs:58` | Missing draining barrier & unverified `SETRANGE` |
| **F-04** | Drastic Storage Quota Disparity & Permanent User Storage Drift | **HIGH** | `CanvasCoreService.php:596,1505` / `UserRepository.php:585` | Inconsistent calculation metrics (5% vs 100%) |
| **F-05** | Atomic Set Deletion Race Condition in Background Persistence Worker | **HIGH** | `worker_persistence.py:302` | Non-atomic `smembers` + `delete` pattern |
| **F-06** | Stale Pixel Binary Embedded in 30-Day Redis Metadata Cache | **HIGH** | `CanvasCoreService.php:284,543` | Coarse-grained caching of binary state in meta key |
| **F-07** | Dual-Database Cross-Connection Transaction Inconsistency | **MEDIUM** | `CanvasCoreService.php:1508,1608` | Non-atomic multi-database PDO operations |
| **F-08** | Illusory Lock Token Generation during Redis Degradation | **MEDIUM** | `RedisCache.php:104` | Faulty failover / false sense of mutual exclusion |
| **F-09** | Connection Churn on Cassandra Intermittent Outages in Worker | **LOW** | `worker_persistence.py:208` | Inner-loop reconnection storm |

---

### 5.2. Detailed Technical Diagnostic of Findings

#### Finding F-01: Subscription Quota Bypass via Concurrent `activateOnline` [CRITICAL]
- **Affected File:** `api/services/Canvas/CanvasCoreService.php` lines 1403–1450.
- **Detailed Mechanism:**  
  When an owner requests to activate an offline canvas into an online multiplayer room, `CanvasCoreService::activateOnline` executes:
  ```php
  $currentOnlineCount = $this->canvasRepository->countUserOnlineCanvases($userId);
  if ($currentOnlineCount >= $maxOnlineCanvases && empty($canvas['is_online_active'])) {
      return ['success' => false, 'message' => __('err_online_slots_exceeded'), ...];
  }
  ```
  Neither a distributed Redis lock (`RedisCache::executeWithLock`) nor a pessimistic row lock (`SELECT ... FOR UPDATE` or transactional serializability) is used.
  If an automated script or multi-tab user sends $N$ concurrent `canvases.activate_online` requests for different offline canvases simultaneously, all requests execute the `countUserOnlineCanvases` query concurrently before any request writes to MySQL. All requests receive `currentOnlineCount < maxOnlineCanvases`, pass validation, and commit `is_online_active = 1`.
- **Reproduction Steps:**
  1. Set user subscription to Tier 0 (limit: 1 online canvas).
  2. Create 3 offline canvases ($C_1, C_2, C_3$).
  3. Send 3 simultaneous HTTP requests calling `canvases.activate_online` for $C_1, C_2, C_3$.
  4. Query `SELECT id, name, is_online_active FROM canvases WHERE owner_id = :uid`: all 3 canvases are activated (`is_online_active = 1`), completely bypassing the Tier 0 limit.
- **Mitigation Recommendation:**
  Wrap `activateOnline` within a user-level distributed lock in Redis:
  ```php
  $redisCache->executeWithLock("user:{$userId}:online_transition", 5, function() use ($userId, $canvasId) {
      // Transactional check and atomic update
  });
  ```
  Additionally, execute the count and status update inside an atomic database transaction with `SELECT ... FOR UPDATE`.

---

#### Finding F-02: Active Online State Destruction via Unchecked `saveOfflineState` [CRITICAL]
- **Affected File:** `api/services/Canvas/CanvasCoreService.php` lines 1559–1628.
- **Detailed Mechanism:**  
  The endpoint `canvases.save_offline_state` allows clients to upload an offline drawing state. In `CanvasCoreService::saveOfflineState`:
  ```php
  $this->canvasRepository->saveSnapshot($canvasId, $rawBinary);
  ...
  if (class_exists(RedisCache::class)) {
      $redis = (new RedisCache())->getClient();
      if ($redis) {
          $redis->del("canvas:{$canvasId}:state"); // CRITICAL: Unconditionally deletes Redis key!
          $redis->sAdd('canvases:pending_snapshots', (string)$canvasId);
      }
  }
  ```
  The service fails to check if `$canvas['mode'] === 'online'` or `$canvas['is_online_active'] == 1`.
  If a canvas is active online with 50 participants drawing, and an owner (or editor with `place_pixels` permission) leaves an offline tab open that subsequently auto-saves or manually submits `saveOfflineState`, the active online state in Redis is wiped out and overwritten with the stale offline snapshot.
- **Reproduction Steps:**
  1. Open canvas $C_1$ in Online mode and place pixels with multiple users.
  2. In another tab or API client, send a POST request to `canvases.save_offline_state` with payload `{canvas_id: C_1, state_base64: "..."}`.
  3. Redis key `canvas:C_1:state` is deleted.
  4. Active online users immediately see the canvas revert or crash on subsequent pixel placements.
- **Mitigation Recommendation:**
  Reject `saveOfflineState` if the canvas is currently online:
  ```php
  if (($canvas['mode'] ?? 'offline') === 'online' || !empty($canvas['is_online_active'])) {
      return ['success' => false, 'message' => __('err_canvas_is_online_mode'), 'http_code' => 409];
  }
  ```

---

#### Finding F-03: In-Flight Pixel Loss & Sparse Key Corruption on `deactivateOnline` [CRITICAL]
- **Affected File:** `api/services/Canvas/CanvasCoreService.php` lines 1486–1557 and `scripts/ws_server/src/lua_scripts.rs` lines 58–60.
- **Detailed Mechanism:**  
  When `deactivateOnline` executes, it performs:
  1. `stateRaw = $redis->get("canvas:{$canvasId}:state");`
  2. `saveSnapshot($canvasId, $stateRaw);`
  3. `$redis->del("canvas:{$canvasId}:state");`
  4. `$redis->publish("admin:canvas_events", json_encode(['type' => 'canvas_mode_changed', 'mode' => 'offline']));`
  
  Three critical flaws occur concurrently:
  1. **In-Flight Loss:** Pixels drawn between step 1 (`get`) and step 3 (`del`) exist in Redis memory but are deleted by `del` before being written to S3.
  2. **WebSocket `SETRANGE` Buffer Corruption:** The WebSocket server's Lua script executes:
     `redis.call('SETRANGE', KEYS[1], tonumber(ARGV[1]), ARGV[2])`
     In Redis, if `SETRANGE` is called on a non-existent key, Redis automatically creates a zero-filled binary string up to the target offset. If a user draws a pixel at coordinate $(500, 500)$ right after `del` executes, Redis allocates an empty buffer filled with null bytes up to byte offset $1,000,000$, destroying the rest of the canvas.
  3. **No Graceful Disconnect / Drain:** The WebSocket server broadcasts `canvas_mode_changed` but does not terminate active client connections or drain pending streams.
- **Reproduction Steps:**
  1. Generate high-frequency pixel placements (e.g. 50 pixels/sec) via WebSocket on canvas $C_1$.
  2. Simultaneously call `canvases.deactivate_online`.
  3. Inspect S3 snapshot vs Cassandra pixel history: the last 1-3 seconds of placed pixels are absent from the S3 snapshot.
- **Mitigation Recommendation:**
  Implement a 3-step state drain protocol:
  1. Acquire transition lock `canvas:{id}:transition_lock`.
  2. Publish `canvas_freeze` / `canvas_closing` event to WebSocket server to halt new pixel inputs and close client sockets.
  3. Drain `canvas:{id}:stream` and wait 500ms for pending worker flush, then persist snapshot and safely delete keys.

---

#### Finding F-04: Drastic Storage Quota Disparity & Permanent User Storage Drift [HIGH]
- **Affected Files:**
  - `api/services/Canvas/CanvasCoreService.php` lines 596, 1505–1514, 1599–1612.
  - `includes/core/Repositories/UserRepository.php` lines 585–630.
  - `scripts/workers/worker_canvas_jobs.py` lines 854–883.
- **Detailed Mechanism:**
  1. In `createCanvas()`:
     `$estimatedStorageBytes = max(4096, (int)(($targetW * $targetH * 4) * 0.05));` (5% estimation, e.g. 52,428 bytes for 512x512).
     `canvases.storage_bytes` is set to 52,428 bytes, and `users.storage_used_bytes` is incremented by 52,428 bytes.
  2. In `deactivateOnline()` and `saveOfflineState()`:
     `$newSizeBytes = strlen($stateRaw);` (100% uncompressed raw size, e.g. 1,048,576 bytes).
     `$diffBytes = $newSizeBytes - $oldSizeBytes;` (adds 996,148 bytes to user storage).
  3. In `calculateDynamicUserStorageBytes()` (used when recalculating storage):
     `$totalBytes += ($w * $h * 4);` (100% uncompressed raw size) + `$snapshotCount * 50 * 1024`.
  4. In `worker_canvas_jobs.py`:
     When historical snapshots are purged to enforce quota limits, the records are deleted from MySQL and S3, but `users.storage_used_bytes` is **never decremented**.
  5. In `deleteCanvas()`:
     Deducts `canvases.storage_bytes`. If the canvas was never deactivated or saved offline, it deducts only 5%, leaving the user's storage ledger permanently out of sync.
- **Mitigation Recommendation:**
  Standardize storage accounting across the entire platform:
  - Define a canonical calculation rule: Either track uncompressed allocation (`width * height * 4`) consistently, or track actual compressed S3 object bytes (`gzcompress`).
  - Create a single helper method `StorageAccountingService::recordDelta($userId, $bytesDelta)` and attach triggers/listeners on snapshot creation, pruning, and canvas deletion.

---

#### Finding F-05: Atomic Set Deletion Race Condition in Background Persistence Worker [HIGH]
- **Affected File:** `scripts/workers/worker_persistence.py` lines 302–306.
- **Detailed Mechanism:**
  ```python
  dirty_canvases_bytes = r.smembers("canvases:dirty_states")
  if dirty_canvases_bytes:
      r.delete("canvases:dirty_states")
      for canvas_id_bytes in dirty_canvases_bytes:
          ...
  ```
  The combination of `smembers` followed by `delete` is non-atomic.
  If another thread or worker adds a new canvas ID via `r.sadd("canvases:dirty_states", new_canvas_id)` during the microsecond interval between `smembers` and `delete`, the newly added canvas ID will be erased by `delete` without ever having been read into `dirty_canvases_bytes`. That canvas's state will remain unflushed in Redis indefinitely until another pixel happens to be placed on it.
- **Mitigation Recommendation:**
  Use an atomic Lua script or Redis `SPOP` in a loop / atomic rename:
  ```python
  # Atomically move the dirty set to a processing key
  r.rename("canvases:dirty_states", f"canvases:processing_{worker_id}")
  dirty_canvases = r.smembers(f"canvases:processing_{worker_id}")
  # Process and finally delete the processing key
  r.delete(f"canvases:processing_{worker_id}")
  ```

---

#### Finding F-06: Stale Pixel Binary Embedded in 30-Day Redis Metadata Cache [HIGH]
- **Affected File:** `api/services/Canvas/CanvasCoreService.php` lines 284–306, 516, 543.
- **Detailed Mechanism:**
  In `getCanvas()`:
  ```php
  $canvas['state_base64'] = base64_encode(gzencode($stateRaw, 6));
  ...
  $result = ['success' => true, 'data' => $canvas];
  $redis->setex($cacheKey, CacheConstants::TTL_THIRTY_DAYS, json_encode($result));
  ```
  For non-progressive canvases, the full binary pixel state is encoded inside `$result` and cached in Redis under `canvas:{id}:meta:user:{userId}` with a 30-day TTL.
  When users place pixels in online mode via WebSocket, only `canvas:{id}:state` is modified in Redis; metadata caches are not invalidated on every pixel placement.
  If a user reloads the canvas page or calls `getCanvas()`, they hit the cache and receive the stale initial `state_base64`.
- **Mitigation Recommendation:**
  Decouple binary state from metadata caching:
  - Do NOT store `state_base64` in `canvas:{id}:meta:user:{userId}`.
  - Fetch metadata from cache and always read the current binary buffer dynamically from `canvas:{id}:state` (or S3 snapshot fallback) on demand.

---

#### Finding F-07: Dual-Database Cross-Connection Transaction Inconsistency [MEDIUM]
- **Affected File:** `api/services/Canvas/CanvasCoreService.php` lines 1446–1450, 1508–1514, 1603–1612.
- **Detailed Mechanism:**
  The application utilizes separate PDO database instances for `db_canvases` and `db_identity`. In `deactivateOnline` and `saveOfflineState`, updates to `canvases` and updates to `users.storage_used_bytes` occur across two independent connections without a distributed transaction coordinator. If the server terminates (e.g. timeout, memory limit, DB connection drop) after updating `canvases` but before updating `users`, the database state becomes permanently inconsistent.
- **Mitigation Recommendation:**
  Encapsulate multi-database updates in try-catch blocks with explicit compensatory rollback handlers or enqueue storage delta updates in a reliable Redis Stream / background job queue.

---

#### Finding F-08: Illusory Lock Token Generation during Redis Degradation [MEDIUM]
- **Affected File:** `config/Database/RedisCache.php` lines 103–105.
- **Detailed Mechanism:**
  ```php
  public function acquireLock(string $name, int $timeoutSeconds = 5) {
      if (!$this->client || defined('SYSTEM_DEGRADED')) {
          return bin2hex(random_bytes(16)); // Returns fake valid token!
      }
  ```
  When Redis is unavailable or in degraded mode, `acquireLock` returns a random 32-character token claiming success. Callers invoking `executeWithLock` assume they hold exclusive mutual exclusion and proceed to execute non-thread-safe critical sections concurrently.
- **Mitigation Recommendation:**
  Return `false` or throw an exception when Redis is degraded to prevent uncoordinated concurrent operations on critical resources:
  ```php
  if (!$this->client || defined('SYSTEM_DEGRADED')) {
      return false;
  }
  ```

---

#### Finding F-09: Connection Churn on Cassandra Intermittent Outages in Worker [LOW]
- **Affected File:** `scripts/workers/worker_persistence.py` lines 116–138, 208–212.
- **Detailed Mechanism:**
  When inserting pixel batches, if Cassandra is unreachable, `cassandra_session` is set to `None`. On every iteration of the stream processing loop, `connect_cassandra()` is invoked immediately without exponential backoff. During a prolonged Cassandra outage, this causes CPU thrashing and socket exhaustion from repeated connection timeouts.
- **Mitigation Recommendation:**
  Implement a backoff cooldown timer (e.g. wait 15 seconds before attempting Cassandra reconnection).

---

## 6. Architecture & Concurrency Recommendations

1. **Strict State Machine for Canvas Modes:**
   Enforce state invariants at the database and service layer:
   ```
   [OFFLINE] <== (activateOnline: requires user lock + tier check) ==> [ONLINE]
      |                                                                    |
      +-- (saveOfflineState: rejected if online)                           +-- (deactivateOnline: drain -> flush -> del)
   ```
2. **Atomic Set Operations in Python Workers:**
   Replace `smembers` + `delete` with atomic key rotation (`RENAME`) or Redis Streams for persistence queues.
3. **Decouple Binary State from REST Metadata Caching:**
   Strip large binary blobs (`state_base64`) from long-lived JSON metadata caches in Redis.
4. **Canonical Storage Accounting:**
   Harmonize storage byte accounting across MySQL `canvases.storage_bytes`, `users.storage_used_bytes`, S3 historical snapshots, and template uploads.
