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
let protectedPixelsArray = new Uint32Array(0);
let ownerProtectedPixelsArray = new Uint32Array(0);
let myProtectedPixelsArray = new Uint32Array(0);
let showMyProtectionsHighlight = false;
let protectedBitmask = new Uint8Array(0);
let protectedOffscreenCanvas = null;
let protectedOffscreenCtx = null;
let protectedPixelsDirty = true;
let isOwnerProtecting = false;
let hoveredPixelKey = -1;
let ownerEraserBox = null;
let moveAreaBox = null;
let myMinesArray = new Uint32Array(0);
let isPlacingMines = false;
let shapePreviewPixelsArray = new Uint32Array(0);
let shapePreviewBox = null;
const workerPath2dCache = new Map();
let textPreviewPixelsArray = new Uint32Array(0);
let textPreviewShadowArray = new Uint32Array(0);
let textPreviewOutlineArray = new Uint32Array(0);
let textPreviewBox = null;
let interactionMode = 'normal';
let textPosition = null;
let activePixelText = null;

let isOfflineMode = false;
let isMirrorMode = false;
let isEyedropperActive = false;
let tileGridSize = 0;
let brushSize = 1;
let brushShape = 'square';
const MAX_HISTORY = 50;
let undoStack = [];
let redoStack = [];
let activeSprayStrokeDiffs = null;
let activeBrushStrokeDiffs = null;

function updateProtectedOffscreen() {
    if (typeof OffscreenCanvas === 'undefined') return;
    if (!protectedOffscreenCanvas || protectedOffscreenCanvas.width !== boardWidth || protectedOffscreenCanvas.height !== boardHeight) {
        protectedOffscreenCanvas = new OffscreenCanvas(boardWidth, boardHeight);
        protectedOffscreenCtx = protectedOffscreenCanvas.getContext('2d', { alpha: true });
    }

    const totalLen = boardWidth * boardHeight;
    if (!protectedBitmask || protectedBitmask.length !== totalLen) {
        protectedBitmask = new Uint8Array(totalLen);
    } else {
        protectedBitmask.fill(0);
    }

    const activeArray = isOwnerProtecting ? ownerProtectedPixelsArray : (showMyProtectionsHighlight ? myProtectedPixelsArray : new Uint32Array(0));

    if (activeArray && activeArray.length > 0) {
        const imgData = protectedOffscreenCtx.createImageData(boardWidth, boardHeight);
        const data32 = new Uint32Array(imgData.data.buffer);
        // RGBA little-endian: 0xAA_BB_GG_RR
        // A=51 (0x33), B=68 (0x44), G=68 (0x44), R=239 (0xEF) => 0x334444EF
        const protColor = 0x334444EF; 
        for (let i = 0; i < activeArray.length; i++) {
            const off = activeArray[i];
            if (off >= 0 && off < totalLen) {
                protectedBitmask[off] = 1;
                data32[off] = protColor;
            }
        }
        protectedOffscreenCtx.putImageData(imgData, 0, 0);
    } else {
        protectedOffscreenCtx.clearRect(0, 0, boardWidth, boardHeight);
    }
    protectedPixelsDirty = false;
}

let isSpectator = false;
let isResetLocked = false;
let isFrozen = false;
let isOwner = false;
let activeTemplate = null;
let activeTemplateId = null;
let templatesList = [];

let eraserAnimations = [];

let resetAnimation = null;
let resizeAnimation = null;
let injectAnimation = null;
let pendingImageBitmap = null;
let pendingHydrateStateBase64 = null;
let pendingChunks = [];

let isProgressive = false;
let hydratedChunks = new Set();
let pendingProgressivePixels = {};

let needsRender = false;
let animFrameId = null;


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
    if (offscreenCanvas) {
        offscreenCanvas.width = w;
        offscreenCanvas.height = h;
        if (offscreenCtx) {
            offscreenCtx.putImageData(mainImageData, 0, 0);
        }
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
    if (!pixelBuffer) return;
    
    const dx = Math.max(0, dirtyRect.minX);
    const dy = Math.max(0, dirtyRect.minY);
    const dw = Math.min(boardWidth - 1, dirtyRect.maxX) - dx + 1;
    const dh = Math.min(boardHeight - 1, dirtyRect.maxY) - dy + 1;
    
    if (dw > 0 && dh > 0) {
        if (offscreenCtx && mainImageData) {
            offscreenCtx.putImageData(mainImageData, 0, 0, dx, dy, dw, dh);
        }
    }
    
    resetDirtyRect();
}

function clearSinglePixel(x, y) {
    if (!pixelBuffer) return;
    if (x < 0 || x >= boardWidth || y < 0 || y >= boardHeight) return;
    const idx = y * boardWidth + x;
    pixelBuffer[idx] = 0;
    markDirty(x, y);
}

function getZigzagCoord(idx, W, H) {
    const y = Math.floor(idx / W);
    const x = (y % 2 === 0) ? (idx % W) : ((W - 1) - (idx % W));
    return { x, y };
}

function getSymmetricZigzagCoord(idx, W, H) {
    const y = Math.floor(idx / W);
    const x = (y % 2 === 0) ? ((W - 1) - (idx % W)) : (idx % W);
    const absY = H - 1 - y;
    return { x, y: absY };
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
        return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
    }
    return 0;
}

function abgrToHex(val) {
    if (!val || val === 0) return '#FFFFFF';
    const r = val & 0xFF;
    const g = (val >> 8) & 0xFF;
    const b = (val >> 16) & 0xFF;
    const a = (val >> 24) & 0xFF;
    if (a === 255) {
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    }
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
}

function abgrToHsv(val) {
    if (!val || val === 0) {
        return { h: 0, s: 0, v: 100 };
    }
    const r = (val & 0xFF) / 255;
    const g = ((val >> 8) & 0xFF) / 255;
    const b = ((val >> 16) & 0xFF) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : (d / max) * 100;
    const v = max * 100;

    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h = Math.round(h * 60);
    }
    return { h, s: Math.round(s), v: Math.round(v) };
}

function hsvToAbgr(h, s, v, a = 255) {
    s = Math.max(0, Math.min(100, s)) / 100;
    v = Math.max(0, Math.min(100, v)) / 100;
    h = ((h % 360) + 360) % 360;
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h / 60);
    const f = (h / 60) - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    const r8 = Math.round(r * 255);
    const g8 = Math.round(g * 255);
    const b8 = Math.round(b * 255);
    return ((a << 24) | (b8 << 16) | (g8 << 8) | r8) >>> 0;
}

// ---------------------------------------------------------
// FUNCIONES DE DESCOMPRESIÓN E HIDRATACIÓN
// ---------------------------------------------------------

async function decompressIfNeeded(input) {
    if (!input) return null;
    let bytes;
    try {
        if (typeof input === 'string') {
            const binaryString = atob(input);
            bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
        } else if (input instanceof Uint8Array) {
            bytes = input;
        } else if (input instanceof ArrayBuffer) {
            bytes = new Uint8Array(input);
        } else {
            return null;
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
        return null;
    }
}

async function hydrateState(base64String) {
    const bytes = await decompressIfNeeded(base64String);
    if (!bytes || !offscreenCtx) {
        console.warn('[Worker] hydrateState no pudo descomprimir o contexto no listo', { hasBytes: !!bytes, hasCtx: !!offscreenCtx });
        return;
    }

    try {
        initMemoryEngine(boardWidth, boardHeight);
        const totalBytes = Math.min(bytes.length, mainImageData.data.length);
        mainImageData.data.set(bytes.subarray(0, totalBytes));
        
        offscreenCtx.putImageData(mainImageData, 0, 0);
        console.info('[Worker] hydrateState aplicado exitosamente (%d bytes cargados en el lienzo).', totalBytes);
        requestRender();
    } catch (e) {
        console.error('[Worker] Error en hydrateState:', e);
    }
}

async function hydrateChunkWorker(chunkX, chunkY, chunkSize, chunkData) {
    const bytes = await decompressIfNeeded(chunkData);
    if (!bytes || !offscreenCtx) return;

    try {
        const actualW = Math.min(chunkSize, boardWidth - chunkX * chunkSize);
        const actualH = Math.min(chunkSize, boardHeight - chunkY * chunkSize);
        if (actualW <= 0 || actualH <= 0) return;
        
        // Cast bytes buffer to Uint32Array for fast 32-bit pixel copies
        let chunkUint32;
        if (bytes.byteOffset % 4 === 0) {
            chunkUint32 = new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
        } else {
            const alignedBuffer = bytes.slice().buffer;
            chunkUint32 = new Uint32Array(alignedBuffer);
        }
        
        for (let cy = 0; cy < actualH; cy++) {
            const destY = chunkY * chunkSize + cy;
            const destIdx = destY * boardWidth + (chunkX * chunkSize);
            const srcIdx = cy * actualW;
            
            if (pixelBuffer && destIdx + actualW <= pixelBuffer.length && srcIdx + actualW <= chunkUint32.length) {
                pixelBuffer.set(chunkUint32.subarray(srcIdx, srcIdx + actualW), destIdx);
            }
        }

        // Draw the chunk directly on offscreenCtx instead of transferring the whole board
        const chunkClamped = new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, bytes.length);
        const chunkImageData = new ImageData(chunkClamped, actualW, actualH);
        offscreenCtx.putImageData(chunkImageData, chunkX * chunkSize, chunkY * chunkSize);
        
        const chunkKey = `${chunkX},${chunkY}`;
        hydratedChunks.add(chunkKey);
        if (pendingProgressivePixels[chunkKey]) {
            const pendingArr = pendingProgressivePixels[chunkKey];
            const pLen = pendingArr.length;
            for (let i = 0; i < pLen; i++) {
                pixelQueue.push(pendingArr[i]);
            }
            delete pendingProgressivePixels[chunkKey];
        }
        
        requestRender();
    } catch (e) {
    }
}

