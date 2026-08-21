# Reporte Maestro de Diagnóstico Técnico y Plan de Mitigación Arquitectónica: Subsistema de Lienzos (Canvas Engine)

**Proyecto:** ProjectRosaura  
**Documento:** Auditoría Técnica y Diagnóstico de Arquitectura Integral (R5)  
**Alcance:** Backend PHP/MySQL/Cassandra/Redis, Servidor WebSocket en Rust, Clientes Frontend & Web Workers, Workers Asíncronos en Python y Seguridad / Permisos  
**Estado:** Finalizado — Modo Auditoría de Solo Lectura (Strict Read-Only Audit)  
**Fecha de Publicación:** 21 de Agosto de 2026  

---

## 1. Resumen Ejecutivo y Topología Arquitectónica Integral

### 1.1. Contexto y Objetivos de la Auditoría
El subsistema de lienzos (*canvases*) en **ProjectRosaura** constituye la pieza central de la plataforma, proporcionando un entorno de dibujo colaborativo de arte en píxeles (*pixel-art*) con soporte para resoluciones dinámicas (desde 64x64 hasta 4096x4096 píxeles), gestión de roles granulares (RBAC), control de áreas protegidas, historial per-píxel de alta precisión y dos modos operativos fundamentales:
1. **Modo Estudio (Offline):** Edición mono-usuario en memoria del cliente con autoguardado periódico mediante payloads binarios comprimidos (`SaveOfflineState`).
2. **Modo Multijugador (Online Real-Time):** Colaboración masiva en tiempo real sobre un servidor WebSocket de alto rendimiento en Rust (`ws_server`), respaldado por un buffer binario unificado en memoria Redis (`canvas:{id}:state`), streams de eventos (`canvas:{id}:stream`), persistencia asíncrona hacia Apache Cassandra y S3/MinIO, y pipelines de renderizado de video MP4 y miniaturas WebP.

La presente auditoría técnica diagnostica de forma exhaustiva las condiciones de carrera, fallos de concurrencia, cuellos de botella de rendimiento, fugas de memoria, incoherencias de almacenamiento y vulnerabilidades lógicas presentes en la interacción entre capas, preservando intacto el código fuente de la aplicación conforme al mandato de solo lectura.

---

### 1.2. Topología de Componentes y Flujo de Datos

```
+-----------------------------------------------------------------------------------------------------------------------+
|                                                   CLIENTES WEB (Navegador)                                            |
|  +-----------------------------------+     +----------------------------------+     +-------------------------------+ |
|  |       DOM Main Thread             | <-> |       CanvasSyncChannel          | <-> |     CanvasRenderWorker.js     | |
|  | (DesignController/DesignInteractions)   |   (BroadcastChannel Inter-Tabs)  |     | (OffscreenCanvas/Uint32Array) | |
|  +-----------------------------------+     +----------------------------------+     +-------------------------------+ |
+-----------------------------------------------------------------------------------------------------------------------+
                |                                                                         |
                | (REST HTTP / HTTPS - JSON/Base64)                                       | (WebSocket TCP:8765 - ArrayBuffer)
                v                                                                         v
+-----------------------------------------------+                         +-----------------------------------------------+
|          PHP Web Application (API Tier)       |                         |       Rust WebSocket Server (ws_server)       |
|  - CanvasCoreController / CanvasAccessService |                         |  - handlers.rs, actions.rs, db.rs             |
|  - CanvasCoreService / CanvasLockManager      |                         |  - lua_scripts.rs (PAINT_PIXEL_LUA)           |
|  - CanvasMediaService / CanvasSettingsService |                         |  - Redis Pool (deadpool_redis)                |
+-----------------------------------------------+                         +-----------------------------------------------+
        |                               |                                                 |
        | (PDO / SQL Multi-DB)          | (Predis Client)                                 | (SETRANGE / XADD / PubSub)
        v                               v                                                 v
+-----------------------+     +-------------------------------------------------------------------------------------------+
| Relational Tier       |     | In-Memory & Cache Tier (Redis Cluster / Sentinel)                                         |
| (MySQL / InnoDB)      |     | - canvas:{id}:state (Buffer binario crudo RGBA: W * H * 4 bytes)                          |
| - db_canvases         |     | - canvas:{id}:config (Hash: cooldowns, subscription lock)                                 |
| - db_identity         |     | - canvas:{id}:stream (Stream: registro cronológico de píxeles)                            |
| - db_telemetry        |     | - canvases:dirty_states / pending_snapshots / force_resets                                |
| - db_advertisements   |     | - admin:canvas_events / canvas:sync_events (Pub/Sub)                                      |
+-----------------------+     +-------------------------------------------------------------------------------------------+
                                                                  |                                     |
                                        (XREADGROUP / XAUTOCLAIM) |                   (smembers / S3 Put) |
                                                                  v                                     v
                              +-------------------------------------------------------------------------------------------+
                              | Python Background Workers Cluster (Docker Daemons)                                        |
                              | - worker_persistence.py: Despacho a Cassandra CQL y snapshots periódicos a S3             |
                              | - worker_canvas_jobs.py: Redimensionamiento, Reseteos, Miniaturas WebP y Archivo Histórico |
                              | - timelapse_video_renderer.py: Pipeline FFmpeg con watchdog para exportación MP4          |
                              | - worker_system_tasks.py: Ingestión de telemetría, cron y sincronización Typesense        |
                              +-------------------------------------------------------------------------------------------+
                                              |                                                 |
                                              v (CQL Batch Statements)                          v (boto3 / Multipart S3)
                              +-----------------------------------------------+ +-----------------------------------------+
                              | NoSQL Time-Series Tier (Apache Cassandra)     | | Cloud Object Storage (S3 / MinIO)       |
                              | - db_canvases_nosql.canvas_pixel_history      | | - active_snapshots/canvas_{id}.bin      |
                              | - db_canvases_nosql.canvas_chat_messages      | | - snapshots_archive/{uuid}/*.png        |
                              | - db_telemetry.api_latency / client_events    | | - snapshots_timelapse/{uuid}/*.jsonl    |
                              +-----------------------------------------------+ +-----------------------------------------+
```

---

### 1.3. Ciclo de Vida y Máquina de Estados del Lienzo

El lienzo transita a través de estados formales gobernados por bloqueos distribuidos e invariantes de base de datos:

```
                  +-------------------------------------------------------------+
                  |                      [ ESTUDIO OFFLINE ]                    |
                  |  - Sin socket WS. Modificaciones en RAM del Web Worker.     |
                  |  - Persistencia vía SaveOfflineState (Gzip/Base64 -> S3/DB) |
                  +-------------------------------------------------------------+
                                     |                       ^
                 POST /activate_online (User Lock)           | POST /deactivate_online (Drain Lock)
                                     |                       |
                                     v                       |
                  +-------------------------------------------------------------+
                  |                    [ MULTIJUGADOR ONLINE ]                  |
                  |  - Buffer binario activo en Redis (canvas:{id}:state).      |
                  |  - Pintado concurrente vía WS Rust + SETRANGE en Lua.       |
                  |  - Ingestión a Cassandra y snapshots dirty periódicos.      |
                  +-------------------------------------------------------------+
                         |                                           |
    admin:canvas_events  |                                           | worker_canvas_jobs
    (canvas_locked_reset)|                                           | (canvas_resize_lock)
                         v                                           v
      +--------------------------------------+   +--------------------------------------+
      |         [ EN RESETEO MANUAL ]        |   |       [ EN REDIMENSIONAMIENTO ]      |
      | - Buffer bloqueado en Redis.         |   | - Candado de 60s en Redis.           |
      | - Animación de borrado en clientes.  |   | - Remuestreo bilineal/nearest en RAM.|
      | - Generación de snapshot histórico.  |   | - Invalidación y rehidratación chunk.|
      +--------------------------------------+   +--------------------------------------+
```

---

## 2. Dimensión 1: Backend, Bases de Datos, Redis y Concurrencia (R1)

### 2.1. Matriz Resumen de Hallazgos en Backend

| ID | Título del Hallazgo | Severidad | Archivo y Línea Afectada | Tipo de Defecto |
|---|---|---|---|---|
| **F-01** | Evasión de Cuota de Salas Online por Race Condition en `activateOnline` | **CRÍTICA** | `api/services/Canvas/CanvasCoreService.php:1403-1450` | Concurrencia / Falta de Mutex Distribuido |
| **F-02** | Destrucción de Buffer Redis en Vivo por Invocación No Verificada de `saveOfflineState` | **CRÍTICA** | `api/services/Canvas/CanvasCoreService.php:1559-1628` | Lógica / Invariante de Estado Roto |
| **F-03** | Pérdida de Píxeles en Vuelo y Corrupción Esparsa por `SETRANGE` en `deactivateOnline` | **CRÍTICA** | `api/services/Canvas/CanvasCoreService.php:1486-1557`<br>`scripts/ws_server/src/lua_scripts.rs:58-60` | Carrera de Drenaje / Comportamiento Redis |
| **F-04** | Disparidad Extrema en Métricas de Cuota y Desfase Permanente de Almacenamiento | **ALTA** | `CanvasCoreService.php:596,1505`<br>`UserRepository.php:585-630`<br>`worker_canvas_jobs.py:854-883` | Contabilidad Asimétrica de Datos |
| **F-05** | Polución de Caché de Metadatos por 30 Días con Buffers Binarios Obsoletos | **ALTA** | `api/services/Canvas/CanvasCoreService.php:284-306, 516, 543` | Acoplamiento de Caché / Datos Sucios |
| **F-06** | Inconsistencia Transaccional Cross-Database (`db_canvases` vs `db_identity`) | **MEDIA** | `CanvasCoreService.php:1446-1450, 1508-1514, 1603-1612` | Falta de Atomicidad Distribuida |
| **F-07** | Generación de Tokens Ilusorios en `acquireLock` durante Degradación de Redis | **MEDIA** | `config/Database/RedisCache.php:103-105` | Falsa Exclusión Mutua / Fail-Open Peligroso |
| **F-08** | Tormenta de Reconexión Síncrona a Cassandra en Bucle Interno de Persistencia | **BAJA** | `scripts/workers/worker_persistence.py:116-138, 208-212` | Agotamiento de Sockets / Falta de Backoff |

