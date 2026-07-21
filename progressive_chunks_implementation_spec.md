# 📜 Especificación Técnica: Implementación de Descarga Progresiva por Chunks en Lienzos Grandes (Zero Breaking Changes)

---

## 🎯 Objetivo General
Implementar un sistema de **Descarga Progresiva Espacial por Chunks ($512 \times 512$ px)** para lienzos de gran escala (`1024x1024`, `2048x1024`, `2048x2048`, `4096x4096`), manteniendo **compatibilidad del 100% (sin romper nada)** con el flujo actual para lienzos pequeños (`64x64`, `128x128`, `256x256`, `512x512`).

La activación del sistema será **100% configurable mediante una propiedad booleana `progressive_load`** en la configuración de tamaños de lienzo.

---

## 🛠️ FASE 1: Configuración Global (JSON + Helper PHP)

### 1.1 Modificar `public/assets/data/canvas_sizes.json`
Agregar la clave `"progressive_load": true/false` a cada tamaño de lienzo:

```json
{
    "16x16": { "label": "16x16", "icon": "crop_square", "tier": 0, "progressive_load": false },
    "32x32": { "label": "32x32", "icon": "crop_square", "tier": 0, "progressive_load": false },
    "64x64": { "label": "64x64", "icon": "crop_square", "tier": 0, "progressive_load": false },
    "128x128": { "label": "128x128", "icon": "aspect_ratio", "tier": 1, "progressive_load": false },
    "256x256": { "label": "256x256", "icon": "grid_4x4", "tier": 1, "progressive_load": false },
    "512x512": { "label": "512x512", "icon": "grid_on", "tier": 1, "progressive_load": false },
    "1024x1024": { "label": "1024x1024", "icon": "grid_on", "tier": 2, "progressive_load": true },
    "2048x1024": { "label": "2048x1024", "icon": "aspect_ratio", "tier": 2, "progressive_load": true },
    "2048x2048": { "label": "2048x2048", "icon": "grid_on", "tier": 2, "progressive_load": true },
    "4096x4096": { "label": "4096x4096", "icon": "grid_on", "tier": 3, "progressive_load": true }
}
```

### 1.2 Agregar Helper en `includes/core/Helpers/Utils.php`
```php
public static function isProgressiveLoadRequired(string $size): bool {
    $sizes = self::getCanvasSizes();
    return isset($sizes[$size]['progressive_load']) && $sizes[$size]['progressive_load'] === true;
}
```

---

## 🖥️ FASE 2: Backend API (PHP + Redis)

### 2.1 Modificar `CanvasCoreService.php` (`getCanvas`)
Si el lienzo requiere carga progresiva, **NO** codificar el buffer completo de 67MB en `state_base64`. En su lugar, enviar un indicador para que el cliente solicite solo los chunks visibles:

```php
// En CanvasCoreService.php dentro de getCanvas():
$isProgressive = Utils::isProgressiveLoadRequired($canvas['size']);
$canvas['progressive_load'] = $isProgressive;

if ($isProgressive) {
    // Para lienzos grandes, omitir state_base64 en la carga inicial
    $canvas['state_base64'] = null;
} else {
    // Comportamiento legado intacto
    $canvas['state_base64'] = base64_encode(gzencode($stateRaw, 6));
}
```

### 2.2 Crear Endpoint API de Obtención de Chunks (`POST /api/canvases/get_chunks`)

#### A. Ruta API (`config/Routes/routes.php`)
```php
$router->post('/api/canvases/get_chunks', 'Canvas\CanvasCoreController@getChunks');
```

#### B. Método en `CanvasCoreController.php`
```php
public function getChunks(): void {
    $canvasId = (int)($this->request['canvas_id'] ?? 0);
    $chunks = $this->request['chunks'] ?? []; // Array de strings ["0,0", "0,1"]

    if ($canvasId <= 0 || empty($chunks) || !is_array($chunks)) {
        $this->jsonResponse(['success' => false, 'message' => 'Invalid parameters'], 400);
        return;
    }

    $result = $this->canvasCoreService->getCanvasChunks($canvasId, $chunks);
    $this->jsonResponse($result, $result['success'] ? 200 : 400);
}
```

