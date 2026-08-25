/**
 * AnimationExporter.js
 * High-performance, zero-dependency pixel art animation exporter.
 * Supports GIF89a encoding, Sprite Sheet packing (Horizontal/Vertical/Grid) with JSON metadata,
 * and Frame Sequences with crisp Nearest-Neighbor scaling.
 */

class SimpleGifEncoder {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.frames = [];
        this.loop = 0; // 0 = loop forever
    }

    setRepeat(loop) {
        this.loop = loop;
    }

    addFrame(ctx, delayMs = 100, isTransparent = true) {
        const imgData = ctx.getImageData(0, 0, this.width, this.height);
        this.frames.push({
            data: imgData.data,
            delay: Math.max(2, Math.round(delayMs / 10)), // centiseconds (1/100 sec)
            transparent: isTransparent
        });
    }

    buildPalette(rgbaData) {
        const colorMap = new Map();
        const palette = [];
        let transparentIndex = -1;

        for (let i = 0; i < rgbaData.length; i += 4) {
            const a = rgbaData[i + 3];
            if (a < 128) {
                if (transparentIndex === -1) {
                    transparentIndex = palette.length;
                    palette.push([0, 0, 0, 0]);
                }
            } else {
                const r = rgbaData[i];
                const g = rgbaData[i + 1];
                const b = rgbaData[i + 2];
                const key = (r << 16) | (g << 8) | b;
                if (!colorMap.has(key)) {
                    if (palette.length < 256) {
                        colorMap.set(key, palette.length);
                        palette.push([r, g, b, 255]);
                    }
                }
            }
        }

        while (palette.length < 2 || (palette.length & (palette.length - 1)) !== 0) {
            if (palette.length >= 256) break;
            palette.push([0, 0, 0, 255]);
        }
        if (palette.length > 256) palette.length = 256;

        return { palette, colorMap, transparentIndex };
    }

    encodeIndexedPixels(rgbaData, palette, colorMap, transparentIndex) {
        const indexed = new Uint8Array(this.width * this.height);
        let ptr = 0;

        for (let i = 0; i < rgbaData.length; i += 4) {
            const a = rgbaData[i + 3];
            if (a < 128 && transparentIndex !== -1) {
                indexed[ptr++] = transparentIndex;
            } else {
                const r = rgbaData[i];
                const g = rgbaData[i + 1];
                const b = rgbaData[i + 2];
                const key = (r << 16) | (g << 8) | b;
                if (colorMap.has(key)) {
                    indexed[ptr++] = colorMap.get(key);
                } else {
                    let bestIdx = 0;
                    let bestDist = Infinity;
                    for (let p = 0; p < palette.length; p++) {
                        if (p === transparentIndex) continue;
                        const pr = palette[p][0];
                        const pg = palette[p][1];
                        const pb = palette[p][2];
                        const dist = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb);
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestIdx = p;
                        }
                    }
                    indexed[ptr++] = bestIdx;
                }
            }
        }
        return indexed;
    }

    lzwEncode(indexedPixels, colorDepth) {
        const initCodeSize = Math.max(2, colorDepth);
        const clearCode = 1 << initCodeSize;
        const eoiCode = clearCode + 1;

        let codeSize = initCodeSize + 1;
        let nextCode = clearCode + 2;

        const dict = new Map();
        for (let i = 0; i < clearCode; i++) {
            dict.set(String.fromCharCode(i), i);
        }

        const outBits = [];
        let curByte = 0;
        let curBit = 0;

        function emit(code, bits) {
            for (let i = 0; i < bits; i++) {
                if (code & (1 << i)) {
                    curByte |= (1 << curBit);
                }
                curBit++;
                if (curBit === 8) {
                    outBits.push(curByte);
                    curByte = 0;
                    curBit = 0;
                }
            }
        }

        emit(clearCode, codeSize);

        let prefix = String.fromCharCode(indexedPixels[0]);
        for (let i = 1; i < indexedPixels.length; i++) {
            const k = String.fromCharCode(indexedPixels[i]);
            const combined = prefix + k;
            if (dict.has(combined)) {
                prefix = combined;
            } else {
                emit(dict.get(prefix), codeSize);
                if (nextCode < 4096) {
                    dict.set(combined, nextCode++);
                    if (nextCode > (1 << codeSize) && codeSize < 12) {
                        codeSize++;
                    }
                } else {
                    emit(clearCode, codeSize);
                    dict.clear();
                    for (let d = 0; d < clearCode; d++) {
                        dict.set(String.fromCharCode(d), d);
                    }
                    codeSize = initCodeSize + 1;
                    nextCode = clearCode + 2;
                }
                prefix = k;
            }
        }
        emit(dict.get(prefix), codeSize);
        emit(eoiCode, codeSize);

        if (curBit > 0) {
            outBits.push(curByte);
        }

        const blocks = [];
        blocks.push(initCodeSize);

        let offset = 0;
        while (offset < outBits.length) {
            const blockSize = Math.min(255, outBits.length - offset);
            blocks.push(blockSize);
            for (let i = 0; i < blockSize; i++) {
                blocks.push(outBits[offset + i]);
            }
            offset += blockSize;
        }
        blocks.push(0); // Block terminator

        return new Uint8Array(blocks);
    }

    render() {
        const out = [];

        // 1. Header GIF89a
        out.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);

        // 2. Logical Screen Descriptor
        out.push(this.width & 0xFF, (this.width >> 8) & 0xFF);
        out.push(this.height & 0xFF, (this.height >> 8) & 0xFF);
        out.push(0x70, 0x00, 0x00); // GCT Flag=0, Color Res=7, Pixel Aspect=0

        // 3. Netscape 2.0 Loop Extension
        if (this.frames.length > 1) {
            out.push(0x21, 0xFF, 0x0B); // Application Extension
            const app = [0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30]; // "NETSCAPE2.0"
            out.push(...app);
            out.push(0x03, 0x01, this.loop & 0xFF, (this.loop >> 8) & 0xFF, 0x00);
        }

        // 4. Frames
        for (let f = 0; f < this.frames.length; f++) {
            const frame = this.frames[f];
            const { palette, colorMap, transparentIndex } = this.buildPalette(frame.data);

            let colorDepth = 1;
            while ((1 << colorDepth) < palette.length) {
                colorDepth++;
            }
            colorDepth = Math.max(1, Math.min(8, colorDepth));
            const actualPaletteLen = 1 << colorDepth;

            // Graphic Control Extension
            out.push(0x21, 0xF9, 0x04);
            const hasTrans = transparentIndex !== -1;
            const disposal = 2; // Restore to background color
            const packedFields = (disposal << 2) | (hasTrans ? 1 : 0);
            out.push(packedFields);
            out.push(frame.delay & 0xFF, (frame.delay >> 8) & 0xFF);
            out.push(hasTrans ? transparentIndex : 0);
            out.push(0x00);

            // Image Descriptor
            out.push(0x2C); // Image Separator
            out.push(0x00, 0x00, 0x00, 0x00); // Left, Top (0, 0)
            out.push(this.width & 0xFF, (this.width >> 8) & 0xFF);
            out.push(this.height & 0xFF, (this.height >> 8) & 0xFF);
            out.push(0x80 | (colorDepth - 1)); // Local Color Table Flag=1, Size

            // Local Color Table
            for (let i = 0; i < actualPaletteLen; i++) {
                if (i < palette.length) {
                    out.push(palette[i][0], palette[i][1], palette[i][2]);
                } else {
                    out.push(0, 0, 0);
                }
            }

            // Image Data (LZW)
            const indexed = this.encodeIndexedPixels(frame.data, palette, colorMap, transparentIndex);
            const lzwBytes = this.lzwEncode(indexed, colorDepth);
            for (let i = 0; i < lzwBytes.length; i++) {
                out.push(lzwBytes[i]);
            }
        }

        // 5. Trailer
        out.push(0x3B);

        return new Blob([new Uint8Array(out)], { type: 'image/gif' });
    }
}