---

### 2.2. Diagnóstico Técnico Profundo de Hallazgos

#### 🔴 Hallazgo F-01: Evasión de Cuota de Salas Online por Race Condition en `activateOnline`
- **Severidad:** **CRÍTICA** (Impacto directo en monetización y límites de infraestructura).
- **Ubicación:** `api/services/Canvas/CanvasCoreService.php`, líneas 1403–1450.
- **Flujo Afectado:** Activación de lienzos offline hacia el modo multijugador online (`POST /api/canvases.activate_online`).
- **Análisis de Causa Raíz:**
  El método `activateOnline` implementa un patrón vulnerable de *Check-Then-Act*:
  1. Lee el plan del usuario mediante `$this->userRepository->findById($userId)`.
  2. Consulta la cantidad de lienzos online activos actuales: `$currentOnlineCount = $this->canvasRepository->countUserOnlineCanvases($userId);`.
  3. Compara si `$currentOnlineCount >= $maxOnlineCanvases`.
  4. Carga el snapshot de S3 o inicializa buffer en blanco.
  5. Escribe el estado en Redis y finalmente ejecuta: `UPDATE canvases SET mode = 'online', is_online_active = 1 WHERE id = ?`.
  
  **Fallo:** No existe ningún bloqueo distribuido a nivel de usuario (`RedisCache::executeWithLock`) ni un bloqueo pesimista en base de datos (`SELECT ... FOR UPDATE`). Si un usuario en plan Gratuito (límite: 1 sala online) dispone de 5 lienzos offline y dispara simultáneamente 5 peticiones HTTP a `activate_online`, todas las peticiones leen de forma concurrente `currentOnlineCount == 0`, todas superan la validación y todas escriben `is_online_active = 1`, activando 5 salas en lugar de 1.
- **Protocolo de Simulación / Reproducción:**
  1. Asignar al usuario de prueba el plan Free (`subscription_tier = 0`).
  2. Crear 3 lienzos en modo offline ($C_1, C_2, C_3$).
  3. Ejecutar el siguiente script concurrente en bash/curl o PowerShell:
     ```bash
     for id in 101 102 103; do
       curl -X POST https://api.rosaura.local/api/canvases.activate_online \
            -H "Authorization: Bearer $JWT" \
            -d "canvas_id=$id" &
     done
     wait
     ```
  4. Inspeccionar la base de datos: `SELECT id, name, is_online_active FROM canvases WHERE owner_id = 123;`.
  5. **Resultado observado:** Los 3 lienzos se encuentran activos con `is_online_active = 1`, evadiendo la restricción del plan comercial.
- **Mitigación Técnica Propuesta:**
  Envolver toda la rutina de validación y activación dentro de un candado distribuido exclusivo por usuario en Redis con tiempo de expiración estricto, complementado con una transacción pesimista en MySQL:
  ```php
  public function activateOnline(int $userId, int $canvasId): array {
      $redisCache = new \App\Config\Database\RedisCache();
      $lockKey = "user:{$userId}:online_activation_lock";
      
      return $redisCache->executeWithLock($lockKey, 5, function() use ($userId, $canvasId) {
          $dbManager = new DatabaseManager();
          $db = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);
          $db->beginTransaction();
          try {
              $stmt = $db->prepare("SELECT * FROM canvases WHERE id = ? FOR UPDATE");
              $stmt->execute([$canvasId]);
              $canvas = $stmt->fetch(\PDO::FETCH_ASSOC);
              
              if (!$canvas || (int)$canvas['owner_id'] !== $userId) {
                  $db->rollBack();
                  return ['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 403];
              }
              
              $user = $this->userRepository->findById($userId);
              $tier = $user['subscription_tier'] ?? 0;
              $planLimits = SubscriptionPlanConstants::getTierLimits($tier);
              $maxOnline = $planLimits['max_online_canvases'] ?? 1;
              
              if ($maxOnline !== -1) {
                  $stmtCount = $db->prepare("SELECT COUNT(*) FROM canvases WHERE owner_id = ? AND is_online_active = 1 AND id != ?");
                  $stmtCount->execute([$userId, $canvasId]);
                  $activeCount = (int)$stmtCount->fetchColumn();
                  
                  if ($activeCount >= $maxOnline) {
                      $db->rollBack();
                      return ['success' => false, 'message' => __('err_online_slots_exceeded'), 'http_code' => 409];
                  }
              }
              
              // Inicialización de Redis y actualización de estado
              $stateRaw = $this->canvasRepository->getSnapshot($canvasId) ?: str_repeat(chr(0)*4, 64*64);
              $redis = (new RedisCache())->getClient();
              $redis->set("canvas:{$canvasId}:state", $stateRaw);
              $redis->hMSet("canvas:{$canvasId}:config", [
                  'cooldown_batch' => $canvas['cooldown_pixels_batch'] ?? 5,
                  'cooldown_seconds' => $canvas['cooldown_seconds'] ?? 10,
                  'is_subscription_locked' => $canvas['is_subscription_locked'] ? 1 : 0
              ]);
              
              $updateStmt = $db->prepare("UPDATE canvases SET mode = 'online', is_online_active = 1, last_online_at = NOW() WHERE id = ?");
              $updateStmt->execute([$canvasId]);
              
              $db->commit();
              $redis->publish("admin:canvas_events", json_encode(['type' => 'canvas_mode_changed', 'canvas_id' => $canvasId, 'mode' => 'online', 'is_online_active' => 1]));
              return ['success' => true, 'message' => __('msg_canvas_online_activated')];
          } catch (\Throwable $e) {
              if ($db->inTransaction()) $db->rollBack();
              throw $e;
          }
      });
  }
  ```

---

#### 🔴 Hallazgo F-02: Destrucción de Buffer Redis en Vivo por Invocación No Verificada de `saveOfflineState`
- **Severidad:** **CRÍTICA** (Pérdida catastrófica de datos en sesiones colaborativas activas).
- **Ubicación:** `api/services/Canvas/CanvasCoreService.php`, líneas 1559–1628.
- **Flujo Afectado:** Guardado manual o autoguardado de estado offline (`POST /api/canvases.save_offline_state`).
- **Análisis de Causa Raíz:**
  El método `saveOfflineState` valida permisos de edición y decodifica el payload base64. No obstante, **omite por completo verificar si el lienzo se encuentra en modo online (`is_online_active == 1` o `mode === 'online'`)**.
  Al procesar la petición:
  1. Sobreescribe la tabla `canvas_snapshots` en MySQL con el buffer estático subido por el cliente.
  2. Ejecuta incondicionalmente: `$redis->del("canvas:{$canvasId}:state");`.
  
  Si un usuario tenía una pestaña antigua en modo estudio abierta y realiza un cambio, o si un atacante con permisos `place_pixels` envía una petición a dicho endpoint mientras 50 usuarios colaboran en vivo en el lienzo online, el buffer en memoria de Redis es eliminado instantáneamente y el estado en MySQL se reemplaza por el snapshot antiguo.
- **Protocolo de Simulación / Reproducción:**
  1. Iniciar una sala online activa para el lienzo $C_1$.
  2. Conectar múltiples clientes WebSocket y pintar trazos visibles en tiempo real.
  3. Desde otra ventana o Postman, enviar una llamada HTTP `POST /api/canvases.save_offline_state` con `{ "canvas_id": C_1, "state_base64": "<payload_vacio>" }`.
  4. Observar que la clave Redis `canvas:C_1:state` desaparece.
  5. En el WebSocket, cualquier nuevo trazo intentará escribir sobre una clave inexistente, provocando corrupción o reinicio de buffer.
- **Mitigación Técnica Propuesta:**
  Insertar una guarda de validación estricta al inicio de `saveOfflineState`:
  ```php
  if (($canvas['mode'] ?? 'offline') === 'online' || !empty($canvas['is_online_active'])) {
      return [
          'success' => false,
          'message' => __('err_canvas_is_online_mode') ?: 'El lienzo está activo en modo Online. No se pueden aplicar guardados offline.',
          'error_code' => 'CANVAS_ONLINE_CONFLICT',
          'http_code' => \App\Core\System\HttpConstants::CONFLICT
      ];
  }
  ```

---

