# Reporte Técnico de Diagnóstico y Mapeo Arquitectónico: Frontend, WebSockets y Canales de Comunicación (Canvas System)

**Proyecto**: ProjectRosaura  
**Subagente Auditor**: Explorer Survey Frontend  
**Fecha de Auditoría**: 2026-08-21  
**Directorio Base**: `f:\htdocs\ProjectRosaura`  
**Modo de Auditoría**: Strict Read-Only Survey & Architectural Diagnostics  

---

## 1. Resumen Ejecutivo y Mapa Arquitectónico

El sistema de lienzos en cliente de **ProjectRosaura** implementa una arquitectura híbrida de alto rendimiento basada en Web Workers (`CanvasRenderWorker.js`), `OffscreenCanvas`, manipulación directa de memoria en buffers de 32 bits (`Uint32Array` y `ImageData`), comunicación binaria y JSON mediante WebSocket (`WebSocketManager.js`), y sincronización inter-pestañas mediante la API nativa de `BroadcastChannel` (`CanvasSyncChannel.js`).

### Diagrama Arquitectónico del Frontend

```
                       ┌──────────────────────────────────────────────────────────┐
                       │                       DOM THREAD                         │
                       │                                                          │
                       │   ┌──────────────────────────────────────────────────┐   │
                       │   │                 DesignController                 │   │
                       │   │ (Setup, Network, Interactions, Render, Template) │   │
                       │   └────────────┬─────────────┬─────────────┬─────────┘   │
                       │                │             │             │             │
                       │   ┌────────────▼─────┐  ┌────▼────────┐  ┌─▼─────────┐   │
                       │   │ WebSocketManager │  │  SyncChannel│  │DesignChat │   │
                       │   └────────────┬─────┘  └────┬────────┘  └───────────┘   │
                       └────────────────┼─────────────┼───────────────────────────┘
                                        │             │
                     ┌──────────────────┼─────────────┼───────────────────────────┐
                     │                  ▼             ▼                           │
                     │           WebSocket Server  BroadcastChannel               │
                     │          (ws://...:8765)   ('rosaura_canvas_events')       │
                     │                  │             │                           │
                     └──────────────────┼─────────────┼───────────────────────────┘
                                        │             │
                       ┌────────────────┼─────────────┼───────────────────────────┐
                       │                │  postMessage│ (Transferable)            │
                       │                ▼             ▼                           │
                       │   ┌──────────────────────────────────────────────────┐   │
                       │   │              CanvasRenderWorker.js               │   │
                       │   │   - OffscreenCanvas (Context 2D)                 │   │
                       │   │   - mainImageData & pixelBuffer (Uint32Array)    │   │
                       │   │   - Dirty Rect Optimizer (O(1) updates)          │   │
                       │   │   - Progressive Chunk Hydration (512x512 tiles)  │   │
                       │   │   - Dynamic Animation Engine (Reset, Perks)      │   │
                       │   └──────────────────────────────────────────────────┘   │
                       │                   WEB WORKER THREAD                      │
                       └──────────────────────────────────────────────────────────┘
```

---

## 2. Inventario Completo de Archivos y Responsabilidades de Módulos

