# Original User Request

## 2026-08-21T17:33:40Z

Auditoría técnica ultra exhaustiva y reporte de diagnóstico arquitectónico del sistema integral de lienzos (canvases), cubriendo el ciclo de vida y conversión bidireccional entre modo Estudio (offline) y modo Online en tiempo real, identificando condiciones de carrera, inconsistencias de datos, cuellos de botella de rendimiento, fallos de concurrencia y vulnerabilidades lógicas sin alterar el código fuente existente.

Working directory: f:\htdocs\ProjectRosaura
Integrity mode: development

## Requirements

### R1. Análisis de Concurrencia y Sincronización de Datos (Backend & Bases de Datos)
Auditar a fondo el flujo de datos y estados entre Redis (`canvas:{id}:state`, `canvas:{id}:config`, pub/sub `admin:canvas_events`), base de datos relacional MySQL (`canvases`, snapshots, storage tracking) y Cassandra/NoSQL al activar, desactivar y guardar estados de lienzos (`activateOnline`, `deactivateOnline`, `saveOfflineState`). Identificar race conditions cuando múltiples solicitudes concurrentes intentan transicionar el estado del lienzo, posibles desincronizaciones de buffers binarios RGBA/zlib, cálculo erróneo de cuotas de almacenamiento (`storage_bytes`) y pérdida de píxeles intermedios durante el vaciado o flushing de caché a disco.

### R2. Auditoría del Frontend, WebSockets y Canales de Comunicación
Examinar el ciclo de vida del lienzo en el cliente: gestión de conexión WebSocket (`WebSocketManager.js`), canal entre pestañas (`CanvasSyncChannel.js`), renderizado en Web Workers (`CanvasRenderWorker.js`), manejo de estado offline en IndexedDB / localStorage / RAM, y manejo de eventos de reconexión/desconexión de red. Identificar desfases entre el canvas DOM, el worker de dibujo, los buffers locales y el servidor ante desconexiones repentinas, transiciones forzadas o caídas de WebSocket.

### R3. Auditoría de Workers en Background y Procesamiento Asíncrono
Analizar la arquitectura de procesamiento en background (`worker_canvas_jobs.py`, Redis Streams, colas de snapshots `canvases:pending_snapshots`, compresión zlib, generación de thumbnails y timelapses de video). Evaluar la resiliencia ante caídas de workers (mecanismos XAUTOCLAIM / XREADGROUP / DLQ), tiempos de bloqueo, consumo de memoria en lienzos de alta resolución y consistencia en el cálculo de firmas CRC32 por cuadrante.

### R4. Evaluación de Seguridad, Permisos y Límites de Suscripción
Revisar la validación de permisos de edición/propiedad (`CanvasPermissionsConstants`), cumplimiento estricto de cuotas de salas online activas por plan de suscripción (`SubscriptionPlanConstants`), integridad en la subida y descompresión de datos binarios (`stateBase4`, `gzdecode`), y control de accesos directos por API o URLs manipuladas.

### R5. Entregable: Reporte Técnico de Diagnóstico y Plan de Mitigación
Generar un informe técnico exhaustivo y estructurado en Markdown que detalle cada anomalía encontrada (con severidad: Crítica / Alta / Media / Baja), el archivo y flujo exacto donde ocurre, la explicación detallada de cómo reproducir o simular el fallo, y la recomendación técnica concreta y paso a paso para su solución y mitigación.

## Acceptance Criteria

### Cobertura y Exhaustividad del Diagnóstico
- [ ] El reporte cubre detalladamente las 4 dimensiones críticas: Backend (PHP/MySQL/Redis), Frontend (JS/Workers/BroadcastChannel), Asíncrono (Python Workers/Streams) y Seguridad/Cuotas.
- [ ] Cada hallazgo incluye nivel de severidad (Crítica, Alta, Media, Baja), archivo/línea de código involucrada y flujo de ejecución afectado.
- [ ] Se analizan explícitamente los escenarios de race condition durante la transición concurrente de `offline` <-> `online` y la persistencia de snapshots.
- [ ] Se evalúa la integridad y validación de buffers binarios de píxeles (resolución, RGBA 4-bytes por píxel, compresión gzip/zlib).
- [ ] Se documenta el comportamiento de fallo o degradación en caso de caída de Redis, MySQL o desincronización de WebSocket.

### Calidad y Accionabilidad de las Recomendaciones
- [ ] Para cada vulnerabilidad o fallo identificado, se proporciona una propuesta de solución técnica clara y viable sin introducir dependencias incompatibles.
- [ ] Se incluye un plan de priorización ordenado por impacto y criticidad para guiar futuras correcciones.
- [ ] El código fuente de la aplicación permanece intacto (modo auditoría estricto sin modificaciones prematuras).
