import { SHAPE_SVG_PATHS } from '../data/ShapeSvgPathsData.js?v=34';

// Reusable canvas and Path2D cache
const path2dCache = new Map();
let rasterCanvas = null;
let rasterCtx = null;

function getRasterContext() {
    if (!rasterCanvas && typeof document !== 'undefined') {
        rasterCanvas = document.createElement('canvas');
        rasterCtx = rasterCanvas.getContext('2d', { willReadFrequently: true });
        if (rasterCtx) {
            rasterCtx.imageSmoothingEnabled = false;
        }
    }
    return { canvas: rasterCanvas, ctx: rasterCtx };
}

// Rasterizador universal de SVG a píxeles discretos con 100% de fidelidad y grosor uniforme
export function rasterizeSvgPathToPixels(pathString, w, h, isFill = false, strokeWidth = 1) {
    const { canvas, ctx } = getRasterContext();
    if (!canvas || !ctx || !pathString || w <= 0 || h <= 0) return [];

    let basePath = path2dCache.get(pathString);
    if (!basePath) {
        try {
            basePath = new Path2D(pathString);
            path2dCache.set(pathString, basePath);
        } catch (e) {
            console.error('Invalid SVG path:', pathString, e);
            return [];
        }
    }

    canvas.width = Math.max(1, w);
    canvas.height = Math.max(1, h);
    ctx.clearRect(0, 0, w, h);

    // Transformar los puntos vectoriales a (w, h) manteniendo el trazo en espacio 1:1 (grosor idéntico en todos los lados)
    let pathObj = basePath;
    if (typeof DOMMatrix !== 'undefined') {
        const matrix = new DOMMatrix([w / 48, 0, 0, h / 48, 0, 0]);
        const transformedPath = new Path2D();
        transformedPath.addPath(basePath, matrix);
        pathObj = transformedPath;
    }

    if (isFill) {
        ctx.fillStyle = '#000000';
        ctx.fill(pathObj, 'evenodd');
    } else {
        ctx.strokeStyle = '#000000';
        // Grosor uniforme exacto en píxeles reales (sin distorsión horizontal/vertical)
        ctx.lineWidth = Math.max(1, strokeWidth || 1);
        ctx.stroke(pathObj);
    }

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const points = [];

    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const alpha = data[(py * w + px) * 4 + 3];
            if (alpha > 48) {
                points.push({ x: px, y: py });
            }
        }
    }

    return points;
}

function getBresenhamLine(x0, y0, x1, y1) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let currX = x0;
    let currY = y0;

    while (true) {
        points.push({ x: currX, y: currY });
        if (currX === x1 && currY === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            currX += sx;
        }
        if (e2 < dx) {
            err += dx;
            currY += sy;
        }
    }
    return points;
}

function getThickLine(x0, y0, x1, y1, width) {
    if (width <= 1) return getBresenhamLine(x0, y0, x1, y1);
    const baseLine = getBresenhamLine(x0, y0, x1, y1);
    const pointMap = new Set();
    const result = [];
    const radius = Math.floor(width / 2);

    for (let i = 0; i < baseLine.length; i++) {
        const pt = baseLine[i];
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const px = pt.x + dx;
                const py = pt.y + dy;
                const key = (py << 16) | (px & 0xFFFF);
                if (!pointMap.has(key)) {
                    pointMap.add(key);
                    result.push({ x: px, y: py });
                }
            }
        }
    }
    return result;
}

function getRectangleOutline(x0, y0, x1, y1, width = 1) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const pointMap = new Set();
    const result = [];

    const addPoint = (x, y) => {
        const key = (y << 16) | (x & 0xFFFF);
        if (!pointMap.has(key)) {
            pointMap.add(key);
            result.push({ x, y });
        }
    };

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

    if (w <= width * 2 || h <= width * 2) {
        return getRectangleFilled(minX, minY, maxX, maxY);
    }

    for (let x = minX; x <= maxX; x++) {
        for (let t = 0; t < width; t++) {
            addPoint(x, minY + t);
            addPoint(x, maxY - t);
        }
    }

    for (let y = minY; y <= maxY; y++) {
        for (let t = 0; t < width; t++) {
            addPoint(minX + t, y);
            addPoint(maxX - t, y);
        }
    }

    return result;
}

function getRectangleFilled(x0, y0, x1, y1) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const result = [];

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            result.push({ x, y });
        }
    }
    return result;
}

function getEllipseOutline(x0, y0, x1, y1) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    let a = Math.abs(maxX - minX);
    let b = Math.abs(maxY - minY);
    let b1 = b & 1;
    let dx = 4 * (1 - a) * b * b;
    let dy = 4 * (b1 + 1) * a * a;
    let err = dx + dy + b1 * a * a;
    let e2;

    let xA0 = minX;
    let yA0 = minY;
    let xA1 = maxX;
    let yA1 = maxY;

    if (xA0 > xA1) { xA0 = maxX; xA1 = minX; }
    if (yA0 > yA1) yA0 = yA1;
    yA0 += Math.floor((b + 1) / 2);
    yA1 = yA0 - b1;
    a *= 8 * a;
    b1 = 8 * b * b;

    const pointMap = new Set();
    const result = [];

    const addPoint = (x, y) => {
        const key = (y << 16) | (x & 0xFFFF);
        if (!pointMap.has(key)) {
            pointMap.add(key);
            result.push({ x, y });
        }
    };

    do {
        addPoint(xA1, yA0);
        addPoint(xA0, yA0);
        addPoint(xA0, yA1);
        addPoint(xA1, yA1);
        e2 = 2 * err;
        if (e2 <= dy) { yA0++; yA1--; err += dy += a; }
        if (e2 >= dx || 2 * err > dy) { xA0++; xA1--; err += dx += b1; }
    } while (xA0 <= xA1);

    while (yA0 - yA1 <= b) {
        addPoint(xA0 - 1, yA0);
        addPoint(xA1 + 1, yA0++);
        addPoint(xA0 - 1, yA1);
        addPoint(xA1 + 1, yA1--);
    }

    return result;
}