#### C. Extracción de Chunks en `CanvasCoreService.php`
Extraer sub-cuadrículas de $512 \times 512$ píxeles directamente del buffer binario RGBA plano de Redis sin alterar el almacenamiento original:

```php
public function getCanvasChunks(int $canvasId, array $requestedChunks): array {
    $canvas = $this->canvasRepository->getById($canvasId);
    if (!$canvas) return ['success' => false, 'message' => 'Canvas not found'];

    list($boardW, $boardH) = explode('x', strtolower($canvas['size']));
    $boardW = (int)$boardW;
    $boardH = (int)$boardH;

    // Obtener buffer completo de Redis o DB
    $redisKey = "canvas:{$canvasId}:state";
    $redis = (new RedisCache())->getClient();
    $stateRaw = $redis ? $redis->get($redisKey) : null;
    if (!$stateRaw) {
        $stateRaw = $this->canvasRepository->getSnapshot($canvasId);
    }

    $chunkSize = 512;
    $responseChunks = [];

    foreach ($requestedChunks as $chunkKey) {
        list($cx, $cy) = explode(',', $chunkKey);
        $cx = (int)$cx;
        $cy = (int)$cy;

        $startX = $cx * $chunkSize;
        $startY = $cy * $chunkSize;

        if ($startX >= $boardW || $startY >= $boardH) continue;

        $actualW = min($chunkSize, $boardW - $startX);
        $actualH = min($chunkSize, $boardH - $startY);

        // Sub-extracción de píxeles RGBA (4 bytes por px)
        $chunkBuffer = '';
        for ($y = 0; $y < $actualH; $y++) {
            $offset = (($startY + $y) * $boardW + $startX) * 4;
            $length = $actualW * 4;
            $chunkBuffer .= substr($stateRaw, $offset, $length);
        }

        // Comprimir cada chunk individualmente (~30 KB a 80 KB)
        $responseChunks[$chunkKey] = base64_encode(gzencode($chunkBuffer, 6));
    }

    return [
        'success' => true,
        'data' => [
            'canvas_id' => $canvasId,
            'chunk_size' => $chunkSize,
            'chunks' => $responseChunks
        ]
    ];
}
```

---

## 🎨 FASE 3: Frontend Client (JS + Web Worker)

### 3.1 Manejo de Chunks Visibles por Cámara/Viewport en `DesignSetup.js`

Detectar si el lienzo actual usa `progressive_load` y coordinar la descarga dinámica:

```javascript
// En DesignSetup.js:
async initCanvasData(canvasData) {
    this.isProgressive = !!canvasData.progressive_load;
    this.loadedChunks = new Set(); // Conjunto de claves "chunkX,chunkY" ya descargados

    if (this.isProgressive) {
        // Cargar únicamente los chunks visibles en pantalla
        this.updateVisibleChunks();
    } else if (canvasData.state_base64) {
        // Flujo tradicional intacto
        this.hydrateCanvasState(canvasData.state_base64);
    }
},

updateVisibleChunks() {
    if (!this.isProgressive || !this.canvas) return;

    const chunkSize = 512;
    const rect = this.canvas.getBoundingClientRect();

    // Calcular coordenadas visibles en el tablero
    const startX = Math.max(0, Math.floor(-this.transform.x / this.transform.scale));
    const startY = Math.max(0, Math.floor(-this.transform.y / this.transform.scale));
    const endX = Math.min(this.boardWidth, Math.ceil((rect.width - this.transform.x) / this.transform.scale));
    const endY = Math.min(this.boardHeight, Math.ceil((rect.height - this.transform.y) / this.transform.scale));

    const minChunkX = Math.floor(startX / chunkSize);
    const minChunkY = Math.floor(startY / chunkSize);
    const maxChunkX = Math.floor(endX / chunkSize);
    const maxChunkY = Math.floor(endY / chunkSize);

    const chunksToFetch = [];

    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
        for (let cy = minChunkY; cy <= maxChunkY; cy++) {
            const key = `${cx},${cy}`;
            if (!this.loadedChunks.has(key)) {
                chunksToFetch.push(key);
            }
        }
    }

    if (chunksToFetch.length > 0) {
        this.fetchChunks(chunksToFetch);
    }
},

async fetchChunks(chunkKeys) {
    chunkKeys.forEach(k => this.loadedChunks.add(k)); // Marcar como solicitados

    try {
        const response = await this.api.post('/api/canvases/get_chunks', {
            canvas_id: this.canvasIntId,
            chunks: chunkKeys
        });

        if (response.success && response.data?.chunks) {
            Object.entries(response.data.chunks).forEach(([key, base64]) => {
                const [cx, cy] = key.split(',').map(Number);
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'HYDRATE_CHUNK',
                        payload: { chunkX: cx, chunkY: cy, chunkSize: 512, base64String: base64 }
                    });
                }
            });
        }
    } catch (e) {
        console.error('[DesignSetup] Error fetching chunks:', e);
    }
}
```