| Componente / Archivo | Ruta Relativa | Responsabilidad Principal |
|---|---|---|
| **WebSocketManager** | `public/assets/js/core/api/WebSocketManager.js` | Conexión WebSocket binaria/JSON, heartbeat de 25s (`ping`), reconexión con backoff exponencial + jitter (0-2000ms), decodificación de opCodes binarios (1, 2, 3, 4). |
| **CanvasSyncChannel** | `public/assets/js/core/services/CanvasSyncChannel.js` | Bus de eventos entre pestañas locales del navegador vía `BroadcastChannel('rosaura_canvas_events')` y emisión de eventos DOM `canvas:sync_event`. |
| **CanvasRenderWorker** | `public/assets/js/modules/app/design/workers/CanvasRenderWorker.js` | Hilo de renderizado dedicado. Manejo de `OffscreenCanvas`, búferes `Uint32Array` Little-Endian (`0xAABBGGRR`), dirty rects, descompresión `gzip` (`DecompressionStream`), animaciones de perks/reset/resize. |
| **DesignController** | `public/assets/js/modules/app/design/DesignController.js` | Orquestador principal del lienzo en cliente. Inicializa perks, cooldown loop (`requestAnimationFrame`), gestión de badges, proxies de píxeles y ensamblado de prototipos mixin. |
| **DesignSetup** | `public/assets/js/modules/app/design/DesignSetup.js` | Extracción de configuración DOM (`data-*`), cálculo de zoom/centrado, inicialización del Web Worker (`transferControlToOffscreen`), carga progresiva de chunks (`/api/go/canvases/get_chunks`). |
| **DesignNetwork** | `public/assets/js/modules/app/design/DesignNetwork.js` | Gestión de tickets WebSocket (con Turnstile para invitados), despacho de mensajes WS, sincronización de áreas protegidas/minas, Live Share de plantillas y autoguardado offline. |
| **DesignInteractions** | `public/assets/js/modules/app/design/DesignInteractions.js` | Manejo de eventos de entrada (mouse, touch, wheel, teclado), dibujo interactivo, selección bitmask, colocación de píxeles (`placePixels`), perks y herramientas de dueño. |
| **DesignRender** | `public/assets/js/modules/app/design/DesignRender.js` | Sincronización de paletas, previews de color, cálculo de luminancia WCAG, envío de estados de renderizado al worker (`UPDATE_RENDER_STATE`). |
| **DesignChat** | `public/assets/js/modules/app/design/DesignChat.js` | Chat en vivo asociado al lienzo. Paginación de historial, envío optimista de mensajes e imágenes, indicadores de escritura en tiempo real (`chat_typing`). |
| **DesignTemplates** | `public/assets/js/modules/app/design/templates/DesignTemplates.js` | Gestión de plantillas y overlays, subida, rotación, Live Share de plantillas y estampado (`injectTemplate`). |
| **CanvasResizeController** | `public/assets/js/modules/canvases/workspace/CanvasResizeController.js` | Redimensionamiento inmediato y programado de lienzos con emisión a `CanvasSyncChannel`. |
| **CanvasResetController** | `public/assets/js/modules/canvases/workspace/CanvasResetController.js` | Vaciado inmediato y programado de lienzos con emisión a `CanvasSyncChannel`. |
| **CanvasEditController** | `public/assets/js/modules/canvases/workspace/CanvasEditController.js` | Configuración de metadatos, privacidad, límites de miembros, cooldown y paletas. |
| **CanvasCardInteractions**| `public/assets/js/core/components/CanvasCardInteractions.js` | Interacciones de tarjetas en feeds y listas; emisión de `canvas_mode_changed` entre pestañas. |
| **ChatViewerController** | `public/assets/js/modules/app/canvases/ChatViewerController.js` | Visor de imágenes adjuntas en el chat del lienzo con soporte de descarga y guardado a plantillas. |
| **SnapshotViewerController**| `public/assets/js/modules/canvases/history/SnapshotViewerController.js`| Visor de snapshots históricos y reproductor de timelapses cuadro a cuadro. |
| **HttpClient** | `public/assets/js/core/api/HttpClient.js` | Capa base HTTP con auto-refresh y retry de tokens CSRF, manejo de respuestas JSON/binarias y streams. |
| **ApiRoutes** | `public/assets/js/core/api/ApiRoutes.js` | Diccionario maestro de rutas API REST y configuración de endpoints WebSocket (`WsConfig`). |

---

## 3. Trazabilidad del Ciclo de Vida del Cliente y Transición de Estados

### 3.1. Fase de Inicialización
1. `DesignController.init()` ejecuta `PerksRegistry.load()` para cargar la configuración de habilidades.
2. Lee atributos de configuración del contenedor `[data-ref="design-wrapper"]`:
   - `data-canvas-id`, `data-canvas-uuid`, `data-privacy`, `data-mode`, `data-online-active`, `data-size`, `data-palette`, `data-cooldown-batch`, `data-cooldown-seconds`.
3. Determina el modo operativo:
   $$\text{isOfflineMode} = (\text{canvasMode} === 'offline' \land \neg \text{isOnlineActive})$$
4. En `DesignSetup.setupCanvas()`:
   - Verifica si el navegador soporta `canvas.transferControlToOffscreen()` y `Worker`.
   - Instancia el Web Worker `CanvasRenderWorker.js` transfiriendo el control del canvas como Transferable Object.
   - Envía el mensaje `INIT_CANVAS` con dimensiones (`boardWidth`, `boardHeight`), DPR (`devicePixelRatio`) y flag `isProgressive`.