export const AnimationExporter = {
    /**
     * Scale and composite a single frame to a crisp offscreen canvas
     */
    renderScaledFrame(frameCanvas, scale = 1, transparent = true, bgColor = '#ffffff') {
        const w = frameCanvas.width;
        const h = frameCanvas.height;
        const targetW = w * scale;
        const targetH = h * scale;

        const outCanvas = document.createElement('canvas');
        outCanvas.width = targetW;
        outCanvas.height = targetH;
        const ctx = outCanvas.getContext('2d', { alpha: true });
        ctx.imageSmoothingEnabled = false;

        if (!transparent) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, targetW, targetH);
        }

        ctx.drawImage(frameCanvas, 0, 0, targetW, targetH);
        return outCanvas;
    },

    /**
     * Export frames array as an Animated GIF Blob
     */
    async exportToGif(frameCanvases, options = {}) {
        const scale = options.scale || 1;
        const fps = Math.max(1, Math.min(30, options.fps || 12));
        const delayMs = Math.round(1000 / fps);
        const transparent = options.transparent !== false;
        const bgColor = options.bgColor || '#ffffff';

        if (!frameCanvases || frameCanvases.length === 0) return null;

        const first = frameCanvases[0];
        const scaledW = first.width * scale;
        const scaledH = first.height * scale;

        const encoder = new SimpleGifEncoder(scaledW, scaledH);
        encoder.setRepeat(0);

        for (let i = 0; i < frameCanvases.length; i++) {
            const scaledCanvas = this.renderScaledFrame(frameCanvases[i], scale, transparent, bgColor);
            const ctx = scaledCanvas.getContext('2d');
            encoder.addFrame(ctx, delayMs, transparent);
        }

        return encoder.render();
    },

    /**
     * Export frames as a Sprite Sheet PNG (+ optional JSON metadata)
     */
    exportToSpriteSheet(frameCanvases, options = {}) {
        const scale = options.scale || 1;
        const layout = options.layout || 'horizontal'; // 'horizontal' | 'vertical' | 'grid'
        const columns = options.columns || Math.ceil(Math.sqrt(frameCanvases.length));
        const transparent = options.transparent !== false;
        const bgColor = options.bgColor || '#ffffff';
        const fps = options.fps || 12;

        if (!frameCanvases || frameCanvases.length === 0) return null;

        const frameW = frameCanvases[0].width * scale;
        const frameH = frameCanvases[0].height * scale;
        const total = frameCanvases.length;

        let sheetCols = total;
        let sheetRows = 1;

        if (layout === 'vertical') {
            sheetCols = 1;
            sheetRows = total;
        } else if (layout === 'grid') {
            sheetCols = Math.max(1, columns);
            sheetRows = Math.ceil(total / sheetCols);
        }

        const sheetW = sheetCols * frameW;
        const sheetH = sheetRows * frameH;

        const canvas = document.createElement('canvas');
        canvas.width = sheetW;
        canvas.height = sheetH;
        const ctx = canvas.getContext('2d', { alpha: true });
        ctx.imageSmoothingEnabled = false;

        if (!transparent) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, sheetW, sheetH);
        }

        const framesMeta = [];

        frameCanvases.forEach((fc, idx) => {
            let col = idx;
            let row = 0;
            if (layout === 'vertical') {
                col = 0;
                row = idx;
            } else if (layout === 'grid') {
                col = idx % sheetCols;
                row = Math.floor(idx / sheetCols);
            }

            const destX = col * frameW;
            const destY = row * frameH;

            const scaled = this.renderScaledFrame(fc, scale, transparent, bgColor);
            ctx.drawImage(scaled, destX, destY);

            framesMeta.push({
                filename: `frame_${idx + 1}.png`,
                frame: { x: destX, y: destY, w: frameW, h: frameH },
                rotated: false,
                trimmed: false,
                spriteSourceSize: { x: 0, y: 0, w: frameW, h: frameH },
                sourceSize: { w: frameW, h: frameH },
                duration: Math.round(1000 / fps)
            });
        });

        const jsonMetadata = {
            frames: framesMeta,
            meta: {
                app: "Project Rosaura Pixel Studio",
                version: "2.0",
                image: "spritesheet.png",
                format: "RGBA8888",
                size: { w: sheetW, h: sheetH },
                scale: `${scale}x`
            }
        };

        return {
            canvas,
            jsonMetadata
        };
    },

    /**
     * Download helper
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 300);
    }
};
