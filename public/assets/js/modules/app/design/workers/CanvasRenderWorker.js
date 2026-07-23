// CanvasRenderWorker.js - Motor de renderizado en Web Worker con OffscreenCanvas
let canvas = null;
let ctx = null;
let offscreenCanvas = null;
let offscreenCtx = null;

let boardWidth = 64;
let boardHeight = 64;
let transform = { x: 0, y: 0, scale: 1 };
let dpr = 1;
let isDarkMode = false;
let currentColor = '#000000';

let pixelQueue = [];
let selectedPixelsArray = new Uint32Array(0); // TypedArray contiguo para píxeles seleccionados
let hoveredPixelKey = -1;

let isSpectator = false;
let isResetLocked = false;
let activeTemplate = null;

let nuclearWarnings = [];
let explosions = [];

let isProgressive = false;
let hydratedChunks = new Set();
let pendingProgressivePixels = {};

let needsRender = false;
let animFrameId = null;

const EXPLOSION_STYLES = {
    'pixel_misil_1': 'missile',
    'pixel_misil_2': 'missile',
    'pixel_misil_3': 'missile',
    'bomba_pixel_1': 'medium',
    'bomba_pixel_2': 'medium',
    'bomba_pixel_3': 'medium',
    'bomba_racimo_1': 'medium',
    'bomba_atomica_1': 'nuclear',
    'bomba_nuclear_1': 'nuclear',
    'bomba_nuclear_2': 'nuclear',
    'bomba_nuclear_3': 'nuclear',
    'lluvia_meteoritos_1': 'medium'
};

function getExplosionStyle(perkId) {
    return EXPLOSION_STYLES[perkId] || 'medium';
}

function requestRender() {
    if (!needsRender) {
        needsRender = true;
        animFrameId = requestAnimationFrame(render);
    }
}

async function decompressIfNeeded(base64String) {
    if (!base64String) return null;
    try {
        const binaryString = atob(base64String);
        let bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
            if ('DecompressionStream' in self) {
                const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
                const decompressedBuffer = await new Response(stream).arrayBuffer();
                bytes = new Uint8Array(decompressedBuffer);
            }
        }
        return bytes;
    } catch (err) {
        console.error('[CanvasRenderWorker] Error decompressing:', err);
        return null;
    }
}

async function hydrateState(base64String) {
    const bytes = await decompressIfNeeded(base64String);
    if (!bytes || !offscreenCtx) return;

    try {
        const imageData = offscreenCtx.createImageData(boardWidth, boardHeight);
        const totalBytes = Math.min(bytes.length, imageData.data.length);
        imageData.data.set(bytes.subarray(0, totalBytes));
        offscreenCtx.putImageData(imageData, 0, 0);
        requestRender();
    } catch (e) {
        console.error('[CanvasRenderWorker] Error hydrating state:', e);
    }
}

async function hydrateChunkWorker(chunkX, chunkY, chunkSize, base64String) {
    const bytes = await decompressIfNeeded(base64String);
    if (!bytes || !offscreenCtx) return;

    try {
        const actualW = Math.min(chunkSize, boardWidth - chunkX * chunkSize);
        const actualH = Math.min(chunkSize, boardHeight - chunkY * chunkSize);
        if (actualW <= 0 || actualH <= 0) return;
        const imageData = offscreenCtx.createImageData(actualW, actualH);
        const totalBytes = Math.min(bytes.length, imageData.data.length);
        imageData.data.set(bytes.subarray(0, totalBytes));

        offscreenCtx.putImageData(imageData, chunkX * chunkSize, chunkY * chunkSize);
        
        const chunkKey = `${chunkX},${chunkY}`;
        hydratedChunks.add(chunkKey);
        if (pendingProgressivePixels[chunkKey]) {
            pixelQueue.push(...pendingProgressivePixels[chunkKey]);
            delete pendingProgressivePixels[chunkKey];
        }
        
        requestRender();
    } catch (e) {
        console.error('[CanvasRenderWorker] Error hydrating chunk:', e);
    }
}

let selectedBitmask = new Uint8Array(0);