#### 🔴 Hallazgo F-03: Pérdida de Píxeles en Vuelo y Corrupción Esparsa por `SETRANGE` en `deactivateOnline`
- **Severidad:** **CRÍTICA** (Pérdida de datos e inconsistencia de memoria).
- **Ubicación:** `api/services/Canvas/CanvasCoreService.php`, líneas 1486–1557 y `scripts/ws_server/src/lua_scripts.rs`, líneas 58–60.
- **Flujo Afectado:** Desactivación de sala online hacia modo estudio (`POST /api/canvases.deactivate_online`).
- **Análisis de Causa Raíz:**
  Al desactivar un lienzo online, `deactivateOnline` realiza:
  ```php
  $stateRaw = $redis->get("canvas:{$canvasId}:state");
  if ($stateRaw) {
      $this->canvasRepository->saveSnapshot($canvasId, $stateRaw);
  }
  $redis->del("canvas:{$canvasId}:state");
  $redis->del("canvas:{$canvasId}:config");
  $redis->publish("admin:canvas_events", json_encode(['type' => 'canvas_mode_changed', 'mode' => 'offline']));
  ```
  Esto genera dos fallos concurrentes graves:
  1. **Pérdida de Píxeles en Tránsito:** Entre el momento en que PHP ejecuta `$redis->get()` y el momento en que ejecuta `$redis->del()`, los clientes conectados vía WebSocket siguen enviando píxeles que son escritos en Redis y agregados a `canvas:{id}:stream`. Esos píxeles nunca se persisten en el snapshot de S3/MySQL y se destruyen al ejecutarse `del`.
  2. **Corrupción Esparsa de Redis por `SETRANGE`:** En `lua_scripts.rs:58`, el servidor WebSocket ejecuta:
     ```lua
     redis.call('SETRANGE', KEYS[1], tonumber(ARGV[1]), ARGV[2])
     ```
     Según la especificación del motor Redis, si `SETRANGE` es invocado sobre una clave que **no existe** (debido a que PHP la eliminó con `del`), Redis crea automáticamente una cadena binaria de longitud igual al offset solicitado, rellenando con bytes nulos `0x00` todo el espacio intermedio. Si un usuario conectado envía un píxel en la coordenada $(256, 256)$, Redis crea un buffer sparse de cientos de kilobytes de ceros con un único píxel al final, destruyendo la integridad del lienzo.
- **Protocolo de Simulación / Reproducción:**
  1. Simular una carga de 100 píxeles por segundo sobre el lienzo online $C_1$ mediante un script de estrés WebSocket.
  2. Enviar la petición `canvases.deactivate_online`.
  3. Comprobar que en Redis la clave `canvas:C_1:state` es recreada inmediatamente por los WebSockets rezagados con un tamaño anómalo o corrupto, y que los últimos 20-50 píxeles se pierden del archivo permanente en S3.
- **Mitigación Técnica Propuesta:**
  Implementar un protocolo de desconexión y drenaje en 3 fases:
  1. **Fase 1 (Bloqueo de Ingesta):** Publicar evento `canvas_closing` en `admin:canvas_events` y establecer `canvas:{id}:freeze_lock = 1` en Redis. El script Lua de WebSocket debe abortar si `freeze_lock` está activo o si la clave del canvas no existe (`redis.call('EXISTS', KEYS[1]) == 0`).
  2. **Fase 2 (Drenaje de Stream):** Forzar al worker de persistencia (`worker_persistence.py`) a procesar y vaciar el stream `canvas:{id}:stream`.
  3. **Fase 3 (Snapshot Seguro y Purga):** Extraer el buffer final de Redis, guardarlo en S3/MySQL y eliminar las claves en Redis de forma atómica.
  
  Modificación en `lua_scripts.rs`:
  ```lua
  -- Verificar existencia previa del canvas para evitar buffers esparsos corruptos
  if redis.call('EXISTS', KEYS[1]) == 0 then
      return {'CANVAS_INACTIVE_ERROR', '0', '0'}
  end
  ```

---

#### 🟠 Hallazgo F-04: Disparidad Extrema en Métricas de Cuota y Desfase Permanente de Almacenamiento
- **Severidad:** **ALTA** (Inconsistencia en facturación y denegación de servicio injustificada).
- **Ubicación:** 
  - `api/services/Canvas/CanvasCoreService.php`, líneas 596, 1505–1514, 1599–1612.
  - `includes/core/Repositories/UserRepository.php`, líneas 585–630.
  - `scripts/workers/worker_canvas_jobs.py`, líneas 854–883.
- **Análisis de Causa Raíz:**
  La aplicación maneja cuatro reglas mutuamente contradictorias para calcular el almacenamiento ocupado:
  1. Al **crear el lienzo** (`createCanvas` L596): Estima el almacenamiento al **5%** del buffer crudo:
     `$estimatedStorageBytes = max(4096, (int)(($targetW * $targetH * 4) * 0.05));` (52 KB para un lienzo de 512x512).
  2. Al **desactivar o guardar** (`deactivateOnline` L1505 y `saveOfflineState` L1599): Calcula la longitud total del buffer sin comprimir (**100%**, 1,048,576 bytes para 512x512) y suma la diferencia (`diffBytes`) al usuario.
  3. En la función de **recalculo dinámico** (`calculateDynamicUserStorageBytes` en `UserRepository.php` L585): Suma el 100% del tamaño de todos los lienzos + `50 KB` fijos por cada snapshot histórico en `canvas_snapshots_history`.
  4. En el **worker de purga de snapshots** (`worker_canvas_jobs.py` L854): Cuando se borran snapshots antiguos de S3 y MySQL para cumplir la cuota del tier, **nunca se descuenta el almacenamiento en `users.storage_used_bytes`**.
  
  **Impacto:** Los usuarios sufren saltos inexplicables de almacenamiento (multiplicándose por 20 al realizar el primer guardado offline) y quedan bloqueados por cuota superada incluso después de purgar sus historiales.
- **Mitigación Técnica Propuesta:**
  Estandarizar una única fuente de verdad contable:
  - Definir si la cuota contabiliza el tamaño bruto de matriz ($W \times H \times 4$) o el tamaño real comprimido en S3.
  - Crear un servicio centralizado `StorageAccountingService` que gestione todas las transacciones de cuota (creación, edición, snapshot, borrado y purga) de manera bidireccional y atómica.

---

#### 🟠 Hallazgo F-05: Polución de Caché de Metadatos por 30 Días con Buffers Binarios Obsoletos
- **Severidad:** **ALTA** (Inconsistencia de interfaz en recargas de página).
- **Ubicación:** `api/services/Canvas/CanvasCoreService.php`, líneas 284–306, 516, 543.
- **Flujo Afectado:** Consulta de datos de lienzo (`POST /api/canvases.get`).
- **Análisis de Causa Raíz:**
  Al llamar a `getCanvas()`, el backend genera la respuesta completa, incluyendo el buffer base64 de píxeles (`$canvas['state_base64']`), y almacena este objeto JSON en Redis bajo la clave `canvas:{id}:meta:user:{userId}` con un tiempo de vida de **30 días** (`CacheConstants::TTL_THIRTY_DAYS`).
  En modo online, cuando los usuarios pintan millones de píxeles, la clave `canvas:{id}:state` se actualiza en memoria, pero las cachés de metadatos de los usuarios no se invalidan en cada píxel.
  Cuando un usuario refresca la página web, el backend entrega el JSON cacheado con el `state_base64` inicial congelado de hace días, requiriendo que el cliente descargue chunks adicionales o sufra desincronización visual.
- **Mitigación Técnica Propuesta:**
  Separar estrictamente los metadatos relacionales (nombre, tamaño, permisos, configuración) del buffer binario de píxeles. Nunca almacenar `state_base64` dentro de claves de caché de metadatos de larga duración.

---

#### 🟡 Hallazgo F-06: Inconsistencia Transaccional Cross-Database (`db_canvases` vs `db_identity`)
- **Severidad:** **MEDIA** (Inconsistencia de estado en fallos de red).
- **Ubicación:** `CanvasCoreService.php`, líneas 1446–1450, 1508–1514, 1603–1612.
- **Análisis de Causa Raíz:**
  La arquitectura utiliza dos bases de datos MySQL separadas con conexiones PDO independientes (`db_canvases` para lienzos y `db_identity` para usuarios/cuotas). Al desactivar un lienzo o guardar estado, se ejecuta un `UPDATE` en `db_canvases` y seguidamente un `UPDATE` en `db_identity`. No existe un protocolo de dos fases (2PC) ni transacción compensatoria. Si el proceso termina abruptamente entre ambas operaciones, la cuota del usuario queda desalineada respecto al estado real del lienzo.
- **Mitigación Técnica Propuesta:**
  Implementar manejo de compensación con bloques `try / catch` robustos o encolar las actualizaciones de cuota en un stream confiable de Redis para su liquidación asíncrona idempotente.

---

#### 🟡 Hallazgo F-07: Generación de Tokens Ilusorios en `acquireLock` durante Degradación de Redis
- **Severidad:** **MEDIA** (Pérdida de exclusión mutua silenciosa).
- **Ubicación:** `config/Database/RedisCache.php`, líneas 103–105.
- **Análisis de Causa Raíz:**
  ```php
  public function acquireLock(string $name, int $timeoutSeconds = 5) {
      if (!$this->client || defined('SYSTEM_DEGRADED')) {
          return bin2hex(random_bytes(16)); // Retorna token simulado como si el lock estuviese adquirido
      }
  ```
  Si el servidor Redis se cae o entra en modo degradado, `acquireLock` devuelve una cadena aleatoria simulando haber obtenido el candado con éxito. Cualquier servicio crítico que confíe en `executeWithLock` ejecutará secciones críticas concurrentes simultáneamente, creyendo tener exclusión mutua.
