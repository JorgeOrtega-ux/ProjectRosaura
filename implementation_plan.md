# Migración de Arquitectura para Lienzos Ultra Fluidos

Este es el plan de implementación basado en el análisis de cuellos de botella que provocan que los lienzos se sientan pesados o con pequeños retrasos al haber mucho tráfico o animaciones.

> [!NOTE]
> Puedes leer el análisis técnico detallado en el documento [arquitectura_lienzos_analisis.md](file:///C:/Users/jorge/.gemini/antigravity/brain/d87c808e-e1ab-4fe1-9ee6-c7769e0f7a84/arquitectura_lienzos_analisis.md).

## User Review Required

> [!WARNING]
> La implementación de esta arquitectura requiere un **gran refactor** del código de frontend (específicamente la lógica de dibujado de `CanvasRenderWorker.js` y `DesignRender.js`) y del servidor Go (para enviar binarios).

## Open Questions

1. **¿El servidor Backend (escrito presumiblemente en Go / PHP) puede modificarse?** Para implementar los WebSockets Binarios y el envío de binarios en crudo para las "cargas de lienzos" necesito saber si tengo acceso o puedo modificar el código del backend.
2. **Soporte de Navegadores:** Para usar `SharedArrayBuffer` necesitamos configurar cabeceras de seguridad estrictas en el servidor web (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`). Si el servidor (Nginx/Apache) o la estructura no lo permiten fácilmente, ¿aceptarías un modelo híbrido puramente WebGL sin SharedArrayBuffer por ahora?

## Proposed Changes

### 1. Motor WebGL2 (GPU Rendering)
La capa visual dejará de pintarse píxel a píxel con la CPU.
- **[MODIFY]** `public/assets/js/modules/app/design/workers/CanvasRenderWorker.js`: Eliminar `OffscreenCanvas` 2D. Implementar WebGL.
- Enviar el estado de los píxeles a la VRAM como una Textura 2D `gl.TEXTURE_2D`.
- Mover todos los efectos de grilla, agujeros negros, explosiones a **Shaders** (GLSL).

### 2. Payload Binario de Red (Zero-GC Sockets)
Las comunicaciones de dibujo serán binarias.
- **[MODIFY]** `public/assets/js/modules/app/design/DesignNetwork.js`: Cambiar lectura de `data` JSON a lectura de `ArrayBuffer` usando un `DataView`.
- Se elimina el base64 de `api/go/canvases/get_chunks`, pasando a recibir flujos puros en bytes.

### 3. DOM & UI Detach (Evitar Thrashing)
- **[MODIFY]** `public/assets/js/modules/app/design/DesignRender.js`: Las modificaciones al DOM en el `requestAnimationFrame` (como la posición del Cañón Orbital) usarán variables CSS inyectadas de forma asíncrona, eliminando `getBoundingClientRect()`.

## Verification Plan

### Manual Verification
1. Abrir un lienzo gigante (ej. 2000x2000 píxeles).
2. Conectar dos ventanas y verificar el dibujo en tiempo real.
3. Observar el profiler de Chrome comprobando que el uso de memoria (GC) de Javascript caiga en picado y los FPS se mantengan clavados a la tasa de refresco del monitor (60, 120 o 144Hz) independientemente del zoom.