5. Si no está en modo offline, llama a `initWebSocket()` y `checkCanvasAccess()`.

### 3.2. Ciclo de Dibujo Offline (Estudio Personal)
- **Aislamiento de Red**: En modo offline, `initWebSocket()` no se ejecuta. El cliente no mantiene ningún socket abierto.
- **Flujo de Píxeles**:
  1. El usuario selecciona píxeles en el canvas mediante `handleMouseDown`, `handleMouseMove` o selección de área.
  2. `placePixels()` valida los límites de balance (en modo offline `getMaxBalance()` retorna `Infinity`).
  3. Despacha `PUSH_PIXELS` al Web Worker (`CanvasRenderWorker.js`).
  4. El Worker actualiza su búfer de memoria de 32 bits (`pixelBuffer`) y marca el área en `dirtyRect`.
  5. `flushDirtyRect()` ejecuta `offscreenCtx.putImageData(...)` en la subregión modificada y dibuja en el canvas principal.
- **Persistencia Offline**:
  - `placePixels()` invoca `saveOfflineCanvasState(false)`, el cual activa un debounce de 1200ms (`_offlineSaveTimeout`).
  - Al vencer el temporizador, envía `EXPORT_OFFLINE_STATE` al Worker.
  - El Worker procesa `pixelQueue`, toma `mainImageData.data`, comprime el búfer con `CompressionStream('gzip')`, lo convierte a binario en trozos de 32KB (`0x8000`), genera base64 (`btoa`) y lo devuelve al hilo principal (`OFFLINE_STATE_EXPORTED`).
  - El hilo principal ejecuta un `POST` a `ApiRoutes.Canvases.SaveOfflineState` con `{ canvas_id, state_base64 }`.
  - **Fallo de Almacenamiento Local**: La aplicación **no utiliza IndexedDB ni localStorage** para respaldar los píxeles modificados localmente. Todo reside exclusivamente en la memoria RAM del Worker hasta que se completa la llamada HTTP al backend.

### 3.3. Transición Bidireccional de Modo (Offline $\leftrightarrow$ Online)
1. **Activación a Online (`toggleOnlineMode('activate')`)**:
   - Si `_offlineDirty` es verdadero, ejecuta de inmediato `saveOfflineCanvasState(true)` esperando la resolución de la promesa.
   - Envía `POST` a `ApiRoutes.Canvases.ActivateOnline`.
   - Al recibir confirmación, ejecuta `window.location.reload()`.
2. **Desactivación a Offline (`toggleOnlineMode('deactivate')`)**:
   - Envía `POST` a `ApiRoutes.Canvases.DeactivateOnline`.
   - Emite broadcast a través de `CanvasSyncChannel` y recarga la página.
3. **Recepción de Cambio de Modo Remoto (`canvas_mode_changed`)**:
   - Si un usuario no propietario está en el lienzo y el dueño lo pasa a offline, se muestra un mensaje informativo, se cierra el WebSocket y se le redirige a `/explore`.
   - Si el usuario es dueño o el lienzo pasa a online, se fuerza la recarga de la interfaz.

### 3.4. Protocolo de Comunicación y Búferes Binarios
El intercambio de datos en tiempo real utiliza un protocolo híbrido:

#### Protocolo Binario Cliente $\rightarrow$ Servidor (WebSocket `ArrayBuffer`):
- **Píxel Individual (OpCode 1)** (9 bytes):
  - `Byte 0`: `0x01` (OpCode `pixel`)
  - `Bytes 1-2`: `uint16` coordenada $X$ (Big-Endian)
  - `Bytes 3-4`: `uint16` coordenada $Y$ (Big-Endian)
  - `Byte 5`: `uint8` canal Rojo ($R$)
  - `Byte 6`: `uint8` canal Verde ($G$)
  - `Byte 7`: `uint8` canal Azul ($B$)
  - `Byte 8`: `uint8` canal Alfa ($A$)
- **Lote de Píxeles (OpCode 3)** ($7 + 4N$ bytes):
  - `Byte 0`: `0x03` (OpCode `batch_pixels`)
  - `Bytes 1-2`: `uint16` cantidad de píxeles ($N$, Big-Endian)
  - `Bytes 3-6`: `uint8` canales $R, G, B, A$ del lote
  - `Bytes 7+`: Secuencia de pares $(X, Y)$ como `uint16` (4 bytes por píxel)