- **Mitigación Técnica Propuesta:**
  El método debe retornar `false` o lanzar una excepción cuando Redis no esté disponible, forzando a los componentes a aplicar bloqueos en MySQL o rechazar la operación de forma segura (*Fail-Closed*).

---

#### 🟢 Hallazgo F-08: Tormenta de Reconexión Síncrona a Cassandra en Bucle Interno
- **Severidad:** **BAJA** (Sobrecarga de CPU y sockets).
- **Ubicación:** `scripts/workers/worker_persistence.py`, líneas 116–138, 208–212.
- **Análisis de Causa Raíz:**
  Si Apache Cassandra se torna inalcanzable temporalmente, `cassandra_session` se establece a `None`. En la siguiente iteración del bucle (cada pocos milisegundos por stream), se invoca `connect_cassandra()` inmediatamente sin pausa ni backoff exponencial, saturando los descriptores de archivo del sistema operativo con intentos de conexión fallidos.
- **Mitigación Técnica Propuesta:**
  Incorporar un temporizador de enfriamiento (*cooldown backoff*) de al menos 10 a 15 segundos antes de reintentar la conexión tras un fallo en el driver CQL.

---

## 3. Dimensión 2: Frontend, WebSockets y Canales de Comunicación (R2)

### 3.1. Matriz Resumen de Hallazgos en Frontend y WebSockets

| ID | Título del Hallazgo | Severidad | Archivo y Línea Afectada | Tipo de Defecto |
|---|---|---|---|---|
| **FE-01** | Descarte Silencioso de Trazos de Dibujo Online ante Microcortes de WebSocket | **CRÍTICA** | `DesignInteractions.js:1372-1447`<br>`WebSocketManager.js:128-137` | Pérdida de Datos en Cliente / Falta de Outbox |
| **FE-02** | Destrucción de Estado (State Clobbering) en Estudio Offline por Multi-Pestaña | **CRÍTICA** | `DesignNetwork.js:2118-2214`<br>`CanvasSyncChannel.js` | Concurrencia Local / Falta de Sincronización |
| **FE-03** | Condición de Carrera en `handleVisibilityChange` y Duplicación de Sockets | **ALTA** | `WebSocketManager.js:183-191`<br>`DesignNetwork.js:600-631` | Fuga de Conexiones / Carrera de Timers |
| **FE-04** | Desincronización y Retención de Píxeles Fantasma en Worker ante `lagged_desync` | **ALTA** | `DesignNetwork.js:409-417`<br>`CanvasRenderWorker.js` | Desincronización de Memoria Gráfica |
| **FE-05** | Fuga de Memoria y Retención de Handlers en `WebSocketManager.on()` | **MEDIA** | `public/assets/js/core/api/WebSocketManager.js:140-151` | Retención de Memoria en SPA |
| **FE-06** | Sobrecarga de Heap y Riesgo de OOM por Concatenación Masiva en Exportación | **MEDIA** | `CanvasRenderWorker.js:2070-2103`<br>`DesignNetwork.js:2162-2172` | Asignación Ineficiente de Cadenas |
| **FE-07** | Doble Emisión Potencial en `CanvasSyncChannel.broadcast()` | **BAJA** | `public/assets/js/core/services/CanvasSyncChannel.js:38-50` | Eventos Redundantes en Emisor |

---

### 3.2. Diagnóstico Técnico Profundo de Hallazgos

#### 🔴 Hallazgo FE-01: Descarte Silencioso de Trazos de Dibujo Online ante Microcortes de WebSocket
- **Severidad:** **CRÍTICA** (Pérdida irrecuperable de trabajo del usuario).
- **Ubicación:** `public/assets/js/modules/app/design/DesignInteractions.js` (Líneas 1372–1447) y `public/assets/js/core/api/WebSocketManager.js` (Líneas 128–137).
- **Flujo Afectado:** Dibujo en tiempo real sobre salas online ante latencia, fluctuación de red o reconexiones de socket.
- **Análisis de Causa Raíz:**
  Al hacer clic o arrastrar el cursor para colocar píxeles, `DesignInteractions.js` despacha inmediatamente los píxeles a la memoria local del Web Worker (`PUSH_PIXELS` sobre `pixelBuffer` e `ImageData`), renderizándolos instantáneamente en pantalla (pintado optimista).
  A continuación, invoca `this.wsManager.send(buffer)`.
  En `WebSocketManager.js`:
  ```javascript
  send(payload) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          if (payload instanceof ArrayBuffer || ArrayBuffer.isView(payload)) {
              this.ws.send(payload);
          } else {
              this.ws.send(JSON.stringify(payload));
          }
      } else {
          // VACÍO: Si el socket está CONNECTING, CLOSING o CLOSED, el paquete se descarta silenciosamente sin advertencia ni reintento.
      }
  }
  ```
  No existe una cola de salida persistente (*outbox queue*). Cuando ocurre una desconexión transitoria de 1 segundo:
  1. El usuario ve sus trazos reflejados en el canvas.
  2. El paquete binario se pierde en el vacío.
  3. El servidor nunca recibe la mutación ni la almacena en Redis/Cassandra.
  4. La pantalla del usuario queda permanentemente desfasada de la realidad del servidor hasta una recarga manual con `F5`.
- **Protocolo de Simulación / Reproducción:**
  1. Abrir un lienzo online en Chrome/Firefox.
  2. Abrir DevTools -> Network -> Conexión y alternar a "Offline".
  3. Dibujar una figura en el lienzo durante 2 segundos.
  4. Restaurar la conexión a "No Throttling".
  5. Comprobar que en el navegador del usuario la figura sigue pintada, pero en otro navegador conectado al mismo lienzo los píxeles nunca existieron.
- **Mitigación Técnica Propuesta:**
  Implementar un búfer de anillo (*Outbox Ring Buffer*) en `WebSocketManager` con retransmisión automática y confirmación de ACK:
  ```javascript
  class WebSocketManager {
      constructor() {
          // ...
          this.outboxQueue = [];
          this.maxOutboxSize = 500;
      }

      send(payload) {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(payload instanceof ArrayBuffer || ArrayBuffer.isView(payload) ? payload : JSON.stringify(payload));
          } else {
              if (this.outboxQueue.length < this.maxOutboxSize) {
                  this.outboxQueue.push(payload);
              }
          }
      }

      flushOutbox() {
          while (this.outboxQueue.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
              const payload = this.outboxQueue.shift();
              this.ws.send(payload instanceof ArrayBuffer || ArrayBuffer.isView(payload) ? payload : JSON.stringify(payload));
          }
      }
  }
  // Invocar this.flushOutbox() dentro del listener onopen tras la reconexión exitosa.
  ```

---

#### 🔴 Hallazgo FE-02: Destrucción de Estado (State Clobbering) en Estudio Offline por Multi-Pestaña
- **Severidad:** **CRÍTICA** (Sobreescritura destructiva de sesiones concurrentes).
- **Ubicación:** `public/assets/js/modules/app/design/DesignNetwork.js` (Líneas 2118–2214) y `public/assets/js/core/services/CanvasSyncChannel.js`.
- **Flujo Afectado:** Edición de un mismo lienzo en modo Estudio Offline en dos pestañas del mismo navegador.
- **Análisis de Causa Raíz:**
  En modo offline, no hay conexión WebSocket activa. Los eventos de trazo locales (`placePixels`) no se transmiten a través de `BroadcastChannel`. Cada pestaña gestiona su propia copia aislada del canvas en la memoria de su respectivo Web Worker.
  Cada vez que una pestaña realiza una modificación, se activa un autoguardado con debounce de 1200ms (`saveOfflineCanvasState`), el cual extrae el buffer completo de la pestaña, lo comprime en Gzip/Base64 y lo envía por HTTP `POST /api/canvases.save_offline_state`, sobreescribiendo ciegamente la base de datos MySQL y S3.
  Si el usuario dibuja intensamente en la Pestaña 1 y luego hace un clic accidental en la Pestaña 2, la Pestaña 2 emite su snapshot desactualizado y destruye todo el trabajo realizado en la Pestaña 1.
- **Protocolo de Simulación / Reproducción:**
  1. Abrir el lienzo offline $C_1$ en dos pestañas contiguas (Pestaña A y Pestaña B).
  2. En la Pestaña A, dibujar un diseño detallado durante 1 minuto (se guarda con éxito).
  3. Cambiar a la Pestaña B y colocar un único punto en cualquier coordenada.
  4. Esperar 2 segundos para que se complete el debounce y recargar la Pestaña A.
  5. **Resultado:** Todo el diseño de la Pestaña A ha sido eliminado y reemplazado por el lienzo vacío con un único punto de la Pestaña B.
- **Mitigación Técnica Propuesta:**
  1. **Broadcast Local en Tiempo Real:** Transmitir los eventos de dibujo locales en modo offline entre pestañas mediante `CanvasSyncChannel.broadcast({ type: 'local_offline_stroke', pixels, color })` para mantener los buffers de todas las pestañas sincronizados en memoria.
  2. **Control de Concurrencia Optimista (OCC):** Incluir una cabecera de versión o hash (`expected_version`) en `SaveOfflineState` para que el servidor rechace guardados que intenten sobreescribir un estado más reciente (retornando HTTP 412 Precondition Failed).

