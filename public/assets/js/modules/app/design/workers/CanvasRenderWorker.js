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
let protectedBitmask = new Uint8Array(0);
let protectedOffscreenCanvas = null;
let protectedOffscreenCtx = null;
let protectedPixelsDirty = true;
let isOwnerProtecting = false;
let hoveredPixelKey = -1;
let ownerEraserBox = null;

function updateProtectedOffscreen() {
    if (typeof OffscreenCanvas === 'undefined') return;
    if (!protectedOffscreenCanvas || protectedOffscreenCanvas.width !== boardWidth || protectedOffscreenCanvas.height !== boardHeight) {
        protectedOffscreenCanvas = new OffscreenCanvas(boardWidth, boardHeight);
        protectedOffscreenCtx = protectedOffscreenCanvas.getContext('2d', { alpha: true });
    }
    protectedOffscreenCtx.clearRect(0, 0, boardWidth, boardHeight);

    const totalLen = boardWidth * boardHeight;
    if (!protectedBitmask || protectedBitmask.length !== totalLen) {
        protectedBitmask = new Uint8Array(totalLen);
    } else {
        protectedBitmask.fill(0);
    }

    if (protectedPixelsArray && protectedPixelsArray.length > 0) {
        protectedOffscreenCtx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        for (let i = 0; i < protectedPixelsArray.length; i++) {
            const off = protectedPixelsArray[i];
            if (off >= 0 && off < totalLen) {
                protectedBitmask[off] = 1;
                const px = off % boardWidth;
                const py = (off / boardWidth) | 0;
                protectedOffscreenCtx.fillRect(px, py, 1, 1);
            }
        }
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
    }
}

async function hydrateChunkWorker(chunkX, chunkY, chunkSize, base64String) {
    const bytes = await decompressIfNeeded(base64String);
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
            pixelQueue.push(...pendingProgressivePixels[chunkKey]);
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

    if (hoveredPixelKey >= 0 && !isSpectator && !isResetLocked && !(isFrozen && !isOwner)) {
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

    // Actualizar animación de reinicio de lienzo en memoria (Espiral)
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

    // Actualizar animación de inyección de template en memoria (Z)
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
                    if (pixelBuffer && pixelBuffer[bufferIdx] !== color) {
                        pixelBuffer[bufferIdx] = color;
                        markDirty(absX, absY);
                        needsFlush = true;
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
                    if (pixelBuffer && pixelBuffer[bufferIdx] !== color) {
                        pixelBuffer[bufferIdx] = color;
                        markDirty(absX, absY);
                        needsFlush = true;
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
                    hydrateChunkWorker(chk.chunkX, chk.chunkY, chk.chunkSize, chk.base64String);
                });
                pendingChunks = [];
            }
            injectAnimation = null;
        } else {
            requestRender();
        }
    }

    // Actualizar animaciones de borrador en memoria (Espiral)
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
                    offscreenCtx.drawImage(pendingImageBitmap, 0, 0, boardWidth, boardHeight);
                    mainImageData = offscreenCtx.getImageData(0, 0, boardWidth, boardHeight);
                    pixelBuffer = new Uint32Array(mainImageData.data.buffer);
                    pendingImageBitmap = null;
                } else {
                    offscreenCtx.putImageData(mainImageData, 0, 0);
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
    
    ctx.restore();

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

    // Renderizado ultra-rápido O(1) de zonas protegidas resaltadas en modo Bloqueador
    if (isOwnerProtecting) {
        if (protectedPixelsDirty) {
            updateProtectedOffscreen();
        }
        if (protectedOffscreenCanvas) {
            ctx.drawImage(protectedOffscreenCanvas, 0, 0);
        }
        if (protectedPixelsArray && protectedPixelsArray.length > 0) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1 / transform.scale;
            ctx.beginPath();
            for (let i = 0; i < protectedPixelsArray.length; i++) {
                const off = protectedPixelsArray[i];
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

    if (ownerEraserBox) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1 / transform.scale;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        
        const w = ownerEraserBox.x2 - ownerEraserBox.x1 + 1;
        const h = ownerEraserBox.y2 - ownerEraserBox.y1 + 1;
        
        ctx.fillRect(ownerEraserBox.x1, ownerEraserBox.y1, w, h);
        ctx.strokeRect(ownerEraserBox.x1, ownerEraserBox.y1, w, h);
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

        case 'UPDATE_PROTECTED_PIXELS':
            if (payload.protectedPixels) {
                protectedPixelsArray = new Uint32Array(payload.protectedPixels);
            } else {
                protectedPixelsArray = new Uint32Array(0);
            }
            protectedPixelsDirty = true;
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
            isOwnerProtecting = !!payload.isOwnerProtecting;
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
            const minX = Math.max(0, x1);
            const maxX = Math.min(boardWidth - 1, x2);
            const minY = Math.max(0, y1);
            const maxY = Math.min(boardHeight - 1, y2);
            const w = maxX - minX + 1;
            const h = maxY - minY + 1;
            
            if (w > 0 && h > 0) {
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

        case 'TRIGGER_INJECT_ANIMATION':
            if (!injectAnimation) {
                let templatePixels = null;
                const tc = payload.templateCoords;
                if (payload.imageBitmap) {
                    try {
                        const tempCanvas = new OffscreenCanvas(tc.w, tc.h);
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCtx.drawImage(payload.imageBitmap, 0, 0, tc.w, tc.h);
                        const imgData = tempCtx.getImageData(0, 0, tc.w, tc.h);
                        templatePixels = new Uint32Array(imgData.data.buffer);
                    } catch (e) {
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
                    base64String: payload.base64String
                });
            } else {
                hydrateChunkWorker(payload.chunkX, payload.chunkY, payload.chunkSize || 512, payload.base64String);
            }
            break;

        case 'DRAW_IMAGE_BUFFER':
            if (payload.imageBitmap && offscreenCtx) {
                if (resetAnimation || resizeAnimation) {
                    pendingImageBitmap = payload.imageBitmap;
                } else {
                    offscreenCtx.clearRect(0, 0, boardWidth, boardHeight);
                    offscreenCtx.drawImage(payload.imageBitmap, 0, 0, boardWidth, boardHeight);
                    mainImageData = offscreenCtx.getImageData(0, 0, boardWidth, boardHeight);
                    pixelBuffer = new Uint32Array(mainImageData.data.buffer);
                    requestRender();
                }
            } else if (!payload.imageBitmap && offscreenCtx) {
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
