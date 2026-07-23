// CanvasRenderWorker.js - Motor de renderizado ultra-optimizado en Web Worker (TypedArrays + DirtyRects)
let canvas = null;
let ctx = null;
let offscreenCanvas = null;
let offscreenCtx = null;

// Motor de Memoria Unificado
let mainImageData = null;
let pixelBuffer = null; // Uint32Array map
let dirtyRect = { minX: Infinity, minY: Infinity, maxX: -1, maxY: -1 };

let boardWidth = 64;
let boardHeight = 64;
let transform = { x: 0, y: 0, scale: 1 };
let dpr = 1;
let isDarkMode = false;
let currentColor = '#000000';

let pixelQueue = [];
let selectedPixelsArray = new Uint32Array(0); // TypedArray contiguo para píxeles seleccionados
let hoveredPixelKey = -1;
let ownerEraserBox = null;

let isSpectator = false;
let isResetLocked = false;
let activeTemplate = null;

let nuclearWarnings = [];
let explosions = [];

let resetAnimation = null;
let resizeAnimation = null;
let injectAnimation = null;

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

function requestRender() {
    if (!needsRender) {
        needsRender = true;
        animFrameId = requestAnimationFrame(render);
    }
}

// ---------------------------------------------------------
// MOTOR DE MEMORIA (TYPED ARRAYS & DIRTY RECTS)
// ---------------------------------------------------------

function initMemoryEngine(w, h) {
    if (mainImageData && mainImageData.width === w && mainImageData.height === h) return;
    mainImageData = new ImageData(w, h);
    pixelBuffer = new Uint32Array(mainImageData.data.buffer);
    if (offscreenCtx) {
        offscreenCanvas.width = w;
        offscreenCanvas.height = h;
        offscreenCtx.putImageData(mainImageData, 0, 0);
    }
}

function markDirty(x, y) {
    if (x < dirtyRect.minX) dirtyRect.minX = x;
    if (y < dirtyRect.minY) dirtyRect.minY = y;
    if (x > dirtyRect.maxX) dirtyRect.maxX = x;
    if (y > dirtyRect.maxY) dirtyRect.maxY = y;
}

function resetDirtyRect() {
    dirtyRect.minX = Infinity;
    dirtyRect.minY = Infinity;
    dirtyRect.maxX = -1;
    dirtyRect.maxY = -1;
}

function flushDirtyRect() {
    if (dirtyRect.minX > dirtyRect.maxX) return;
    if (!offscreenCtx || !mainImageData) return;
    
    const dx = Math.max(0, dirtyRect.minX);
    const dy = Math.max(0, dirtyRect.minY);
    const dw = Math.min(boardWidth - 1, dirtyRect.maxX) - dx + 1;
    const dh = Math.min(boardHeight - 1, dirtyRect.maxY) - dy + 1;
    
    if (dw > 0 && dh > 0) {
        // Enviar solo la parte sucia a la GPU en 1 llamada ultra-rápida
        offscreenCtx.putImageData(mainImageData, 0, 0, dx, dy, dw, dh);
    }
    
    resetDirtyRect();
}

function colorToAbgr(color) {
    if (color === 'transparent' || color === 255 || color === 0) return 0;
    if (typeof color === 'string') {
        let hex = color.replace('#', '');
        let r=0, g=0, b=0, a=255;
        if (hex.length === 3) {
            r = parseInt(hex[0]+hex[0], 16);
            g = parseInt(hex[1]+hex[1], 16);
            b = parseInt(hex[2]+hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else if (hex.length === 8) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
            a = parseInt(hex.substring(6, 8), 16);
        }
        return (a << 24) | (b << 16) | (g << 8) | r;
    }
    return 0;
}

// ---------------------------------------------------------
// FUNCIONES DE DESCOMPRESIÓN E HIDRATACIÓN
// ---------------------------------------------------------

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
        initMemoryEngine(boardWidth, boardHeight);
        const totalBytes = Math.min(bytes.length, mainImageData.data.length);
        mainImageData.data.set(bytes.subarray(0, totalBytes));
        offscreenCtx.putImageData(mainImageData, 0, 0);
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
        
        // El array viene como UInt8 contiguo, lo copiamos a mainImageData línea por línea
        for (let cy = 0; cy < actualH; cy++) {
            const destY = chunkY * chunkSize + cy;
            const destX = chunkX * chunkSize;
            
            const destIdx = (destY * boardWidth + destX) * 4;
            const srcIdx = (cy * actualW) * 4;
            const length = actualW * 4;
            
            if (destIdx + length <= mainImageData.data.length && srcIdx + length <= bytes.length) {
                mainImageData.data.set(bytes.subarray(srcIdx, srcIdx + length), destIdx);
            }
        }

        offscreenCtx.putImageData(mainImageData, 0, 0, chunkX * chunkSize, chunkY * chunkSize, actualW, actualH);
        
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

// ---------------------------------------------------------
// FUNCIONES DE DIBUJO MASIVO (O(1))
// ---------------------------------------------------------

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
    if (!pixelQueue || pixelQueue.length === 0 || !pixelBuffer) return;
    try {
        while (pixelQueue.length > 0) {
            const p = pixelQueue.pop();
            const x = p.x, y = p.y;
            if (x >= 0 && x < boardWidth && y >= 0 && y < boardHeight) {
                pixelBuffer[y * boardWidth + x] = colorToAbgr(p.color);
                markDirty(x, y);
            }
        }
        flushDirtyRect();
    } catch (e) {
        pixelQueue.length = 0;
    }
}