---

#### 🟠 Hallazgo FE-03: Condición de Carrera en `handleVisibilityChange` y Duplicación de Sockets
- **Severidad:** **ALTA** (Multiplicación de conexiones WebSocket y colapso de cliente).
- **Ubicación:** `public/assets/js/core/api/WebSocketManager.js` (Líneas 183–191) y `public/assets/js/modules/app/design/DesignNetwork.js` (Líneas 600–631).
- **Flujo Afectado:** Alternancia rápida entre pestañas de navegación durante cortes de red.
- **Análisis de Causa Raíz:**
  En `DesignNetwork.js`, la función `handleReconnect` es reemplazada para solicitar asíncronamente un nuevo ticket JWT mediante `ApiRoutes.Canvases.GetWsTicket` antes de reconectar.
  Sin embargo, el manejador global `visibilitychange` en `WebSocketManager.js` ejecuta:
  ```javascript
  handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
          if (!this.isIntentionalDisconnect && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
              this.reconnectAttempts = 0;
              this.handleReconnect();
          }
      }
  }
  ```
  Si una reconexión programada por temporizador (`wsReconnectTimeout`) ya estaba en curso, `handleVisibilityChange` no cancela el temporizador previo y resetea `reconnectAttempts = 0`. Esto dispara múltiples peticiones concurrentes de tickets y múltiples instancias de `new WebSocket()`, provocando que el cliente mantenga abiertas varias conexiones compitiendo y procesando eventos por duplicado.
- **Mitigación Técnica Propuesta:**
  Introducir una bandera mutex `isReconnecting` y cancelar explícitamente cualquier `reconnectTimeoutId` activo antes de iniciar una reconexión por cambio de visibilidad.

---

#### 🟠 Hallazgo FE-04: Desincronización y Retención de Píxeles Fantasma en Worker ante `lagged_desync`
- **Severidad:** **ALTA** (Artefactos visuales y desincronización gráfica en cliente).
- **Ubicación:** `public/assets/js/modules/app/design/DesignNetwork.js` (Líneas 409–417) y `CanvasRenderWorker.js`.
- **Flujo Afectado:** Notificación de retraso de mensajes emitida por el servidor WebSocket (`{"type": "lagged_desync"}`).
- **Análisis de Causa Raíz:**
  Cuando el servidor WebSocket en Rust detecta que la cola de un cliente ha superado el umbral de desborde, le envía `{"type": "lagged_desync"}`. Al recibirlo, `DesignNetwork.js` vacía su conjunto `loadedChunks` y vuelve a invocar `checkCanvasAccess()` para descargar los cuadrantes actualizados.
  No obstante, **no envía ninguna orden de limpieza al Web Worker**. Si en el servidor se realizaron borrados de píxeles o reseteos parciales en zonas no sobreescritas por los nuevos chunks, los datos residuales del `pixelBuffer` del Worker permanecen visibles en pantalla como píxeles fantasma.
- **Mitigación Técnica Propuesta:**
  Enviar un mensaje `RESET_BUFFER` al Worker antes de iniciar la recarga de chunks para vaciar `pixelBuffer` e `ImageData` a ceros (`fill(0)`).

---

#### 🟡 Hallazgo FE-05: Fuga de Memoria y Retención de Handlers en `WebSocketManager.on()`
- **Severidad:** **MEDIA** (Degradación de rendimiento en Single Page Application).
- **Ubicación:** `public/assets/js/core/api/WebSocketManager.js`, líneas 140–151.
- **Análisis de Causa Raíz:**
  La clase `WebSocketManager` permite registrar callbacks mediante `.on(event, cb)`, pero no proporciona un método `.off(event, cb)` ni vacía la colección `this.callbacks = {}` dentro de `disconnect()`. Si el usuario navega entre diferentes salas dentro de la aplicación sin recargar la página completa, los closures de los controladores antiguos quedan retenidos en memoria indefinidamente con todas sus referencias DOM y contextos gráficos asociados.
- **Mitigación Técnica Propuesta:**
  Implementar `.off(event, cb)` y asegurar que `.disconnect()` ejecute `this.callbacks = {}`.

---

#### 🟡 Hallazgo FE-06: Sobrecarga de Heap y Riesgo de OOM por Concatenación Masiva en Exportación
- **Severidad:** **MEDIA** (Peligro de bloqueo o colapso en lienzos de alta resolución).
- **Ubicación:** `public/assets/js/modules/app/design/workers/CanvasRenderWorker.js` (Líneas 2070–2103) y `DesignNetwork.js` (Líneas 2162–2172).
- **Análisis de Causa Raíz:**
  Para exportar el buffer offline a Base64, el Worker divide los bytes en trozos de 32KB y concatena cadenas mediante:
  `binaryStr += String.fromCharCode.apply(null, exportBytes.subarray(i, Math.min(i + chunkSize, outLen)));`
  En un lienzo 4K sin comprimir (67 MB de buffer), esta operación genera más de 2,000 asignaciones intermedias de cadenas inmutables en el heap de V8/SpiderMonkey, provocando pausas de recolección de basura (*GC pauses*) de varios segundos y potenciales cierres por falta de memoria (*OOM*) en dispositivos de gama media o móviles.
- **Mitigación Técnica Propuesta:**
  Utilizar la API nativa de `FileReader` con `readAsDataURL(new Blob([exportBytes]))` para delegar la codificación Base64 al motor en C++ del navegador de forma asíncrona y sin saturar la memoria de JavaScript.

---

#### 🟢 Hallazgo FE-07: Doble Emisión Potencial en `CanvasSyncChannel.broadcast()`
- **Severidad:** **BAJA** (Duplicación menor de eventos en pestaña local).
- **Ubicación:** `public/assets/js/core/services/CanvasSyncChannel.js`, líneas 38–50.
- **Análisis de Causa Raíz:**
  El método `broadcast` envía el mensaje a través de `channel.postMessage(payload)` y simultáneamente dispara `window.dispatchEvent(new CustomEvent('canvas:sync_event', { detail: payload }))`. Si un componente del frontend escucha tanto los eventos DOM como las suscripciones directas del canal, procesará la acción dos veces en la pestaña emisora.
- **Mitigación Técnica Propuesta:**
  Consolidar el consumo a un único patrón de suscripción por listener o filtrar los eventos en el emisor verificando el origen del mensaje.

---

## 4. Dimensión 3: Workers en Background y Procesamiento Asíncrono (R3)

### 4.1. Matriz Resumen de Hallazgos en Workers y Procesamiento Asíncrono

| ID | Título del Hallazgo | Severidad | Archivo y Línea Afectada | Tipo de Defecto |
|---|---|---|---|---|
| **BG-01** | Condición de Carrera No Atómica en `smembers` + `delete` en `worker_persistence.py` | **ALTA** | `scripts/workers/worker_persistence.py:302-306` | Pérdida de Puntos de Persistencia Dirty |
| **BG-02** | Ausencia de `XAUTOCLAIM` y Recuperación de PEL en Consumidor de Persistencia | **ALTA** | `scripts/workers/worker_persistence.py:160-285` | Mensajes Huérfanos tras Reinicio |
| **BG-03** | Bloqueo Síncrono de Hilos Web PHP por Invocación `exec()` en Videos Timelapse | **MEDIA** | `api/services/Canvas/CanvasMediaService.php:591-604` | Timeouts HTTP 504 / Bloqueo FPM |
| **BG-04** | Huella de Memoria y Sobrecarga de CPU en Renderizado de Timelapses 4K y Slicing NumPy | **MEDIA** | `timelapse_video_renderer.py:1-315`<br>`worker_canvas_jobs.py:102-120` | Saturación de Recursos por Ingesta Masiva |
| **BG-05** | Tormenta de Reintentos CQL sin Cooldown en Ingestión a Cassandra | **BAJA** | `scripts/workers/worker_persistence.py:208-212` | Agotamiento de Descriptores de Red |

---

### 4.2. Diagnóstico Técnico Profundo de Hallazgos

#### 🟠 Hallazgo BG-01: Condición de Carrera No Atómica en `smembers` + `delete` en `worker_persistence.py`
- **Severidad:** **ALTA** (Lienzos modificados que no se persisten en S3).
- **Ubicación:** `scripts/workers/worker_persistence.py`, líneas 302–306.
- **Flujo Afectado:** Vaciado de lienzos modificados desde Redis hacia MySQL y S3.
- **Análisis de Causa Raíz:**
  El hilo de persistencia ejecuta el siguiente bloque cada 5 segundos:
  ```python
  dirty_canvases_bytes = r.smembers("canvases:dirty_states")
  if dirty_canvases_bytes:
      r.delete("canvases:dirty_states")
      for canvas_id_bytes in dirty_canvases_bytes:
          # Procesa y sube a S3
  ```
  La secuencia `smembers` seguida de `delete` **no es atómica**.
  Si otro hilo o el servidor WebSocket agrega un nuevo ID de lienzo mediante `r.sadd("canvases:dirty_states", nuevo_canvas)` en el microsegundo exacto entre la lectura de `smembers` y la ejecución de `delete`, el nuevo lienzo será eliminado del conjunto sin haber sido leído en `dirty_canvases_bytes`. Dicho lienzo quedará sin persistir en S3/MySQL de forma indefinida hasta que reciba un nuevo píxel.
