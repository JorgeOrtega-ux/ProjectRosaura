# Reporte de Auditoría Técnica & Mapeo Arquitectónico: Workers en Background, Redis Streams, Procesamiento Asíncrono y Seguridad/Permisos

**Proyecto**: ProjectRosaura (Canvas System)  
**Módulo**: Asíncrono, Workers en Background, Redis Streams, Seguridad, Permisos y Validación Binaria  
**Fecha**: 2026-08-21  
**Autor**: Explorer Subagent (Survey & Codebase Mapping)  
**Estado**: Completado — Auditoría de solo lectura (Read-Only)

---

## 1. Resumen Ejecutivo

Este reporte detalla los hallazgos técnicos, mapa de arquitectura, análisis de flujo de datos y matriz de riesgos de los componentes de procesamiento en background, colas/streams en Redis, tuberías de generación de thumbnails/timelapses, constantes de seguridad y validación de buffers binarios en ProjectRosaura.

### Resumen de Dimensiones Auditadas
1. **Workers en Background y Redis Streams**:
   - `scripts/workers/worker_canvas_jobs.py`: Motor unificado multihilo con `ResilientStreamConsumer` (Consumer Groups, `XREADGROUP`, `XACK`, `XAUTOCLAIM`, detección de huérfanos y DLQ).
   - `scripts/workers/worker_persistence.py`: Hilos de persistencia para Canvas, Chat (Cassandra) y Recent Colors.
   - `scripts/workers/worker_system_tasks.py`: Scheduler de mantenimiento, ingestión de telemetría a Cassandra, sincronización con Typesense y reseteo de tokens de plantillas.
   - `scripts/workers/timelapse_video_renderer.py`: Pipeline de renderizado de video MP4 vía FFmpeg con watchdog y renderizado vectorial de eventos JSONL.
2. **Pipelines de Thumbnails, Timelapses y Hash CRC32**:
   - Procesamiento de thumbnails en WebP y snapshots históricos en PNG con control de cuotas por tier (`get_max_snapshots_per_tier`).
   - Algoritmo de cálculo de firmas CRC32 por cuadrante de 512x512 píxeles (`compute_chunk_crc_map`).
   - Carga de memoria en lienzos de alta resolución y buffers RGBA/zlib.
3. **Seguridad, Permisos y Límites de Suscripción**:
   - `CanvasPermissionsConstants.php` y `SubscriptionPlanConstants.php`.
   - Control de acceso a nivel de API (`CanvasCoreController`, `CanvasAccessService`, `CanvasMediaService`, `CanvasSettingsService`, `CanvasChatRestrictionController`) y WebSocket Server en Rust (`ws_server`).
   - Detección de fallos críticos de autorización en `generateWsTicket` y condiciones de carrera en `activateOnline`.
4. **Validación de Datos Binarios y Manipulación de URLs**:
   - Flujo de `saveOfflineState` (`stateBase64`, `gzdecode`, validación de resolución 4-bytes RGBA).
   - Desincronizaciones de buffers entre Redis, MySQL y S3/MinIO.

---

## 2. Mapa Arquitectónico de Background Workers y Redis Streams

