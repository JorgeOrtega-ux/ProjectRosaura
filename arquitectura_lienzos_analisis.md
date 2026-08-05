# Análisis de Arquitectura para Lienzos Ultra Fluidos

Este documento detalla los cuellos de botella actuales en la arquitectura de renderizado y red de los lienzos (tipo r/place) y propone una arquitectura moderna para alcanzar una fluidez absoluta (60-120 FPS sin lag, tiempos de carga instantáneos y cero bloqueos).

## 1. Análisis de Cuellos de Botella Actuales

### A. Renderizado basado en Canvas 2D API (`OffscreenCanvas` con context `2d`)
Actualmente, el motor (`CanvasRenderWorker.js` y `DesignRender.js`) utiliza el contexto `2d` y operaciones intensivas como `putImageData` o `fillRect` iterando sobre arrays para pintar píxeles. 
**El Problema:** La API de Canvas 2D procesa estas instrucciones en CPU y las pasa a la GPU secuencialmente. Cuando hay miles de píxeles mutando por explosiones (bombas nucleares, agujeros negros) o cargas masivas, el bus de datos CPU-GPU se satura provocando "stuttering" (tirones) y caídas drásticas de FPS.

### B. Sobrecarga de Serialización JSON en WebSockets y Cargas de Chunks
El cliente recibe actualizaciones en tiempo real y lee los "chunks" mediante JSON (`DesignNetwork.js` parseando mensajes como `{ type: 'pixel', x: 10, y: 10, color: '#ff0000' }`).
**El Problema:** Parsear JSON en masa genera una enorme recolección de basura (Garbage Collection). La decodificación Base64 (`atob`) que se usa actualmente para los "chunks" aumenta el tamaño del payload un 33% y obliga al hilo principal (o al worker) a procesar strings inmensos, bloqueando la ejecución.

### C. Duplicación de Memoria y Overhead en `postMessage`
La sincronización del estado de los píxeles (selecciones, templates, zonas protegidas) entre `DesignRender.js` (Main Thread) y `CanvasRenderWorker.js` se hace clonando datos mediante `postMessage`.
**El Problema:** El proceso de serialización estructurada de `postMessage` para objetos grandes añade una penalización de tiempo de respuesta (latency).

### D. Reflow y Repaint por Superposiciones DOM (DOM Thrashing)
En `DesignRender.js`, elementos como las advertencias de "Cañón Orbital" modifican el DOM (`element.style.left`) leyendo coordenadas previas con `getBoundingClientRect()` dentro del bucle de animación `requestAnimationFrame`.
**El Problema:** Leer (get) y luego escribir (set) propiedades de layout en el DOM fuerza al navegador a recalcular el estilo y el layout repetidamente por frame, destruyendo el rendimiento (Layout Thrashing).

---

## 2. Propuesta de Arquitectura State-of-the-Art (Web 3.0)

Para que la experiencia de los lienzos sea **100% fluida**, se deben implementar las siguientes tecnologías y patrones:

### A. Migración de Canvas 2D a WebGL2 (o WebGPU)
> [!TIP]
> **Rendimiento Masivo:** WebGL trata el lienzo entero como una **textura** en la VRAM de la tarjeta gráfica.
1. **Un buffer de píxeles lineal:** Mantenemos la matriz de píxeles (`Uint32Array`) en memoria.
2. **Actualización parcial rápida:** En lugar de redibujar con `putImageData`, enviamos fragmentos de la matriz directamente a la GPU a través de `glTexSubImage2D` (O(1) para la GPU).
3. **Shaders para Explosiones y Efectos:** Efectos visuales pesados como agujeros negros, mira de misiles, parpadeos de píxeles protegidos y grillas se calculan matemáticamente a nivel de píxel (Fragment Shader) en la GPU de manera paralela. El costo computacional en CPU es cero.

### B. Protocolo Binario Estricto (ArrayBuffer / WebSockets)
> [!IMPORTANT]
> **No más JSON en caliente:** La comunicación entre el Go Server y el cliente debe ser binaria.
1. **WebSockets con BinaryType:** Usar `ws.binaryType = "arraybuffer"`. 
2. **Empaquetado custom:** Definir una estructura binaria simple de 6 o 8 bytes por píxel (e.g., `[OpCode: 1 byte] [X: 2 bytes] [Y: 2 bytes] [Color: 3 bytes]`).
3. **Lectura directa:** `DataView` permite parsear eventos de red con `0%` de Garbage Collection.

### C. SharedArrayBuffer (Memoria Compartida Zero-Copy)
> [!NOTE]
> Permite a `DesignController` y `CanvasRenderWorker` acceder exactamente a la misma RAM, sin copiarse mensajes.
1. Habilitando las cabeceras `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Embedder-Policy: require-corp` en el servidor HTTP.
2. El Worker y el Hilo principal pueden mutar `SharedArrayBuffer`, así el render (WebGL) lee los últimos cambios al instante sin necesidad de un `postMessage`.

### D. Abstracción del UI Overlay (Separar Lógica DOM del Loop de Render)
1. Extraer todo el código que lee o modifica el DOM de `DesignRender.js` (como `updateOrbitalCannonBallPosition()`) a un loop separado o usar propiedades CSS variables (`--x`, `--y`) gestionadas eficientemente, evitando totalmente `getBoundingClientRect()` dentro del frame de dibujado del lienzo.

---

## 3. Beneficios Resumidos de la Nueva Arquitectura
* **Cargas instantáneas:** El parsing binario hace que cargar 2 Millones de píxeles pase de tardar ~800ms a **~12ms**.
* **Efectos a 60-120 FPS fijos:** La GPU renderizará el canvas; tu ordenador o teléfono apenas notará consumo de CPU.
* **Reducción de RAM y Red:** El tráfico de servidor a cliente caerá al menos un 40% usando binarios compactos en vez de JSON.
* **Escalabilidad Pura:** Preparado para resistir eventos masivos donde miles de usuarios coloquen píxeles o disparen cañones a la vez.