// ---------------------------------------------------------
// FUNCIONES DE DIBUJO MASIVO (O(1))
// ---------------------------------------------------------

let selectedBitmask = new Uint8Array(0);
let selectionBitmaskDirty = true;

function updateSelectionBitmask() {
    if (!selectionBitmaskDirty && selectedBitmask && selectedBitmask.length === boardWidth * boardHeight) {
        return;
    }
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

    if (hoveredPixelKey >= 0 && !isSpectator && !isResetLocked && !(isFrozen && !isOwner)) {
        const hx = hoveredPixelKey & 0xFFFF;
        const hy = hoveredPixelKey >> 16;
        if (isOfflineMode && (brushSize > 1 || brushShape !== 'square')) {
            const offsets = getBrushOffsetsWorker(brushSize, brushShape);
            for (let i = 0; i < offsets.length; i++) {
                const px = hx + offsets[i].dx;
                const py = hy + offsets[i].dy;
                if (px >= 0 && px < boardWidth && py >= 0 && py < boardHeight) {
                    selectedBitmask[py * boardWidth + px] = 1;
                }
            }
        } else {
            if (hx >= 0 && hx < boardWidth && hy >= 0 && hy < boardHeight) {
                selectedBitmask[hy * boardWidth + hx] = 1;
            }
        }
    }
    selectionBitmaskDirty = false;
}

function getBrushOffsetsWorker(size = 1, shape = 'square') {
    const offsets = [];
    if (size <= 1) return [{ dx: 0, dy: 0 }];
    const half1 = Math.floor((size - 1) / 2);
    const half2 = Math.floor(size / 2);

    if (shape === 'circle') {
        if (size === 2) {
            for (let dy = 0; dy < 2; dy++) {
                for (let dx = 0; dx < 2; dx++) offsets.push({ dx, dy });
            }
        } else if (size % 2 === 1) {
            const r = (size - 1) / 2;
            const maxDistSq = r * r + 0.45;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (dx * dx + dy * dy <= maxDistSq) offsets.push({ dx, dy });
                }
            }
        } else {
            const half = size / 2;
            const maxDistSq = (half - 0.5) * (half - 0.5) + (half - 0.85);
            for (let dy = -half; dy < half; dy++) {
                for (let dx = -half; dx < half; dx++) {
                    const cx = dx + 0.5;
                    const cy = dy + 0.5;
                    if (cx * cx + cy * cy <= maxDistSq) offsets.push({ dx, dy });
                }
            }
        }
    } else if (shape === 'slash') {
        for (let i = -half1; i <= half2; i++) offsets.push({ dx: i, dy: -i });
    } else {
        for (let dy = -half1; dy <= half2; dy++) {
            for (let dx = -half1; dx <= half2; dx++) offsets.push({ dx, dy });
        }
    }
    return offsets.length > 0 ? offsets : [{ dx: 0, dy: 0 }];
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


// ---------------------------------------------------------


// ---------------------------------------------------------