### 2.1 Topología de Daemons y Workers
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             DOCKER COMPOSE TOPOLOGY                              │
├──────────────────────────┬──────────────────────────┬────────────────────────────┤
│ Service                  │ Entrypoint / Command     │ Responsibilities           │
├──────────────────────────┼──────────────────────────┼────────────────────────────┤
│ rosaura_worker_canvas_jobs│ worker_canvas_jobs.py    │ Resizes, Resets, Snapshots,│
│                          │ (Multithreaded Daemon)   │ S3 Thumbnails, Template    │
│                          │                          │ Injection, MP4 Timelapses  │
├──────────────────────────┼──────────────────────────┼────────────────────────────┤
│ rosaura_worker_persistence│ worker_persistence.py   │ Stream -> Cassandra & S3,  │
│                          │ (Multithreaded Daemon)   │ Chat -> Cassandra, Colors  │
├──────────────────────────┼──────────────────────────┼────────────────────────────┤
│ rosaura_worker_system_tasks worker_system_tasks.py  │ Renewal/Expiration Cron,   │
│                          │ (Multithreaded Daemon)   │ Telemetry Ingestion, TS    │
├──────────────────────────┼──────────────────────────┼────────────────────────────┤
│ rosaura_worker_backups   │ worker_backups.py        │ MySQL + Cassandra Backups, │
│                          │ (AES-CBC Encrypted)      │ Selective Restore Engine   │
├──────────────────────────┼──────────────────────────┼────────────────────────────┤
│ rosaura_websocket_node_rust ws_server (Rust/Axum)   │ Real-time WebSocket Hub,   │
│                          │                          │ Lua Painting, QoS, AntiSpam│
└──────────────────────────┴──────────────────────────┴────────────────────────────┘
```

### 2.2 Arquitectura de Redis Streams y Consumer Groups
El sistema implementa dos patrones distintos de consumo en Redis:

#### A. Patrón Resiliente (`ResilientStreamConsumer` en `worker_canvas_jobs.py:122-308`)
- **Consumer Groups**: Crea el grupo con `xgroup_create(stream_key, group_name, id='0', mkstream=True)`.
- **Lectura en 4 Fases**:
  1. *PEL Local*: `xreadgroup(group, consumer, {stream: '0'}, count=1)` para reintentar mensajes pendientes propios tras un reinicio.
  2. *XAUTOCLAIM*: Cada 30s ejecuta `xautoclaim(stream, group, consumer, min_idle_time=claim_idle_ms, start_id='0-0', count=10)` para reclamar tareas huérfanas de workers caídos.
  3. *Nuevos Mensajes*: `xreadgroup(group, consumer, {stream: '>'}, count=1, block=block_ms)`.
  4. *Fallback Legacy*: `rpop(legacy_queue_key)` para colas de listas antiguas (`canvases:pending_resizes`, `queue:canvas_draw_image`, `queue:canvas_timelapse_video`).
- **Confirmación Transaccional**:
  - `ack_cb()`: Ejecuta `xack(stream, group, msg_id)` y `xdel(stream, msg_id)`.
  - `fail_cb(err)`: Consulta `xpending_range` para obtener `times_delivered`. Si `delivery_count >= max_retries` (default 3), enruta a DLQ (`stream:dead_letter` y `queue:dead_letter`), publica alerta en `admin:canvas_events` (`job_dlq_alert`) y reconoce/elimina el mensaje del stream original.

#### B. Patrón Continuo (`worker_persistence.py:160-285`)
- Itera sobre streams dinámicos `canvas:*:stream` con el grupo `canvas_workers`.
- Realiza `xreadgroup(CONSUMER_GROUP, CONSUMER_NAME, streams, count=5000, block=1000)`.
- **Deficiencia identificada**: Usa un nombre de consumidor hardcodeado `CONSUMER_NAME = "worker-1"`, y solo consulta con `'>'`, sin ejecutar `XAUTOCLAIM` ni leer con `'0'`. Si el worker muere durante el lote, los mensajes quedan atascados en el PEL sin recuperación automática.

### 2.3 Inventario de Colas, Streams y Canales Pub/Sub
| Canal / Clave | Tipo | Productor | Consumidor | Propósito |
|---|---|---|---|---|
| `stream:canvas_resizes` | Redis Stream | `worker_canvas_jobs.py` (Scheduler) | `worker_canvas_jobs.py` (ResizeThread) | Ejecución de redimensionado de lienzos |
| `stream:canvas_resets` | Redis Stream | `worker_canvas_jobs.py` (Scheduler) | `worker_canvas_jobs.py` (ResetThread) | Vaciado y reseteo programado/forzado |
| `stream:canvas_draw_image` | Redis Stream | PHP API (`CanvasAssetService`) | `worker_canvas_jobs.py` (DrawImageThread) | Inyección de plantillas en buffer |
| `stream:canvas_timelapse_video` | Redis Stream | PHP API (`CanvasMediaService`) | `worker_canvas_jobs.py` (VideoThread) | Renderizado asíncrono de MP4 |
| `canvas:{id}:stream` | Redis Stream | Rust `ws_server` / PHP API | `worker_persistence.py` | Stream de píxeles hacia Cassandra/JSONL |
| `canvases:pending_snapshots` | Redis Set | PHP API / `worker_persistence.py` | `worker_canvas_jobs.py` (Thumbnails) | Generación de thumbnails WebP y S3 |
| `canvases:dirty_states` | Redis Set | Rust `ws_server` / Python Workers | `worker_persistence.py` | Vaciado de buffer Redis a S3 y MySQL |
| `canvases:force_resets` | Redis Set | PHP API (`CanvasSettingsService`) | `worker_canvas_jobs.py` (Scheduler) | Solicitud de reseteo manual inmediato |
| `canvases:force_snapshots` | Redis Set | PHP API (`CanvasSettingsService`) | `worker_canvas_jobs.py` (Scheduler) | Solicitud de snapshot manual |
| `stream:dead_letter` / `queue:dead_letter` | Stream & List | `ResilientStreamConsumer` | Admin / Logging | Dead Letter Queue para tareas fallidas |
| `admin:canvas_events` | Redis Pub/Sub | Todos los servicios | Frontend / Admin / Nodos WS | Notificaciones globales de ciclo de vida |
| `canvas:sync_events` | Redis Pub/Sub | Rust `ws_server` | Nodos Rust pares | Sincronización multi-nodo de WebSockets |

---

## 3. Tuberías de Thumbnails, Timelapses, Memoria y Firmas CRC32

### 3.1 Pipeline de Thumbnails y Snapshots Históricos
1. **Detección de Cambio**:
   - Cuando se modifica un lienzo o se guarda un estado offline, se agrega el `canvas_id` al conjunto Redis `canvases:pending_snapshots`.
2. **Extracción y Descompresión**:
   - `worker_canvas_jobs.py:thumbnails_thread` (L983-1076) obtiene los IDs pendientes cada `SYNC_INTERVAL` (10s).
   - Recupera el estado binario comprimido desde Redis `canvas:{id}:temp_snapshot`, o desde MySQL `canvas_snapshots.snapshot_data`, o descargando el archivo S3 `active_snapshots/canvas_{id}.bin`.
   - `process_canvas_image` (L802-980) descomprime el buffer con `zlib.decompress()`.
3. **Generación de Thumbnail WebP**:
   - Si la longitud es menor a `width * height * 4`, rellena con bytes nulos (`\x00`).
   - Construye una imagen PIL `Image.frombytes('RGBA', (width, height), raw_bytes)`.
   - Escala manteniendo la relación de aspecto (`min(THUMBNAIL_MAX_SIZE / width, THUMBNAIL_MAX_SIZE / height, SCALE_FACTOR)` con interpolación `NEAREST`).
   - Pega sobre un fondo RGB blanco `(255, 255, 255)` y exporta a `io.BytesIO` en formato WEBP (calidad 80).
   - Sube a S3: `thumbnails/canvas_{canvas_uuid}.webp` con `ContentType='image/webp'`.
   - Invalida claves de caché del feed en Redis `canvases:home:feed:*` y actualiza `canvas:{canvas_uuid}:thumbnail_version`.
4. **Archivo Histórico y Timelapses**:
   - Si existen candados de reseteo (`reset_lock`) o snapshot (`snapshot_lock`), evalúa la cuota de snapshots del dueño según su tier (`get_max_snapshots_per_tier`):
     - *Tier 0 (Free)*: Máximo 10 snapshots.
     - *Tier 1 (Pro)*: Máximo 25 snapshots.
     - *Tier 2 (Ultra)*: Máximo 100 snapshots.
     - *Tier 3 (Master)*: Ilimitado (-1).
   - Si supera la cuota, purga los snapshots más antiguos de S3 y elimina el registro en MySQL `canvas_snapshots_history`.
   - Genera PNG de archivo en resolución hasta `ARCHIVE_MAX_SIZE` (2048px) y sube a S3 `snapshots_archive/{canvas_uuid}/canvas_{id}_{timestamp}.png`.
   - Congela el log JSONL activo `canvas_{id}_active.jsonl` y lo sube a S3 `snapshots_timelapse/{canvas_uuid}/{snapshot_uuid}.jsonl`.
   - Inserta fila en MySQL `canvas_snapshots_history`.

### 3.2 Pipeline de Video Timelapse (`timelapse_video_renderer.py`)
1. **Carga y Reproducción de Eventos**:
   - Lee el archivo `.jsonl` y parsea los eventos cronológicamente (`init`, `pixel`, `clear`, `resize`, `reset`).
   - Mantiene en memoria un buffer `board = bytearray([255, 255, 255] * (canvas_w * canvas_h))`.
2. **Cámara Dinámica para Resizes**:
   - Cuando ocurren eventos `resize`, calcula la cámara virtual con interpolación suave (`zoom_smoothing = 0.15`), preservando la relación de aspecto del video final.
3. **Piping hacia FFmpeg**:
   - Lanza subproceso FFmpeg:
     `ffmpeg -y -threads 2 -f rawvideo -vcodec rawvideo -s {out_w}x{out_h} -pix_fmt rgb24 -r {fps} -i - -c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 22 -movflags +faststart {output.mp4}`
   - Escribe los frames crudos `proc.stdin.write(frame_bytes)`.
   - Añade frames de congelamiento final (`end_freeze_sec = 2.0s`).
4. **Análisis de Consumo de Memoria y CPU**:
   - Para un lienzo 4K (3840x2160), cada frame RGB24 pesa `3840 * 2160 * 3 = 24.88 MB`.
   - Un video de 30s a 30 FPS requiere transferir ~22.4 GB de frames por `stdin`.
   - Para mitigar saturación de CPU, el subproceso está topado a `-threads 2` y preset `veryfast`, con deadline de timeout (`max_timeout_sec` = 90s para 1080p, 150s para 4K).
   - Incluye `kill_process_safely(proc)` con `SIGTERM` y `SIGKILL` para prevenir procesos zombis ante timeouts.

### 3.3 Hashing de Firmas CRC32 por Cuadrante (`worker_canvas_jobs.py:102-120`)
- Durante la inyección de plantillas (`execute_canvas_draw_image`), el lienzo se divide en cuadrantes fijos de `512x512` píxeles (`CHUNK_SIZE = 512`).
- Para cada cuadrante afectado `cx, cy`, extrae el slice del arreglo NumPy:
  `chunk_slice = canvas_arr[start_y:end_y, start_x:end_x]`
- Calcula la firma CRC32 estándar IEEE 802.3:
  `crc_val = zlib.crc32(chunk_slice.tobytes()) & 0xffffffff`
- Genera el mapa `crc_map[chunk_key] = format(crc_val, '08x')` y lo publica en `admin:canvas_events` (`canvas_inject_completed`), permitiendo que el cliente web actualice únicamente los cuadrantes cuya firma haya variado.

---

## 4. Auditoría de Seguridad, Permisos y Límites de Suscripción

### 4.1 Matriz de Constantes de Permisos (`CanvasPermissionsConstants.php`)
| Constante | Valor | Nivel de Riesgo | Uso en el Sistema |
|---|---|---|---|
| `PLACE_PIXELS` | `place_pixels` | Medio | Dibujo de píxeles en offline y online |
| `MANAGE_SETTINGS` | `manage_settings` | Alto | Cambio de tamaño, paleta, límites, chat |
| `MANAGE_MEMBERS` | `manage_members` | Alto | Expulsión y aprobación de miembros |
| `MANAGE_ROLES` | `manage_roles` | Crítico | Creación y asignación de roles de sala |
| `ASSIGN_ROLES` | `assign_roles` | Alto | Asignación de roles existentes |
| `VIEW_HISTORY` | `view_history` | Bajo | Consulta de historial de píxeles |
| `MANAGE_RESETS` | `manage_resets` | Crítico | Configuración y ejecución de reseteos |
| `MANAGE_SANCTIONS` | `manage_sanctions` | Alto | Muteo y baneo de usuarios |
| `MANAGE_INVITES` | `manage_invites` | Medio | Creación y revocación de enlaces de invitación |
| `CREATE_SNAPSHOTS` | `create_snapshots` | Medio | Captura manual de snapshots |

### 4.2 Matriz de Límites por Plan de Suscripción (`SubscriptionPlanConstants.php`)
| Feature / Límite | Free (Tier 0) | Pro (Tier 1) | Ultra (Tier 2) | Master (Tier 3) |
|---|---|---|---|---|
| `max_canvases` | 1 | 5 | 20 | Ilimitado (-1) |
| `max_online_canvases` | 1 | 2 | 5 | Ilimitado (-1) |
| `max_snapshots_per_canvas` | 10 | 25 | 100 | Ilimitado (-1) |
| `max_members_per_canvas` | 10 | 50 | 200 | Ilimitado (-1) |
| `max_storage_mb` | 20 MB | 100 MB | 500 MB | 2048 MB |
| `feat_advanced_roles` | ❌ No | ❌ No | ✅ Sí | ✅ Sí |
| `feat_chat_restriction` | ❌ No | ✅ Sí | ✅ Sí | ✅ Sí |
| `feat_inject_templates` | ❌ No | ❌ No | ✅ Sí | ✅ Sí |
| `feat_live_share` | ❌ No | ❌ No | ✅ Sí | ✅ Sí |
| `feat_download_4k` | ❌ No | ❌ No | ❌ No | ✅ Sí |

---

## 5. Hallazgos y Vulnerabilidades Identificadas

### 🔴 HALLAZGO 1 [CRÍTICO]: Bypass de Autorización en `generateWsTicket` para Lienzos Privados
- **Ubicación**: `api/services/Canvas/CanvasCoreService.php:74-98`
- **Flujo Afectado**: Solicitud de ticket JWT para conexión WebSocket (`get_ws_ticket`).
- **Descripción**: El método `generateWsTicket` solo valida si el lienzo está en modo `offline`. **NO valida si el lienzo es de privacidad privada (`privacy = 'private'`)**, ni verifica si el usuario es miembro (`isMember`) o dueño del lienzo. A diferencia de `validateCanvasAccess` (L41-68) que sí verifica la pertenencia, `generateWsTicket` emite un JWT firmado válido a cualquier usuario autenticado o anónimo (invitado) que conozca el `canvas_id`, permitiendo conectarse a salas privadas y recibir/transmitir eventos en tiempo real.
- **Simulación / Reproducción**:
  1. El Usuario A crea un lienzo privado en modo Online (`privacy = 'private'`, `is_online_active = 1`).
  2. El Usuario B (o un invitado sin sesión) realiza una llamada API a `POST /api/canvases.get_ws_ticket` enviando `canvas_id = <ID del lienzo privado>`.
  3. El backend responde con un token JWT válido de 15 segundos.
  4. El Usuario B se conecta al servidor WebSocket de Rust pasando el ticket y recibe el estado completo y los mensajes del lienzo privado.
- **Mitigación Recomendada**:
  Refactorizar `generateWsTicket` para que invoque `validateCanvasAccess($userId, $canvasId)` antes de generar el ticket. Si la validación falla, retornar inmediatamente un error 403 Forbidden.

---

### 🔴 HALLAZGO 2 [ALTO]: Race Condition en `activateOnline` con Evasión de Cuota de Salas Online
- **Ubicación**: `api/services/Canvas/CanvasCoreService.php:1393-1418`
- **Flujo Afectado**: Transición de lienzo Offline -> Online.
- **Descripción**: La verificación de la cuota de salas online (`$this->canvasRepository->countUserOnlineCanvases($userId) >= $maxOnlineCanvases`) se ejecuta mediante un patrón "Check-Then-Act" sin bloqueo distribuido (Redis Mutex) ni transacción a nivel de fila (`SELECT ... FOR UPDATE`). Dos peticiones concurrentes para dos lienzos diferentes del mismo usuario leerán la misma cuenta actual antes de que se actualice la base de datos, permitiendo a usuarios del plan Free activar múltiples salas online simultáneamente.
- **Simulación / Reproducción**:
  1. Un usuario del plan Free (límite: 1 sala online) crea dos lienzos offline.
  2. Se envían dos peticiones HTTP simultáneas a `canvases.activate_online` para ambos lienzos.
  3. Ambas peticiones ejecutan `countUserOnlineCanvases` y obtienen `0`.
  4. Ambas pasan la validación y ejecutan `UPDATE canvases SET is_online_active = 1`.
  5. El usuario mantiene 2 salas online activas superando su límite de plan.
- **Mitigación Recomendada**:
  Implementar un candado distribuido en Redis basado en el ID de usuario (`lock:user:{id}:online_transition`) con TTL de 5 segundos utilizando `SET key val NX EX 5` antes de evaluar la cuota y persistir la activación.

---

### 🟠 HALLAZGO 3 [ALTO]: Posible Pérdida de Píxeles en Vuelo durante `deactivateOnline`
- **Ubicación**: `api/services/Canvas/CanvasCoreService.php:1486-1526`
- **Flujo Afectado**: Transición de lienzo Online -> Offline.
- **Descripción**: Al desactivar el modo online, `deactivateOnline` lee el estado de Redis (`$redis->get("canvas:{$canvasId}:state")`), guarda el snapshot en MySQL, y ejecuta inmediatamente `$redis->del("canvas:{$canvasId}:state")`. Sin embargo, si existen mensajes de píxeles pendientes en el Redis Stream `canvas:{$canvasId}:stream` que aún no han sido procesados por `worker_persistence.py`, o si clientes WebSocket tenían operaciones en cola, dichos píxeles intermedios no se reflejarán en el snapshot y la clave de Redis será eliminada, provocando pérdida de datos.
- **Simulación / Reproducción**:
  1. Varios usuarios pintan intensamente en un lienzo online de 2048x2048.
  2. El dueño envía `canvases.deactivate_online`.
  3. El backend lee el buffer de Redis, guarda el snapshot y borra la clave de Redis antes de que `worker_persistence.py` procese el lote de eventos del stream.
  4. Los píxeles dibujados en los últimos segundos no se guardan en el snapshot de MySQL/S3.
- **Mitigación Recomendada**:
  Antes de eliminar la clave de Redis, publicar un evento de bloqueo `canvas:{$canvasId}:deactivating_lock`, verificar que el stream `canvas:{$canvasId}:stream` esté vacío (`XLEN == 0` o PEL vacío), o invocar una sincronización forzada antes de borrar `state` y `config`.

---

### 🟠 HALLAZGO 4 [MEDIO]: `saveOfflineState` sin Verificación de Estado Online y Soporte Parcial de Descompresión
- **Ubicación**: `api/services/Canvas/CanvasCoreService.php:1559-1620`
- **Flujo Afectado**: Guardado de estado en modo Estudio (Offline).
- **Descripción**:
  1. `saveOfflineState` **NO comprueba si el lienzo se encuentra actualmente en modo Online (`is_online_active = 1`)**. Si un usuario envía una petición de guardado offline a un lienzo que está activo online, sobreescribirá el snapshot de MySQL y ejecutará `$redis->del("canvas:{$canvasId}:state")`, destruyendo el lienzo activo en tiempo real para todos los usuarios conectados.
  2. La rutina de descompresión binaria únicamente valida la cabecera mágica de Gzip (`\x1f\x8b`), pero no soporta flujos estándar de compresión Zlib/Deflate (RFC 1950, ej. `\x78\x9c`), lo cual causa que clientes que usen librerías como Pako en modo raw deflate fallen la validación de tamaño.
- **Simulación / Reproducción**:
  1. El lienzo está Online con 20 usuarios pintando.
  2. Un usuario con permiso `place_pixels` envía una petición antigua o maliciosa a `canvases.save_offline_state`.
  3. La petición borra la clave de Redis `canvas:{id}:state` de los usuarios conectados y sobreescribe MySQL.
- **Mitigación Recomendada**:
  1. Agregar validación: Si `!empty($canvas['is_online_active'])`, rechazar la petición con error `CANVAS_IS_ONLINE`.
  2. Agregar soporte para `gzuncompress` y `zlib_decode` si `gzdecode` no aplica.

---

### 🟡 HALLAZGO 5 [MEDIO]: Bloqueo Síncrono de Hilo Web en Exportación de Videos Timelapse
- **Ubicación**: `api/services/Canvas/CanvasMediaService.php:591-604`
- **Flujo Afectado**: `POST /api/canvases.export_snapshot_timelapse_video`
- **Descripción**: El servicio web intenta ejecutar sincrónicamente el script Python `timelapse_video_renderer.py` mediante `exec()` utilizando rutas hardcodeadas de Windows (`C:\Users\jorge\AppData\Local\Python\...`) antes de encolar la tarea a Redis Stream (`stream:canvas_timelapse_video`). Si el cliente solicita un video de 60s en 1080p, la ejecución puede demorar entre 20 y 60 segundos, bloqueando el proceso PHP-FPM y provocando timeouts HTTP 504 Gateway Timeout.
- **Mitigación Recomendada**:
  Eliminar la ejecución síncrona `exec()` del flujo web y delegar el 100% del renderizado al worker asíncrono `worker_canvas_jobs.py` a través del Redis Stream `stream:canvas_timelapse_video`.

---

### 🟡 HALLAZGO 6 [BAJO]: Falta de Resiliencia en el Consumidor de Streams de `worker_persistence.py`
- **Ubicación**: `scripts/workers/worker_persistence.py:160-285`
- **Flujo Afectado**: Persistencia de píxeles a Cassandra y timelapse JSONL.
- **Descripción**: A diferencia de `worker_canvas_jobs.py` que implementa `ResilientStreamConsumer` con `XAUTOCLAIM` y lectura de PEL (`'0'`), `worker_persistence.py` utiliza un identificador fijo `CONSUMER_NAME = "worker-1"` y solo lee mensajes nuevos (`'>'`). Si el contenedor de persistencia se reinicia mientras procesaba un lote, los mensajes no confirmados quedan huérfanos en el PEL indefinidamente.
- **Mitigación Recomendada**:
  Integrar la clase `ResilientStreamConsumer` en `worker_persistence.py` para garantizar la recuperación automática de mensajes pendientes mediante `XAUTOCLAIM`.

---

## 6. Resumen de Hallazgos y Priorización de Mitigación

| ID | Hallazgo | Severidad | Componente | Impacto |
|---|---|---|---|---|
| **H1** | Bypass de autorización en `generateWsTicket` para lienzos privados | **Crítica** | `CanvasCoreService.php` | Acceso no autorizado a salas WebSocket privadas |
| **H2** | Race condition en `activateOnline` sobrepasando cuotas de plan | **Alta** | `CanvasCoreService.php` | Evasión de límites de suscripción Free/Pro |
| **H3** | Pérdida de píxeles en vuelo durante `deactivateOnline` | **Alta** | `CanvasCoreService.php` | Desincronización y pérdida de datos al cerrar sala |
| **H4** | `saveOfflineState` permite sobreescribir lienzos online activos | **Media** | `CanvasCoreService.php` | Corrupción de estado y borrado de buffer Redis en vivo |
| **H5** | Bloqueo síncrono `exec()` en exportación de video timelapse | **Media** | `CanvasMediaService.php` | Saturación de PHP-FPM y timeouts 504 |
| **H6** | Falta de `XAUTOCLAIM` y PEL check en `worker_persistence.py` | **Baja** | `worker_persistence.py` | Mensajes huérfanos en caso de reinicio de worker |

---

## 7. Verificación e Integridad

1. **Estado del Código**: El código fuente de la aplicación no ha sufrido ninguna modificación.
2. **Archivos Analizados**:
   - `scripts/workers/worker_canvas_jobs.py` (L1-1516)
   - `scripts/workers/worker_persistence.py` (L1-566)
   - `scripts/workers/worker_system_tasks.py` (L1-1258)
   - `scripts/workers/timelapse_video_renderer.py` (L1-315)
   - `scripts/workers/worker_backups.py` (L1-927)
   - `includes/core/System/CanvasPermissionsConstants.php` (L1-17)
   - `includes/core/System/SubscriptionPlanConstants.php` (L1-280)
   - `api/controllers/Canvas/CanvasCoreController.php` (L1-446)
   - `api/services/Canvas/CanvasCoreService.php` (L1-1630)
   - `api/services/Canvas/CanvasAccessService.php` (L1-593)
   - `api/services/Canvas/CanvasMediaService.php` (L1-663)
   - `api/services/Canvas/CanvasSettingsService.php` (L1-753)
   - `api/controllers/Canvas/CanvasChatRestrictionController.php` (L1-234)
   - `scripts/ws_server/src/handlers.rs` (L1-379)
   - `scripts/ws_server/src/actions.rs` (L1-1489)
   - `scripts/ws_server/src/db.rs` (L1-332)
   - `scripts/ws_server/src/lua_scripts.rs` (L1-66)
   - `docker-compose.yml`, `docker/python/Dockerfile.worker`
