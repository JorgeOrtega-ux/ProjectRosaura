# Project: Canvas System Technical Audit & Diagnostic (ProjectRosaura)

## Architecture Overview
The Canvas (Lienzo) system in ProjectRosaura provides collaborative multi-user pixel-art editing with dual operating modes:
1. **Offline Studio Mode**: Single-user editing in browser RAM with periodic compressed gzip base64 payload uploads via HTTP REST (`SaveOfflineState`).
2. **Online Multiplayer Mode**: Real-time collaborative canvas backed by a high-performance Rust WebSocket server (`ws_server`), Redis binary string state (`canvas:{id}:state`), Redis Streams (`canvas:{id}:stream`), Python persistence workers (`worker_persistence.py`), and background processing daemons (`worker_canvas_jobs.py`).
3. **Database Architecture**: Multi-database MySQL (`db_canvases`, `db_identity`, `db_logs`), Cassandra time-series clustering for pixel history, Redis pub/sub (`admin:canvas_events`), and S3/MinIO cloud storage for snapshot archives and WebP thumbnails.

## Feature / Audit Inventory
| # | Dimension / Area | Description | Assigned Milestone | Source |
|---|------------------|-------------|--------------------|--------|
| 1 | R1: Backend Concurrency & Mutex | Race condition in `activateOnline` bypassing subscription plan quotas | M1 | Backend Survey |
| 2 | R1: Backend State Transitions | `deactivateOnline` in-flight pixel loss and lack of draining lock | M1 | Backend Survey |
| 3 | R1: Backend Offline State Invariant | `saveOfflineState` unchecked execution deleting active online Redis state | M1 | Backend Survey |
| 4 | R1: Storage Metrics Drift | Inconsistency between 5% estimation in `createCanvas` and 100% raw buffer in `deactivateOnline`, missing decrements on snapshot prune | M1 | Backend Survey |
| 5 | R1: Redis Cache Pollution | 30-day metadata cache embedding stale base64 binary state buffers | M1 | Backend Survey |
| 6 | R1: Degraded Mode Mutex Bug | Fake lock token generation in `RedisCache::acquireLock` | M1 | Backend Survey |
| 7 | R2: WebSocket Dropped Frames | Silent drop of binary draw buffers when WebSocket is not `OPEN` | M1 | Frontend Survey |
| 8 | R2: Multi-tab Offline Clobbering | Unsynchronized multi-tab auto-save in offline studio clobbering state | M1 | Frontend Survey |
| 9 | R2: Visibility Reconnect Race | Duplicate WebSocket instances generated during rapid tab switching / visibility changes | M1 | Frontend Survey |
| 10 | R2: Worker Desync Incomplete Reset | `CanvasRenderWorker` failing to flush pixel buffer upon `lagged_desync` | M1 | Frontend Survey |
| 11 | R2: Memory & Event Listener Leaks | Missing `off()` cleanup in `WebSocketManager` and unbounded callback collections | M1 | Frontend Survey |
| 12 | R3: Python Stream Consumer Resiliency | Standardizing `ResilientStreamConsumer` (PEL recovery, `XAUTOCLAIM`, DLQ) across all worker scripts | M1 | Async Survey |
| 13 | R3: Non-atomic Dirty State Flushes | Non-atomic `smembers` + `delete` pattern in `worker_persistence.py` | M1 | Async Survey |
| 14 | R3: Synchronous Video Export Blocking | Synchronous `exec()` calls in `CanvasMediaService` causing HTTP 504 timeouts | M1 | Async Survey |
| 15 | R3: High-Res Canvas Memory & CRC32 | Numpy quadrant slicing and IEEE 802.3 CRC32 map evaluation under high resolution | M1 | Async Survey |
| 16 | R4: Security - WS Ticket Auth Bypass | `generateWsTicket` skipping privacy and membership validation on private canvases | M1 | Security Survey |
| 17 | R4: Security - Binary Input Validation | Buffer boundary, dimension checks, and gzip magic byte validation in `stateBase64` / `gzdecode` | M1 | Security Survey |
| 18 | R4: Security - Subscription Tier Limits | Enforcing limits for max online rooms, snapshot history per tier, and 4K exports | M1 | Security Survey |
| 19 | R5: Master Diagnostic Report & Plan | Complete structured Markdown diagnostic report with severity ratings, code locations, reproduction steps, and actionable mitigations | M1 | Master Request |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Master Diagnostic Report & Mitigation Plan Generation | Synthesize findings from R1, R2, R3, R4 into an ultra-detailed, structured, high-severity diagnostic report and mitigation plan in `f:\htdocs\ProjectRosaura\.agents\CANVAS_AUDIT_REPORT.md` | Survey Complete | IN_PROGRESS |
| M2 | Peer Review & Adversarial Stress Testing | Independent technical review and adversarial challenge of the diagnostic report, reproduction scenarios, and architectural solutions | M1 | PLANNED |
| M3 | Forensic Integrity Audit & Final Verification | Forensic verification ensuring 100% adherence to read-only constraints, zero unauthorized file modifications, and complete satisfaction of all acceptance criteria | M2 | PLANNED |

## Interface Contracts & Guidelines
- All reports MUST cite exact file paths and line numbers.
- Each finding MUST include Severity (Crítica / Alta / Media / Baja), Affected Flow, Root Cause Analysis, Reproduction / Simulation Protocol, and Step-by-Step Technical Mitigation.
- Strict Read-Only Audit mode: Application source code in `f:\htdocs\ProjectRosaura` must NOT be edited.