function clearBombPixels(cX, cY, r) {
    if (!pixelBuffer) return;
    const radius = Math.max(1, parseInt(r || 1, 10));
    const rSq = radius * radius;
    for (let y = cY - radius; y <= cY + radius; y++) {
        if (y < 0 || y >= boardHeight) continue;
        const dy = y - cY;
        const dx = Math.floor(Math.sqrt(Math.max(0, rSq - dy * dy)));
        let startX = Math.max(0, cX - dx);
        let endX = Math.min(boardWidth - 1, cX + dx);
        
        if (startX <= endX) {
            const idx = y * boardWidth + startX;
            pixelBuffer.fill(0, idx, idx + (endX - startX + 1));
            markDirty(startX, y);
            markDirty(endX, y);
        }
    }
    flushDirtyRect();
}

// ---------------------------------------------------------
// RENDER LOOP PRINCIPAL
// ---------------------------------------------------------

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

    // Fondo blanco del mapa (Animado)
    let drawW = boardWidth;
    let drawH = boardHeight;
    
    if (resizeAnimation) {
        const now = Date.now();
        const elapsed = now - resizeAnimation.startTime;
        const progress = Math.min(1, elapsed / resizeAnimation.duration);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        drawW = resizeAnimation.startW + (resizeAnimation.endW - resizeAnimation.startW) * easeProgress;
        drawH = resizeAnimation.startH + (resizeAnimation.endH - resizeAnimation.startH) * easeProgress;
        
        if (progress >= 1) {
            resizeAnimation = null;
        } else {
            requestRender();
        }
    }
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, drawW, drawH);

    // Rejilla optimizada por Viewport Culling
    if (transform.scale > 4) {
        ctx.lineWidth = 1 / transform.scale;
        ctx.strokeStyle = gridColor;
        ctx.beginPath();

        const canvasWidthCss = canvas.width / dpr;
        const canvasHeightCss = canvas.height / dpr;

        const startX = Math.max(0, Math.floor(-transform.x / transform.scale));
        const startY = Math.max(0, Math.floor(-transform.y / transform.scale));
        
        // BUG FIX: Limitar grid al tamaño en animación (drawW / drawH), no al total instantáneo
        const endX = Math.min(drawW, Math.ceil((canvasWidthCss - transform.x) / transform.scale));
        const endY = Math.min(drawH, Math.ceil((canvasHeightCss - transform.y) / transform.scale));

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

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, drawW, drawH);
    ctx.clip();

    // Copiar buffer offscreen (siempre y cuando sea válido)
    if (offscreenCanvas && offscreenCanvas.width > 0 && offscreenCanvas.height > 0) {
        ctx.drawImage(offscreenCanvas, 0, 0);
    }
    
    // Animación de reinicio de lienzo (Barrido circular visual)
    if (resetAnimation) {
        const now = Date.now();
        const elapsed = now - resetAnimation.startTime;
        const progress = Math.min(1, elapsed / resetAnimation.duration);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentRadius = resetAnimation.maxRadius * easeProgress;
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(boardWidth / 2, boardHeight / 2, currentRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        
        ctx.beginPath();
        ctx.arc(boardWidth / 2, boardHeight / 2, currentRadius, 0, 2 * Math.PI);
        ctx.lineWidth = Math.max(1, 6 / transform.scale);
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();
        
        if (progress >= 1) {
            // Aplicar la limpieza masiva en memoria a velocidad luz
            if (pixelBuffer) pixelBuffer.fill(0);
            if (offscreenCtx && mainImageData) offscreenCtx.putImageData(mainImageData, 0, 0);
            resetAnimation = null;
        } else {
            requestRender();
        }
    }
    
    ctx.restore();

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
    
    if (ownerEraserBox) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1 / transform.scale;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        
        const w = ownerEraserBox.x2 - ownerEraserBox.x1 + 1;
        const h = ownerEraserBox.y2 - ownerEraserBox.y1 + 1;
        
        ctx.fillRect(ownerEraserBox.x1, ownerEraserBox.y1, w, h);
        ctx.strokeRect(ownerEraserBox.x1, ownerEraserBox.y1, w, h);
    } else if ((selLen > 0 || hasHover) && !isSpectator && !isResetLocked) {
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
            ctx.beginPath();
            ctx.moveTo(wx - crossLength, wy);
            ctx.lineTo(wx + crossLength, wy);
            ctx.moveTo(wx, wy - crossLength);
            ctx.lineTo(wx, wy + crossLength);
            ctx.lineWidth = lineW;
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(wx, wy, outerR, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.fill();
            ctx.lineWidth = lineW;
            ctx.strokeStyle = '#ef4444';
            ctx.stroke();

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

            const radiusOuter = exp.maxRadius * (1 + 1.5 * progress);
            const radiusInner = exp.maxRadius * (0.5 + 1 * progress);

            ctx.beginPath();
            ctx.arc(exp.x + 0.5, exp.y + 0.5, radiusOuter, 0, 2 * Math.PI);
            ctx.lineWidth = Math.max(2, 4 / transform.scale);
            ctx.strokeStyle = `rgba(249, 115, 22, ${opacity})`;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(exp.x + 0.5, exp.y + 0.5, radiusInner, 0, 2 * Math.PI);
            ctx.lineWidth = Math.max(3, 5 / transform.scale);
            ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;
            ctx.fillStyle = `rgba(220, 38, 38, ${opacity * 0.5})`;
            ctx.fill();
            ctx.stroke();
        });
    }

    // Animación de Inyección de Template
    if (injectAnimation) {
        const now = Date.now();
        const elapsed = now - injectAnimation.startTime;
        const progress = Math.min(1, elapsed / injectAnimation.duration);
        const easeProgress = 1 - Math.pow(1 - progress, 2);
        
        const t = injectAnimation.template;
        const scanY = t.y + (t.h * easeProgress);
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(t.x, scanY);
        ctx.lineTo(t.x + t.w, scanY);
        ctx.lineWidth = Math.max(1, 3 / transform.scale);
        ctx.strokeStyle = '#4ade80';
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 10;
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
        ctx.lineWidth = Math.max(1, 1 / transform.scale);
        ctx.strokeRect(t.x, t.y, t.w, t.h);
        ctx.restore();
        
        if (progress >= 1) {
            injectAnimation = null;
        } else {
            requestRender();
        }
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
            
            initMemoryEngine(boardWidth, boardHeight);
            requestRender();
            break;

        case 'RESIZE_BOARD': {
            resizeAnimation = {
                startTime: Date.now(),
                duration: 1500,
                startW: boardWidth,
                startH: boardHeight,
                endW: payload.boardWidth,
                endH: payload.boardHeight
            };
            
            const newW = payload.boardWidth;
            const newH = payload.boardHeight;
            const newImgData = new ImageData(newW, newH);
            const newBuffer = new Uint32Array(newImgData.data.buffer);
            
            if (pixelBuffer) {
                // Copy old buffer to new buffer respecting boundaries
                const minH = Math.min(boardHeight, newH);
                const minW = Math.min(boardWidth, newW);
                for (let y = 0; y < minH; y++) {
                    const srcIdx = y * boardWidth;
                    const destIdx = y * newW;
                    newBuffer.set(pixelBuffer.subarray(srcIdx, srcIdx + minW), destIdx);
                }
            }
            
            boardWidth = newW;
            boardHeight = newH;
            mainImageData = newImgData;
            pixelBuffer = newBuffer;
            if (offscreenCanvas) {
                offscreenCanvas.width = boardWidth;
                offscreenCanvas.height = boardHeight;
                offscreenCtx.putImageData(mainImageData, 0, 0);
            }
            requestRender();
            break;
        }

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
            ownerEraserBox = payload.ownerEraserBox || null;
            requestRender();
            break;

        case 'CLEAR_AREA': {
            const { x1, y1, x2, y2 } = e.data.payload;
            if (pixelBuffer) {
                const startY = Math.max(0, y1);
                const endY = Math.min(boardHeight - 1, y2);
                const startX = Math.max(0, x1);
                const endX = Math.min(boardWidth - 1, x2);
                
                for (let y = startY; y <= endY; y++) {
                    const idx = y * boardWidth + startX;
                    pixelBuffer.fill(0, idx, idx + (endX - startX + 1));
                }
                
                markDirty(startX, startY);
                markDirty(endX, endY);
                flushDirtyRect();
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
                // Inyección de imagen completa al lienzo (Template finalizado)
                offscreenCtx.clearRect(0, 0, boardWidth, boardHeight);
                offscreenCtx.drawImage(payload.imageBitmap, 0, 0, boardWidth, boardHeight);
                
                // Extraer a memoria compartida central O(1)
                mainImageData = offscreenCtx.getImageData(0, 0, boardWidth, boardHeight);
                pixelBuffer = new Uint32Array(mainImageData.data.buffer);
                requestRender();
            } else if (!payload.imageBitmap && offscreenCtx) {
                // Reinicio de lienzo (Animación masiva + Limpieza Memoria)
                resetAnimation = {
                    startTime: Date.now(),
                    duration: 2000,
                    maxRadius: Math.sqrt(boardWidth*boardWidth + boardHeight*boardHeight)
                };
                requestRender();
            }
            break;
            
        case 'TRIGGER_INJECT_ANIMATION':
            injectAnimation = {
                startTime: Date.now(),
                duration: 2000,
                template: payload.template
            };
            requestRender();
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
                    break;
                }

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