function render() {
    needsRender = false;
    if (!ctx || !canvas) return;

    processPixelQueue();

    

    if (resetAnimation) {
        const now = Date.now();
        const elapsed = now - resetAnimation.startTime;
        const progress = Math.min(1, elapsed / resetAnimation.duration);
        
        const targetClearCount = Math.floor(progress * resetAnimation.totalPixels / 2);
        let needsFlush = false;
        
        const halfTotal = Math.ceil(resetAnimation.totalPixels / 2);
        while (resetAnimation.clearedCount < targetClearCount && resetAnimation.clearedCount < halfTotal) {
            const idx = resetAnimation.clearedCount;
            
            // Clear Spiral 1
            const p1 = getZigzagCoord(idx, resetAnimation.w, resetAnimation.h);
            if (p1) {
                const bufferIdx = p1.y * boardWidth + p1.x;
                if (pixelBuffer && pixelBuffer[bufferIdx] !== 0) {
                    pixelBuffer[bufferIdx] = 0;
                    markDirty(p1.x, p1.y);
                    needsFlush = true;
                }
            }
            
            // Clear Spiral 2
            const p2 = getSymmetricZigzagCoord(idx, resetAnimation.w, resetAnimation.h);
            if (p2) {
                const bufferIdx = p2.y * boardWidth + p2.x;
                if (pixelBuffer && pixelBuffer[bufferIdx] !== 0) {
                    pixelBuffer[bufferIdx] = 0;
                    markDirty(p2.x, p2.y);
                    needsFlush = true;
                }
            }
            
            resetAnimation.clearedCount++;
        }
        
        if (needsFlush) {
            flushDirtyRect();
        }
        
        if (progress >= 1) {
            if (pixelBuffer) pixelBuffer.fill(0);
            if (offscreenCtx && mainImageData) {
                if (pendingImageBitmap) {
                    offscreenCtx.drawImage(pendingImageBitmap, 0, 0, boardWidth, boardHeight);
                    mainImageData = offscreenCtx.getImageData(0, 0, boardWidth, boardHeight);
                    pixelBuffer = new Uint32Array(mainImageData.data.buffer);
                    pendingImageBitmap = null;
                } else {
                    offscreenCtx.putImageData(mainImageData, 0, 0);
                }
            }
            resetAnimation = null;
        } else {
            requestRender();
        }
    }

    

    if (injectAnimation) {
        const now = Date.now();
        const elapsed = now - injectAnimation.startTime;
        const progress = Math.min(1, elapsed / injectAnimation.duration);
        
        const targetClearCount = Math.floor(progress * injectAnimation.totalPixels / 2);
        let needsFlush = false;
        
        const halfTotal = Math.ceil(injectAnimation.totalPixels / 2);
        while (injectAnimation.clearedCount < targetClearCount && injectAnimation.clearedCount < halfTotal) {
            const idx = injectAnimation.clearedCount;
            
            // Clear / Draw Spiral 1
            const p1 = getZigzagCoord(idx, injectAnimation.w, injectAnimation.h);
            if (p1) {
                const absX = injectAnimation.x + p1.x;
                const absY = injectAnimation.y + p1.y;
                if (absX >= 0 && absX < boardWidth && absY >= 0 && absY < boardHeight) {
                    const bufferIdx = absY * boardWidth + absX;
                    let color = 0;
                    if (injectAnimation.templatePixels) {
                        const templateIdx = p1.y * injectAnimation.w + p1.x;
                        color = injectAnimation.templatePixels[templateIdx];
                    }
                    if ((color & 0xFF000000) !== 0) {
                        if (pixelBuffer && pixelBuffer[bufferIdx] !== color) {
                            pixelBuffer[bufferIdx] = color;
                            markDirty(absX, absY);
                            needsFlush = true;
                        }
                    }
                }
            }
            
            // Clear / Draw Spiral 2
            const p2 = getSymmetricZigzagCoord(idx, injectAnimation.w, injectAnimation.h);
            if (p2) {
                const absX = injectAnimation.x + p2.x;
                const absY = injectAnimation.y + p2.y;
                if (absX >= 0 && absX < boardWidth && absY >= 0 && absY < boardHeight) {
                    const bufferIdx = absY * boardWidth + absX;
                    let color = 0;
                    if (injectAnimation.templatePixels) {
                        const templateIdx = p2.y * injectAnimation.w + p2.x;
                        color = injectAnimation.templatePixels[templateIdx];
                    }
                    if ((color & 0xFF000000) !== 0) {
                        if (pixelBuffer && pixelBuffer[bufferIdx] !== color) {
                            pixelBuffer[bufferIdx] = color;
                            markDirty(absX, absY);
                            needsFlush = true;
                        }
                    }
                }
            }
            
            injectAnimation.clearedCount++;
        }
        
        if (needsFlush) {
            flushDirtyRect();
        }
        
        if (progress >= 1) {
            if (pendingHydrateStateBase64) {
                hydrateState(pendingHydrateStateBase64);
                pendingHydrateStateBase64 = null;
            }
            if (pendingChunks.length > 0) {
                pendingChunks.forEach(chk => {
                    hydrateChunkWorker(chk.chunkX, chk.chunkY, chk.chunkSize, chk.chunkData || chk.base64String);
                });
                pendingChunks = [];
            }
            injectAnimation = null;
        } else {
            requestRender();
        }
    }

    

    if (eraserAnimations.length > 0) {
        const now = Date.now();
        let needsFlush = false;
        
        eraserAnimations.forEach(anim => {
            const elapsed = now - anim.startTime;
            const progress = Math.min(1, elapsed / anim.duration);
            
            const targetClearCount = Math.floor(progress * anim.totalPixels / 2);
            const halfTotal = Math.ceil(anim.totalPixels / 2);
            
            while (anim.clearedCount < targetClearCount && anim.clearedCount < halfTotal) {
                const idx = anim.clearedCount;
                
                // Clear Spiral 1
                const p1 = getZigzagCoord(idx, anim.w, anim.h);
                if (p1) {
                    const absX = anim.x1 + p1.x;
                    const absY = anim.y1 + p1.y;
                    if (absX >= 0 && absX < boardWidth && absY >= 0 && absY < boardHeight) {
                        const bufferIdx = absY * boardWidth + absX;
                        if (pixelBuffer && pixelBuffer[bufferIdx] !== 0) {
                            pixelBuffer[bufferIdx] = 0;
                            markDirty(absX, absY);
                            needsFlush = true;
                        }
                    }
                }
                
                // Clear Spiral 2
                const p2 = getSymmetricZigzagCoord(idx, anim.w, anim.h);
                if (p2) {
                    const absX = anim.x1 + p2.x;
                    const absY = anim.y1 + p2.y;
                    if (absX >= 0 && absX < boardWidth && absY >= 0 && absY < boardHeight) {
                        const bufferIdx = absY * boardWidth + absX;
                        if (pixelBuffer && pixelBuffer[bufferIdx] !== 0) {
                            pixelBuffer[bufferIdx] = 0;
                            markDirty(absX, absY);
                            needsFlush = true;
                        }
                    }
                }
                
                anim.clearedCount++;
            }
        });
        
        if (needsFlush) {
            flushDirtyRect();
        }
        
        // Remove finished animations and ensure everything is fully cleared
        eraserAnimations = eraserAnimations.filter(anim => {
            const finished = (now - anim.startTime) >= anim.duration;
            if (finished) {
                let areaCleared = false;
                for (let y = anim.y1; y <= anim.y2; y++) {
                    for (let x = anim.x1; x <= anim.x2; x++) {
                        if (x >= 0 && x < boardWidth && y >= 0 && y < boardHeight) {
                            const bufferIdx = y * boardWidth + x;
                            if (pixelBuffer && pixelBuffer[bufferIdx] !== 0) {
                                pixelBuffer[bufferIdx] = 0;
                                markDirty(x, y);
                                areaCleared = true;
                            }
                        }
                    }
                }
                if (areaCleared) {
                    flushDirtyRect();
                }
            }
            return !finished;
        });
        
        if (eraserAnimations.length > 0) {
            requestRender();
        }
    }

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
        
        const targetClearCount = Math.floor(progress * resizeAnimation.totalPixels / 2);
        let needsFlush = false;
        
        const halfTotal = Math.ceil(resizeAnimation.totalPixels / 2);
        while (resizeAnimation.clearedCount < targetClearCount && resizeAnimation.clearedCount < halfTotal) {
            const idx = resizeAnimation.clearedCount;
            
            const p1 = getZigzagCoord(idx, resizeAnimation.startW, resizeAnimation.startH);
            if (p1) {
                const bufferIdx = p1.y * resizeAnimation.startW + p1.x;
                if (pixelBuffer && pixelBuffer[bufferIdx] !== 0) {
                    pixelBuffer[bufferIdx] = 0;
                    markDirty(p1.x, p1.y);
                    needsFlush = true;
                }
            }
            
            const p2 = getSymmetricZigzagCoord(idx, resizeAnimation.startW, resizeAnimation.startH);
            if (p2) {
                const bufferIdx = p2.y * resizeAnimation.startW + p2.x;
                if (pixelBuffer && pixelBuffer[bufferIdx] !== 0) {
                    pixelBuffer[bufferIdx] = 0;
                    markDirty(p2.x, p2.y);
                    needsFlush = true;
                }
            }
            
            resizeAnimation.clearedCount++;
        }
        
        if (needsFlush) {
            flushDirtyRect();
        }
        
        if (progress >= 1) {
            const newW = resizeAnimation.endW;
            const newH = resizeAnimation.endH;
            const newImgData = new ImageData(newW, newH);
            const newBuffer = new Uint32Array(newImgData.data.buffer);
            
            if (pixelBuffer) {
                const minH = Math.min(resizeAnimation.startH, newH);
                const minW = Math.min(resizeAnimation.startW, newW);
                for (let y = 0; y < minH; y++) {
                    const srcIdx = y * resizeAnimation.startW;
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
                if (pendingImageBitmap) {
                    let tempCanvas = new OffscreenCanvas(boardWidth, boardHeight);
                    let tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(pendingImageBitmap, 0, 0, boardWidth, boardHeight);
                    mainImageData = tempCtx.getImageData(0, 0, boardWidth, boardHeight);
                    pixelBuffer = new Uint32Array(mainImageData.data.buffer);
                    pendingImageBitmap = null;
                    
                    if (offscreenCtx) {
                        offscreenCtx.drawImage(pendingImageBitmap, 0, 0, boardWidth, boardHeight);
                    }
                } else {
                    if (offscreenCtx) {
                        offscreenCtx.putImageData(mainImageData, 0, 0);
                    }
                }
            }
            
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

    if (offscreenCanvas && offscreenCanvas.width > 0 && offscreenCanvas.height > 0) {
        ctx.drawImage(offscreenCanvas, 0, 0);
    }
    
    ctx.restore();

    // Cuadrícula de Tiles / Bloques con Viewport Culling & LOD
    if (tileGridSize > 0 && boardWidth > 0 && boardHeight > 0) {
        const screenStep = tileGridSize * transform.scale;
        if (screenStep >= 3.5 && canvas) {
            const canvasWidthCss = canvas.width / (dpr || 1);
            const canvasHeightCss = canvas.height / (dpr || 1);
            const visibleMinX = Math.max(0, Math.floor((-transform.x) / transform.scale));
            const visibleMaxX = Math.min(drawW, Math.ceil((canvasWidthCss - transform.x) / transform.scale));
            const visibleMinY = Math.max(0, Math.floor((-transform.y) / transform.scale));
            const visibleMaxY = Math.min(drawH, Math.ceil((canvasHeightCss - transform.y) / transform.scale));

            if (visibleMinX < visibleMaxX && visibleMinY < visibleMaxY) {
                ctx.save();
                ctx.lineWidth = Math.max(1 / transform.scale, 1.5 / transform.scale);
                ctx.strokeStyle = isDarkMode ? 'rgba(99, 102, 241, 0.7)' : 'rgba(79, 70, 229, 0.6)';
                ctx.setLineDash([3 / transform.scale, 2 / transform.scale]);
                ctx.beginPath();

                const startX = Math.max(tileGridSize, Math.floor(visibleMinX / tileGridSize) * tileGridSize);
                for (let x = startX; x < visibleMaxX && x < drawW; x += tileGridSize) {
                    ctx.moveTo(x, visibleMinY);
                    ctx.lineTo(x, visibleMaxY);
                }

                const startY = Math.max(tileGridSize, Math.floor(visibleMinY / tileGridSize) * tileGridSize);
                for (let y = startY; y < visibleMaxY && y < drawH; y += tileGridSize) {
                    ctx.moveTo(visibleMinX, y);
                    ctx.lineTo(visibleMaxX, y);
                }
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    // Render all templates concurrently
    if (templatesList && templatesList.length > 0 && !isSpectator && !isResetLocked && !(isFrozen && !isOwner)) {
        templatesList.forEach(tpl => {
            if (!tpl) return;
            if (tpl.id !== activeTemplateId) return;
            ctx.save();
            ctx.globalAlpha = tpl.opacity !== undefined ? tpl.opacity : 0.5;
            const cx = Math.round(tpl.x + tpl.w / 2);
            const cy = Math.round(tpl.y + tpl.h / 2);
            ctx.translate(cx, cy);
            if (tpl.angle) {
                ctx.rotate((tpl.angle * Math.PI) / 180);
            }
            const hw = Math.round(tpl.w / 2);
            const hh = Math.round(tpl.h / 2);

            if (tpl.imageBitmap) {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(tpl.imageBitmap, -hw, -hh, tpl.w, tpl.h);
            }

            // Draw selection outline & corner handles ONLY for the active un-locked template
            if (tpl.id === activeTemplateId && !tpl.locked) {
                ctx.strokeStyle = '#2196F3';
                ctx.lineWidth = 2 / transform.scale;
                ctx.strokeRect(-hw, -hh, tpl.w, tpl.h);
                const handleSize = 8 / transform.scale;
                ctx.fillStyle = '#FFFFFF';
                const handles = [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]];
                handles.forEach(([hx, hy]) => {
                    ctx.fillRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
                    ctx.strokeRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
                });
            }
            ctx.restore();
        });
    }

    const selLen = selectedPixelsArray.length;
    const hasHover = hoveredPixelKey >= 0 && !isSpectator && !isResetLocked && !(isFrozen && !isOwner);

    

    if (isOwnerProtecting || showMyProtectionsHighlight) {
        if (protectedPixelsDirty) {
            updateProtectedOffscreen();
        }
        if (protectedOffscreenCanvas) {
            ctx.drawImage(protectedOffscreenCanvas, 0, 0);
        }
        
        const activeArray = isOwnerProtecting ? ownerProtectedPixelsArray : myProtectedPixelsArray;
        if (activeArray && activeArray.length > 0) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1 / transform.scale;
            ctx.beginPath();
            
            for (let i = 0; i < activeArray.length; i++) {
                const off = activeArray[i];
                const x = off % boardWidth;
                const y = (off / boardWidth) | 0;
                if (x < 0 || x >= boardWidth || y < 0 || y >= boardHeight) continue;

                const idx = y * boardWidth + x;
                const hasTop = y > 0 && protectedBitmask[idx - boardWidth] === 1;
                const hasBottom = y < boardHeight - 1 && protectedBitmask[idx + boardWidth] === 1;
                const hasLeft = x > 0 && protectedBitmask[idx - 1] === 1;
                const hasRight = x < boardWidth - 1 && protectedBitmask[idx + 1] === 1;

                if (!hasTop) { ctx.moveTo(x, y); ctx.lineTo(x + 1, y); }
                if (!hasBottom) { ctx.moveTo(x, y + 1); ctx.lineTo(x + 1, y + 1); }
                if (!hasLeft) { ctx.moveTo(x, y); ctx.lineTo(x, y + 1); }
                if (!hasRight) { ctx.moveTo(x + 1, y); ctx.lineTo(x + 1, y + 1); }
            }
            ctx.stroke();
        }
    }

    if (isPlacingMines && myMinesArray && myMinesArray.length > 0) {
        ctx.strokeStyle = '#22c55e'; // Green highlight
        ctx.lineWidth = 1 / transform.scale;
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)'; // Transparent green fill
        ctx.beginPath();
        for (let i = 0; i < myMinesArray.length; i++) {
            const off = myMinesArray[i];
            const x = off % boardWidth;
            const y = (off / boardWidth) | 0;
            if (x < 0 || x >= boardWidth || y < 0 || y >= boardHeight) continue;
            ctx.fillRect(x, y, 1, 1);
            ctx.rect(x, y, 1, 1);
        }
        ctx.stroke();
    }

    if (shapePreviewBox || (shapePreviewPixelsArray && shapePreviewPixelsArray.length > 0)) {
        ctx.save();
        
        if (shapePreviewPixelsArray && shapePreviewPixelsArray.length > 0) {
            ctx.fillStyle = currentColor;
            for (let i = 0; i < shapePreviewPixelsArray.length; i++) {
                const key = shapePreviewPixelsArray[i];
                const px = key & 0xFFFF;
                const py = key >> 16;
                if (px >= 0 && px < boardWidth && py >= 0 && py < boardHeight) {
                    ctx.fillRect(px, py, 1, 1);
                }
            }
        } else if (shapePreviewBox && shapePreviewBox.pathD) {
            // RENDERIZADO VECTORIAL CON GROSOR UNIFORME PERFECTO EN TODOS LOS LADOS
            const { pathD, minX, minY, w, h, isFill, strokeWidth, color } = shapePreviewBox;
            let basePath = workerPath2dCache.get(pathD);
            if (!basePath && typeof Path2D !== 'undefined') {
                try {
                    basePath = new Path2D(pathD);
                    workerPath2dCache.set(pathD, basePath);
                } catch (e) {}
            }
            if (basePath) {
                let pathObj = basePath;
                if (typeof DOMMatrix !== 'undefined') {
                    const matrix = new DOMMatrix([w / 48, 0, 0, h / 48, 0, 0]);
                    const transformedPath = new Path2D();
                    transformedPath.addPath(basePath, matrix);
                    pathObj = transformedPath;
                }

                const drawVector = (ox, oy) => {
                    ctx.save();
                    ctx.translate(ox, oy);
                    if (isFill) {
                        ctx.fillStyle = color || currentColor;
                        ctx.fill(pathObj, 'evenodd');
                    } else {
                        ctx.strokeStyle = color || currentColor;
                        ctx.lineWidth = Math.max(1, strokeWidth || 1);
                        ctx.stroke(pathObj);
                    }
                    ctx.restore();
                };

                drawVector(minX, minY);
                if (isMirrorMode) {
                    const symMinX = boardWidth - 1 - (minX + w - 1);
                    if (symMinX >= 0 && symMinX < boardWidth) {
                        drawVector(symMinX, minY);
                    }
                }
            }
        }

        if (shapePreviewBox) {
            const { minX, minY, maxX, maxY, w, h, x0, y0, x1, y1 } = shapePreviewBox;

            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1 / transform.scale;
            ctx.setLineDash([3 / transform.scale, 3 / transform.scale]);
            ctx.strokeRect(minX, minY, w, h);

            if (isMirrorMode) {
                const symMinX = boardWidth - 1 - maxX;
                if (symMinX >= 0 && symMinX < boardWidth) {
                    ctx.strokeRect(symMinX, minY, w, h);
                }
            }

            ctx.setLineDash([]);
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1 / transform.scale;
            const handleR = Math.max(0.6, 2.5 / transform.scale);

            ctx.beginPath();
            ctx.arc(x0 + 0.5, y0 + 0.5, handleR, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x1 + 0.5, y1 + 0.5, handleR, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            if (isMirrorMode) {
                const symX0 = boardWidth - 1 - x0;
                const symX1 = boardWidth - 1 - x1;
                ctx.beginPath();
                ctx.arc(symX0 + 0.5, y0 + 0.5, handleR, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(symX1 + 0.5, y1 + 0.5, handleR, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    if (interactionMode === 'offline_text' && textPosition) {
        ctx.save();

        if (textPreviewShadowArray && textPreviewShadowArray.length > 0) {
            ctx.fillStyle = '#404040';
            for (let i = 0; i < textPreviewShadowArray.length; i++) {
                const key = textPreviewShadowArray[i];
                const px = key & 0xFFFF;
                const py = key >> 16;
                if (px >= 0 && px < boardWidth && py >= 0 && py < boardHeight) {
                    ctx.fillRect(px, py, 1, 1);
                }
            }
        }

        if (textPreviewOutlineArray && textPreviewOutlineArray.length > 0) {
            ctx.fillStyle = '#000000';
            for (let i = 0; i < textPreviewOutlineArray.length; i++) {
                const key = textPreviewOutlineArray[i];
                const px = key & 0xFFFF;
                const py = key >> 16;
                if (px >= 0 && px < boardWidth && py >= 0 && py < boardHeight) {
                    ctx.fillRect(px, py, 1, 1);
                }
            }
        }

        if (textPreviewPixelsArray && textPreviewPixelsArray.length > 0) {
            ctx.fillStyle = currentColor;
            for (let i = 0; i < textPreviewPixelsArray.length; i++) {
                const key = textPreviewPixelsArray[i];
                const px = key & 0xFFFF;
                const py = key >> 16;
                if (px >= 0 && px < boardWidth && py >= 0 && py < boardHeight) {
                    ctx.fillRect(px, py, 1, 1);
                }
            }
        }

        // Vertical Blinking Caret matching the selected font and scale
        const isCaretVisible = (Math.floor(Date.now() / 500) % 2 === 0);
        if (isCaretVisible) {
            const scale = activePixelText?.scale || 1;
            const fontHeights = { 'mini_3x5': 5, 'arcade_5x7': 7, 'cyber_6x8': 8 };
            const fontH = (fontHeights[activePixelText?.fontId] || 7) * scale;

            let caretX = (textPreviewBox && textPreviewBox.cursorX !== undefined) 
                ? textPreviewBox.cursorX 
                : (textPosition ? textPosition.x : 0);
            let caretY = textPosition ? textPosition.y : 0;

            if (caretX >= 0 && caretX < boardWidth && caretY >= 0 && caretY < boardHeight) {
                ctx.fillStyle = currentColor || '#ffffff';
                ctx.fillRect(caretX, caretY, 1, Math.min(fontH, boardHeight - caretY));

                if (isMirrorMode) {
                    const symCaretX = boardWidth - 1 - caretX;
                    if (symCaretX >= 0 && symCaretX < boardWidth) {
                        ctx.fillRect(symCaretX, caretY, 1, Math.min(fontH, boardHeight - caretY));
                    }
                }
            }
        }

        if (textPreviewBox && activePixelText?.text && activePixelText.text.length > 0 && textPreviewBox.w > 0) {
            const { minX, minY, maxX, maxY, w, h } = textPreviewBox;

            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 1 / transform.scale;
            ctx.setLineDash([2 / transform.scale, 2 / transform.scale]);
            ctx.strokeRect(minX - 0.5, minY - 0.5, w + 1, h + 1);

            if (isMirrorMode) {
                const symMinX = boardWidth - 1 - maxX;
                if (symMinX >= 0 && symMinX < boardWidth) {
                    ctx.strokeRect(symMinX - 0.5, minY - 0.5, w + 1, h + 1);
                }
            }

            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    if (ownerEraserBox) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1 / transform.scale;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        
        const w = ownerEraserBox.x2 - ownerEraserBox.x1 + 1;
        const h = ownerEraserBox.y2 - ownerEraserBox.y1 + 1;
        
        ctx.fillRect(ownerEraserBox.x1, ownerEraserBox.y1, w, h);
        ctx.strokeRect(ownerEraserBox.x1, ownerEraserBox.y1, w, h);
    } else if (moveAreaBox) {
        const { x1, y1, x2, y2, dx = 0, dy = 0, state = 1 } = moveAreaBox;
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        const w = maxX - minX + 1;
        const h = maxY - minY + 1;

        if (w > 0 && h > 0) {
            ctx.save();
            if (state === 3 && (dx !== 0 || dy !== 0)) {
                // Source cut-out overlay
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(minX, minY, w, h);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1 / transform.scale;
                ctx.setLineDash([2 / transform.scale, 2 / transform.scale]);
                ctx.strokeRect(minX, minY, w, h);

                // Draw floating sliced pixels at destination
                if (offscreenCanvas) {
                    ctx.drawImage(offscreenCanvas, minX, minY, w, h, minX + dx, minY + dy, w, h);
                }

                // Destination selection box
                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 1.5 / transform.scale;
                ctx.setLineDash([4 / transform.scale, 4 / transform.scale]);
                ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
                ctx.fillRect(minX + dx, minY + dy, w, h);
                ctx.strokeRect(minX + dx, minY + dy, w, h);
            } else {
                // Selection box during defining or fixed state
                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 1.5 / transform.scale;
                ctx.setLineDash([4 / transform.scale, 4 / transform.scale]);
                ctx.fillStyle = 'rgba(6, 182, 212, 0.18)';
                ctx.fillRect(minX, minY, w, h);
                ctx.strokeRect(minX, minY, w, h);
            }
            ctx.restore();
        }
    } else if ((selLen > 0 || hasHover) && !isSpectator && !isResetLocked && !(isFrozen && !isOwner)) {
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

    if (isMirrorMode && boardWidth > 0 && boardHeight > 0) {
        ctx.save();
        const midX = boardWidth / 2;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5 / transform.scale;
        ctx.setLineDash([4 / transform.scale, 4 / transform.scale]);
        ctx.beginPath();
        ctx.moveTo(midX, 0);
        ctx.lineTo(midX, boardHeight);
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();

    if (isEyedropperActive && hoveredPixelKey >= 0) {
        drawEyedropperLoupe();
    }
}

function drawEyedropperLoupe() {
    if (!isEyedropperActive || hoveredPixelKey < 0) return;
    const hx = hoveredPixelKey & 0xFFFF;
    const hy = hoveredPixelKey >> 16;
    if (hx < 0 || hx >= boardWidth || hy < 0 || hy >= boardHeight) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    const screenX = transform.x + (hx + 0.5) * transform.scale;
    const screenY = transform.y + (hy + 0.5) * transform.scale;

    const gridRadius = 4; // 9x9 grid (-4 to +4)
    const gridSize = 9;
    const cellSize = 12; // 12px per cell
    const loupeRadius = (gridSize * cellSize) / 2; // 54px radius

    // Read sampled color at center
    let centerHex = '#FFFFFF';
    if (pixelBuffer) {
        const val = pixelBuffer[hy * boardWidth + hx];
        if (val !== 0) centerHex = abgrToHex(val);
    }

    // Shadow for the loupe
    ctx.save();
    ctx.beginPath();
    ctx.arc(screenX, screenY, loupeRadius + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();

    // Clip to circle for magnifying lens
    ctx.beginPath();
    ctx.arc(screenX, screenY, loupeRadius, 0, Math.PI * 2);
    ctx.clip();

    // Background
    ctx.fillStyle = isDarkMode ? '#1f2937' : '#ffffff';
    ctx.fillRect(screenX - loupeRadius, screenY - loupeRadius, loupeRadius * 2, loupeRadius * 2);

    // Draw magnified grid cells
    for (let gy = -gridRadius; gy <= gridRadius; gy++) {
        for (let gx = -gridRadius; gx <= gridRadius; gx++) {
            const bx = hx + gx;
            const by = hy + gy;
            let cellColor = '#FFFFFF';
            if (bx >= 0 && bx < boardWidth && by >= 0 && by < boardHeight) {
                if (pixelBuffer) {
                    const val = pixelBuffer[by * boardWidth + bx];
                    if (val !== 0) cellColor = abgrToHex(val);
                }
            } else {
                cellColor = isDarkMode ? '#111827' : '#e5e7eb';
            }

            const cellX = screenX + gx * cellSize - cellSize / 2;
            const cellY = screenY + gy * cellSize - cellSize / 2;

            ctx.fillStyle = cellColor;
            ctx.fillRect(cellX, cellY, cellSize, cellSize);

            // Cell grid border
            ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(cellX, cellY, cellSize, cellSize);
        }
    }

    // Highlight center pixel with a dual-contrast square border (as shown in reference image)
    const centerX = screenX - cellSize / 2;
    const centerY = screenY - cellSize / 2;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(centerX, centerY, cellSize, cellSize);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX + 0.5, centerY + 0.5, cellSize - 1, cellSize - 1);

    ctx.restore();

    // Outer circular rings
    ctx.beginPath();
    ctx.arc(screenX, screenY, loupeRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(screenX, screenY, loupeRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Color preview badge on top of loupe
    ctx.beginPath();
    ctx.arc(screenX, screenY - loupeRadius - 14, 10, 0, Math.PI * 2);
    ctx.fillStyle = centerHex;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
}

self.onmessage = function (e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT_CANVAS':
            canvas = payload.canvas;
            ctx = canvas.getContext('2d', { alpha: false });
            ctx.imageSmoothingEnabled = false;
            ctx.mozImageSmoothingEnabled = false;
            ctx.webkitImageSmoothingEnabled = false;
            ctx.msImageSmoothingEnabled = false;
            
            boardWidth = payload.boardWidth || 64;
            boardHeight = payload.boardHeight || 64;
            dpr = payload.dpr || 1;
            isProgressive = !!payload.isProgressive;
            isOfflineMode = !!payload.isOfflineMode;

            offscreenCanvas = new OffscreenCanvas(boardWidth, boardHeight);
            offscreenCtx = offscreenCanvas.getContext('2d', { alpha: true });
            
            initMemoryEngine(boardWidth, boardHeight);
            
            selectionBitmaskDirty = true;
            requestRender();
            break;

        case 'SET_OFFLINE_MODE':
            isOfflineMode = !!payload.isOfflineMode;
            break;

        case 'SET_MIRROR_MODE':
            isMirrorMode = !!payload.isMirrorMode;
            requestRender();
            break;

        case 'RESIZE_BOARD': {
            resetAnimation = null;
            injectAnimation = null;
            eraserAnimations = [];

            if (!resizeAnimation) {
                resizeAnimation = {
                    startTime: Date.now(),
                    duration: 1500,
                    startW: boardWidth,
                    startH: boardHeight,
                    endW: payload.boardWidth,
                    endH: payload.boardHeight,
                    totalPixels: boardWidth * boardHeight,
                    clearedCount: 0
                };
            }
            selectionBitmaskDirty = true;
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
            selectionBitmaskDirty = true;
            requestRender();
            break;

        case 'UPDATE_PROTECTED_PIXELS':
            if (payload.protectedPixels) {
                protectedPixelsArray = new Uint32Array(payload.protectedPixels);
            } else {
                protectedPixelsArray = new Uint32Array(0);
            }
            if (payload.ownerProtectedPixels) {
                ownerProtectedPixelsArray = new Uint32Array(payload.ownerProtectedPixels);
            } else {
                ownerProtectedPixelsArray = new Uint32Array(0);
            }
            if (payload.myProtectedPixels) {
                myProtectedPixelsArray = new Uint32Array(payload.myProtectedPixels);
            } else {
                myProtectedPixelsArray = new Uint32Array(0);
            }
            showMyProtectionsHighlight = !!payload.showMyProtectionsHighlight;
            protectedPixelsDirty = true;
            requestRender();
            break;

        case 'UPDATE_MY_MINES':
            if (payload.myMines) {
                myMinesArray = new Uint32Array(payload.myMines);
            } else {
                myMinesArray = new Uint32Array(0);
            }
            if (payload.isPlacingMines !== undefined) {
                isPlacingMines = !!payload.isPlacingMines;
            }
            requestRender();
            break;

        case 'UPDATE_RENDER_STATE':
            transform = payload.transform;
            isDarkMode = !!payload.isDarkMode;
            currentColor = payload.currentColor || '#000000';
            isSpectator = payload.isSpectator;
            isResetLocked = payload.isResetLocked;
            isFrozen = !!payload.isFrozen;
            isOwner = !!payload.isOwner;
            if (payload.isMirrorMode !== undefined) isMirrorMode = !!payload.isMirrorMode;
            if (isOwnerProtecting !== !!payload.isOwnerProtecting) {
                isOwnerProtecting = !!payload.isOwnerProtecting;
                protectedPixelsDirty = true;
            }
            if (payload.isPlacingMines !== undefined) {
                isPlacingMines = !!payload.isPlacingMines;
            }
            if (payload.selectedPixels) {
                selectedPixelsArray = new Uint32Array(payload.selectedPixels);
            } else {
                selectedPixelsArray = new Uint32Array(0);
            }
            hoveredPixelKey = payload.hoveredPixelKey !== undefined ? payload.hoveredPixelKey : -1;
            ownerEraserBox = payload.ownerEraserBox || null;
            if (payload.shapePreviewPixels) {
                shapePreviewPixelsArray = new Uint32Array(payload.shapePreviewPixels);
            } else {
                shapePreviewPixelsArray = new Uint32Array(0);
            }
            shapePreviewBox = payload.shapePreviewBox || null;
            if (payload.textPreviewPixels) {
                textPreviewPixelsArray = new Uint32Array(payload.textPreviewPixels);
            } else {
                textPreviewPixelsArray = new Uint32Array(0);
            }
            if (payload.textPreviewShadow) {
                textPreviewShadowArray = new Uint32Array(payload.textPreviewShadow);
            } else {
                textPreviewShadowArray = new Uint32Array(0);
            }
            if (payload.textPreviewOutline) {
                textPreviewOutlineArray = new Uint32Array(payload.textPreviewOutline);
            } else {
                textPreviewOutlineArray = new Uint32Array(0);
            }
            textPreviewBox = payload.textPreviewBox || null;
            if (payload.interactionMode !== undefined) {
                interactionMode = payload.interactionMode;
            }
            if (payload.textPosition !== undefined) {
                textPosition = payload.textPosition;
            }
            if (payload.activePixelText !== undefined) {
                activePixelText = payload.activePixelText;
            }
            topBarCenterX = payload.topBarCenterX || 0;
            topBarBottomY = payload.topBarBottomY || 0;
            if (payload.isEyedropperActive !== undefined) {
                isEyedropperActive = !!payload.isEyedropperActive;
            }
            if (payload.tileGridSize !== undefined) {
                tileGridSize = parseInt(payload.tileGridSize, 10) || 0;
            }
            if (payload.brushSize !== undefined) {
                brushSize = parseInt(payload.brushSize, 10) || 1;
            }
            if (payload.brushShape !== undefined) {
                brushShape = payload.brushShape || 'square';
            }
            selectionBitmaskDirty = true;
            requestRender();
            break;

        case 'PICK_PIXEL_COLOR': {
            const { x, y } = payload;
            let hex = '#FFFFFF';
            if (pixelBuffer && x >= 0 && x < boardWidth && y >= 0 && y < boardHeight) {
                const val = pixelBuffer[y * boardWidth + x];
                hex = (val === 0) ? '#FFFFFF' : abgrToHex(val);
            }
            self.postMessage({
                type: 'PIXEL_COLOR_PICKED',
                payload: { x, y, hex }
            });
            break;
        }

        case 'CLEAR_AREA': {
            const { x1, y1, x2, y2 } = e.data.payload;
            const minX = Math.max(0, x1);
            const maxX = Math.min(boardWidth - 1, x2);
            const minY = Math.max(0, y1);
            const maxY = Math.min(boardHeight - 1, y2);
            const w = maxX - minX + 1;
            const h = maxY - minY + 1;
            
            if (w > 0 && h > 0) {
                if (isOfflineMode && pixelBuffer) {
                    processPixelQueue();
                    const diffs = [];
                    for (let y = minY; y <= maxY; y++) {
                        for (let x = minX; x <= maxX; x++) {
                            const idx = y * boardWidth + x;
                            const prev = pixelBuffer[idx];
                            if (prev !== 0) {
                                diffs.push({ x, y, prev, next: 0 });
                            }
                        }
                    }
                    if (diffs.length > 0) {
                        undoStack.push({ type: 'clear', diffs });
                        redoStack.length = 0;
                        if (undoStack.length > MAX_HISTORY) undoStack.shift();
                        self.postMessage({
                            type: 'HISTORY_CHANGED',
                            payload: { canUndo: undoStack.length > 0, canRedo: false, action: 'clear' }
                        });
                    }
                }

                eraserAnimations.push({
                    startTime: Date.now(),
                    duration: 1000,
                    x1: minX,
                    y1: minY,
                    x2: maxX,
                    y2: maxY,
                    w: w,
                    h: h,
                    totalPixels: w * h,
                    clearedCount: 0
                });
                requestRender();
            }
            break;
        }

        case 'RESET_BUFFER': {
            if (pixelBuffer) {
                pixelBuffer.fill(0);
                if (offscreenCtx && mainImageData) {
                    offscreenCtx.putImageData(mainImageData, 0, 0);
                }
                resetDirtyRect();
                requestRender();
            }
            break;
        }

        case 'PUSH_PIXELS': {
            const pixels = e.data.payload.pixels;
            const strokePhase = e.data.payload.strokePhase;
            const skipUndo = !!e.data.payload.skipUndo;

            if (isOfflineMode && pixelBuffer && pixels && pixels.length > 0) {
                processPixelQueue();
                const diffs = [];

                if (strokePhase === 'start') {
                    activeBrushStrokeDiffs = new Map();
                } else if (strokePhase === 'step' && !activeBrushStrokeDiffs) {
                    activeBrushStrokeDiffs = new Map();
                }

                for (let i = 0; i < pixels.length; i++) {
                    const p = pixels[i];
                    if (p.x >= 0 && p.x < boardWidth && p.y >= 0 && p.y < boardHeight) {
                        const idx = p.y * boardWidth + p.x;
                        const prev = pixelBuffer[idx];
                        const next = colorToAbgr(p.color);
                        if (prev !== next) {
                            if (activeBrushStrokeDiffs) {
                                if (!activeBrushStrokeDiffs.has(idx)) {
                                    activeBrushStrokeDiffs.set(idx, { x: p.x, y: p.y, prev, next });
                                } else {
                                    activeBrushStrokeDiffs.get(idx).next = next;
                                }
                            } else {
                                diffs.push({ x: p.x, y: p.y, prev, next });
                            }
                        }
                    }
                }

                if (strokePhase === 'end') {
                    if (activeBrushStrokeDiffs && activeBrushStrokeDiffs.size > 0) {
                        const strokeDiffs = Array.from(activeBrushStrokeDiffs.values()).filter(d => d.prev !== d.next);
                        if (strokeDiffs.length > 0) {
                            undoStack.push({ type: 'pixels', diffs: strokeDiffs });
                            redoStack.length = 0;
                            if (undoStack.length > MAX_HISTORY) undoStack.shift();
                            self.postMessage({
                                type: 'HISTORY_CHANGED',
                                payload: { canUndo: undoStack.length > 0, canRedo: false, action: 'push' }
                            });
                        }
                    }
                    activeBrushStrokeDiffs = null;
                } else if (!skipUndo && !activeBrushStrokeDiffs) {
                    if (diffs.length > 0) {
                        undoStack.push({ type: 'pixels', diffs });
                        redoStack.length = 0;
                        if (undoStack.length > MAX_HISTORY) undoStack.shift();
                        self.postMessage({
                            type: 'HISTORY_CHANGED',
                            payload: { canUndo: undoStack.length > 0, canRedo: false, action: 'push' }
                        });
                    }
                }
            } else if (strokePhase === 'end') {
                if (activeBrushStrokeDiffs && activeBrushStrokeDiffs.size > 0) {
                    const strokeDiffs = Array.from(activeBrushStrokeDiffs.values()).filter(d => d.prev !== d.next);
                    if (strokeDiffs.length > 0) {
                        undoStack.push({ type: 'pixels', diffs: strokeDiffs });
                        redoStack.length = 0;
                        if (undoStack.length > MAX_HISTORY) undoStack.shift();
                        self.postMessage({
                            type: 'HISTORY_CHANGED',
                            payload: { canUndo: undoStack.length > 0, canRedo: false, action: 'push' }
                        });
                    }
                }
                activeBrushStrokeDiffs = null;
            }

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
                const pLen = pixels.length;
                for (let i = 0; i < pLen; i++) {
                    pixelQueue.push(pixels[i]);
                }
            }
            requestRender();
            break;
        }

        case 'APPLY_SHADING': {
            if (!pixelBuffer || !payload) break;
            const { cx, cy, points, mode, size = 1, isMirrorMode = false, strokePhase = 'step' } = payload;
            const bw = boardWidth;
            const bh = boardHeight;
            const offsets = getBrushOffsetsWorker(size, 'square');

            processPixelQueue();

            if (strokePhase === 'start') {
                activeBrushStrokeDiffs = new Map();
            } else if (!activeBrushStrokeDiffs) {
                activeBrushStrokeDiffs = new Map();
            }

            const applyShadeToCoord = (px, py) => {
                if (px < 0 || px >= bw || py < 0 || py >= bh) return;
                const idx = py * bw + px;

                // Si ya fue sombreado en este mismo trazo, no volver a sombrear
                if (activeBrushStrokeDiffs && activeBrushStrokeDiffs.has(idx)) return;

                const prev = pixelBuffer[idx];
                // Ignorar píxeles transparentes / vacíos
                if (!prev || prev === 0 || (prev >>> 24) === 0) return;

                const hsv = abgrToHsv(prev);
                let h = hsv.h;
                let s = hsv.s;
                let v = hsv.v;

                if (mode === 'highlight') {
                    v = Math.min(100, v + 7);
                    if (v >= 90) {
                        s = Math.max(0, s - 5);
                    }
                } else {
                    v = Math.max(8, v - 7);
                    if (v <= 25) {
                        s = Math.min(100, s + 3);
                    }
                }

                const next = hsvToAbgr(h, s, v);
                if (prev !== next) {
                    if (activeBrushStrokeDiffs) {
                        activeBrushStrokeDiffs.set(idx, { x: px, y: py, prev, next });
                    }
                    pixelBuffer[idx] = next;
                    markDirty(px, py);
                }
            };

            const pointList = Array.isArray(points) ? points : (cx !== undefined && cy !== undefined ? [{ x: cx, y: cy }] : []);
            for (let p = 0; p < pointList.length; p++) {
                const pt = pointList[p];
                for (let i = 0; i < offsets.length; i++) {
                    const off = offsets[i];
                    applyShadeToCoord(pt.x + off.dx, pt.y + off.dy);
                    if (isMirrorMode) {
                        const symX = bw - 1 - (pt.x + off.dx);
                        applyShadeToCoord(symX, pt.y + off.dy);
                    }
                }
            }

            if (strokePhase === 'end') {
                if (activeBrushStrokeDiffs && activeBrushStrokeDiffs.size > 0) {
                    const strokeDiffs = Array.from(activeBrushStrokeDiffs.values()).filter(d => d.prev !== d.next);
                    if (strokeDiffs.length > 0) {
                        undoStack.push({ type: 'shading', diffs: strokeDiffs });
                        redoStack.length = 0;
                        if (undoStack.length > MAX_HISTORY) undoStack.shift();
                        self.postMessage({
                            type: 'HISTORY_CHANGED',
                            payload: { canUndo: undoStack.length > 0, canRedo: false, action: 'shading' }
                        });
                    }
                }
                activeBrushStrokeDiffs = null;
            }

            flushDirtyRect();
            requestRender();
            break;
        }

        case 'TRIGGER_INJECT_ANIMATION':
            if (!injectAnimation) {
                let templatePixels = null;
                const tc = payload.templateCoords;
                if (payload.imageBitmap) {
                    try {
                        const tempCanvas = new OffscreenCanvas(tc.w, tc.h);
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCtx.imageSmoothingEnabled = false;
                        tempCtx.drawImage(payload.imageBitmap, 0, 0, tc.w, tc.h);
                        const imgData = tempCtx.getImageData(0, 0, tc.w, tc.h);
                        templatePixels = new Uint32Array(imgData.data.buffer);
                    } catch (e) {
                    }
                }

                if (isOfflineMode && pixelBuffer && templatePixels) {
                    processPixelQueue();
                    const diffs = [];
                    for (let y = 0; y < tc.h; y++) {
                        for (let x = 0; x < tc.w; x++) {
                            const absX = tc.x + x;
                            const absY = tc.y + y;
                            if (absX >= 0 && absX < boardWidth && absY >= 0 && absY < boardHeight) {
                                const bufferIdx = absY * boardWidth + absX;
                                const templateIdx = y * tc.w + x;
                                const nextColor = templatePixels[templateIdx];
                                const alpha = (nextColor >>> 24) & 0xFF;
                                if (alpha >= 128) {
                                    const solidColor = (nextColor & 0x00FFFFFF) | 0xFF000000;
                                    const prevColor = pixelBuffer[bufferIdx];
                                    if (prevColor !== solidColor) {
                                        diffs.push({ x: absX, y: absY, prev: prevColor, next: solidColor });
                                    }
                                }
                            }
                        }
                    }
                    if (diffs.length > 0) {
                        undoStack.push({ type: 'inject', diffs });
                        redoStack.length = 0;
                        if (undoStack.length > MAX_HISTORY) undoStack.shift();
                        self.postMessage({
                            type: 'HISTORY_CHANGED',
                            payload: { canUndo: undoStack.length > 0, canRedo: false, action: 'inject' }
                        });
                    }
                }

                injectAnimation = {
                    startTime: Date.now(),
                    duration: 1200,
                    x: tc.x,
                    y: tc.y,
                    w: tc.w,
                    h: tc.h,
                    totalPixels: tc.w * tc.h,
                    clearedCount: 0,
                    templatePixels: templatePixels
                };
            }
            requestRender();
            break;

        case 'HYDRATE_STATE':
            if (payload.boardWidth && payload.boardHeight) {
                boardWidth = payload.boardWidth;
                boardHeight = payload.boardHeight;
                if (offscreenCanvas) {
                    offscreenCanvas.width = boardWidth;
                    offscreenCanvas.height = boardHeight;
                }
            }
            selectionBitmaskDirty = true;
            if (injectAnimation) {
                pendingHydrateStateBase64 = payload.base64String;
            } else {
                hydrateState(payload.base64String);
            }
            break;

        case 'HYDRATE_CHUNK':
            if (injectAnimation) {
                pendingChunks.push({
                    chunkX: payload.chunkX,
                    chunkY: payload.chunkY,
                    chunkSize: payload.chunkSize || 512,
                    base64String: payload.base64String,
                    chunkData: payload.chunkData
                });
            } else {
                hydrateChunkWorker(payload.chunkX, payload.chunkY, payload.chunkSize || 512, payload.chunkData || payload.base64String);
            }
            break;

        case 'DRAW_IMAGE_BUFFER':
            if (payload.imageBitmap) {
                if (resetAnimation || resizeAnimation) {
                    pendingImageBitmap = payload.imageBitmap;
                } else {
                    let tempCanvas = new OffscreenCanvas(boardWidth, boardHeight);
                    let tempCtx = tempCanvas.getContext('2d');
                    tempCtx.imageSmoothingEnabled = false;
                    tempCtx.drawImage(payload.imageBitmap, 0, 0, boardWidth, boardHeight);
                    mainImageData = tempCtx.getImageData(0, 0, boardWidth, boardHeight);
                    pixelBuffer = new Uint32Array(mainImageData.data.buffer);
                    
                    if (offscreenCtx) {
                        offscreenCtx.clearRect(0, 0, boardWidth, boardHeight);
                        offscreenCtx.imageSmoothingEnabled = false;
                        offscreenCtx.drawImage(payload.imageBitmap, 0, 0, boardWidth, boardHeight);
                    }
                    requestRender();
                }
            } else if (!payload.imageBitmap) {
                if (!resetAnimation) {
                    resetAnimation = {
                        startTime: Date.now(),
                        duration: 1500,
                        w: boardWidth,
                        h: boardHeight,
                        totalPixels: boardWidth * boardHeight,
                        clearedCount: 0
                    };
                }
                requestRender();
            }
            break;

        case 'EXPORT_OFFLINE_STATE': {
            processPixelQueue();
            if (mainImageData && mainImageData.data) {
                const bytes = mainImageData.data;
                (async () => {
                    let exportBytes = bytes;
                    if ('CompressionStream' in self) {
                        try {
                            const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
                            const compressedBuffer = await new Response(stream).arrayBuffer();
                            exportBytes = new Uint8Array(compressedBuffer);
                        } catch (compErr) {
                            exportBytes = bytes;
                        }
                    }
                    
                    const outLen = exportBytes.byteLength;
                    let binaryStr = '';
                    const chunkSize = 0x8000;
                    for (let i = 0; i < outLen; i += chunkSize) {
                        binaryStr += String.fromCharCode.apply(null, exportBytes.subarray(i, Math.min(i + chunkSize, outLen)));
                    }
                    const base64 = btoa(binaryStr);
                    self.postMessage({
                        type: 'OFFLINE_STATE_EXPORTED',
                        payload: { base64 }
                    });
                })();
            } else {
                self.postMessage({
                    type: 'OFFLINE_STATE_EXPORTED',
                    payload: { base64: null }
                });
            }
            break;
        }

        case 'FLOOD_FILL': {
            if (!pixelBuffer || !payload) break;
            const startX = Math.floor(payload.startX);
            const startY = Math.floor(payload.startY);
            const fillColor = colorToAbgr(payload.color);
            const isMirror = payload.isMirrorMode !== undefined ? !!payload.isMirrorMode : isMirrorMode;

            if (startX < 0 || startX >= boardWidth || startY < 0 || startY >= boardHeight) break;

            processPixelQueue();

            const bw = boardWidth;
            const bh = boardHeight;
            const totalPixels = bw * bh;
            const diffs = isOfflineMode ? [] : null;

            const runFloodFillAt = (sX, sY) => {
                const sIdx = sY * bw + sX;
                const targetColor = pixelBuffer[sIdx];
                if (targetColor === fillColor) return;

                const queue = new Int32Array(totalPixels);
                let head = 0;
                let tail = 0;

                pixelBuffer[sIdx] = fillColor;
                markDirty(sX, sY);
                if (diffs) diffs.push({ x: sX, y: sY, prev: targetColor, next: fillColor });
                queue[tail++] = sIdx;

                while (head < tail) {
                    const idx = queue[head++];
                    const cx = idx % bw;
                    const cy = (idx / bw) | 0;

                    // Left
                    if (cx > 0) {
                        const nIdx = idx - 1;
                        if (pixelBuffer[nIdx] === targetColor) {
                            pixelBuffer[nIdx] = fillColor;
                            markDirty(cx - 1, cy);
                            if (diffs) diffs.push({ x: cx - 1, y: cy, prev: targetColor, next: fillColor });
                            queue[tail++] = nIdx;
                        }
                    }
                    // Right
                    if (cx < bw - 1) {
                        const nIdx = idx + 1;
                        if (pixelBuffer[nIdx] === targetColor) {
                            pixelBuffer[nIdx] = fillColor;
                            markDirty(cx + 1, cy);
                            if (diffs) diffs.push({ x: cx + 1, y: cy, prev: targetColor, next: fillColor });
                            queue[tail++] = nIdx;
                        }
                    }
                    // Up
                    if (cy > 0) {
                        const nIdx = idx - bw;
                        if (pixelBuffer[nIdx] === targetColor) {
                            pixelBuffer[nIdx] = fillColor;
                            markDirty(cx, cy - 1);
                            if (diffs) diffs.push({ x: cx, y: cy - 1, prev: targetColor, next: fillColor });
                            queue[tail++] = nIdx;
                        }
                    }
                    // Down
                    if (cy < bh - 1) {
                        const nIdx = idx + bw;
                        if (pixelBuffer[nIdx] === targetColor) {
                            pixelBuffer[nIdx] = fillColor;
                            markDirty(cx, cy + 1);
                            if (diffs) diffs.push({ x: cx, y: cy + 1, prev: targetColor, next: fillColor });
                            queue[tail++] = nIdx;
                        }
                    }
                }
            };

            runFloodFillAt(startX, startY);

            if (isMirror) {
                const symStartX = bw - 1 - startX;
                if (symStartX >= 0 && symStartX < bw && symStartX !== startX) {
                    runFloodFillAt(symStartX, startY);
                }
            }

            if (isOfflineMode && diffs && diffs.length > 0) {
                undoStack.push({ type: 'flood_fill', diffs });
                redoStack.length = 0;
                if (undoStack.length > MAX_HISTORY) undoStack.shift();
                self.postMessage({
                    type: 'HISTORY_CHANGED',
                    payload: { canUndo: undoStack.length > 0, canRedo: false, action: 'flood_fill' }
                });
            }

            flushDirtyRect();
            requestRender();
            break;
        }

        case 'SPRAY_BURST': {
            if (!pixelBuffer || !payload) break;
            const centerX = Math.floor(payload.centerX);
            const centerY = Math.floor(payload.centerY);
            const radius = Math.max(1, payload.radius || 4);
            const density = Math.max(1, payload.density || 5);
            const fillColor = colorToAbgr(payload.color);

            if (centerX < -radius || centerX >= boardWidth + radius || centerY < -radius || centerY >= boardHeight + radius) break;

            processPixelQueue();

            if (isOfflineMode && activeSprayStrokeDiffs === null) {
                activeSprayStrokeDiffs = new Map();
            }

            const radSq = radius * radius;

            for (let i = 0; i < density; i++) {
                const rx = (Math.random() - 0.5) * 2 * radius;
                const ry = (Math.random() - 0.5) * 2 * radius;
                if (rx * rx + ry * ry > radSq) continue;

                const px = Math.round(centerX + rx);
                const py = Math.round(centerY + ry);

                if (px >= 0 && px < boardWidth && py >= 0 && py < boardHeight) {
                    const idx = py * boardWidth + px;
                    const prevColor = pixelBuffer[idx];
                    if (prevColor !== fillColor) {
                        if (isOfflineMode && activeSprayStrokeDiffs) {
                            if (!activeSprayStrokeDiffs.has(idx)) {
                                activeSprayStrokeDiffs.set(idx, { x: px, y: py, prev: prevColor, next: fillColor });
                            } else {
                                activeSprayStrokeDiffs.get(idx).next = fillColor;
                            }
                        }
                        pixelBuffer[idx] = fillColor;
                        markDirty(px, py);
                    }

                    if (isMirrorMode) {
                        const symX = (boardWidth - 1) - px;
                        const symY = py;
                        if (symX >= 0 && symX < boardWidth && symY >= 0 && symY < boardHeight && symX !== px) {
                            const symIdx = symY * boardWidth + symX;
                            const symPrev = pixelBuffer[symIdx];
                            if (symPrev !== fillColor) {
                                if (isOfflineMode && activeSprayStrokeDiffs) {
                                    if (!activeSprayStrokeDiffs.has(symIdx)) {
                                        activeSprayStrokeDiffs.set(symIdx, { x: symX, y: symY, prev: symPrev, next: fillColor });
                                    } else {
                                        activeSprayStrokeDiffs.get(symIdx).next = fillColor;
                                    }
                                }
                                pixelBuffer[symIdx] = fillColor;
                                markDirty(symX, symY);
                            }
                        }
                    }
                }
            }

            flushDirtyRect();
            requestRender();
            break;
        }

        case 'SPRAY_END': {
            if (isOfflineMode && activeSprayStrokeDiffs && activeSprayStrokeDiffs.size > 0) {
                const diffs = Array.from(activeSprayStrokeDiffs.values());
                undoStack.push({ type: 'spray', diffs });
                redoStack.length = 0;
                if (undoStack.length > MAX_HISTORY) undoStack.shift();
                self.postMessage({
                    type: 'HISTORY_CHANGED',
                    payload: { canUndo: undoStack.length > 0, canRedo: false, action: 'spray' }
                });
            }
            activeSprayStrokeDiffs = null;
            break;
        }

        case 'SET_MOVE_AREA': {
            moveAreaBox = payload.moveAreaBox || null;
            requestRender();
            break;
        }

        case 'COMMIT_MOVE_AREA': {
            if (!pixelBuffer || !payload) break;
            const { x1, y1, x2, y2, dx = 0, dy = 0 } = payload;
            const minX = Math.max(0, Math.min(x1, x2));
            const maxX = Math.min(boardWidth - 1, Math.max(x1, x2));
            const minY = Math.max(0, Math.min(y1, y2));
            const maxY = Math.min(boardHeight - 1, Math.max(y1, y2));
            const w = maxX - minX + 1;
            const h = maxY - minY + 1;

            if (w <= 0 || h <= 0) break;
            processPixelQueue();

            if (dx === 0 && dy === 0) {
                moveAreaBox = null;
                requestRender();
                break;
            }

            // 1. Copy source slice
            const srcPixels = new Uint32Array(w * h);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const srcIdx = (minY + y) * boardWidth + (minX + x);
                    srcPixels[y * w + x] = pixelBuffer[srcIdx];
                }
            }

            // 2. Track diffs and apply changes
            const diffMap = new Map();

            // First: clear source area
            for (let y = 0; y < h; y++) {
                const py = minY + y;
                for (let x = 0; x < w; x++) {
                    const px = minX + x;
                    const idx = py * boardWidth + px;
                    const prev = pixelBuffer[idx];
                    diffMap.set(idx, { x: px, y: py, prev, next: 0 });
                    pixelBuffer[idx] = 0;
                    markDirty(px, py);
                }
            }

            // Second: paste onto destination (overwriting destination with source slice)
            for (let y = 0; y < h; y++) {
                const py = minY + y + dy;
                if (py < 0 || py >= boardHeight) continue;
                for (let x = 0; x < w; x++) {
                    const px = minX + x + dx;
                    if (px < 0 || px >= boardWidth) continue;

                    const idx = py * boardWidth + px;
                    const next = srcPixels[y * w + x];
                    
                    if (diffMap.has(idx)) {
                        diffMap.get(idx).next = next;
                    } else {
                        const prev = pixelBuffer[idx];
                        diffMap.set(idx, { x: px, y: py, prev, next });
                    }
                    pixelBuffer[idx] = next;
                    markDirty(px, py);
                }
            }

            // Filter out no-op diffs where prev === next
            const diffs = [];
            diffMap.forEach(d => {
                if (d.prev !== d.next) diffs.push(d);
            });

            if (isOfflineMode && diffs.length > 0) {
                undoStack.push({ type: 'move_area', diffs });
                redoStack.length = 0;
                if (undoStack.length > MAX_HISTORY) undoStack.shift();
                self.postMessage({
                    type: 'HISTORY_CHANGED',
                    payload: { canUndo: undoStack.length > 0, canRedo: false, action: 'move_area' }
                });
            }

            moveAreaBox = null;
            flushDirtyRect();
            requestRender();
            break;
        }

        case 'UNDO': {
            if (undoStack.length > 0 && pixelBuffer) {
                processPixelQueue();
                eraserAnimations = [];
                injectAnimation = null;
                const action = undoStack.pop();
                const diffs = action.diffs;
                for (let i = 0; i < diffs.length; i++) {
                    const d = diffs[i];
                    const idx = d.y * boardWidth + d.x;
                    if (idx >= 0 && idx < pixelBuffer.length) {
                        pixelBuffer[idx] = d.prev;
                        markDirty(d.x, d.y);
                    }
                }
                redoStack.push(action);
                flushDirtyRect();
                requestRender();
                self.postMessage({
                    type: 'HISTORY_CHANGED',
                    payload: {
                        canUndo: undoStack.length > 0,
                        canRedo: redoStack.length > 0,
                        action: 'undo'
                    }
                });
            }
            break;
        }

        case 'REDO': {
            if (redoStack.length > 0 && pixelBuffer) {
                processPixelQueue();
                eraserAnimations = [];
                injectAnimation = null;
                const action = redoStack.pop();
                const diffs = action.diffs;
                for (let i = 0; i < diffs.length; i++) {
                    const d = diffs[i];
                    const idx = d.y * boardWidth + d.x;
                    if (idx >= 0 && idx < pixelBuffer.length) {
                        pixelBuffer[idx] = d.next;
                        markDirty(d.x, d.y);
                    }
                }
                undoStack.push(action);
                flushDirtyRect();
                requestRender();
                self.postMessage({
                    type: 'HISTORY_CHANGED',
                    payload: {
                        canUndo: undoStack.length > 0,
                        canRedo: redoStack.length > 0,
                        action: 'redo'
                    }
                });
            }
            break;
        }

        case 'CLEAR_HISTORY': {
            undoStack.length = 0;
            redoStack.length = 0;
            break;
        }

        case 'UPDATE_TEMPLATES':
        case 'UPDATE_TEMPLATE':
            if (payload.templates) {
                const prevMap = new Map();
                if (templatesList) {
                    templatesList.forEach(t => { if (t.imageBitmap) prevMap.set(t.id, t); });
                }
                activeTemplateId = payload.activeTemplateId || null;
                templatesList = payload.templates.map(tpl => {
                    const prev = prevMap.get(tpl.id);
                    if (!tpl.imageBitmap && prev && prev.url === tpl.url) {
                        tpl.imageBitmap = prev.imageBitmap;
                    }
                    return tpl;
                });
            } else if (payload.template) {
                const prevTpl = activeTemplate;
                activeTemplate = payload.template;
                if (!activeTemplate.imageBitmap && prevTpl && prevTpl.url === activeTemplate.url) {
                    activeTemplate.imageBitmap = prevTpl.imageBitmap;
                }
                activeTemplateId = activeTemplate.id || null;
                templatesList = [activeTemplate];
            } else {
                activeTemplate = null;
                activeTemplateId = null;
                templatesList = [];
            }
            requestRender();
            break;

        case 'REQUEST_RENDER':
            requestRender();
            break;
    }
};