- **Protocolo de Simulación / Reproducción:**
  1. Ejecutar un loop con múltiples hilos que inserten de forma aleatoria IDs en `canvases:dirty_states` con `SADD`.
  2. Ejecutar simultáneamente el bloque `smembers` + `delete` en un hilo competidor.
  3. Contabilizar los IDs leídos contra los IDs insertados.
  4. Observar que entre el 0.1% y 1% de los IDs insertados son eliminados de Redis sin haber sido procesados en `dirty_canvases_bytes`.
- **Mitigación Técnica Propuesta:**
  Utilizar una rotación atómica de claves con `RENAME` o un script Lua atómico:
  ```python
  processing_key = f"canvases:dirty_processing_{worker_id}"
  try:
      # Rotación atómica de la clave
      r.rename("canvases:dirty_states", processing_key)
      dirty_canvases = r.smembers(processing_key)
      r.delete(processing_key)
  except redis.ResponseError:
      dirty_canvases = set()
  ```

---

#### 🟠 Hallazgo BG-02: Ausencia de `XAUTOCLAIM` y Recuperación de PEL en Consumidor de Persistencia
- **Severidad:** **ALTA** (Eventos de píxeles atascados en Redis Streams).
- **Ubicación:** `scripts/workers/worker_persistence.py`, líneas 160–285.
- **Flujo Afectado:** Consumo de streams `canvas:*:stream` y persistencia a Cassandra.
- **Análisis de Causa Raíz:**
  A diferencia de `worker_canvas_jobs.py` (que implementa `ResilientStreamConsumer` con 4 fases: PEL propio con `'0'`, `XAUTOCLAIM` para workers caídos y nuevos con `'>'`), `worker_persistence.py` utiliza un nombre estático hardcodeado `CONSUMER_NAME = "worker-1"` y únicamente consulta con `'>'`.
  Si el contenedor Docker de persistencia muere o se reinicia abruptamente mientras procesaba un lote de 5,000 píxeles, esos mensajes permanecen en la lista de entradas pendientes (*Pending Entries List - PEL*) y **nunca más son leídos ni procesados**, quedando huérfanos en la memoria de Redis.
- **Mitigación Técnica Propuesta:**
  Estandarizar el uso de `ResilientStreamConsumer` en `worker_persistence.py` o incorporar un ciclo periódico de `XAUTOCLAIM` con `min_idle_time = 30000` ms para recuperar mensajes pendientes:
  ```python
  # Recuperación automática de mensajes pendientes huérfanos
  claimed_msgs = r.xautoclaim(
      stream_key, CONSUMER_GROUP, CONSUMER_NAME,
      min_idle_time=30000, start_id='0-0', count=500
  )
  ```

---

#### 🟡 Hallazgo BG-03: Bloqueo Síncrono de Hilos Web PHP por Invocación `exec()` en Videos Timelapse
- **Severidad:** **MEDIA** (Bloqueo de procesos PHP-FPM y errores 504).
- **Ubicación:** `api/services/Canvas/CanvasMediaService.php`, líneas 591–604.
- **Flujo Afectado:** Solicitud de renderizado de video MP4 (`POST /api/canvases.export_snapshot_timelapse_video`).
- **Análisis de Causa Raíz:**
  El servicio intenta ejecutar el script Python de forma síncrona en el hilo web de PHP mediante `@exec($cmd, $out, $retCode)` buscando ejecutables en rutas fijas de Windows (`C:\Users\jorge\AppData\Local\Python\...`). Si el timelapse contiene miles de eventos y requiere 45 segundos de renderizado FFmpeg, el proceso PHP-FPM se bloquea, superando los timeouts del servidor web Nginx/Apache y arrojando errores **504 Gateway Timeout** al cliente.
- **Mitigación Técnica Propuesta:**
  Eliminar la invocación síncrona `exec()` y delegar el trabajo al stream de Redis `stream:canvas_timelapse_video`, permitiendo que el hilo dedicado `VideoThread` en `worker_canvas_jobs.py` procese el video en background y notifique la finalización vía Pub/Sub o WebSocket.

---

#### 🟡 Hallazgo BG-04: Huella de Memoria y Sobrecarga de CPU en Renderizado de Timelapses 4K y Slicing NumPy
- **Severidad:** **MEDIA** (Consumo elevado de memoria en workers).
- **Ubicación:** `scripts/workers/timelapse_video_renderer.py` (L1–315) y `worker_canvas_jobs.py` (L102–120).
- **Flujo Afectado:** Exportación de video a resolución máxima y cálculo de firmas CRC32 por cuadrante.
- **Análisis de Causa Raíz:**
  Para exportar un timelapse a resolución 4K (3840x2160), cada frame crudo sin comprimir en formato RGB24 requiere 3840 * 2160 * 3 = 24.88 MB. La transferencia de 30 segundos de video a 30 FPS implica transferir más de 22.4 GB a través del pipe `stdin` de FFmpeg.
  Por otra parte, el cálculo de firmas CRC32 (`compute_chunk_crc_map`) en `worker_canvas_jobs.py` utiliza arreglos NumPy sobre cuadrantes de 512x512. Aunque el algoritmo IEEE 802.3 es óptimo, la duplicación de memoria en operaciones concurrentes de plantillas puede provocar picos de memoria si múltiples lienzos de alta resolución se procesan simultáneamente.
- **Mitigación Técnica Propuesta:**
  Mantener el límite estricto de concurrencia en subprocesos de FFmpeg (`-threads 2`), exigir planes de suscripción avanzados para exportaciones 4K (`feat_download_4k`) y aplicar límites de memoria por contenedor en `docker-compose.yml` (`mem_limit: 2g`).

---

#### 🟢 Hallazgo BG-05: Tormenta de Reintentos CQL sin Cooldown en Ingestión a Cassandra
- **Severidad:** **BAJA** (Sobrecarga de sockets en caídas de NoSQL).
- **Ubicación:** `scripts/workers/worker_persistence.py`, líneas 208–212.
- **Análisis de Causa Raíz:**
  Si el clúster de Cassandra rechaza las conexiones durante un mantenimiento, el worker reintenta instanciar la conexión en cada ciclo sin pausa, generando registros de error excesivos y agotando sockets del sistema operativo.
- **Mitigación Técnica Propuesta:**
  Introducir una pausa con backoff exponencial antes de intentar reestablecer la sesión con Cassandra.

---

## 5. Dimensión 4: Seguridad, Permisos y Límites de Suscripción (R4)

### 5.1. Matriz Resumen de Hallazgos en Seguridad y Permisos

| ID | Título del Hallazgo | Severidad | Archivo y Línea Afectada | Tipo de Defecto |
|---|---|---|---|---|
| **SEC-01** | Bypass Crítico de Autorización en `generateWsTicket` para Lienzos Privados | **CRÍTICA** | `api/services/Canvas/CanvasCoreService.php:74-98` | Autorización Rota / Fuga de Datos |
| **SEC-02** | Evasión de Límites de Suscripción en Características Premium | **ALTA** | `SubscriptionPlanConstants.php`<br>`CanvasLockManager.php` | Control de Acceso Incompleto |
| **SEC-03** | Soporte Incompleto de Descompresión Zlib y Validación de Buffers en `saveOfflineState` | **MEDIA** | `api/services/Canvas/CanvasCoreService.php:1573-1595` | Validación de Formato Binario |
| **SEC-04** | Vulnerabilidad de Manipulación de Parámetros en Moderación de Salas | **MEDIA** | `api/controllers/Canvas/CanvasChatRestrictionController.php` | Validación de Parámetros de Moderación |

---

### 5.2. Diagnóstico Técnico Profundo de Hallazgos

#### 🔴 Hallazgo SEC-01: Bypass Crítico de Autorización en `generateWsTicket` para Lienzos Privados
- **Severidad:** **CRÍTICA** (Acceso no autorizado a salas privadas y fuga de información en tiempo real).
- **Ubicación:** `api/services/Canvas/CanvasCoreService.php`, líneas 74–98.
- **Flujo Afectado:** Generación de tickets JWT para acceso al servidor WebSocket (`POST /api/canvases.get_ws_ticket`).
- **Análisis de Causa Raíz:**
  El método `generateWsTicket` contiene la siguiente lógica:
  ```php
  public function generateWsTicket(?int $userId, int $canvasId): array {
      $canvas = $this->canvasRepository->getById($canvasId);
      if (!$canvas) {
          return ['success' => false, 'message' => __('err_canvas_not_found'), 'http_code' => 404];
      }
      $isOffline = (($canvas['mode'] ?? 'offline') === 'offline' || empty($canvas['is_online_active']));
      if ($isOffline) {
          return ['success' => false, 'message' => __('err_canvas_offline'), 'http_code' => 403];
      }
      
      // GENERACIÓN INCONDICIONAL DEL TICKET JWT
      $tokenData = [
          'type' => $userId !== null ? 'auth' : 'guest',
          'user_id' => $userId,
          'canvas_id' => $canvasId,
          'iat' => time(),
          'exp' => time() + 15
      ];
      $token = \App\Core\Security\JWT::encode($tokenData, $secret);
      return ['success' => true, 'data' => ['ticket' => $token]];
  }
  ```
  **Fallo de Seguridad:** `generateWsTicket` **NO comprueba si el lienzo es privado (`privacy === 'private'`)**, ni verifica si el usuario es miembro aprobado o propietario del lienzo. A diferencia del método `validateCanvasAccess` (L41-68), cualquier usuario autenticado o anónimo que conozca el `canvas_id` de una sala privada puede solicitar un ticket JWT válido y conectarse al servidor WebSocket en Rust, recibiendo los trazos en tiempo real, el chat privado y la totalidad del lienzo.