function updateSelectionBitmask() {
    const totalPixels = boardWidth * boardHeight;
    if (selectedBitmask.length !== totalPixels) {
        selectedBitmask = new Uint8Array(totalPixels);
    } else {
        selectedBitmask.fill(0);
    }

    const len = selectedPixelsArray.length;
    for (let i = 0; i < len; i++) {
        const key = selectedPixelsArray[i];
        const x = key & 0xFFFF;
        const y = key >> 16;
        if (x >= 0 && x < boardWidth && y >= 0 && y < boardHeight) {
            selectedBitmask[y * boardWidth + x] = 1;
        }
    }

    if (hoveredPixelKey >= 0 && !isSpectator && !isResetLocked) {
        const hx = hoveredPixelKey & 0xFFFF;
        const hy = hoveredPixelKey >> 16;
        if (hx >= 0 && hx < boardWidth && hy >= 0 && hy < boardHeight) {
            selectedBitmask[hy * boardWidth + hx] = 1;
        }
    }
}

function processPixelQueue() {
    if (!pixelQueue || pixelQueue.length === 0 || !offscreenCtx) return;
    try {
        const len = pixelQueue.length;
        if (len === 1) {
            const p = pixelQueue.pop();
            const x = p.x;
            const y = p.y;
            if (x >= 0 && x < boardWidth && y >= 0 && y < boardHeight) {
                const color = p.color;
                if (color === 'transparent' || color === 255) {
                    offscreenCtx.clearRect(x, y, 1, 1);
                } else if (typeof color === 'string') {
                    offscreenCtx.fillStyle = color;
                    offscreenCtx.clearRect(x, y, 1, 1);
                    offscreenCtx.fillRect(x, y, 1, 1);
                }
            }
            return;
        }

        const colorGroups = new Map();
        while (pixelQueue.length > 0) {
            const p = pixelQueue.pop();
            const x = p.x;
            const y = p.y;
            if (isNaN(x) || isNaN(y) || x < 0 || x >= boardWidth || y < 0 || y >= boardHeight) {
                continue;
            }
            const color = p.color;
            let group = colorGroups.get(color);
            if (!group) {
                group = [];
                colorGroups.set(color, group);
            }
            group.push(x, y);
        }

        colorGroups.forEach((coords, color) => {
            if (color === 'transparent' || color === 255) {
                for (let i = 0; i < coords.length; i += 2) {
                    offscreenCtx.clearRect(coords[i], coords[i + 1], 1, 1);
                }
            } else if (typeof color === 'string') {
                offscreenCtx.fillStyle = color;
                for (let i = 0; i < coords.length; i += 2) {
                    offscreenCtx.clearRect(coords[i], coords[i + 1], 1, 1);
                    offscreenCtx.fillRect(coords[i], coords[i + 1], 1, 1);
                }
            }
        });
    } catch (e) {
        pixelQueue.length = 0;
    }
}

function clearBombPixels(cX, cY, r) {
    if (!offscreenCtx) return;
    const radius = Math.max(1, parseInt(r || 1, 10));
    for (let y = cY - radius; y <= cY + radius; y++) {
        const dy = y - cY;
        const dx = Math.floor(Math.sqrt(Math.max(0, radius * radius - dy * dy)));
        const startX = cX - dx;
        const endX = cX + dx;
        const width = endX - startX + 1;
        offscreenCtx.clearRect(startX, y, width, 1);
    }
}