#### Protocolo Binario Servidor $\rightarrow$ Cliente:
- Soporta OpCodes `0x01` (pixel), `0x02` (erase_pixel), `0x03` (batch_pixels), `0x04` (batch_erase_pixels).

---

## 4. Auditoría de Sincronización Multi-Pestaña (`CanvasSyncChannel.js`)

`CanvasSyncChannel.js` actúa como un bus local de eventos utilizando `BroadcastChannel('rosaura_canvas_events')`.

### Matriz de Eventos Emitidos y Consumidos:

| Evento (`data.type`) | Origen Emisor | Consumidor en `DesignNetwork` | Acción Ejecutada |
|---|---|---|---|
| `canvas_resize_completed` | `CanvasResizeController.js` | `handleCanvasLockedResize` + `handleCanvasResizeCompleted` | Bloquea canvas, aplica blur, consulta `canvases.get` y rehidrata chunks. |
| `canvas_resize_settings_updated` | `CanvasResizeController.js` | `handleResizeSettingsUpdated` | Inicia/detiene el temporizador de redimensionado programado. |
| `canvas_clear_completed` / `canvas_reset` | `CanvasResetController.js` | `handleCanvasLockedClear` + `handleCanvasClearCompleted` | Vaciado local del Worker/OffscreenCtx y re-fetch de datos desde API. |
| `canvas_reset_settings_updated` | `CanvasResetController.js` | `handleResetSettingsUpdated` | Actualiza la cuenta regresiva del temporizador de reseteo. |
| `canvas_mode_changed` | `CanvasCardInteractions.js` | `handleCanvasModeChanged` | Cierra WebSocket / Redirige o recarga página según rol de usuario. |

---

## 5. Auditoría de Conexión WebSocket y Resiliencia (`WebSocketManager.js`)

### 5.1. Ciclo de Conexión y Heartbeat
1. `WebSocketManager.connect(canvasId, ticket)` construye la URL:
   `ws(s)://{host}:{port}/canvas/{canvasId}?ticket={ticket}`
2. Configura `ws.binaryType = "arraybuffer"`.
3. Al dispararse `onopen`:
   - Resetea `reconnectAttempts = 0`.
   - Inicia heartbeat periódico cada **25,000 ms** enviando `{"type": "ping"}`.
4. Al recibir `onclose`:
   - Detiene el intervalo de heartbeat.
   - Si el código es `4001` (cierre por QoS / desalojo intencional), activa `isIntentionalDisconnect = true` y no reconecta.
   - En caso contrario, invoca `handleReconnect()`.

### 5.2. Mecanismo de Reconexión y Backoff
- `handleReconnect` calcula el retraso con fórmula exponencial y jitter:
  $$\text{delay} = \text{baseDelay} \cdot 2^{\text{reconnectAttempts}} + \text{random}(0, 2000)\text{ ms}$$
  con $\text{baseDelay} = 1000\text{ ms}$ y un máximo de **5 intentos**.
- En `DesignNetwork.js`, se sobreescribe `wsManager.handleReconnect` para que antes de cada reconexión se realice una petición asíncrona a `ApiRoutes.Canvases.GetWsTicket` (obteniendo nuevo ticket e integrando Turnstile en caso de invitados).
- `handleVisibilityChange()`: Al pasar `document.visibilityState` a `'visible'`, si la conexión está cerrada o nula, reinicia los intentos y reconecta.

---

## 6. Inventario Exhaustivo de Vulnerabilidades, Fallos Lógicos y Condiciones de Carrera

A continuación se detalla cada anomalía encontrada en el frontend y canales de comunicación, clasificada con severidad estandarizada:

---