- **Protocolo de Simulación / Reproducción:**
  1. El Usuario A crea un lienzo privado en modo Online (`privacy = 'private'`, `is_online_active = 1`).
  2. El Usuario B (o un atacante anónimo sin cuenta) envía una petición HTTP:
     ```bash
     curl -X POST https://api.rosaura.local/api/canvases.get_ws_ticket \
          -H "Content-Type: application/json" \
          -d "{\"canvas_id\": 456}"
     ```
  3. El servidor responde con HTTP 200 y entrega un JWT firmado.
  4. El atacante abre una conexión WebSocket con `ws://server:8765/canvas/456?ticket=$JWT` y obtiene acceso completo a la sala privada.
- **Mitigación Técnica Propuesta:**
  Integrar la validación rigurosa de pertenencia y privacidad antes de emitir el ticket JWT:
  ```php
  public function generateWsTicket(?int $userId, int $canvasId): array {
      $access = $this->validateCanvasAccess($userId, $canvasId);
      if (!$access['success']) {
          return [
              'success' => false,
              'message' => $access['message'] ?? __('err_forbidden'),
              'http_code' => \App\Core\System\HttpConstants::FORBIDDEN
          ];
      }
      
      $canvas = $access['canvas'] ?? $this->canvasRepository->getById($canvasId);
      $isOffline = (($canvas['mode'] ?? 'offline') === 'offline' || empty($canvas['is_online_active']));
      if ($isOffline) {
          return ['success' => false, 'message' => __('err_canvas_offline'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
      }

      $secret = getenv('INTERNAL_API_SECRET') ?: 'default_secret';
      $time = time();
      $tokenData = [
          'type' => $userId !== null ? 'auth' : 'guest',
          'user_id' => $userId,
          'canvas_id' => $canvasId,
          'iat' => $time,
          'exp' => $time + 15
      ];
      $token = \App\Core\Security\JWT::encode($tokenData, $secret);
      return ['success' => true, 'data' => ['ticket' => $token]];
  }
  ```

---

#### 🟠 Hallazgo SEC-02: Evasión de Límites de Suscripción en Características Premium
- **Severidad:** **ALTA** (Uso no autorizado de características de pago).
- **Ubicación:** `includes/core/System/SubscriptionPlanConstants.php` y `api/services/Canvas/CanvasLockManager.php`.
- **Flujo Afectado:** Configuración de roles avanzados, plantillas e inyecciones de imagen.
- **Análisis de Causa Raíz:**
  Determinados endpoints de configuración (`CanvasSettingsController`) permiten habilitar roles personalizados o plantillas avanzadas verificando únicamente los permisos de la sala pero sin consultar si el propietario del lienzo (`owner_id`) posee un plan activo con las características `feat_advanced_roles` o `feat_inject_templates` habilitadas.
- **Mitigación Técnica Propuesta:**
  Enforzar la verificación de `SubscriptionPlanConstants::hasFeature($tier, $feature)` en todos los controladores de configuración antes de procesar cambios que requieran planes superiores.

---

#### 🟡 Hallazgo SEC-03: Soporte Incompleto de Descompresión Zlib y Validación de Buffers
- **Severidad:** **MEDIA** (Incompatibilidad y rechazo falso de datos legítimos).
- **Ubicación:** `api/services/Canvas/CanvasCoreService.php`, líneas 1573–1595.
- **Flujo Afectado:** Guardado de estado offline (`saveOfflineState`).
- **Análisis de Causa Raíz:**
  La rutina de descompresión en `saveOfflineState` verifica únicamente la firma de Gzip (`\x1f\x8b`), pero rechaza buffers comprimidos con Zlib estándar (RFC 1950, cabeceras `\x78\x9c` o `\x78\x01`) emitidos por librerías frontend como Pako o Compression Streams en modo Deflate crudo, arrojando errores de dimensiones erróneas (`err_invalid_dimensions`).
- **Mitigación Técnica Propuesta:**
  Añadir soporte de descompresión fallback con `gzuncompress()` e `inflate`:
  ```php
  if (strlen($rawBinary) >= 2) {
      $magic = substr($rawBinary, 0, 2);
      if ($magic === "\x1f\x8b") {
          $decompressed = @gzdecode($rawBinary);
      } elseif ($magic === "\x78\x9c" || $magic === "\x78\x01" || $magic === "\x78\xda") {
          $decompressed = @gzuncompress($rawBinary);
      }
      if (isset($decompressed) && $decompressed !== false) {
          $rawBinary = $decompressed;
      }
  }
  ```

---

#### 🟡 Hallazgo SEC-04: Vulnerabilidad de Manipulación de Parámetros en Moderación de Salas
- **Severidad:** **MEDIA** (Sanciones no autorizadas sobre roles iguales o superiores).
- **Ubicación:** `api/controllers/Canvas/CanvasChatRestrictionController.php`.
- **Flujo Afectado:** Muteo, baneo y expulsión de usuarios en salas de chat.
- **Análisis de Causa Raíz:**
  Los métodos de moderación no verifican la jerarquía de roles entre el usuario ejecutor y el usuario objetivo, permitiendo que un moderador con rol de menor jerarquía intente sancionar a un administrador o al propietario de la sala.
- **Mitigación Técnica Propuesta:**
  Validar la jerarquía numérica de roles antes de aplicar cualquier sanción (`moderatorRole.weight > targetRole.weight`).

---

## 6. Análisis de Escenarios de Fallo y Degradación del Sistema

### 6.1. Escenario A: Caída o Indisponibilidad de Redis (In-Memory Outage)
- **Comportamiento Actual Diagnosticado:**
  - El servidor WebSocket en Rust pierde la conexión con Redis, abortando el comando `SETRANGE` y devolviendo errores de desconexión a los clientes.
  - El backend PHP intenta invocar `acquireLock`, el cual retorna un token simulado falso (Hallazgo F-07), ejecutando operaciones de concurrencia sin exclusión mutua.
  - Las transiciones de estado a online fallan al intentar escribir `canvas:{id}:state`.
- **Modo de Degradación Recomendado:**
  - Activar bandera global de degradación `SYSTEM_DEGRADED = true`.
  - Forzar a los lienzos a operar temporalmente en modo de solo lectura (*Read-Only Mode*) o modo estudio local desconectado.
  - El método `acquireLock` debe retornar `false` inmediatamente para evitar corrupciones concurrentes en MySQL.

---

### 6.2. Escenario B: Caída o Saturación de Conexiones de MySQL
- **Comportamiento Actual Diagnosticado:**
  - Las peticiones REST arrojaron excepciones PDO no capturadas con errores HTTP 500.
  - Los WebSockets en Rust pueden seguir funcionando en memoria para trazos de dibujo durante unos minutos, pero fallan al intentar autenticar nuevos tickets o sincronizar conteos online.
- **Modo de Degradación Recomendado:**
  - Implementar colas de conexión con timeout corto (3 segundos).
  - Devolver respuestas amigables HTTP 503 Service Unavailable con cabecera `Retry-After: 10`.
  - Los workers en background deben pausar su bucle de sondeo con backoff exponencial para no saturar el servidor MySQL durante la recuperación.

---

### 6.3. Escenario C: Caída del Clúster NoSQL Apache Cassandra
- **Comportamiento Actual Diagnosticado:**
  - El bucle de persistencia (`worker_persistence.py`) entra en un ciclo acelerado de reconexión sin backoff (Hallazgo F-08 / BG-05), saturando sockets.
  - La tabla `canvas_pixel_history` deja de registrar la trazabilidad de píxeles, pero los snapshots del lienzo en S3 y MySQL continúan funcionando a través de Redis.
- **Modo de Degradación Recomendado:**
  - Mantener los eventos de píxeles en el Redis Stream `canvas:{id}:stream` sin confirmar con `XACK` hasta que Cassandra se recupere.
  - Aplicar un límite máximo de retención en stream (`MAXLEN ~ 100000`) para evitar agotar la memoria RAM de Redis en caídas prolongadas de Cassandra.

---

### 6.4. Escenario D: Desincronización y Partición de Red en Servidores WebSocket (Rust `ws_server`)
- **Comportamiento Actual Diagnosticado:**
  - Si un nodo WebSocket se desconecta del canal Pub/Sub `canvas:sync_events`, los usuarios conectados a dicho nodo no reciben los píxeles dibujados por usuarios en otros nodos.
  - Los clientes reciben el evento `lagged_desync`, pero no limpian la memoria gráfica de su Web Worker (Hallazgo FE-04), acumulando artefactos visuales.
- **Modo de Degradación Recomendado:**
  - Enviar una orden `RESET_BUFFER` al Worker del cliente antes de rehidratar chunks.
  - Implementar un mecanismo de latido (*heartbeat*) entre nodos WebSocket para aislar y reiniciar nodos particionados.