function render() {
    needsRender = false;
    if (!ctx || !canvas) return;

    processPixelQueue();

    const bgColor = isDarkMode ? '#0e0e11' : '#f5f5fa';
    const gridColor = 'rgba(0, 0, 0, 0.15)';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);
    ctx.imageSmoothingEnabled = false;

    // Fondo blanco del mapa
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, boardWidth, boardHeight);

    // Rejilla optimizada por Viewport Culling
    if (transform.scale > 4) {
        ctx.lineWidth = 1 / transform.scale;
        ctx.strokeStyle = gridColor;
        ctx.beginPath();

        const canvasWidthCss = canvas.width / dpr;
        const canvasHeightCss = canvas.height / dpr;

        const startX = Math.max(0, Math.floor(-transform.x / transform.scale));
        const startY = Math.max(0, Math.floor(-transform.y / transform.scale));
        const endX = Math.min(boardWidth, Math.ceil((canvasWidthCss - transform.x) / transform.scale));
        const endY = Math.min(boardHeight, Math.ceil((canvasHeightCss - transform.y) / transform.scale));

        for (let x = startX; x <= endX; x++) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y++) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();
    }

    // Copiar buffer offscreen
    if (offscreenCanvas && offscreenCanvas.width > 0 && offscreenCanvas.height > 0) {
        ctx.drawImage(offscreenCanvas, 0, 0);
    }

    // Plantillas activas
    if (activeTemplate && !isSpectator && !isResetLocked) {
        ctx.save();
        ctx.globalAlpha = activeTemplate.opacity;
        const cx = Math.round(activeTemplate.x + activeTemplate.w / 2);
        const cy = Math.round(activeTemplate.y + activeTemplate.h / 2);
        ctx.translate(cx, cy);
        if (activeTemplate.angle) {
            ctx.rotate((activeTemplate.angle * Math.PI) / 180);
        }
        const hw = Math.round(activeTemplate.w / 2);
        const hh = Math.round(activeTemplate.h / 2);

        if (activeTemplate.imageBitmap) {
            ctx.drawImage(activeTemplate.imageBitmap, -hw, -hh, activeTemplate.w, activeTemplate.h);
        }

        if (!activeTemplate.locked) {
            ctx.strokeStyle = '#2196F3';
            ctx.lineWidth = 2 / transform.scale;
            ctx.strokeRect(-hw, -hh, activeTemplate.w, activeTemplate.h);
            const handleSize = 8 / transform.scale;
            ctx.fillStyle = '#FFFFFF';
            const handles = [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]];
            handles.forEach(([hx, hy]) => {
                ctx.fillRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
                ctx.strokeRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
            });
        }
        ctx.restore();
    }

    // Dibujado de contornos de selección optimizado vía Bitmask O(1)
    const selLen = selectedPixelsArray.length;
    const hasHover = hoveredPixelKey >= 0 && !isSpectator && !isResetLocked;
    
    if ((selLen > 0 || hasHover) && !isSpectator && !isResetLocked) {
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 1 / transform.scale;
        ctx.beginPath();

        updateSelectionBitmask();

        const drawPixelContour = (key) => {
            const x = key & 0xFFFF;
            const y = key >> 16;
            if (x < 0 || x >= boardWidth || y < 0 || y >= boardHeight) return;

            const idx = y * boardWidth + x;
            const hasTop = y > 0 && selectedBitmask[idx - boardWidth] === 1;
            const hasBottom = y < boardHeight - 1 && selectedBitmask[idx + boardWidth] === 1;
            const hasLeft = x > 0 && selectedBitmask[idx - 1] === 1;
            const hasRight = x < boardWidth - 1 && selectedBitmask[idx + 1] === 1;

            if (!hasTop) { ctx.moveTo(x, y); ctx.lineTo(x + 1, y); }
            if (!hasBottom) { ctx.moveTo(x, y + 1); ctx.lineTo(x + 1, y + 1); }
            if (!hasLeft) { ctx.moveTo(x, y); ctx.lineTo(x, y + 1); }
            if (!hasRight) { ctx.moveTo(x + 1, y); ctx.lineTo(x + 1, y + 1); }
        };

        for (let i = 0; i < selLen; i++) {
            drawPixelContour(selectedPixelsArray[i]);
        }
        if (hasHover) {
            drawPixelContour(hoveredPixelKey);
        }
        ctx.stroke();
    }

    // Nuclear Warnings (Mira telescópica + Círculo rojo cerrándose)
    if (nuclearWarnings.length > 0) {
        const now = Date.now();
        nuclearWarnings = nuclearWarnings.filter(w => !isNaN(w.endTime) && now < w.endTime);
        if (nuclearWarnings.length > 0) {
            requestRender();
        }

        const scale = transform.scale || 1;
        const lineW = 1.2 / scale;

        nuclearWarnings.forEach(warning => {
            const wx = warning.x + 0.5;
            const wy = warning.y + 0.5;
            const outerR = warning.radius;
            const crossLength = outerR + (4 / scale);

            ctx.save();
            // 1. Mira telescópica fina cruzada en el centro
            ctx.beginPath();
            ctx.moveTo(wx - crossLength, wy);
            ctx.lineTo(wx + crossLength, wy);
            ctx.moveTo(wx, wy - crossLength);
            ctx.lineTo(wx, wy + crossLength);
            ctx.lineWidth = lineW;
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
            ctx.stroke();

            // 2. Anillo fijo exterior translúcido
            ctx.beginPath();
            ctx.arc(wx, wy, outerR, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.fill();
            ctx.lineWidth = lineW;
            ctx.strokeStyle = '#ef4444';
            ctx.stroke();

            // 3. Círculo rojo cerrándose progresivamente hacia el centro
            const duration = warning.endTime - warning.startTime;
            const timeRatio = duration > 0 ? Math.min(1, Math.max(0, (now - warning.startTime) / duration)) : 1;
            const innerR = outerR * (1 - timeRatio);

            if (innerR > 0.1) {
                ctx.beginPath();
                ctx.arc(wx, wy, innerR, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
                ctx.fill();
                ctx.lineWidth = lineW;
                ctx.strokeStyle = '#dc2626';
                ctx.stroke();
            }
            ctx.restore();
        });
    }

    // Animaciones de Explosiones
    if (explosions.length > 0) {
        const now = Date.now();
        explosions = explosions.filter(exp => (now - exp.startTime) < exp.duration);
        if (explosions.length > 0) {
            requestRender();
        }

        explosions.forEach(exp => {
            const elapsed = now - exp.startTime;
            const progress = Math.min(1, elapsed / exp.duration);
            const opacity = 1 - progress;

            // Animación unificada de onda expansiva circular (escalada proporcionalmente al radio)
            const radiusOuter = exp.maxRadius * (1 + 1.5 * progress);
            const radiusInner = exp.maxRadius * (0.5 + 1 * progress);

            // Anillo exterior de onda expansiva
            ctx.beginPath();
            ctx.arc(exp.x + 0.5, exp.y + 0.5, radiusOuter, 0, 2 * Math.PI);
            ctx.lineWidth = Math.max(2, 4 / transform.scale);
            ctx.strokeStyle = `rgba(249, 115, 22, ${opacity})`;
            ctx.stroke();

            // Núcleo de fuego interior
            ctx.beginPath();
            ctx.arc(exp.x + 0.5, exp.y + 0.5, radiusInner, 0, 2 * Math.PI);
            ctx.lineWidth = Math.max(3, 5 / transform.scale);
            ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;
            ctx.fillStyle = `rgba(220, 38, 38, ${opacity * 0.5})`;
            ctx.fill();
            ctx.stroke();
        });
    }

    ctx.restore();
}

self.onmessage = function (e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT_CANVAS':
            canvas = payload.canvas;
            ctx = canvas.getContext('2d', { alpha: false });
            boardWidth = payload.boardWidth || 64;
            boardHeight = payload.boardHeight || 64;
            dpr = payload.dpr || 1;
            isProgressive = !!payload.isProgressive;

            offscreenCanvas = new OffscreenCanvas(boardWidth, boardHeight);
            offscreenCtx = offscreenCanvas.getContext('2d', { alpha: true });
            requestRender();
            break;

        case 'RESIZE_BOARD':
            boardWidth = payload.boardWidth;
            boardHeight = payload.boardHeight;
            if (offscreenCanvas) {
                offscreenCanvas.width = boardWidth;
                offscreenCanvas.height = boardHeight;
            }
            requestRender();
            break;

        case 'RESIZE':
            if (canvas && payload.width && payload.height) {
                dpr = payload.dpr || 1;
                canvas.width = Math.floor(payload.width * dpr);
                canvas.height = Math.floor(payload.height * dpr);
                requestRender();
            }
            break;

        case 'UPDATE_TRANSFORM':
            transform = payload.transform;
            isDarkMode = !!payload.isDarkMode;
            currentColor = payload.currentColor || '#000000';
            isSpectator = payload.isSpectator;
            isResetLocked = payload.isResetLocked;
            requestRender();
            break;

        case 'UPDATE_SELECTION':
            if (payload.selectedPixels) {
                selectedPixelsArray = new Uint32Array(payload.selectedPixels);
            } else {
                selectedPixelsArray = new Uint32Array(0);
            }
            hoveredPixelKey = payload.hoveredPixelKey !== undefined ? payload.hoveredPixelKey : -1;
            requestRender();
            break;

        case 'CLEAR_AREA': {
            const { x1, y1, x2, y2 } = e.data.payload;
            if (offscreenCtx) {
                const w = Math.max(1, x2 - x1 + 1);
                const h = Math.max(1, y2 - y1 + 1);
                offscreenCtx.clearRect(x1, y1, w, h);
                requestRender();
            }
            break;
        }

        case 'PUSH_PIXELS': {
            const pixels = e.data.payload.pixels;
            if (isProgressive) {
                pixels.forEach(p => {
                    const cx = Math.floor(p.x / 512);
                    const cy = Math.floor(p.y / 512);
                    const key = `${cx},${cy}`;
                    if (!hydratedChunks.has(key)) {
                        if (!pendingProgressivePixels[key]) {
                            pendingProgressivePixels[key] = [];
                        }
                        pendingProgressivePixels[key].push(p);
                    } else {
                        pixelQueue.push(p);
                    }
                });
            } else {
                pixelQueue.push(...pixels);
            }
            requestRender();
            break;
        }

        case 'HYDRATE_STATE':
            if (payload.boardWidth && payload.boardHeight) {
                boardWidth = payload.boardWidth;
                boardHeight = payload.boardHeight;
                if (offscreenCanvas) {
                    offscreenCanvas.width = boardWidth;
                    offscreenCanvas.height = boardHeight;
                }
            }
            hydrateState(payload.base64String);
            break;

        case 'HYDRATE_CHUNK':
            hydrateChunkWorker(payload.chunkX, payload.chunkY, payload.chunkSize || 512, payload.base64String);
            break;

        case 'DRAW_IMAGE_BUFFER':
            if (payload.imageBitmap && offscreenCtx) {
                offscreenCtx.clearRect(0, 0, boardWidth, boardHeight);
                offscreenCtx.drawImage(payload.imageBitmap, 0, 0, boardWidth, boardHeight);
                requestRender();
            }
            break;

        case 'BOMB_WARNING':
        case 'NUCLEAR_WARNING':
            if (payload) {
                const cx = parseInt(payload.x || 0, 10);
                const cy = parseInt(payload.y || 0, 10);
                const r = parseInt(payload.radius || 10, 10);
                const durationMs = parseInt(payload.durationMs || 3000, 10);
                const key = payload.key || `${cx}_${cy}`;
                const now = Date.now();

                const existing = nuclearWarnings.find(w => w.key === key && now < w.endTime);
                if (existing) {
                    console.log(`[WorkerWarning] Duplicate warning ignored for key:${key}`);
                    break;
                }

                console.log(`[WorkerWarning] Received BOMB_WARNING -> key:${key}, x:${cx}, y:${cy}, r:${r}, durationMs:${durationMs}ms`);

                nuclearWarnings.push({
                    key: key,
                    x: cx,
                    y: cy,
                    radius: r,
                    startTime: now,
                    endTime: now + durationMs
                });
                requestRender();
            }
            break;

        case 'BOMB_PIXEL':
            if (offscreenCtx) {
                const cX = parseInt(payload.cX ?? payload.x ?? 0, 10);
                const cY = parseInt(payload.cY ?? payload.y ?? 0, 10);
                const r = parseInt(payload.r ?? payload.radius ?? 10, 10);
                const perkId = payload.perkId || payload.perk || 'pixel_misil_1';
                const now = Date.now();

                // Limpiar advertencia del objetivo si aún sigue activa
                nuclearWarnings = nuclearWarnings.filter(w => Math.abs(w.x - cX) > 2 || Math.abs(w.y - cY) > 2);

                clearBombPixels(cX, cY, r);

                explosions.push({
                    x: cX,
                    y: cY,
                    maxRadius: r,
                    startTime: now,
                    duration: 800,
                    perkId: perkId
                });
                requestRender();
            }
            break;

        case 'UPDATE_TEMPLATE':
            activeTemplate = payload.template;
            requestRender();
            break;

        case 'REQUEST_RENDER':
            requestRender();
            break;
    }
};