### 3.2 Escuchar Eventos de Pan/Zoom en `DesignInteractions.js`
Llamar a `updateVisibleChunks()` con un **Throttle de 100ms** durante la navegación del usuario (drag/wheel):

```javascript
// En el evento wheel / drag-move:
if (this.isProgressive) {
    if (this.chunkThrottleTimer) clearTimeout(this.chunkThrottleTimer);
    this.chunkThrottleTimer = setTimeout(() => this.updateVisibleChunks(), 100);
}
```

### 3.3 Soporte de Chunk Hydration en `CanvasRenderWorker.js`

Agregar el manejador para el mensaje `'HYDRATE_CHUNK'`:

```javascript
// En CanvasRenderWorker.js (switch payload.type):
case 'HYDRATE_CHUNK':
    hydrateChunkWorker(payload.chunkX, payload.chunkY, payload.chunkSize || 512, payload.base64String);
    break;

// Función de renderizado parcial por Chunk:
async function hydrateChunkWorker(chunkX, chunkY, chunkSize, base64String) {
    const bytes = await decompressIfNeeded(base64String);
    if (!bytes || !offscreenCtx) return;

    try {
        const actualW = Math.min(chunkSize, boardWidth - chunkX * chunkSize);
        const actualH = Math.min(chunkSize, boardHeight - chunkY * chunkSize);

        const imageData = offscreenCtx.createImageData(actualW, actualH);
        const totalBytes = Math.min(bytes.length, imageData.data.length);
        imageData.data.set(bytes.subarray(0, totalBytes));

        // Dibujar sub-región en las coordenadas exactas del tablero
        offscreenCtx.putImageData(imageData, chunkX * chunkSize, chunkY * chunkSize);
        requestRender();
    } catch (e) {
        console.error('[CanvasRenderWorker] Error hydrating chunk:', e);
    }
}
```

---

## 🔒 Reglas de Seguridad y Cero Roturas (Checking Criteria)

1. **Lienzos Pequeños ($\le 512\text{px}$)**:
   * Con `"progressive_load": false`, se ignora todo el flujo de chunks y el sistema ejecuta exactamente el código monolítico previo.
2. **WebSocket Sync Intacto**:
   * Los eventos de WebSocket (`pixel`, `batch_pixels`, `bomb_pixel`) continúan enviando las coordenadas absolutas $(X,Y)$ del tablero global. El Worker simplemente escribe sobre el `OffscreenCanvas` en esa posición, independientemente de qué chunk provenga.
3. **Memoria Garantizada**:
   * Los chunks ya cargados permanecen en el buffer `OffscreenCanvas` sin sobreescribir las áreas de otros chunks.

---

## ✅ Lista de Verificación para Pruebas (QA Testing)

- [ ] Probar crear y abrir un lienzo de $64 \times 64$ y $512 \times 512$ $\rightarrow$ Verificar que carga instantáneamente usando `state_base64` tradicional.
- [ ] Cambiar `"progressive_load": true` en `1024x1024` o `4096x4096` en `canvas_sizes.json`.
- [ ] Abrir lienzo de $4096 \times 4096$ $\rightarrow$ Verificar en Network que solo se solicitan los 4-9 chunks del viewport inicial (`POST /api/canvases/get_chunks`).
- [ ] Hacer scroll/pan sobre el lienzo $4096 \times 4096$ $\rightarrow$ Verificar que los nuevos chunks se descargan transparentemente al moverse.
- [ ] Pintar píxeles vía herramienta o WebSocket $\rightarrow$ Verificar que el dibujo es fluido en lienzos gigantes.
