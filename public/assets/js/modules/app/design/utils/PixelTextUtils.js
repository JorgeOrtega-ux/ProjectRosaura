import { getPixelFont } from '../data/PixelFontsData.js';

export function renderPixelText({
    text = '',
    fontId = 'arcade_5x7',
    scale = 1,
    letterSpacing = 1,
    lineSpacing = 2,
    hasOutline = false,
    hasShadow = false,
    originX = 0,
    originY = 0,
    boardW = 64,
    boardH = 64
} = {}) {
    if (!text || typeof text !== 'string') {
        return {
            points: [],
            outlinePoints: [],
            shadowPoints: [],
            bounds: { minX: originX, minY: originY, maxX: originX, maxY: originY, w: 0, h: 0 },
            totalWidth: 0,
            totalHeight: 0
        };
    }

    const font = getPixelFont(fontId);
    const s = Math.max(1, Math.min(6, parseInt(scale, 10) || 1));
    const lSpacing = Math.max(0, parseInt(letterSpacing, 10) || 0) * s;
    const lines = text.split('\n');
    
    const textPointsMap = new Set();
    const textPoints = [];
    
    let maxLineWidth = 0;
    let curY = originY;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        let curX = originX;

        for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const char = line[charIdx];
            const upperChar = char.toUpperCase();
            const glyphRows = font.glyphs[char] || font.glyphs[upperChar] || font.glyphs['?'] || font.glyphs[' '];

            if (glyphRows && glyphRows.length > 0) {
                for (let r = 0; r < font.height; r++) {
                    const rowBits = glyphRows[r] || 0;
                    for (let c = 0; c < font.width; c++) {
                        const bit = (rowBits >> (font.width - 1 - c)) & 1;
                        if (bit === 1) {
                            for (let dy = 0; dy < s; dy++) {
                                for (let dx = 0; dx < s; dx++) {
                                    const px = curX + (c * s) + dx;
                                    const py = curY + (r * s) + dy;
                                    if (px >= 0 && px < boardW && py >= 0 && py < boardH) {
                                        const key = (py << 16) | (px & 0xFFFF);
                                        if (!textPointsMap.has(key)) {
                                            textPointsMap.add(key);
                                            textPoints.push({ x: px, y: py });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            curX += (font.width * s) + lSpacing;
        }

        const lineWidth = curX - originX - (line.length > 0 ? lSpacing : 0);
        if (lineWidth > maxLineWidth) {
            maxLineWidth = lineWidth;
        }

        curY += (font.height * s) + (lineSpacing * s);
    }

    const totalHeight = curY - originY - (lines.length > 0 ? (lineSpacing * s) : 0);
    const totalWidth = maxLineWidth;

    const shadowPoints = [];
    if (hasShadow) {
        const shadowMap = new Set();
        const shadowOffset = 1 * s;
        for (let i = 0; i < textPoints.length; i++) {
            const pt = textPoints[i];
            const sx = pt.x + shadowOffset;
            const sy = pt.y + shadowOffset;
            if (sx >= 0 && sx < boardW && sy >= 0 && sy < boardH) {
                const key = (sy << 16) | (sx & 0xFFFF);
                if (!textPointsMap.has(key) && !shadowMap.has(key)) {
                    shadowMap.add(key);
                    shadowPoints.push({ x: sx, y: sy });
                }
            }
        }
    }

    const outlinePoints = [];
    if (hasOutline) {
        const outlineMap = new Set();
        const dirs = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];

        for (let i = 0; i < textPoints.length; i++) {
            const pt = textPoints[i];
            for (let d = 0; d < dirs.length; d++) {
                const ox = pt.x + dirs[d][0];
                const oy = pt.y + dirs[d][1];
                if (ox >= 0 && ox < boardW && oy >= 0 && oy < boardH) {
                    const key = (oy << 16) | (ox & 0xFFFF);
                    if (!textPointsMap.has(key) && !outlineMap.has(key)) {
                        outlineMap.add(key);
                        outlinePoints.push({ x: ox, y: oy });
                    }
                }
            }
        }
    }

    let minX = originX;
    let minY = originY;
    let maxX = originX + totalWidth - 1;
    let maxY = originY + totalHeight - 1;

    if (textPoints.length > 0) {
        minX = Math.min(...textPoints.map(p => p.x));
        minY = Math.min(...textPoints.map(p => p.y));
        maxX = Math.max(...textPoints.map(p => p.x));
        maxY = Math.max(...textPoints.map(p => p.y));
    }

    return {
        points: textPoints,
        outlinePoints,
        shadowPoints,
        bounds: {
            minX,
            minY,
            maxX,
            maxY,
            w: Math.max(1, maxX - minX + 1),
            h: Math.max(1, maxY - minY + 1)
        },
        totalWidth,
        totalHeight
    };
}
