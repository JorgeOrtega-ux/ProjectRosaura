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

let needsRender = false;
let animFrameId = null;

const EXPLOSION_STYLES = {
    'pixel_misil_1': 'small',
    'pixel_misil_2': 'small',
    'pixel_misil_3': 'small',
    'bomba_pixel_1': 'medium',
    'bomba_pixel_2': 'medium',
    'bomba_pixel_3': 'medium',
    'bomba_nuclear_1': 'nuclear',
    'bomba_nuclear_2': 'nuclear',
    'bomba_nuclear_3': 'nuclear'
};

function getExplosionStyle(perkId) {
    return EXPLOSION_STYLES[perkId] || 'small';
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

function processPixelQueue() {
    if (!pixelQueue || pixelQueue.length === 0 || !offscreenCtx) return;
    try {
        while (pixelQueue.length > 0) {
            const p = pixelQueue.pop();
            const x = p.x;
            const y = p.y;
            if (isNaN(x) || isNaN(y) || x < 0 || x >= boardWidth || y < 0 || y >= boardHeight) {
                continue;
            }
            const color = p.color;

            if (color === 'transparent' || color === 255) {
                offscreenCtx.clearRect(x, y, 1, 1);
            } else if (typeof color === 'string') {
                offscreenCtx.fillStyle = color;
                offscreenCtx.clearRect(x, y, 1, 1);
                offscreenCtx.fillRect(x, y, 1, 1);
            }
        }
    } catch (e) {
        pixelQueue.length = 0;
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

    // TypedArray para renderSet de selección y hover
    const selLen = selectedPixelsArray.length;
    const hasHover = hoveredPixelKey >= 0 && !isSpectator && !isResetLocked;
    
    if ((selLen > 0 || hasHover) && !isSpectator && !isResetLocked) {
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 1 / transform.scale;
        ctx.beginPath();

        const keyLookup = new Set(selectedPixelsArray);
        if (hasHover) keyLookup.add(hoveredPixelKey);

        keyLookup.forEach(key => {
            const x = key & 0xFFFF;
            const y = key >> 16;

            const hasTop = keyLookup.has(((y - 1) << 16) | x);
            const hasBottom = keyLookup.has(((y + 1) << 16) | x);
            const hasLeft = keyLookup.has((y << 16) | (x - 1));
            const hasRight = keyLookup.has((y << 16) | (x + 1));

            if (!hasTop) { ctx.moveTo(x, y); ctx.lineTo(x + 1, y); }
            if (!hasBottom) { ctx.moveTo(x, y + 1); ctx.lineTo(x + 1, y + 1); }
            if (!hasLeft) { ctx.moveTo(x, y); ctx.lineTo(x, y + 1); }
            if (!hasRight) { ctx.moveTo(x + 1, y); ctx.lineTo(x + 1, y + 1); }
        });
        ctx.stroke();
    }

    // Nuclear Warnings
    if (nuclearWarnings.length > 0) {
        nuclearWarnings.forEach(warning => {
            ctx.beginPath();
            ctx.arc(warning.x + 0.5, warning.y + 0.5, warning.radius, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
            ctx.fill();
            ctx.lineWidth = 2 / transform.scale;
            ctx.strokeStyle = '#ef4444';
            ctx.stroke();

            const timeRatio = (Date.now() - warning.startTime) / (warning.endTime - warning.startTime);
            if (timeRatio >= 0 && timeRatio <= 1) {
                ctx.beginPath();
                ctx.arc(warning.x + 0.5, warning.y + 0.5, warning.radius * (1 - timeRatio), 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
                ctx.fill();
            }
        });
    }

    // Animaciones de Explosiones
    if (explosions.length > 0) {
        const now = Date.now();
        explosions = explosions.filter(exp => (now - exp.startTime) < exp.duration);

        explosions.forEach(exp => {
            const elapsed = now - exp.startTime;
            const progress = Math.min(1, elapsed / exp.duration);
            const opacity = 1 - progress;
            const style = getExplosionStyle(exp.perkId);

            if (style === 'nuclear') {
                const currentRadius = exp.maxRadius * (1 + 2 * progress);
                ctx.beginPath();
                ctx.arc(exp.x + 0.5, exp.y + 0.5, currentRadius, 0, 2 * Math.PI);
                ctx.lineWidth = 10 / transform.scale;
                ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
                ctx.fill();
                ctx.stroke();
            } else if (style === 'medium') {
                const radius1 = exp.maxRadius * (1 + 1.5 * progress);
                const radius2 = exp.maxRadius * (0.5 + 1 * progress);
                ctx.beginPath();
                ctx.arc(exp.x + 0.5, exp.y + 0.5, radius1, 0, 2 * Math.PI);
                ctx.lineWidth = 3 / transform.scale;
                ctx.strokeStyle = `rgba(249, 115, 22, ${opacity})`;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(exp.x + 0.5, exp.y + 0.5, radius2, 0, 2 * Math.PI);
                ctx.lineWidth = 4 / transform.scale;
                ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;
                ctx.fillStyle = `rgba(220, 38, 38, ${opacity * 0.6})`;
                ctx.fill();
                ctx.stroke();
            } else {
                const size = exp.maxRadius * (1 + 3 * progress);
                ctx.beginPath();
                ctx.moveTo(exp.x + 0.5 - size, exp.y + 0.5);
                ctx.lineTo(exp.x + 0.5 + size, exp.y + 0.5);
                ctx.moveTo(exp.x + 0.5, exp.y + 0.5 - size);
                ctx.lineTo(exp.x + 0.5, exp.y + 0.5 + size);
                ctx.lineWidth = 3 / transform.scale;
                ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(exp.x + 0.5, exp.y + 0.5, size * 0.8, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
                ctx.fill();
            }
        });
        if (explosions.length > 0) {
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

        case 'UPDATE_TRANSFORM':
            transform = payload.transform;
            isDarkMode = payload.isDarkMode;
            currentColor = payload.currentColor;
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

        case 'PUSH_PIXELS':
            if (payload.pixels && Array.isArray(payload.pixels)) {
                pixelQueue.push(...payload.pixels);
                requestRender();
            }
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
            hydrateState(payload.base64String);
            break;

        case 'DRAW_IMAGE_BUFFER':
            if (payload.imageBitmap && offscreenCtx) {
                offscreenCtx.clearRect(0, 0, boardWidth, boardHeight);
                offscreenCtx.drawImage(payload.imageBitmap, 0, 0, boardWidth, boardHeight);
                requestRender();
            }
            break;

        case 'BOMB_PIXEL':
            if (offscreenCtx) {
                const { cX, cY, r, perkId } = payload;
                explosions.push({
                    x: cX,
                    y: cY,
                    maxRadius: r,
                    startTime: Date.now(),
                    duration: 800,
                    perkId: perkId || 'pixel_misil_1'
                });
                for (let y = cY - r; y <= cY + r; y++) {
                    const dy = y - cY;
                    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
                    const startX = cX - dx;
                    const endX = cX + dx;
                    const width = endX - startX + 1;
                    offscreenCtx.clearRect(startX, y, width, 1);
                }
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
