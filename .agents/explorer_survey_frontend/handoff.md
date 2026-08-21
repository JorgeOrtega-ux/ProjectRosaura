# Handoff Report — Phase 0: Survey & Codebase Mapping (Frontend & WebSockets)

**Agent**: Explorer Survey Frontend (`explorer_survey_frontend`)  
**Parent Agent**: `parent` (`a83220b8-40a1-4605-b9c2-0bb2922fd4fa`)  
**Workspace**: `f:\htdocs\ProjectRosaura`  
**Report Path**: `f:\htdocs\ProjectRosaura\.agents\explorer_survey_frontend\report.md`  
**Date**: 2026-08-21  

---

## 1. Observation

Direct code observations from codebase inspection:

1. **WebSocket Client Management & Dropped Strokes**:
   - In `public/assets/js/core/api/WebSocketManager.js` (Lines 128–137), `send(payload)` evaluates `if (this.ws && this.ws.readyState === WebSocket.OPEN)`. If the socket is in `CONNECTING` or `CLOSED` state, the `else` branch is empty and the payload is silently dropped.
   - In `public/assets/js/modules/app/design/DesignInteractions.js` (Lines 1372–1385), `placePixels()` draws pixels to the local screen immediately via Web Worker (`PUSH_PIXELS`) before attempting `wsManager.send(buffer)`. When a micro-disconnect occurs, pixels remain visually on the screen, but are never sent to the server.

2. **Offline Mode Storage & Multi-Tab State Clobbering**:
   - In `public/assets/js/modules/app/design/DesignNetwork.js` (Lines 2118–2214) and `CanvasRenderWorker.js` (Lines 2070–2103), offline state is saved by exporting the entire canvas memory (`mainImageData.data`) as a compressed base64 Gzip string sent via HTTP `POST` to `ApiRoutes.Canvases.SaveOfflineState`.
   - Drawing events in offline mode are NOT broadcasted over `CanvasSyncChannel` (only `canvas_resize_completed`, `canvas_clear_completed`, `canvas_mode_changed` are broadcasted). Two tabs open on the same offline canvas clobber each other's state upon automatic debounced saving (1200ms).
   - IndexedDB and localStorage are NOT used for canvas pixel buffer persistence; pixel state lives only in Worker RAM until the HTTP `POST` succeeds.

3. **Reconnection Race in Visibility Change**:
   - In `public/assets/js/core/api/WebSocketManager.js` (Lines 183–191), `handleVisibilityChange()` immediately resets `this.reconnectAttempts = 0` and calls `this.handleReconnect()`.
   - In `public/assets/js/modules/app/design/DesignNetwork.js` (Lines 600–631), `wsManager.handleReconnect` is overridden with an asynchronous function that sets `this.wsReconnectTimeout = setTimeout(...)`. Visibility events do not cancel pending `wsReconnectTimeout`, resulting in concurrent duplicate WebSocket connection attempts.

4. **Web Worker Buffer Inconsistency in `lagged_desync`**:
   - In `public/assets/js/modules/app/design/DesignNetwork.js` (Lines 409–417), upon receiving `{"type": "lagged_desync"}`, `loadedChunks.clear()` is called and `checkCanvasAccess()` fetches chunks from `/api/go/canvases/get_chunks`, but `CanvasRenderWorker.js` is never instructed to reset its `pixelBuffer` or `hydratedChunks`, leaving stale pixels on screen.

5. **Memory and Listener Leakage**:
   - In `public/assets/js/core/api/WebSocketManager.js` (Lines 140–151), `on(event, callback)` has no corresponding `off()` method, and `disconnect()` does not clear `this.callbacks`.

---

## 2. Logic Chain

1. **Premise 1 (Obs. 1)**: `WebSocketManager.send()` discards binary buffers when `ws.readyState !== WebSocket.OPEN`.
2. **Inference 1**: Any network glitch or socket reconnect window results in local optimistic pixel placement with zero server awareness and no retransmission.
3. **Premise 2 (Obs. 2)**: In offline mode, each browser tab maintains an independent in-memory canvas and periodically dumps its full state via HTTP `SaveOfflineState`.
4. **Inference 2**: Multiple open tabs editing the same offline canvas will overwrite each other's work upon auto-save without conflict detection (loss of user artwork).
5. **Premise 3 (Obs. 3)**: Document visibility toggling invokes reconnection without clearing the existing timer in `DesignNetwork`.
6. **Inference 3**: Rapidly switching tabs creates duplicate WebSocket instances and ticket consumption race conditions.
7. **Premise 4 (Obs. 4)**: `lagged_desync` re-requests chunks but fails to flush `CanvasRenderWorker`'s internal `pixelBuffer`.
8. **Inference 4**: Out-of-sync clients retain ghost pixels and dirty artifacts after desync recovery.

---

## 3. Caveats

- **Scope boundary**: This audit was strictly focused on the frontend, WebSockets, Web Workers, client-side storage, and inter-tab communication channels. Backend PHP controllers, Redis Streams, Python background workers, and MySQL database locking are covered in complementary reports.
- **Assumptions**: We assume the browser supports standard HTML5 APIs (`OffscreenCanvas`, `Worker`, `BroadcastChannel`, `DecompressionStream`, `CompressionStream`). Older browsers fall back to DOM-thread `<canvas>`.
- **Alternative Interpretations**: The lack of local IndexedDB storage was likely an intentional design simplification to treat the MySQL/Redis backend as the single source of truth; however, in offline Studio mode, lack of local offline buffering increases vulnerability to network interruptions during auto-save.

---

## 4. Conclusion

The Frontend architecture of ProjectRosaura's Canvas System exhibits high performance through Web Workers, 32-bit TypedArrays, and Dirty Rect optimizations. However, it suffers from two **Critical** architectural deficiencies (Online Stroke Loss during micro-disconnects [SEC-FE-01] and Multi-tab State Clobbering in Offline Studio [SEC-FE-02]), two **High** severity synchronization issues (Visibility change reconnection race [SEC-FE-03] and Incomplete Worker desync recovery [SEC-FE-04]), and several **Medium/Low** memory and event handling leaks.

All anomalies have been fully documented with file paths, line numbers, reproduction scenarios, and concrete mitigations in `report.md`.

---

## 5. Verification Method

To independently verify these observations:
1. **Inspection of code**:
   - `view_file` on `public/assets/js/core/api/WebSocketManager.js` lines 128–137 (empty send fallback).
   - `view_file` on `public/assets/js/modules/app/design/DesignInteractions.js` lines 1372–1447 (optimistic draw before send).
   - `view_file` on `public/assets/js/modules/app/design/DesignNetwork.js` lines 2118–2214 (offline state full export & save).
   - `view_file` on `public/assets/js/modules/app/design/workers/CanvasRenderWorker.js` lines 2070–2103 (string chunking and lack of reset on desync).
2. **Behavioral Simulation**:
   - Open DevTools Network throttling on `public/views/app/design.php` and observe WebSocket dropped frames vs UI rendering.
   - Open two browser tabs on the same offline canvas ID and verify last-write-wins state clobbering.
