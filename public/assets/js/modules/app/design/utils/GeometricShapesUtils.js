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

function getTriangleOutline(x0, y0, x1, y1, width = 1) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    const topX = Math.round((minX + maxX) / 2);
    const topY = minY;
    const leftX = minX;
    const leftY = maxY;
    const rightX = maxX;
    const rightY = maxY;

    const l1 = getThickLine(topX, topY, leftX, leftY, width);
    const l2 = getThickLine(leftX, leftY, rightX, rightY, width);
    const l3 = getThickLine(rightX, rightY, topX, topY, width);

    const pointMap = new Set();
    const result = [];

    const addBatch = (arr) => {
        for (let i = 0; i < arr.length; i++) {
            const p = arr[i];
            const key = (p.y << 16) | (p.x & 0xFFFF);
            if (!pointMap.has(key)) {
                pointMap.add(key);
                result.push(p);
            }
        }
    };

    addBatch(l1);
    addBatch(l2);
    addBatch(l3);
    return result;
}

function getTriangleFilled(x0, y0, x1, y1) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    const topX = Math.round((minX + maxX) / 2);
    const topY = minY;
    const leftX = minX;
    const leftY = maxY;
    const rightX = maxX;
    const rightY = maxY;

    const lLeft = getBresenhamLine(topX, topY, leftX, leftY);
    const lRight = getBresenhamLine(topX, topY, rightX, rightY);

    const minScan = new Map();
    const maxScan = new Map();

    const recordLine = (arr) => {
        for (let i = 0; i < arr.length; i++) {
            const { x, y } = arr[i];
            if (!minScan.has(y) || x < minScan.get(y)) minScan.set(y, x);
            if (!maxScan.has(y) || x > maxScan.get(y)) maxScan.set(y, x);
        }
    };

    recordLine(lLeft);
    recordLine(lRight);

    const result = [];
    for (let y = minY; y <= maxY; y++) {
        const sX = minScan.has(y) ? minScan.get(y) : minX;
        const eX = maxScan.has(y) ? maxScan.get(y) : maxX;
        for (let x = sX; x <= eX; x++) {
            result.push({ x, y });
        }
    }
    return result;
}

function getDiamondOutline(x0, y0, x1, y1, width = 1) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    const midX = Math.round((minX + maxX) / 2);
    const midY = Math.round((minY + maxY) / 2);

    const pTop = { x: midX, y: minY };
    const pRight = { x: maxX, y: midY };
    const pBottom = { x: midX, y: maxY };
    const pLeft = { x: minX, y: midY };

    const l1 = getThickLine(pTop.x, pTop.y, pRight.x, pRight.y, width);
    const l2 = getThickLine(pRight.x, pRight.y, pBottom.x, pBottom.y, width);
    const l3 = getThickLine(pBottom.x, pBottom.y, pLeft.x, pLeft.y, width);
    const l4 = getThickLine(pLeft.x, pLeft.y, pTop.x, pTop.y, width);

    const pointMap = new Set();
    const result = [];

    const addBatch = (arr) => {
        for (let i = 0; i < arr.length; i++) {
            const p = arr[i];
            const key = (p.y << 16) | (p.x & 0xFFFF);
            if (!pointMap.has(key)) {
                pointMap.add(key);
                result.push(p);
            }
        }
    };

    addBatch(l1);
    addBatch(l2);
    addBatch(l3);
    addBatch(l4);
    return result;
}

function getDiamondFilled(x0, y0, x1, y1) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    const midX = Math.round((minX + maxX) / 2);
    const midY = Math.round((minY + maxY) / 2);

    const l1 = getBresenhamLine(midX, minY, maxX, midY);
    const l2 = getBresenhamLine(maxX, midY, midX, maxY);
    const l3 = getBresenhamLine(midX, maxY, minX, midY);
    const l4 = getBresenhamLine(minX, midY, midX, minY);

    const minScan = new Map();
    const maxScan = new Map();

    const recordLine = (arr) => {
        for (let i = 0; i < arr.length; i++) {
            const { x, y } = arr[i];
            if (!minScan.has(y) || x < minScan.get(y)) minScan.set(y, x);
            if (!maxScan.has(y) || x > maxScan.get(y)) maxScan.set(y, x);
        }
    };

    recordLine(l1);
    recordLine(l2);
    recordLine(l3);
    recordLine(l4);

    const result = [];
    for (let y = minY; y <= maxY; y++) {
        const sX = minScan.has(y) ? minScan.get(y) : minX;
        const eX = maxScan.has(y) ? maxScan.get(y) : maxX;
        for (let x = sX; x <= eX; x++) {
            result.push({ x, y });
        }
    }
    return result;
}

export function generateShapePixels(shapeType, x0, y0, x1, y1, isFill = false, strokeWidth = 1, boardW = 64, boardH = 64) {
    let rawPoints = [];

    switch (shapeType) {
        case 'line':
            rawPoints = getThickLine(x0, y0, x1, y1, strokeWidth);
            break;
        case 'rectangle':
            rawPoints = isFill ? getRectangleFilled(x0, y0, x1, y1) : getRectangleOutline(x0, y0, x1, y1, strokeWidth);
            break;
        case 'circle':
        case 'ellipse':
            rawPoints = isFill ? getEllipseFilled(x0, y0, x1, y1) : getEllipseOutline(x0, y0, x1, y1);
            break;
        case 'triangle':
            rawPoints = isFill ? getTriangleFilled(x0, y0, x1, y1) : getTriangleOutline(x0, y0, x1, y1, strokeWidth);
            break;
        case 'diamond':
        case 'rhombus':
            rawPoints = isFill ? getDiamondFilled(x0, y0, x1, y1) : getDiamondOutline(x0, y0, x1, y1, strokeWidth);
            break;
        default:
            rawPoints = getThickLine(x0, y0, x1, y1, strokeWidth);
            break;
    }

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
    getTriangleOutline,
    getTriangleFilled,
    getDiamondOutline,
    getDiamondFilled
};
