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

let nuclearWarnings = [];
let explosions = [];
let topBarCenterX = 0;
let topBarBottomY = 0;
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

const EXPLOSION_STYLES = {
    'pixel_missile_1': 'missile',
    'pixel_missile_2': 'missile',
    'pixel_missile_3': 'missile',
    'pixel_bomb_1': 'medium',
    'pixel_bomb_2': 'medium',
    'pixel_bomb_3': 'medium',
    'cluster_bomb_1': 'medium',
    'atomic_bomb_1': 'nuclear',
    'nuclear_bomb_1': 'nuclear',
    'nuclear_bomb_2': 'nuclear',
    'nuclear_bomb_3': 'nuclear',
    'meteor_shower_1': 'medium',
    'orbital_cannon_1': 'nuclear',
    'black_hole_1': 'blackhole',
    'supernova_blast': 'nuclear',
    'ion_strike': 'ion'
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

function clearBombPixels(cX, cY, r, perkId) {
    if (!pixelBuffer) return;
    const radius = Math.max(1, parseInt(r || 1, 10));

    if (perkId === 'ion_strike') {
        const p1 = { x: cX, y: cY - radius };
        const p2 = { x: cX - radius * 0.866, y: cY + radius * 0.5 };
        const p3 = { x: cX + radius * 0.866, y: cY + radius * 0.5 };

        const xMin = Math.max(0, Math.floor(cX - radius - 5));
        const xMax = Math.min(boardWidth - 1, Math.floor(cX + radius + 5));
        const yMin = Math.max(0, Math.floor(cY - radius - 5));
        const yMax = Math.min(boardHeight - 1, Math.floor(cY + radius + 5));

        const distToSegment = (px, py, ax, ay, bx, by) => {
            const dx = bx - ax;
            const dy = by - ay;
            const lenSq = dx * dx + dy * dy;
            if (lenSq === 0) {
                return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
            }
            let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            const projX = ax + t * dx;
            const projY = ay + t * dy;
            return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
        };

        const pointInTriangle = (px, py, a, b, c) => {
            const d1 = (px - b.x) * (a.y - b.y) - (a.x - b.x) * (py - b.y);
            const d2 = (px - c.x) * (b.y - c.y) - (b.x - c.x) * (py - c.y);
            const d3 = (px - a.x) * (c.y - a.y) - (c.x - a.x) * (py - a.y);
            const hasNeg = (d1 < -0.001) || (d2 < -0.001) || (d3 < -0.001);
            const hasPos = (d1 > 0.001) || (d2 > 0.001) || (d3 > 0.001);
            return !(hasNeg && hasPos);
        };

        for (let y = yMin; y <= yMax; y++) {
            for (let x = xMin; x <= xMax; x++) {
                const isInside = pointInTriangle(x, y, p1, p2, p3);
                const isV1 = Math.sqrt((x - p1.x) ** 2 + (y - p1.y) ** 2) <= 4.0;
                const isV2 = Math.sqrt((x - p2.x) ** 2 + (y - p2.y) ** 2) <= 4.0;
                const isV3 = Math.sqrt((x - p3.x) ** 2 + (y - p3.y) ** 2) <= 4.0;

                const isL1 = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) <= 1.5;
                const isL2 = distToSegment(x, y, p2.x, p2.y, p3.x, p3.y) <= 1.5;
                const isL3 = distToSegment(x, y, p3.x, p3.y, p1.x, p1.y) <= 1.5;

                if (isInside || isV1 || isV2 || isV3 || isL1 || isL2 || isL3) {
                    const idx = y * boardWidth + x;
                    pixelBuffer[idx] = 0;
                    markDirty(x, y);
                }
            }
        }
        flushDirtyRect();
        return;
    }

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

    if (textPreviewBox || (textPreviewPixelsArray && textPreviewPixelsArray.length > 0)) {
        ctx.save();

        if (textPreviewShadowArray && textPreviewShadowArray.length > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
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

        if (textPreviewBox) {
            const { minX, minY, maxX, maxY, w, h, originX, originY } = textPreviewBox;

            ctx.strokeStyle = '#8b5cf6';
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
            ctx.fillStyle = '#8b5cf6';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1 / transform.scale;
            const handleR = Math.max(0.6, 2.5 / transform.scale);

            ctx.beginPath();
            ctx.arc(originX + 0.5, originY + 0.5, handleR, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            if (isMirrorMode) {
                const symOriginX = boardWidth - 1 - originX;
                ctx.beginPath();
                ctx.arc(symOriginX + 0.5, originY + 0.5, handleR, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
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

    // Nuclear Warnings (Mira telescópica + Círculo cerrado progresivo de color)
    if (nuclearWarnings.length > 0) {
        const now = Date.now();
        nuclearWarnings = nuclearWarnings.filter(w => !isNaN(w.endTime) && now < w.endTime + 5000);
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

            // Configuración de colores por perk
            let primaryColor = '#ef4444';
            let secondaryColor = 'rgba(239, 68, 68, 0.35)';
            let fillColor = 'rgba(239, 68, 68, 0.08)';

            if (warning.perkId === 'orbital_cannon_1') {
                primaryColor = '#00f0ff';
                secondaryColor = 'rgba(0, 240, 255, 0.4)';
                fillColor = 'rgba(0, 240, 255, 0.08)';
            } else if (warning.perkId === 'atomic_bomb_1') {
                primaryColor = '#fb923c';
                secondaryColor = 'rgba(251, 146, 60, 0.5)';
                fillColor = 'rgba(251, 146, 60, 0.08)';
            } else if (warning.perkId === 'cluster_bomb_1') {
                primaryColor = '#a3e635';
                secondaryColor = 'rgba(163, 230, 53, 0.5)';
                fillColor = 'rgba(163, 230, 53, 0.08)';
            } else if (warning.perkId === 'meteor_shower_1') {
                primaryColor = '#e879f9';
                secondaryColor = 'rgba(232, 121, 249, 0.5)';
                fillColor = 'rgba(232, 121, 249, 0.08)';
            } else if (warning.perkId === 'black_hole_1') {
                primaryColor = '#a78bfa';
                secondaryColor = 'rgba(167, 139, 250, 0.5)';
                fillColor = 'rgba(167, 139, 250, 0.08)';
            } else if (warning.perkId === 'supernova_blast') {
                primaryColor = '#f59e0b';
                secondaryColor = 'rgba(245, 158, 11, 0.4)';
                fillColor = 'rgba(245, 158, 11, 0.08)';
            } else if (warning.perkId === 'ion_strike') {
                primaryColor = '#06b6d4';
                secondaryColor = 'rgba(6, 182, 212, 0.4)';
                fillColor = 'rgba(6, 182, 212, 0.08)';
            }

            const elapsed = now - warning.startTime;
            const duration = warning.endTime - warning.startTime;
            const progress = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 1;

            if (warning.perkId === 'black_hole_1' || warning.perkId === 'supernova_blast') {
                let needsFlush = false;
                if (warning.candidates) {
                    while (warning.candidateIndex < warning.candidates.length) {
                        const cand = warning.candidates[warning.candidateIndex];
                        if (progress < cand.threshold) {
                            break;
                        }
                        const px = cand.x;
                        const py = cand.y;
                        const idx = py * boardWidth + px;
                        const colorVal = pixelBuffer ? pixelBuffer[idx] : 0;
                        if (colorVal !== 0) {
                            if (pixelBuffer) {
                                pixelBuffer[idx] = 0;
                                markDirty(px, py);
                                needsFlush = true;
                            }
                        }
                        warning.candidateIndex++;
                    }
                }
                if (needsFlush && typeof flushDirtyRect === 'function') {
                    flushDirtyRect();
                }
            }

            // --- 1. CÁPSULAS / SATÉLITES GIRATORIOS EN ÓRBITA EXTERIOR (Estilo de foto de referencia) ---
            const numPods = warning.perkId === 'ion_strike' ? 3 : (warning.perkId === 'atomic_bomb_1' ? 6 : 8);
            const orbitR = outerR * 1.5;
            const spinAngle = (now / 1800) % (2 * Math.PI);

            // Anillo de órbita exterior
            ctx.beginPath();
            ctx.arc(wx, wy, orbitR, 0, 2 * Math.PI);
            ctx.strokeStyle = secondaryColor;
            ctx.lineWidth = 0.8 / scale;
            ctx.stroke();

            // Cápsulas orbitales giratorias y líneas radiales
            for (let i = 0; i < numPods; i++) {
                const podAngle = spinAngle + (i * 2 * Math.PI / numPods);
                const px = wx + orbitR * Math.cos(podAngle);
                const py = wy + orbitR * Math.sin(podAngle);

                // Línea radial desde el centro a la cápsula
                ctx.beginPath();
                ctx.moveTo(wx, wy);
                ctx.lineTo(px, py);
                ctx.strokeStyle = secondaryColor;
                ctx.lineWidth = 0.6 / scale;
                ctx.stroke();

                // Pulso de energía viajando hacia el centro
                const pTravel = ((now / 800 + i * 0.25) % 1.0);
                const pulseX = px + (wx - px) * pTravel;
                const pulseY = py + (wy - py) * pTravel;
                ctx.beginPath();
                ctx.arc(pulseX, pulseY, 1.2 / scale, 0, 2 * Math.PI);
                ctx.fillStyle = primaryColor;
                ctx.fill();

                // Cápsula / Satélite orbital (doble círculo)
                const podRadius = 5 / scale;
                ctx.beginPath();
                ctx.arc(px, py, podRadius, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                ctx.fill();
                ctx.strokeStyle = primaryColor;
                ctx.lineWidth = 1.2 / scale;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(px, py, podRadius * 0.55, 0, 2 * Math.PI);
                ctx.strokeStyle = secondaryColor;
                ctx.lineWidth = 0.8 / scale;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(px, py, podRadius * 0.25, 0, 2 * Math.PI);
                ctx.fillStyle = primaryColor;
                ctx.fill();
            }

            // --- 2. EFECTOS ESPECIALES ESPECÍFICOS POR PERK ---
            if (warning.perkId === 'ion_strike') {
                // --- ATAQUE DE SATÉLITE TRIANGULADO: RETÍCULA EN TRIÁNGULO DE PLASMA ---
                const p1 = { x: wx, y: wy - outerR };
                const p2 = { x: wx - outerR * 0.866, y: wy + outerR * 0.5 };
                const p3 = { x: wx + outerR * 0.866, y: wy + outerR * 0.5 };

                // Triángulo exterior
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.closePath();
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.strokeStyle = primaryColor;
                ctx.lineWidth = lineW * 1.5;
                ctx.stroke();

                // Triángulo interior cerrándose progresivamente
                const innerR = outerR * (1 - progress);
                if (innerR > 0.1) {
                    const ip1 = { x: wx, y: wy - innerR };
                    const ip2 = { x: wx - innerR * 0.866, y: wy + innerR * 0.5 };
                    const ip3 = { x: wx + innerR * 0.866, y: wy + innerR * 0.5 };

                    ctx.beginPath();
                    ctx.moveTo(ip1.x, ip1.y);
                    ctx.lineTo(ip2.x, ip2.y);
                    ctx.lineTo(ip3.x, ip3.y);
                    ctx.closePath();
                    ctx.fillStyle = secondaryColor;
                    ctx.fill();
                    ctx.strokeStyle = primaryColor;
                    ctx.lineWidth = lineW;
                    ctx.stroke();
                }

                // Chispas de plasma de alto voltaje a lo largo de los bordes del triángulo
                const sparkCount = 9;
                for (let s = 0; s < sparkCount; s++) {
                    const edge = s % 3;
                    const t = ((now / 200 + s * 0.33) % 1.0);
                    let startP = p1, endP = p2;
                    if (edge === 1) { startP = p2; endP = p3; }
                    else if (edge === 2) { startP = p3; endP = p1; }

                    const sparkX = startP.x + (endP.x - startP.x) * t;
                    const sparkY = startP.y + (endP.y - startP.y) * t;

                    ctx.beginPath();
                    ctx.arc(sparkX, sparkY, 1.5 / scale, 0, 2 * Math.PI);
                    ctx.fillStyle = s % 2 === 0 ? '#ffffff' : '#06b6d4';
                    ctx.fill();
                }
            } else if (warning.perkId === 'black_hole_1') {
                // Dibujar disco de acreción del agujero negro
                const diskRadius = outerR * 0.45 * (1.0 + 0.05 * Math.sin(now / 250));
                if (diskRadius > 0.1) {
                    const grad = ctx.createRadialGradient(wx, wy, 0, wx, wy, diskRadius);
                    grad.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');
                    grad.addColorStop(0.25, 'rgba(10, 10, 12, 1.0)');
                    grad.addColorStop(0.5, 'rgba(40, 25, 60, 0.9)');
                    grad.addColorStop(0.75, 'rgba(100, 100, 110, 0.7)');
                    grad.addColorStop(0.9, 'rgba(230, 230, 240, 0.35)');
                    grad.addColorStop(1.0, 'rgba(230, 230, 240, 0.0)');

                    ctx.beginPath();
                    ctx.arc(wx, wy, diskRadius, 0, 2 * Math.PI);
                    ctx.fillStyle = grad;
                    ctx.fill();
                }

                // Dibujar brazos espirales
                const arms = 3;
                for (let i = 0; i < arms; i++) {
                    const armAngleOffset = (i * 2 * Math.PI) / arms;
                    ctx.beginPath();
                    for (let step = 0; step <= 50; step++) {
                        const t = step / 50;
                        const r = t * outerR;
                        const angle = armAngleOffset + (now / 400) - (3.5 * Math.PI * (1 - t));
                        const px = wx + r * Math.cos(angle);
                        const py = wy + r * Math.sin(angle);
                        if (step === 0) {
                            ctx.moveTo(px, py);
                        } else {
                            ctx.lineTo(px, py);
                        }
                    }
                    ctx.strokeStyle = `rgba(167, 139, 250, ${0.25 + 0.15 * Math.sin(now / 150 + i)})`;
                    ctx.lineWidth = 1.5 / scale;
                    ctx.stroke();
                }

                // Dibujar polvo cósmico del agujero negro
                const dustCount = 20;
                for (let k = 0; k < dustCount; k++) {
                    const baseAngle = (k * 2 * Math.PI) / dustCount;
                    const offset = (k * 500) % 5000;
                    const pProgress = ((now + offset) % 5000) / 5000;
                    const pr = outerR * (1 - pProgress);
                    const pAngle = baseAngle + (now / 350) + (4 * Math.PI * pProgress);
                    const px = wx + pr * Math.cos(pAngle);
                    const py = wy + pr * Math.sin(pAngle);
                    const pSize = (1.5 * (1 - pProgress)) / scale;
                    if (pSize > 0.05) {
                        ctx.fillStyle = k % 3 === 0 ? 'rgba(240, 240, 245, 0.65)' : (k % 3 === 1 ? 'rgba(167, 139, 250, 0.5)' : 'rgba(76, 29, 149, 0.45)');
                        ctx.fillRect(px - pSize / 2, py - pSize / 2, pSize, pSize);
                    }
                }
            } else if (warning.perkId === 'supernova_blast') {
                const currentR = outerR * progress;
                ctx.beginPath();
                ctx.arc(wx, wy, currentR, 0, 2 * Math.PI);
                const grad = ctx.createRadialGradient(wx, wy, Math.max(0, currentR - 5 / scale), wx, wy, currentR);
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                grad.addColorStop(0.3, 'rgba(254, 240, 138, 0.8)');
                grad.addColorStop(0.7, 'rgba(249, 115, 22, 0.6)');
                grad.addColorStop(1.0, 'rgba(239, 68, 68, 0.0)');
                ctx.fillStyle = grad;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(wx, wy, Math.min(outerR * 0.15, 3), 0, 2 * Math.PI);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }

            // --- 3. RENDERIZADO DEL CÍRCULO BASE Y MIRA (para Perks no triangulares) ---
            if (warning.perkId !== 'ion_strike' && warning.perkId !== 'supernova_blast') {
                // Mira telescópica cruzada en el centro
                ctx.beginPath();
                ctx.moveTo(wx - crossLength, wy);
                ctx.lineTo(wx + crossLength, wy);
                ctx.moveTo(wx, wy - crossLength);
                ctx.lineTo(wx, wy + crossLength);
                ctx.lineWidth = lineW;
                ctx.strokeStyle = secondaryColor;
                ctx.stroke();

                // Círculo exterior
                ctx.beginPath();
                ctx.arc(wx, wy, outerR, 0, 2 * Math.PI);
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.lineWidth = lineW;
                ctx.strokeStyle = primaryColor;
                ctx.stroke();

                // Anillo cerrándose progresivamente
                const innerR = outerR * (1 - progress);
                if (innerR > 0.1) {
                    ctx.beginPath();
                    ctx.arc(wx, wy, innerR, 0, 2 * Math.PI);
                    ctx.fillStyle = secondaryColor;
                    ctx.fill();
                    ctx.lineWidth = lineW;
                    ctx.strokeStyle = primaryColor;
                    ctx.stroke();
                }
            }

            // --- 4. DETALLES MILITARES Y TÁCTICOS ADICIONALES ---
            if (warning.perkId === 'pixel_bomb_1' || warning.perkId === 'pixel_missile_1') {
                // Esquinas de fijación de objetivo militar [ ]
                const bLen = Math.min(outerR * 0.4, 8 / scale);
                const gap = outerR + 2 / scale;
                ctx.strokeStyle = primaryColor;
                ctx.lineWidth = 1.8 / scale;

                // Esquina Superior Izquierda
                ctx.beginPath();
                ctx.moveTo(wx - gap, wy - gap + bLen);
                ctx.lineTo(wx - gap, wy - gap);
                ctx.lineTo(wx - gap + bLen, wy - gap);
                ctx.stroke();

                // Esquina Superior Derecha
                ctx.beginPath();
                ctx.moveTo(wx + gap - bLen, wy - gap);
                ctx.lineTo(wx + gap, wy - gap);
                ctx.lineTo(wx + gap, wy - gap + bLen);
                ctx.stroke();

                // Esquina Inferior Izquierda
                ctx.beginPath();
                ctx.moveTo(wx - gap, wy + gap - bLen);
                ctx.lineTo(wx - gap, wy + gap);
                ctx.lineTo(wx - gap + bLen, wy + gap);
                ctx.stroke();

                // Esquina Inferior Derecha
                ctx.beginPath();
                ctx.moveTo(wx + gap - bLen, wy + gap);
                ctx.lineTo(wx + gap, wy + gap);
                ctx.lineTo(wx + gap, wy + gap - bLen);
                ctx.stroke();
            } else if (warning.perkId === 'orbital_cannon_1') {
                // Anillo de retícula exterior discontinua giratorio
                ctx.beginPath();
                ctx.arc(wx, wy, outerR + (2 / scale), 0, 2 * Math.PI);
                ctx.setLineDash([4 / scale, 4 / scale]);
                ctx.strokeStyle = primaryColor;
                ctx.lineWidth = 1 / scale;
                ctx.lineDashOffset = -now / 150;
                ctx.stroke();
                ctx.setLineDash([]);

                // Partículas de plasma cargando hacia el centro
                const particleCount = 10;
                for (let i = 0; i < particleCount; i++) {
                    const travelProgress = ((now + i * 150) % 1500) / 1500;
                    const r = outerR * (1 - travelProgress);
                    const angle = (i * 2 * Math.PI / particleCount) + (now / 200) + (travelProgress * Math.PI);
                    const px = wx + r * Math.cos(angle);
                    const py = wy + r * Math.sin(angle);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(px - (1 / scale), py - (1 / scale), 2 / scale, 2 / scale);
                }
            } else if (warning.perkId === 'atomic_bomb_1') {
                // Múltiples aureolas concéntricas de pulso naranja expansivas
                for (let p = 0; p < 3; p++) {
                    const pulseProgress = (((now / 1200) + p * 0.33) % 1.0);
                    const pulseR = outerR * pulseProgress;
                    ctx.beginPath();
                    ctx.arc(wx, wy, pulseR, 0, 2 * Math.PI);
                    ctx.strokeStyle = `rgba(251, 146, 60, ${0.45 * (1 - pulseProgress)})`;
                    ctx.lineWidth = 1.2 / scale;
                    ctx.stroke();
                }

                // Protones orbitando circularmente alrededor del centro
                const particleCount = 8;
                for (let i = 0; i < particleCount; i++) {
                    const angle = (i * 2 * Math.PI / particleCount) + (now / 250);
                    const r = outerR * 0.35 * (0.8 + 0.2 * Math.sin(now / 100 + i));
                    const px = wx + r * Math.cos(angle);
                    const py = wy + r * Math.sin(angle);
                    ctx.fillStyle = '#fb923c';
                    ctx.fillRect(px - (1 / scale), py - (1 / scale), 2 / scale, 2 / scale);
                }
            } else if (warning.perkId === 'cluster_bomb_1') {
                // Cuadrícula táctica de puntos
                ctx.save();
                ctx.beginPath();
                ctx.arc(wx, wy, outerR, 0, 2 * Math.PI);
                ctx.clip();

                ctx.fillStyle = 'rgba(163, 230, 53, 0.35)';
                const spacing = Math.max(3, outerR / 3);
                for (let xOffset = -outerR; xOffset <= outerR; xOffset += spacing) {
                    for (let yOffset = -outerR; yOffset <= outerR; yOffset += spacing) {
                        ctx.fillRect(wx + xOffset - 0.5 / scale, wy + yOffset - 0.5 / scale, 1 / scale, 1 / scale);
                    }
                }
                ctx.restore();

                // Barrido de radar verde lima circular
                ctx.beginPath();
                ctx.moveTo(wx, wy);
                const sweepAngle = (now / 300) % (2 * Math.PI);
                ctx.arc(wx, wy, outerR, sweepAngle, sweepAngle + 0.25);
                ctx.lineTo(wx, wy);
                ctx.fillStyle = 'rgba(163, 230, 53, 0.15)';
                ctx.fill();
            } else if (warning.perkId === 'meteor_shower_1') {
                // Meteoros cayendo de forma limpia
                const particleCount = 6;
                ctx.save();
                ctx.beginPath();
                ctx.arc(wx, wy, outerR, 0, 2 * Math.PI);
                ctx.clip();

                for (let i = 0; i < particleCount; i++) {
                    const offset = (i * 350) % 1000;
                    const pProgress = ((now + offset) % 1000) / 1000;
                    const px = wx - outerR + (2 * outerR * ((i * 17) % 10 / 10));
                    const py = wy - outerR + (2 * outerR * pProgress);

                    ctx.beginPath();
                    ctx.arc(px, py, 0.8 / scale, 0, 2 * Math.PI);
                    ctx.fillStyle = `rgba(232, 121, 249, ${0.75 * (1 - pProgress)})`;
                    ctx.fill();
                }
                ctx.restore();
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

            if (exp.perkId === 'ion_strike') {
                const r = exp.maxRadius * (0.1 + 1.8 * progress);
                const cx = exp.x + 0.5;
                const cy = exp.y + 0.5;

                const p1 = { x: cx, y: cy - r };
                const p2 = { x: cx - r * 0.866, y: cy + r * 0.5 };
                const p3 = { x: cx + r * 0.866, y: cy + r * 0.5 };

                // 1. Relleno de resplandor de onda expansiva triangular de plasma cian
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.closePath();
                ctx.fillStyle = `rgba(6, 182, 212, ${opacity * 0.35})`;
                ctx.fill();

                // 2. Trazo del triángulo de plasma brillante exterior
                ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
                ctx.lineWidth = Math.max(2, 6 * (1 - progress) / transform.scale);
                ctx.stroke();

                // 3. Triángulo interior secundario (más concentrado y blanco)
                const innerR = r * 0.65;
                const ip1 = { x: cx, y: cy - innerR };
                const ip2 = { x: cx - innerR * 0.866, y: cy + innerR * 0.5 };
                const ip3 = { x: cx + innerR * 0.866, y: cy + innerR * 0.5 };

                ctx.beginPath();
                ctx.moveTo(ip1.x, ip1.y);
                ctx.lineTo(ip2.x, ip2.y);
                ctx.lineTo(ip3.x, ip3.y);
                ctx.closePath();
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.9})`;
                ctx.lineWidth = Math.max(1, 3.5 * (1 - progress) / transform.scale);
                ctx.stroke();

                // 4. Rayos de impacto de iones concentrados en los 3 vértices
                const verts = [p1, p2, p3];
                const coreR = Math.max(1.5, (exp.maxRadius * 0.25 * (1 - progress)) / transform.scale);
                verts.forEach(v => {
                    ctx.beginPath();
                    ctx.arc(v.x, v.y, coreR, 0, 2 * Math.PI);
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                    ctx.fill();
                    ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
                    ctx.lineWidth = 1.5 / transform.scale;
                    ctx.stroke();
                });

                // 5. Partículas de plasma flotantes dispersándose desde la figura del triángulo
                const particleCount = 18;
                for (let i = 0; i < particleCount; i++) {
                    const hash = Math.sin(exp.startTime + i * 17.31) * 1000;
                    const angle = (hash * 11) % (2 * Math.PI);
                    const speed = exp.maxRadius * 1.3 * (0.3 + 0.9 * (Math.abs(hash * 3) % 1));
                    const dist = speed * (1 - Math.pow(1 - progress, 2));

                    const px = cx + dist * Math.cos(angle);
                    const py = cy + dist * Math.sin(angle);

                    const size = Math.max(1, (2.2 * (1 - progress)) / transform.scale);
                    ctx.fillStyle = i % 2 === 0 ? '#06b6d4' : '#ffffff';
                    ctx.fillRect(px - size / 2, py - size / 2, size, size);
                }
                return;
            }

            // 1. Explosión limpia de Cañón Orbital (cian/blanco, múltiples aureolas circulares y protones de alta energía)
            if (exp.perkId === 'orbital_cannon_1') {
                // Múltiples aureolas concéntricas en cian expansivas
                for (let p = 0; p < 3; p++) {
                    const ringProgress = Math.min(1, progress * 1.5 - p * 0.25);
                    if (ringProgress > 0) {
                        const r = exp.maxRadius * (0.1 + 1.9 * ringProgress);
                        const op = (1 - ringProgress) * opacity;
                        ctx.beginPath();
                        ctx.arc(exp.x + 0.5, exp.y + 0.5, r, 0, 2 * Math.PI);
                        ctx.strokeStyle = `rgba(0, 240, 255, ${op})`;
                        ctx.lineWidth = Math.max(1.5, 3.5 * (1 - ringProgress) / transform.scale);
                        ctx.stroke();
                    }
                }

                // Campo electromagnético central (aureola interna brillante cian)
                ctx.beginPath();
                ctx.arc(exp.x + 0.5, exp.y + 0.5, exp.maxRadius * 0.65 * progress, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(0, 240, 255, ${opacity * 0.15})`;
                ctx.fill();

                // Protones electromagnéticos de alta velocidad radial sin gravedad
                const particleCount = 25;
                for (let i = 0; i < particleCount; i++) {
                    const hash = Math.sin(exp.startTime + i * 47.13) * 1000;
                    const angle = (hash * 93.7) % (2 * Math.PI);
                    const speed = exp.maxRadius * (0.8 + 1.6 * (Math.abs(hash * 11.2) % 1));
                    const dist = speed * (1 - Math.pow(1 - progress, 3));
                    
                    const px = exp.x + 0.5 + dist * Math.cos(angle) + 0.4 * Math.sin(now / 10);
                    const py = exp.y + 0.5 + dist * Math.sin(angle) + 0.4 * Math.cos(now / 10);
                    
                    const size = Math.max(1, (2.5 * (1 - progress)) / transform.scale);
                    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#00f0ff';
                    ctx.fillRect(px - size/2, py - size/2, size, size);
                }
                return;
            }

            // 2. Agujero Negro
            if (exp.perkId === 'black_hole_1') {
                if (progress < 0.4) {
                    const phaseProgress = progress / 0.4;
                    const r = exp.maxRadius * 0.8 * Math.sin(phaseProgress * Math.PI / 2);
                    
                    ctx.beginPath();
                    ctx.arc(exp.x + 0.5, exp.y + 0.5, r, 0, 2 * Math.PI);
                    ctx.fillStyle = '#000000';
                    ctx.fill();
                    
                    ctx.strokeStyle = `rgba(90, 80, 110, ${0.9 * opacity})`; // Mysterious dark violet/gray
                    ctx.lineWidth = Math.max(3, 6 / transform.scale);
                    ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.arc(exp.x + 0.5, exp.y + 0.5, r * 1.4, 0, 2 * Math.PI);
                    ctx.strokeStyle = `rgba(64, 64, 72, ${0.6 * opacity})`; // Dark slate gray ripple
                    ctx.lineWidth = Math.max(1, 3 / transform.scale);
                    ctx.stroke();
                } else if (progress < 0.7) {
                    const phaseProgress = (progress - 0.4) / 0.3;
                    const r = exp.maxRadius * 0.8 * (1 - phaseProgress);
                    
                    if (r > 0.1) {
                        ctx.beginPath();
                        ctx.arc(exp.x + 0.5, exp.y + 0.5, r, 0, 2 * Math.PI);
                        ctx.fillStyle = '#000000';
                        ctx.fill();
                        
                        ctx.strokeStyle = `rgba(45, 20, 80, ${0.9 * opacity})`; // Deep violet collapse border
                        ctx.lineWidth = Math.max(3, 8 * (1 - phaseProgress) / transform.scale);
                        ctx.stroke();
                    }
                    
                    const collapseRadius = exp.maxRadius * 2.0 * (1 - phaseProgress);
                    ctx.beginPath();
                    ctx.arc(exp.x + 0.5, exp.y + 0.5, collapseRadius, 0, 2 * Math.PI);
                    ctx.strokeStyle = `rgba(200, 200, 210, ${0.75 * opacity})`; // Silver collapsing ring
                    ctx.lineWidth = Math.max(1, 2 / transform.scale);
                    ctx.stroke();
                } else {
                    const phaseProgress = (progress - 0.7) / 0.3;
                    const r = exp.maxRadius * 2.5 * phaseProgress;
                    
                    const grad = ctx.createRadialGradient(
                        exp.x + 0.5, exp.y + 0.5, 0,
                        exp.x + 0.5, exp.y + 0.5, r
                    );
                    grad.addColorStop(0, `rgba(255, 255, 255, ${1.0 - phaseProgress})`); // White center
                    grad.addColorStop(0.35, `rgba(60, 40, 90, ${(1.0 - phaseProgress) * 0.85})`); // Deep cosmic violet
                    grad.addColorStop(0.7, `rgba(30, 30, 40, ${(1.0 - phaseProgress) * 0.5})`); // Dark gray
                    grad.addColorStop(1.0, `rgba(0, 0, 0, 0.0)`);
                    
                    ctx.beginPath();
                    ctx.arc(exp.x + 0.5, exp.y + 0.5, r, 0, 2 * Math.PI);
                    ctx.fillStyle = grad;
                    ctx.fill();
                }
                return;
            }

            // 3. Bomba Atómica (Fuego circular termo-nuclear suave, aureolas concéntricas y partículas)
            if (exp.perkId === 'atomic_bomb_1') {
                // Onda expansiva de fuego circular suave mediante gradiente radial
                const r = exp.maxRadius * (0.1 + 2.4 * progress);
                const grad = ctx.createRadialGradient(exp.x + 0.5, exp.y + 0.5, 0, exp.x + 0.5, exp.y + 0.5, r);
                grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
                grad.addColorStop(0.15, `rgba(254, 240, 138, ${opacity})`); // Amarillo neón
                grad.addColorStop(0.45, `rgba(249, 115, 22, ${opacity * 0.8})`); // Naranja
                grad.addColorStop(0.75, `rgba(239, 68, 68, ${opacity * 0.45})`); // Rojo
                grad.addColorStop(1, `rgba(239, 68, 68, 0)`);
                
                ctx.beginPath();
                ctx.arc(exp.x + 0.5, exp.y + 0.5, r, 0, 2 * Math.PI);
                ctx.fillStyle = grad;
                ctx.fill();

                // Múltiples aureolas concéntricas de pulso expansivas (ondas de choque circulares)
                for (let p = 0; p < 4; p++) {
                    const ringProgress = Math.min(1, progress * 1.6 - p * 0.2);
                    if (ringProgress > 0) {
                        const ar = exp.maxRadius * (0.05 + 2.45 * ringProgress);
                        const op = (1 - ringProgress) * opacity;
                        ctx.beginPath();
                        ctx.arc(exp.x + 0.5, exp.y + 0.5, ar, 0, 2 * Math.PI);
                        ctx.strokeStyle = `rgba(251, 146, 60, ${op * 0.6})`;
                        ctx.lineWidth = Math.max(1, 4 * (1 - ringProgress) / transform.scale);
                        ctx.stroke();
                    }
                }

                // Cúpula atómica de fuego ascendente circular
                const riseDist = exp.maxRadius * 0.7 * progress;
                const domeR = exp.maxRadius * (0.35 + 1.15 * progress);
                const mx = exp.x + 0.5 + 0.6 * Math.sin(now / 10);
                const my = exp.y + 0.5 - riseDist;
                
                ctx.beginPath();
                ctx.arc(mx, my, domeR * 0.55, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(251, 146, 60, ${opacity * 0.45})`;
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(mx - domeR * 0.25, my + domeR * 0.08, domeR * 0.38, 0, 2 * Math.PI);
                ctx.arc(mx + domeR * 0.25, my + domeR * 0.08, domeR * 0.38, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(239, 68, 68, ${opacity * 0.35})`;
                ctx.fill();

                // Protones/escombros del cataclismo volando
                const particleCount = 45;
                for (let i = 0; i < particleCount; i++) {
                    const hash = Math.sin(exp.startTime + i * 31.81) * 10000;
                    const angle = (hash * 13.9) % (2 * Math.PI);
                    const speed = exp.maxRadius * 1.5 * (0.4 + 1.2 * (Math.abs(hash * 7.3) % 1));
                    const dist = speed * (1 - Math.pow(1 - progress, 2));
                    
                    const px = exp.x + 0.5 + dist * Math.cos(angle);
                    const py = exp.y + 0.5 + dist * Math.sin(angle) - (exp.maxRadius * 0.4 * progress);
                    
                    // Turbulencia circular
                    const finalPx = px + 1.5 * Math.sin(now / 80 + i) * progress;
                    const finalPy = py + 1.5 * Math.cos(now / 90 + i) * progress;
                    
                    const size = Math.max(1, (3 * (1 - progress)) / transform.scale);
                    const colors = ['#facc15', '#f97316', '#ef4444', '#a3e635']; // Colores fuego/radioactivos
                    ctx.fillStyle = colors[Math.abs(Math.floor(hash)) % colors.length];
                    ctx.fillRect(finalPx - size/2, finalPy - size/2, size, size);
                }
                return;
            }

            // 4. Bomba de Racimo (Micro-detonaciones circulares encadenadas y chispas)
            if (exp.perkId === 'cluster_bomb_1') {
                const bombletCount = 6;
                for (let i = 0; i < bombletCount; i++) {
                    const delay = i * 0.12;
                    if (progress > delay) {
                        const localProgress = Math.min(1, (progress - delay) / (1 - delay));
                        const localOpacity = 1 - localProgress;
                        
                        const angle = i * 2.37;
                        const dist = exp.maxRadius * 0.65 * Math.sin(i * 1.83);
                        const bx = exp.x + 0.5 + dist * Math.cos(angle);
                        const by = exp.y + 0.5 + dist * Math.sin(angle);
                        
                        // Explosión circular limpia para cada bomblet
                        const localR = (exp.maxRadius * 0.3) * (0.4 + 1.4 * localProgress);
                        ctx.beginPath();
                        ctx.arc(bx, by, localR, 0, 2 * Math.PI);
                        ctx.strokeStyle = `rgba(163, 230, 53, ${localOpacity})`;
                        ctx.fillStyle = `rgba(163, 230, 53, ${localOpacity * 0.25})`;
                        ctx.fill();
                        ctx.stroke();

                        // Chispas verdes/amarillas de la submunición
                        const sparkCount = 4;
                        for (let s = 0; s < sparkCount; s++) {
                            const hash = Math.sin(exp.startTime + i * 5 + s * 11) * 500;
                            const sa = (hash * 7) % (2 * Math.PI);
                            const sd = (exp.maxRadius * 0.4) * localProgress * (0.8 + 0.6 * (hash % 1));
                            const spx = bx + sd * Math.cos(sa);
                            const spy = by + sd * Math.sin(sa);
                            const size = 1.5 / transform.scale;
                            ctx.fillStyle = '#a3e635';
                            ctx.fillRect(spx - size/2, spy - size/2, size, size);
                        }
                    }
                }
                return;
            }

            // 5. Lluvia de Meteoritos (Múltiples impactos circulares magenta)
            if (exp.perkId === 'meteor_shower_1') {
                const subImpacts = 5;
                for (let i = 0; i < subImpacts; i++) {
                    const delay = i * 0.15;
                    if (progress > delay) {
                        const localProgress = Math.min(1, (progress - delay) / (1 - delay));
                        const localOpacity = 1 - localProgress;
                        
                        const angle = i * 2.1;
                        const dist = exp.maxRadius * 0.5 * Math.sin(i * 1.5);
                        const mx = exp.x + 0.5 + dist * Math.cos(angle);
                        const my = exp.y + 0.5 + dist * Math.sin(angle);
                        
                        const localR = (exp.maxRadius * 0.45) * (0.2 + 1.8 * localProgress);
                        ctx.beginPath();
                        ctx.arc(mx, my, localR, 0, 2 * Math.PI);
                        ctx.lineWidth = Math.max(1.5, 3 / transform.scale);
                        ctx.strokeStyle = `rgba(232, 121, 249, ${localOpacity})`;
                        ctx.fillStyle = `rgba(232, 121, 249, ${localOpacity * 0.2})`;
                        ctx.fill();
                        ctx.stroke();
                    }
                }

                // Escombros magenta de los meteoritos volando
                const debrisCount = 15;
                for (let d = 0; d < debrisCount; d++) {
                    const hash = Math.sin(exp.startTime + d * 19.3) * 1000;
                    const angle = (hash * 11) % (2 * Math.PI);
                    const speed = exp.maxRadius * 1.5 * (0.3 + 1.1 * (Math.abs(hash * 3.7) % 1));
                    const dist = speed * (1 - Math.pow(1 - progress, 2));
                    
                    const px = exp.x + 0.5 + dist * Math.cos(angle);
                    const py = exp.y + 0.5 + dist * Math.sin(angle) + (8 * progress * progress);
                    
                    const size = Math.max(1, (2.2 * (1 - progress)) / transform.scale);
                    ctx.fillStyle = d % 2 === 0 ? '#e879f9' : '#db2777';
                    ctx.fillRect(px - size/2, py - size/2, size, size);
                }
                return;
            }

            // Fallback genérico para misil, bomba e impactos estándar (Anillos circulares limpios y escombros)
            const maxR = exp.maxRadius;
            const radiusOuter = maxR * (0.8 + 1.7 * progress);
            const radiusInner = maxR * (0.4 + 1.1 * progress);
            const mainCol = exp.perkId === 'pixel_bomb_1' ? '249, 115, 22' : '239, 68, 68';
            const fillCol = exp.perkId === 'pixel_bomb_1' ? '251, 146, 60' : '220, 38, 38';

            // Anillo exterior circular
            ctx.beginPath();
            ctx.arc(exp.x + 0.5, exp.y + 0.5, radiusOuter, 0, 2 * Math.PI);
            ctx.lineWidth = Math.max(2, 4 / transform.scale);
            ctx.strokeStyle = `rgba(${mainCol}, ${opacity})`;
            ctx.stroke();

            // Círculo interior circular
            ctx.beginPath();
            ctx.arc(exp.x + 0.5, exp.y + 0.5, radiusInner, 0, 2 * Math.PI);
            ctx.lineWidth = Math.max(3, 5 / transform.scale);
            ctx.strokeStyle = `rgba(${fillCol}, ${opacity})`;
            ctx.fillStyle = `rgba(${fillCol}, ${opacity * 0.18})`;
            ctx.fill();
            ctx.stroke();

            // Píxeles esparcidos rotos volando con gravedad
            const debrisCount = 12;
            for (let i = 0; i < debrisCount; i++) {
                const hash = Math.sin(exp.startTime + i * 29) * 1000;
                const angle = (hash * 11) % (2 * Math.PI);
                const speed = maxR * 1.3 * (0.3 + 0.9 * (Math.abs(hash * 5) % 1));
                const dist = speed * (1 - Math.pow(1 - progress, 2));
                
                const px = exp.x + 0.5 + dist * Math.cos(angle);
                const py = exp.y + 0.5 + dist * Math.sin(angle) + (14 * progress * progress);
                
                const size = Math.max(1, (2 / transform.scale));
                ctx.fillStyle = i % 2 === 0 ? `rgb(${mainCol})` : `rgb(${fillCol})`;
                ctx.fillRect(px - size/2, py - size/2, size, size);
            }
        });
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

        case 'BOMB_WARNING':
        case 'NUCLEAR_WARNING':
            if (payload) {
                const cx = parseInt(payload.x || 0, 10);
                const cy = parseInt(payload.y || 0, 10);
                const r = parseInt(payload.radius || 10, 10);
                const durationMs = parseInt(payload.durationMs || 3000, 10);
                const key = payload.key || `${cx}_${cy}`;
                const perkId = payload.perkId || 'pixel_missile_1';
                const now = Date.now();

                const existing = nuclearWarnings.find(w => w.key === key && now < w.endTime);
                if (existing) {
                    break;
                }

                const warningObj = {
                    key: key,
                    x: cx,
                    y: cy,
                    radius: r,
                    startTime: now,
                    endTime: now + durationMs,
                    perkId: perkId
                };

                if (perkId === 'black_hole_1' || perkId === 'supernova_blast') {
                    const candidates = [];
                    const rInt = Math.ceil(r);
                    for (let dy = -rInt; dy <= rInt; dy++) {
                        for (let dx = -rInt; dx <= rInt; dx++) {
                            const px = cx + dx;
                            const py = cy + dy;
                            if (px >= 0 && px < boardWidth && py >= 0 && py < boardHeight) {
                                const distSq = dx * dx + dy * dy;
                                if (distSq <= r * r) {
                                    const dist = Math.sqrt(distSq);
                                    if (perkId === 'black_hole_1') {
                                        const hash = ((px * 17 + py * 23) % 100) / 100;
                                        const threshold = 0.05 + (dist / r) * 0.75 + hash * 0.15;
                                        candidates.push({
                                            x: px,
                                            y: py,
                                            dx: dx,
                                            dy: dy,
                                            dist: dist,
                                            threshold: threshold
                                        });
                                    } else {
                                        const threshold = dist / r;
                                        candidates.push({
                                            x: px,
                                            y: py,
                                            dx: dx,
                                            dy: dy,
                                            dist: dist,
                                            threshold: threshold
                                        });
                                    }
                                }
                            }
                        }
                    }
                    candidates.sort((a, b) => a.threshold - b.threshold);
                    warningObj.candidates = candidates;
                    warningObj.candidateIndex = 0;
                }

                nuclearWarnings.push(warningObj);
                requestRender();
            }
            break;

        case 'BOMB_PIXEL':
            if (offscreenCtx) {
                const cX = parseInt(payload.cX ?? payload.x ?? 0, 10);
                const cY = parseInt(payload.cY ?? payload.y ?? 0, 10);
                const r = parseInt(payload.r ?? payload.radius ?? 10, 10);
                const perkId = payload.perkId || payload.perk || 'pixel_missile_1';
                const now = Date.now();

                nuclearWarnings = nuclearWarnings.filter(w => Math.abs(w.x - cX) > 2 || Math.abs(w.y - cY) > 2);

                clearBombPixels(cX, cY, r, perkId);

                let duration = 800;
                if (perkId === 'orbital_cannon_1') {
                    duration = 3000;
                } else if (perkId === 'atomic_bomb_1') {
                    duration = 3000;
                } else if (perkId === 'black_hole_1') {
                    duration = 4000;
                } else if (perkId === 'cluster_bomb_1') {
                    duration = 2000;
                } else if (perkId === 'meteor_shower_1') {
                    duration = 1500;
                } else if (perkId === 'pixel_bomb_1') {
                    duration = 1200;
                } else if (perkId === 'pixel_missile_1') {
                    duration = 1000;
                } else if (perkId === 'supernova_blast') {
                    duration = 5000;
                } else if (perkId === 'ion_strike') {
                    duration = 4500;
                }

                explosions.push({
                    x: cX,
                    y: cY,
                    maxRadius: r,
                    startTime: now,
                    duration: duration,
                    perkId: perkId
                });
                requestRender();
            }
            break;

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