function getEllipseFilled(x0, y0, x1, y1) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;
    if (rx <= 0 && ry <= 0) return [{ x: minX, y: minY }];
    if (rx <= 0) {
        const res = [];
        for (let y = minY; y <= maxY; y++) res.push({ x: minX, y });
        return res;
    }
    if (ry <= 0) {
        const res = [];
        for (let x = minX; x <= maxX; x++) res.push({ x, y: minY });
        return res;
    }

    const cx = minX + rx;
    const cy = minY + ry;
    const result = [];

    for (let y = minY; y <= maxY; y++) {
        const dy = y - cy;
        const normalizedY = dy / ry;
        if (Math.abs(normalizedY) <= 1) {
            const spanX = rx * Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));
            const startX = Math.round(cx - spanX);
            const endX = Math.round(cx + spanX);
            for (let x = startX; x <= endX; x++) {
                result.push({ x, y });
            }
        }
    }
    return result;
}

// Algoritmo general de polígonos: contorno
function getPolygonOutline(vertices, width = 1) {
    if (!vertices || vertices.length < 2) return [];
    const pointMap = new Set();
    const result = [];

    const addPoints = (pts) => {
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            const key = (p.y << 16) | (p.x & 0xFFFF);
            if (!pointMap.has(key)) {
                pointMap.add(key);
                result.push(p);
            }
        }
    };

    for (let i = 0; i < vertices.length; i++) {
        const p1 = vertices[i];
        const p2 = vertices[(i + 1) % vertices.length];
        const line = getThickLine(p1.x, p1.y, p2.x, p2.y, width);
        addPoints(line);
    }
    return result;
}

// Algoritmo general de polígonos: relleno scanline
function getPolygonFilled(vertices) {
    if (!vertices || vertices.length < 3) return [];
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < vertices.length; i++) {
        const y = vertices[i].y;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    const edges = [];
    for (let i = 0; i < vertices.length; i++) {
        const p1 = vertices[i];
        const p2 = vertices[(i + 1) % vertices.length];
        if (p1.y !== p2.y) {
            edges.push({
                yMin: Math.min(p1.y, p2.y),
                yMax: Math.max(p1.y, p2.y),
                xAtYMin: p1.y < p2.y ? p1.x : p2.x,
                slopeInv: (p2.x - p1.x) / (p2.y - p1.y)
            });
        }
    }

    const result = [];
    const pointMap = new Set();

    for (let y = minY; y <= maxY; y++) {
        const intersections = [];
        for (let i = 0; i < edges.length; i++) {
            const e = edges[i];
            if (y >= e.yMin && y <= e.yMax) {
                const x = e.xAtYMin + (y - e.yMin) * e.slopeInv;
                intersections.push(x);
            }
        }

        intersections.sort((a, b) => a - b);

        for (let i = 0; i < intersections.length - 1; i += 2) {
            const startX = Math.round(intersections[i]);
            const endX = Math.round(intersections[i + 1]);
            for (let x = startX; x <= endX; x++) {
                const key = (y << 16) | (x & 0xFFFF);
                if (!pointMap.has(key)) {
                    pointMap.add(key);
                    result.push({ x, y });
                }
            }
        }
    }

    return result;
}

// Función principal de generación de píxeles para cualquier forma del catálogo
export function generateShapePixels(shapeType, x0, y0, x1, y1, isFill = false, strokeWidth = 1, boardW = 64, boardH = 64) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

    let rawPoints = [];

    // Casos especiales nativos
    if (shapeType === 'line') {
        rawPoints = getThickLine(x0, y0, x1, y1, strokeWidth);
    } else if (SHAPE_SVG_PATHS && SHAPE_SVG_PATHS[shapeType]) {
        // RASTERIZADO VECTORIAL NATIVO PATH2D: 100% IDÉNTICO AL ICONO SVG
        const localPoints = rasterizeSvgPathToPixels(SHAPE_SVG_PATHS[shapeType], w, h, isFill, strokeWidth);
        rawPoints = localPoints.map(p => ({ x: minX + p.x, y: minY + p.y }));
    } else if (shapeType === 'square' || shapeType === 'rectangle' || shapeType === 'flow_process') {
        rawPoints = isFill ? getRectangleFilled(minX, minY, maxX, maxY) : getRectangleOutline(minX, minY, maxX, maxY, strokeWidth);
    } else if (shapeType === 'circle' || shapeType === 'ellipse') {
        rawPoints = isFill ? getEllipseFilled(minX, minY, maxX, maxY) : getEllipseOutline(minX, minY, maxX, maxY);
    } else {
        rawPoints = isFill ? getRectangleFilled(minX, minY, maxX, maxY) : getRectangleOutline(minX, minY, maxX, maxY, strokeWidth);
    }

    // Filtrar límites del lienzo y deduplicar
    const filtered = [];
    const seen = new Set();

    for (let i = 0; i < rawPoints.length; i++) {
        const p = rawPoints[i];
        if (p.x >= 0 && p.x < boardW && p.y >= 0 && p.y < boardH) {
            const key = (p.y << 16) | (p.x & 0xFFFF);
            if (!seen.has(key)) {
                seen.add(key);
                filtered.push({ x: p.x, y: p.y });
            }
        }
    }

    return filtered;
}

export {
    getBresenhamLine,
    getThickLine,
    getRectangleOutline,
    getRectangleFilled,
    getEllipseOutline,
    getEllipseFilled,
    getPolygonOutline,
    getPolygonFilled
};
