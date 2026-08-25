/**
 * LassoSelectionUtils.js
 * Algoritmo de rasterización y relleno de polígono para lazo a mano alzada (Lasso Selection).
 */

/**
 * Traza una línea recta discreta entre dos puntos usando el algoritmo de Bresenham.
 */
function getLinePixels(x0, y0, x1, y1) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    while (true) {
        points.push({ x: cx, y: cy });
        if (cx === x1 && cy === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            cx += sx;
        }
        if (e2 < dx) {
            err += dx;
            cy += sy;
        }
    }

    return points;
}

/**
 * Comprueba si un punto (px, py) está dentro de un polígono 2D mediante Ray Casting (Even-Odd rule).
 */
function isPointInPolygon(px, py, polygon) {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi + 0.0000001) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Obtiene todos los píxeles discretos dentro del lazo cerrado.
 * @param {Array<{x: number, y: number}>} rawPoints - Puntos capturados durante el trazo.
 * @param {number} boardW - Ancho del lienzo.
 * @param {number} boardH - Alto del lienzo.
 * @returns {Array<{x: number, y: number}>} - Lista de píxeles seleccionados.
 */
export function getLassoSelectedPixels(rawPoints, boardW = 64, boardH = 64) {
    if (!rawPoints || rawPoints.length < 3) {
        return (rawPoints || []).filter(p => p.x >= 0 && p.x < boardW && p.y >= 0 && p.y < boardH);
    }

    // Simplificar puntos duplicados consecutivos
    const cleanPoly = [];
    for (let i = 0; i < rawPoints.length; i++) {
        const p = rawPoints[i];
        if (cleanPoly.length === 0 || cleanPoly[cleanPoly.length - 1].x !== p.x || cleanPoly[cleanPoly.length - 1].y !== p.y) {
            cleanPoly.push({
                x: Math.max(0, Math.min(boardW - 1, Math.round(p.x))),
                y: Math.max(0, Math.min(boardH - 1, Math.round(p.y)))
            });
        }
    }

    if (cleanPoly.length < 3) return cleanPoly;

    const pixelSet = new Set();
    const result = [];

    // 1. Rasterizar los bordes del polígono para asegurar continuidad
    for (let i = 0; i < cleanPoly.length; i++) {
        const p1 = cleanPoly[i];
        const p2 = cleanPoly[(i + 1) % cleanPoly.length];
        const edgePixels = getLinePixels(p1.x, p1.y, p2.x, p2.y);
        for (let j = 0; j < edgePixels.length; j++) {
            const ep = edgePixels[j];
            if (ep.x >= 0 && ep.x < boardW && ep.y >= 0 && ep.y < boardH) {
                const key = (ep.y << 16) | (ep.x & 0xFFFF);
                if (!pixelSet.has(key)) {
                    pixelSet.add(key);
                    result.push({ x: ep.x, y: ep.y });
                }
            }
        }
    }

    // 2. Calcular Bounding Box del polígono
    let minX = boardW, maxX = 0, minY = boardH, maxY = 0;
    for (let i = 0; i < cleanPoly.length; i++) {
        const p = cleanPoly[i];
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }

    minX = Math.max(0, minX);
    maxX = Math.min(boardW - 1, maxX);
    minY = Math.max(0, minY);
    maxY = Math.min(boardH - 1, maxY);

    // 3. Scanline fill: evaluar cada píxel dentro del bounding box
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const key = (y << 16) | (x & 0xFFFF);
            if (!pixelSet.has(key)) {
                if (isPointInPolygon(x + 0.5, y + 0.5, cleanPoly)) {
                    pixelSet.add(key);
                    result.push({ x, y });
                }
            }
        }
    }

    return result;
}