### [CRÍTICA] SEC-FE-01: Pérdida Silenciosa de Trazos de Dibujo Online ante Caídas Temporales de WebSocket (Data Loss)
- **Archivo**: `public/assets/js/modules/app/design/DesignInteractions.js` (Líneas 1372–1447) y `public/assets/js/core/api/WebSocketManager.js` (Líneas 128–137)
- **Flujo Afectado**: Dibujo en modo Online en tiempo real durante micro-desconexiones o reconexiones de red.
- **Descripción Técnica**:
  Cuando el usuario hace clic en "Colocar Píxeles", `placePixels()` despacha inmediatamente los píxeles locales al Web Worker (`PUSH_PIXELS` / `offscreenCtx`), pintándolos en la pantalla del usuario (renderizado optimista). Luego invoca `this.wsManager.send(buffer)`.
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
          // VACÍO: Si ws está CONNECTING o CLOSED durante un micro-corte, el mensaje se descarta silenciosamente.
      }
  }
  ```
  No existe una cola de retransmisión offline (`offlineStrokeQueue`) para el modo online. Como resultado:
  1. La pantalla del usuario muestra los píxeles como colocados.
  2. El servidor nunca recibe el paquete binario.
  3. Al reconectar el socket, el cliente queda con un lienzo visualmente desincronizado con el servidor de por vida (hasta un refresco manual F5).
- **Pasos para Reproducir**:
  1. Abrir un lienzo en modo Online.
  2. En las DevTools del navegador (pestaña Red), alternar a modo "Offline" durante 2 segundos mientras se colocan píxeles.
  3. Restaurar la conexión ("Online").
  4. Observar que en el cliente los píxeles pintados permanecen visibles, pero en cualquier otro cliente conectado los píxeles nunca aparecieron.
- **Mitigación Recomendada**:
  Implementar un búfer de anillo en `WebSocketManager` (`outboxQueue`) con confirmación de ACK (`pixel_confirm`). Si `ws.readyState !== WebSocket.OPEN`, encolar los buffers binarios y vaciar la cola tan pronto como ocurra el evento `open` tras la reconexión.

---

### [CRÍTICA] SEC-FE-02: Destrucción Silenciosa de Estado (State Clobbering) en Modo Estudio Offline por Concurrencia Multi-Pestaña
- **Archivo**: `public/assets/js/modules/app/design/DesignNetwork.js` (Líneas 2118–2214) y `public/assets/js/core/services/CanvasSyncChannel.js`
- **Flujo Afectado**: Edición concurrente en modo Estudio Offline desde dos o más pestañas del mismo navegador.
- **Descripción Técnica**:
  En modo offline, los trazos de dibujo no se transmiten ni por WebSocket ni por `CanvasSyncChannel`. Cada pestaña mantiene su propio `mainImageData` y `pixelBuffer` en su Worker aislado.
  Cuando la Pestaña A realiza modificaciones, programa `saveOfflineCanvasState` (debounce de 1200ms) que serializa **todo el lienzo completo** en base64 y sobreescribe la fila en la base de datos MySQL.
  Si la Pestaña B está abierta simultáneamente y el usuario dibuja un solo píxel en ella, la Pestaña B serializa su propio búfer (que no contiene los trazos de la Pestaña A) y lo envía al servidor, sobreescribiendo por completo los cambios de la Pestaña A.
- **Pasos para Reproducir**:
  1. Abrir el mismo lienzo en modo Estudio (offline) en dos pestañas (Pestaña 1 y Pestaña 2).
  2. En la Pestaña 1, dibujar un dibujo complejo durante 10 segundos (se guarda automáticamente).
  3. En la Pestaña 2, colocar 1 píxel negro en una esquina.
  4. Esperar 2 segundos y recargar la Pestaña 1. Todo el dibujo complejo se habrá perdido irremediablemente.
- **Mitigación Recomendada**:
  1. Sincronizar los trazos locales entre pestañas en modo offline mediante `CanvasSyncChannel.broadcast({ type: 'local_pixel_stroke', pixels, color })`.
  2. O bien implementar control de concurrencia optimista con cabecera de versión/ETag (`expected_state_version`) en `ApiRoutes.Canvases.SaveOfflineState` para rechazar guardados basados en estados obsoletos.

---

### [ALTA] SEC-FE-03: Condición de Carrera en `handleVisibilityChange` y Duplicación de Conexiones WebSocket
- **Archivo**: `public/assets/js/core/api/WebSocketManager.js` (Líneas 183–191) y `public/assets/js/modules/app/design/DesignNetwork.js` (Líneas 600–631)
- **Flujo Afectado**: Cambio de pestaña activa en el navegador cuando una reconexión está programada.
- **Descripción Técnica**:
  En `DesignNetwork.js`, la función `wsManager.handleReconnect` es reemplazada por un método asíncrono que establece `this.wsReconnectTimeout = setTimeout(...)`.
  Sin embargo, en `WebSocketManager.js`, el listener global `document.addEventListener('visibilitychange', ...)` hace lo siguiente:
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
  `handleVisibilityChange` invoca `handleReconnect()` sin verificar si `wsReconnectTimeout` ya estaba pendiente en `DesignNetwork`. Además, como `reconnectAttempts` se resetea a 0 de forma inmediata, se disparan dos o más peticiones concurrentes a `ApiRoutes.Canvases.GetWsTicket` y múltiples sockets `new WebSocket(...)` quedan activos en paralelo compitiendo por los mismos eventos.
- **Pasos para Reproducir**:
  1. Conectar a un lienzo online.
  2. Desconectar brevemente la red para entrar en ciclo de reintento.
  3. Minimizar y restaurar rápidamente la pestaña del navegador varias veces.
  4. Inspeccionar la consola de red y observar múltiples conexiones WebSocket concurrentes abiertas hacia el mismo lienzo.
- **Mitigación Recomendada**:
  Cancelar explícitamente cualquier `reconnectTimeoutId` o `wsReconnectTimeout` pendiente antes de invocar `handleReconnect()` en `handleVisibilityChange()`, y asegurar un bloqueo tipo mutex (`isReconnecting`) durante el proceso de reconexión.

---

### [ALTA] SEC-FE-04: Desincronización Incompleta de Memoria en el Web Worker ante Evento `lagged_desync`
- **Archivo**: `public/assets/js/modules/app/design/DesignNetwork.js` (Líneas 409–417) y `CanvasRenderWorker.js`
- **Flujo Afectado**: Recuperación de clientes desfasados que han perdido sincronía por latencia de WebSocket.
- **Descripción Técnica**:
  Cuando el servidor WebSocket detecta que un cliente ha acumulado retraso en la cola de mensajes y emite `{"type": "lagged_desync"}`, `DesignNetwork.js` ejecuta:
  ```javascript
  else if (data.type === 'lagged_desync') {
      console.warn('[DesignNetwork] WebSocket lagged and lost sync. Re-fetching chunks...');
      if (this.loadedChunks) {
          this.loadedChunks.clear();
      }
      if (typeof this.checkCanvasAccess === 'function') {
          this.checkCanvasAccess();
      }
  }
  ```
  `this.checkCanvasAccess()` descarga los chunks o el estado base64 y los rehidrata. Sin embargo, **no limpia ni resetea `pixelBuffer` ni `mainImageData` en `CanvasRenderWorker.js`**. Si el lienzo experimentó borrados o modificaciones en píxeles que no están cubiertos por los nuevos chunks, los píxeles fantasma permanecen dibujados en el búfer del Worker.
- **Pasos para Reproducir**:
  1. Simular un mensaje `{"type": "lagged_desync"}` inyectado desde la consola.
  2. Observar que el Worker no recibe una instrucción para limpiar (`fill(0)`) su búfer antes de rehidratar, provocando artefactos visuales superpuestos.
- **Mitigación Recomendada**:
  Antes de volver a pedir los chunks, enviar un mensaje explícito `RESET_BUFFER` al Worker para vaciar `pixelBuffer` y `hydratedChunks` en el hilo de renderizado.

---

### [MEDIA] SEC-FE-05: Fuga de Memoria y Falta de Métodos de Desuscripción en `WebSocketManager.on()`
- **Archivo**: `public/assets/js/core/api/WebSocketManager.js` (Líneas 140–151)
- **Flujo Afectado**: Navegación SPA continua entre diferentes lienzos sin recarga completa de página.
- **Descripción Técnica**:
  `WebSocketManager` provee el método `on(event, callback)`:
  ```javascript
  on(event, callback) {
      if (!this.callbacks[event]) {
          this.callbacks[event] = [];
      }
      this.callbacks[event].push(callback);
  }
  ```
  No existe un método `off(event, callback)` ni limpieza en `disconnect()`. En una aplicación de tipo SPA (Single Page Application) donde el usuario navega entre lienzos, si `WebSocketManager` o sus callbacks mantienen referencias a controladores o closures de vistas anteriores, se retienen en memoria objetos DOM completos, Web Workers y Canvas contexts.
- **Mitigación Recomendada**:
  Implementar `off(event, callback)` y vaciar `this.callbacks = {}` dentro de `disconnect()`.

---

### [MEDIA] SEC-FE-06: Riesgo de Fallo de Memoria por Concatenación de Strings Masivos en `EXPORT_OFFLINE_STATE`
- **Archivo**: `public/assets/js/modules/app/design/workers/CanvasRenderWorker.js` (Líneas 2070–2103) y `DesignNetwork.js` (Líneas 2162–2172)
- **Flujo Afectado**: Exportación y autoguardado de lienzos de alta resolución (2000x2000 o 4096x4096px).
- **Descripción Técnica**:
  Para convertir el `Uint8Array` a base64, se realiza la siguiente iteración por fragmentos de 32KB:
  ```javascript
  const chunkSize = 0x8000;
  for (let i = 0; i < outLen; i += chunkSize) {
      binaryStr += String.fromCharCode.apply(null, exportBytes.subarray(i, Math.min(i + chunkSize, outLen)));
  }
  const base64 = btoa(binaryStr);
  ```
  En lienzos grandes de 4096x4096px (67 MB sin comprimir), si la compresión gzip falla o el navegador no implementa `CompressionStream`, este bucle genera miles de asignaciones de cadenas inmutables en memoria, provocando picos de Garbage Collection (GC) y potenciales cierres inesperados por OOM (Out Of Memory) en dispositivos móviles o pestañas con memoria restringida.
- **Mitigación Recomendada**:
  Utilizar `FileReader` con `readAsDataURL(new Blob([exportBytes]))` para delegar la conversión Base64 al motor nativo en C++ del navegador de forma asíncrona y sin saturar el heap de JavaScript.

---

### [BAJA] SEC-FE-07: Doble Emisión Potencial en `CanvasSyncChannel.broadcast()`
- **Archivo**: `public/assets/js/core/services/CanvasSyncChannel.js` (Líneas 38–50)
- **Flujo Afectado**: Emisión de eventos inter-pestañas.
- **Descripción Técnica**:
  `CanvasSyncChannel.broadcast()` envía el mensaje por `channel.postMessage(payload)` y simultáneamente dispara `window.dispatchEvent(new CustomEvent('canvas:sync_event', { detail: payload }))`. Si un componente escucha tanto los callbacks directos de `CanvasSyncChannel.subscribe()` como el evento DOM `canvas:sync_event`, procesará el mismo evento dos veces en la pestaña emisora.
- **Mitigación Recomendada**:
  Estandarizar el canal de consumo para usar únicamente la suscripción por callback y evitar la doble emisión redundante.

---

## 7. Plan de Acción y Recomendaciones Técnicas Priorizadas

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             PLAN DE PRIORIZACIÓN                                 │
├──────────────┬─────────────────────────────────────────────────┬─────────────────┤
│ Prioridad    │ Tarea / Mitigación                              │ Impacto         │
├──────────────┼─────────────────────────────────────────────────┼─────────────────┤
│ 1. CRÍTICA   │ Implementar Outbox Queue en WebSocketManager    │ Cero pérdida de │
│              │ para retransmitir trazos online tras reconexión │ trazos online   │
├──────────────┼─────────────────────────────────────────────────┼─────────────────┤
│ 2. CRÍTICA   │ Sincronizar trazos offline en BroadcastChannel  │ Evitar clobber  │
│              │ o añadir ETag de versión en SaveOfflineState    │ entre pestañas  │
├──────────────┼─────────────────────────────────────────────────┼─────────────────┤
│ 3. ALTA      │ Cancelar timeouts y colocar mutex en            │ Evitar sockets  │
│              │ reconexión por visibilitychange                 │ duplicados      │
├──────────────┼─────────────────────────────────────────────────┼─────────────────┤
│ 4. ALTA      │ Enviar RESET_BUFFER al Worker en lagged_desync  │ Evitar píxeles  │
│              │ antes de rehidratar chunks                      │ fantasma        │
├──────────────┼─────────────────────────────────────────────────┼─────────────────┤
│ 5. MEDIA     │ Añadir off() y limpieza de callbacks en         │ Evitar fugas de │
│              │ WebSocketManager.disconnect()                   │ memoria en SPA  │
├──────────────┼─────────────────────────────────────────────────┼─────────────────┤
│ 6. MEDIA     │ Reemplazar String.fromCharCode por Blob/Reader  │ Optimizar RAM   │
│              │ en EXPORT_OFFLINE_STATE                         │ en lienzos 4K   │
└──────────────┴─────────────────────────────────────────────────┴─────────────────┘
```
