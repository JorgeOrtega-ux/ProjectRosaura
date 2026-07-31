/**
 * DesignSandboxDb - Offline IndexedDB storage manager for Rosaura Sandbox mode.
 * Persists custom board settings and pixel chunks in the browser.
 */

export class DesignSandboxDb {
    static db = null;

    static init() {
        if (this.db) return Promise.resolve(this.db);

        return new Promise((resolve, reject) => {
            const request = indexedDB.open('rosaura_sandbox', 1);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
                if (!db.objectStoreNames.contains('chunks')) {
                    db.createObjectStore('chunks');
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };

            request.onerror = (e) => {
                reject(e.target.error);
            };
        });
    }

    static getSettings() {
        return this.init().then(db => {
            return new Promise((resolve) => {
                const tx = db.transaction('settings', 'readonly');
                const store = tx.objectStore('settings');
                const request = store.get('current');
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => resolve(null);
            });
        });
    }

    static saveSettings(settings) {
        return this.init().then(db => {
            return new Promise((resolve, reject) => {
                const tx = db.transaction('settings', 'readwrite');
                const store = tx.objectStore('settings');
                const request = store.put(settings, 'current');
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        });
    }

    static getChunk(key) {
        return this.init().then(db => {
            return new Promise((resolve) => {
                const tx = db.transaction('chunks', 'readonly');
                const store = tx.objectStore('chunks');
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => resolve(null);
            });
        });
    }

    static saveChunk(key, base64Data) {
        return this.init().then(db => {
            return new Promise((resolve, reject) => {
                const tx = db.transaction('chunks', 'readwrite');
                const store = tx.objectStore('chunks');
                const request = store.put(base64Data, key);
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        });
    }

    static clearDb() {
        return this.init().then(db => {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(['chunks', 'settings'], 'readwrite');
                tx.objectStore('chunks').clear();
                tx.objectStore('settings').clear();
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        });
    }

    static async decompress(base64String) {
        if (!base64String) return null;
        try {
            const binaryString = atob(base64String);
            let bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
                if ('DecompressionStream' in window) {
                    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
                    const decompressedBuffer = await new Response(stream).arrayBuffer();
                    bytes = new Uint8Array(decompressedBuffer);
                }
            }
            return bytes;
        } catch (err) {
            console.error('[DesignSandboxDb] Decompression error:', err);
            return null;
        }
    }

    static async compressAndEncode(uint8Array) {
        let bytes = uint8Array;
        if ('CompressionStream' in window) {
            try {
                const stream = new Blob([uint8Array]).stream().pipeThrough(new CompressionStream('gzip'));
                const compressedBuffer = await new Response(stream).arrayBuffer();
                bytes = new Uint8Array(compressedBuffer);
            } catch (e) {
                console.error('[DesignSandboxDb] Compression failed, saving raw bytes', e);
            }
        }
        
        let binary = '';
        const len = bytes.byteLength;
        const chunk = 8192;
        for (let i = 0; i < len; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, len)));
        }
        return btoa(binary);
    }

    static async migrateChunks(oldW, oldH, newW, newH) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('chunks', 'readwrite');
            const store = tx.objectStore('chunks');
            const request = store.openKeyCursor();

            const keys = [];
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    keys.push(cursor.key);
                    cursor.continue();
                } else {
                    (async () => {
                        try {
                            const chunkSize = 512;
                            for (const key of keys) {
                                const [cx, cy] = key.split(',').map(Number);
                                
                                const oldChunkW = Math.min(chunkSize, oldW - cx * chunkSize);
                                const oldChunkH = Math.min(chunkSize, oldH - cy * chunkSize);
                                const newChunkW = Math.min(chunkSize, newW - cx * chunkSize);
                                const newChunkH = Math.min(chunkSize, newH - cy * chunkSize);

                                if (oldChunkW <= 0 || oldChunkH <= 0) continue; 
                                if (newChunkW <= 0 || newChunkH <= 0) {
                                    await new Promise((resDel) => {
                                        const delTx = db.transaction('chunks', 'readwrite');
                                        const delRequest = delTx.objectStore('chunks').delete(key);
                                        delRequest.onsuccess = () => resDel();
                                        delRequest.onerror = () => resDel();
                                    });
                                    continue;
                                }

                                const base64 = await this.getChunk(key);
                                if (!base64) continue;
                                const oldBytes = await this.decompress(base64);
                                if (!oldBytes) continue;

                                const newBytes = new Uint8Array(newChunkW * newChunkH * 4);
                                const limitH = Math.min(oldChunkH, newChunkH);
                                const limitW = Math.min(oldChunkW, newChunkW);

                                for (let y = 0; y < limitH; y++) {
                                    const srcOffset = y * oldChunkW * 4;
                                    const destOffset = y * newChunkW * 4;
                                    if (srcOffset + limitW * 4 <= oldBytes.length && destOffset + limitW * 4 <= newBytes.length) {
                                        newBytes.set(oldBytes.subarray(srcOffset, srcOffset + limitW * 4), destOffset);
                                    }
                                }

                                const newBase64 = await this.compressAndEncode(newBytes);
                                await this.saveChunk(key, newBase64);
                            }
                            resolve(true);
                        } catch (err) {
                            reject(err);
                        }
                    })();
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }
}