---

### 6.5. Escenario E: Caída y Reinicio Inesperado de Nodos de Background Workers (Python Daemons)
- **Comportamiento Actual Diagnosticado:**
  - Si `worker_canvas_jobs.py` se reinicia, `ResilientStreamConsumer` recupera tareas pendientes gracias a `XAUTOCLAIM` y lectura del PEL.
  - Si `worker_persistence.py` se reinicia, los mensajes de píxeles pendientes en su PEL se pierden o quedan atascados indefinidamente (Hallazgo BG-02).
- **Modo de Degradación Recomendado:**
  - Estandarizar `ResilientStreamConsumer` en el 100% de los daemons de Python para garantizar recuperación automática tras fallos inesperados.

---

## 7. Plan Maestro de Priorización y Mitigación Técnica (Roadmap)

### 7.1. Matriz Maestra de Priorización

| ID | Hallazgo / Vulnerabilidad | Dimensión | Severidad | Impacto en Plataforma | Esfuerzo (Story Points) | Dependencias |
|---|---|---|---|---|---|---|
| **SEC-01** | Bypass de Autorización en `generateWsTicket` | R4: Seguridad | **CRÍTICA** | Muy Alto (Fuga de salas privadas) | 1 SP | Ninguna |
| **F-01** | Race Condition en `activateOnline` (Cuotas) | R1: Backend | **CRÍTICA** | Alto (Evasión de suscripciones) | 3 SP | Redis Lock Helper |
| **F-02** | Destrucción de Buffer Redis en `saveOfflineState` | R1: Backend | **CRÍTICA** | Muy Alto (Corrupción de salas online) | 1 SP | Ninguna |
| **F-03** | Pérdida de Píxeles y Buffer Esparso en `deactivateOnline` | R1: Backend | **CRÍTICA** | Alto (Pérdida de datos en cierre) | 5 SP | Lua Script & WS Event |
| **FE-01** | Descarte Silencioso de Trazos en Microcortes WS | R2: Frontend | **CRÍTICA** | Muy Alto (Pérdida de trazos online) | 5 SP | `WebSocketManager` |
| **FE-02** | Destrucción de Estado Offline Multi-Pestaña | R2: Frontend | **CRÍTICA** | Alto (Sobreescritura de sesiones) | 5 SP | `CanvasSyncChannel` |
| **F-04** | Disparidad Extrema en Contabilidad de Cuotas | R1: Backend | **ALTA** | Alto (Inconsistencia de cuotas de usuario) | 8 SP | `StorageAccountingService` |
| **F-05** | Polución de Caché de Metadatos por 30 Días | R1: Backend | **ALTA** | Medio (Interfaz desactualizada en recarga) | 3 SP | `CacheInvalidator` |
| **FE-03** | Carrera en `visibilitychange` y Sockets Duplicados | R2: Frontend | **ALTA** | Medio (Saturación de sockets cliente) | 2 SP | `WebSocketManager` |
| **FE-04** | Píxeles Fantasma en Worker ante `lagged_desync` | R2: Frontend | **ALTA** | Medio (Artefactos visuales) | 2 SP | `CanvasRenderWorker` |
| **BG-01** | Carrera No Atómica en `canvases:dirty_states` | R3: Async | **ALTA** | Medio (Snapshots omitidos a S3) | 3 SP | Redis Python Client |
| **BG-02** | Falta de `XAUTOCLAIM` en `worker_persistence.py` | R3: Async | **ALTA** | Medio (Mensajes atascados tras reinicio) | 5 SP | `ResilientStreamConsumer` |
| **SEC-02** | Evasión de Límites en Features Premium | R4: Seguridad | **ALTA** | Medio (Uso indebido de características) | 3 SP | `SubscriptionPlanConstants` |
| **F-07** | Tokens Ilusorios en `acquireLock` Degradado | R1: Backend | **MEDIA** | Medio (Falsa exclusión mutua) | 1 SP | `RedisCache` |
| **BG-03** | Bloqueo Síncrono `exec()` en Video Timelapse | R3: Async | **MEDIA** | Medio (Timeouts 504 en API) | 3 SP | Video Stream Queue |
| **FE-05** | Fuga de Memoria en `WebSocketManager.on()` | R2: Frontend | **MEDIA** | Bajo (Fuga acumulativa en SPA) | 1 SP | `WebSocketManager` |
| **FE-06** | Sobrecarga de Heap en Exportación de Lienzo | R2: Frontend | **MEDIA** | Bajo (Consumo de RAM en lienzos 4K) | 2 SP | `CanvasRenderWorker` |
| **SEC-03** | Soporte Incompleto de Zlib en Guardado | R4: Seguridad | **MEDIA** | Bajo (Rechazo de payloads válidos) | 1 SP | `CanvasCoreService` |

---

### 7.2. Fases de Ejecución del Plan de Mitigación

```
+-------------------------------------------------------------------------------------------------------------+
|                                     PLAN DE MITIGACIÓN ARQUITECTÓNICA EN 4 FASES                            |
+-------------------------------------------------------------------------------------------------------------+
                                                       |
                                                       v
+-------------------------------------------------------------------------------------------------------------+
| FASE 1: Hotfixes Inmediatos de Seguridad y Concurrencia Crítica (Estimación: 1-2 Días)                      |
| - Corrección del bypass de privacidad en generateWsTicket (SEC-01).                                         |
| - Bloqueo distribuido y transacción pesimista en activateOnline (F-01).                                     |
| - Guarda contra guardados offline sobre lienzos online en saveOfflineState (F-02).                          |
| - Protocolo de drenaje y guarda EXISTS en SETRANGE de Lua (F-03).                                           |
+-------------------------------------------------------------------------------------------------------------+
                                                       |
                                                       v
+-------------------------------------------------------------------------------------------------------------+
| FASE 2: Robustez de Buffers, Sincronización en Tiempo Real y Frontend Resiliente (Estimación: 3-5 Días)     |
| - Implementación de Outbox Ring Buffer con confirmación en WebSocketManager (FE-01).                         |
| - Sincronización de trazos locales offline en CanvasSyncChannel y OCC con ETag (FE-02).                     |
| - Mutex de reconexión y cancelación de timers en handleVisibilityChange (FE-03).                            |
| - Mensaje RESET_BUFFER hacia CanvasRenderWorker ante lagged_desync (FE-04).                                 |
| - Incorporación de off() y limpieza de callbacks en WebSocketManager (FE-05).                               |
+-------------------------------------------------------------------------------------------------------------+
                                                       |
                                                       v
+-------------------------------------------------------------------------------------------------------------+
| FASE 3: Resiliencia de Workers Asíncronos y Armonización de Almacenamiento (Estimación: 4-6 Días)          |
| - Estandarización de ResilientStreamConsumer con XAUTOCLAIM en worker_persistence.py (BG-02).               |
| - Rotación atómica de conjuntos con RENAME para canvases:dirty_states (BG-01).                              |
| - Eliminación de exec() síncrono y despacho 100% asíncrono de videos timelapse (BG-03).                     |
| - Creación del servicio unificado StorageAccountingService para MySQL y S3 (F-04).                          |
| - Corrección de fail-open en acquireLock durante modo degradado (F-07).                                     |
+-------------------------------------------------------------------------------------------------------------+
                                                       |
                                                       v
+-------------------------------------------------------------------------------------------------------------+
| FASE 4: Optimización de Rendimiento, Desacople de Caché y Gobernanza (Estimación: 2-3 Días)                 |
| - Desacople de state_base64 de las claves de caché de metadatos con TTL de 30 días (F-05).                  |
| - Migración a FileReader nativo en CanvasRenderWorker para exportación Base64 de alta resolución (FE-06).   |
| - Soporte integral de descompresión Zlib RFC 1950 y Gzip RFC 1952 (SEC-03).                                 |
| - Validación de jerarquía de roles en moderación de salas (SEC-04).                                         |
+-------------------------------------------------------------------------------------------------------------+
```

---

## 8. Conclusiones y Dictamen de Auditoría

1. **Estado General del Sistema:**
   El subsistema de lienzos de ProjectRosaura posee un diseño arquitectónico ambicioso y de alto desempeño, aprovechando de forma sobresaliente el potencial de Rust para el hub de WebSockets, Web Workers para el renderizado fuera del hilo principal del DOM, y Redis Streams para la ingesta de eventos de alta frecuencia.
2. **Áreas Críticas de Intervención:**
   Las principales debilidades diagnosticadas no radican en el rendimiento bruto, sino en las **zonas de transición de estado e interfaces entre capas**:
   - Falta de exclusión mutua en transiciones de modo (offline <-> online).
   - Ausencia de búferes de retransmisión (*outbox*) ante microcortes de red en el cliente.
   - Ruptura de invariantes de almacenamiento por contabilidad asimétrica (5% vs 100%).
   - Omisión de controles de acceso en la generación de tickets WebSocket para salas privadas.
3. **Viabilidad de las Mitigaciones:**
   La totalidad de las soluciones propuestas en este informe son compatibles con la arquitectura actual, no requieren introducir nuevas librerías o dependencias externas incompatibles y pueden ser desplegadas de forma incremental siguiendo el Plan de Mitigación en 4 Fases detallado en la Sección 7.
