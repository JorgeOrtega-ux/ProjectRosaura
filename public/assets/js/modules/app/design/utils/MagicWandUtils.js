/**
 * MagicWandUtils.js
 * Algoritmo de Varita Mágica (Magic Wand) con Flood-Fill BFS y coincidencia por tolerancia.
 */

/**
 * Calcula la distancia perceptual euclidiana entre dos colores en formato ABGR.
 */
function getColorDistance(c1, c2) {
    if (c1 === c2) return 0;

    const r1 = c1 & 0xFF, g1 = (c1 >> 8) & 0xFF, b1 = (c1 >> 16) & 0xFF, a1 = (c1 >> 24) & 0xFF;
    const r2 = c2 & 0xFF, g2 = (c2 >> 8) & 0xFF, b2 = (c2 >> 16) & 0xFF, a2 = (c2 >> 24) & 0xFF;

    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    const da = a1 - a2;

    return Math.sqrt(dr * dr + dg * dg + db * db + da * da);
}

/**
 * Ejecuta la selección por Varita Mágica sobre un búfer de píxeles (Uint32Array ABGR).
 * @param {Uint32Array} buffer - Búfer de píxeles de la capa en formato ABGR.
 * @param {number} startX - Coordenada X inicial.
 * @param {number} startY - Coordenada Y inicial.
 * @param {number} boardW - Ancho del lienzo.
 * @param {number} boardH - Alto del lienzo.
 * @param {number} tolerance - Tolerancia de color (0 a 100).
 * @param {boolean} contiguous - Si es verdadero, solo selecciona píxeles contiguos (BFS). Si es falso, busca en toda la capa.
 * @returns {Array<{x: number, y: number}>} - Lista de píxeles seleccionados.
 */
export function getMagicWandSelectedPixels(buffer, startX, startY, boardW = 64, boardH = 64, tolerance = 0, contiguous = true) {
    if (!buffer || startX < 0 || startX >= boardW || startY < 0 || startY >= boardH) {
        return [];
    }

    const totalLen = boardW * boardH;
    const startIdx = startY * boardW + startX;
    const targetColor = buffer[startIdx];
    const maxDist = tolerance > 0 ? (tolerance * 4.41) : 0; // sqrt(255^2 * 3) ≈ 441.67

    const result = [];
    const visited = new Uint8Array(totalLen);

    if (!contiguous) {
        // Selección global de todo el color en la capa
        for (let i = 0; i < totalLen; i++) {
            const col = buffer[i];
            const dist = (maxDist === 0) ? (col === targetColor ? 0 : 999) : getColorDistance(col, targetColor);
            if (dist <= maxDist) {
                const x = i % boardW;
                const y = Math.floor(i / boardW);
                result.push({ x, y });
            }
        }
        return result;
    }

    // Algoritmo BFS para píxeles contiguos
    const queueX = new Int32Array(totalLen);
    const queueY = new Int32Array(totalLen);
    let head = 0;
    let tail = 0;

    queueX[tail] = startX;
    queueY[tail] = startY;
    tail++;
    visited[startIdx] = 1;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    while (head < tail) {
        const cx = queueX[head];
        const cy = queueY[head];
        head++;

        result.push({ x: cx, y: cy });

        for (let d = 0; d < 4; d++) {
            const nx = cx + dirs[d][0];
            const ny = cy + dirs[d][1];

            if (nx >= 0 && nx < boardW && ny >= 0 && ny < boardH) {
                const nIdx = ny * boardW + nx;
                if (!visited[nIdx]) {
                    visited[nIdx] = 1;
                    const neighborCol = buffer[nIdx];
                    const dist = (maxDist === 0) ? (neighborCol === targetColor ? 0 : 999) : getColorDistance(neighborCol, targetColor);
                    if (dist <= maxDist) {
                        queueX[tail] = nx;
                        queueY[tail] = ny;
                        tail++;
                    }
                }
            }
        }
    }

    return result;
}
