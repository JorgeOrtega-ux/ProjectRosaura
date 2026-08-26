/**
 * CanvasStorageEngine.js
 * Motor de Persistencia IndexedDB y Sistema de Backups Silencioso para Project Rosaura.
 * 
 * Garantiza:
 * 1. Persistencia local indestructible de estados de lienzo, capas y frames de animación.
 * 2. Backups silenciosos rotativos periódicos en segundo plano (sin intervención del usuario).
 * 3. Autorrecuperación automática ante corrupción o caídas del navegador.
 * 4. Cola de sincronización offline resiliente con retroceso adaptativo ante errores o HTTP 429.
 */

const DB_NAME = 'RosauraCanvasDB_v2';
const DB_VERSION = 3;
const STORE_STATE = 'canvas_state';
const STORE_LAYERS = 'canvas_layers';
const STORE_BACKUPS = 'canvas_backups';
const STORE_SYNC_QUEUE = 'offline_sync_queue';
const STORE_LOCAL_CANVASES = 'local_canvases';
const MAX_BACKUPS_PER_CANVAS = 10;

class CanvasStorageEngineClass {
    constructor() {
        this.db = null;
        this.dbPromise = null;
        this.lastBackupHashes = new Map(); // canvasId -> last hash
        this.isFlushingQueue = false;
    }

    _normalizeCanvasId(canvasId) {
        if (canvasId === undefined || canvasId === null) return '';
        if (typeof canvasId === 'string' && (canvasId.startsWith('local_') || isNaN(Number(canvasId)))) {
            return canvasId;
        }
        const parsed = parseInt(canvasId, 10);
        return isNaN(parsed) ? String(canvasId) : parsed;
    }

    /**
     * Inicializa la conexión a IndexedDB con estructura de Object Stores
     */
    async getDB() {
        if (this.db) return this.db;
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                resolve(null);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // 1. Estado binario/base64 actual del lienzo
                if (!db.objectStoreNames.contains(STORE_STATE)) {
                    db.createObjectStore(STORE_STATE, { keyPath: 'canvasId' });
                }

                // 2. Estructura de capas, opacidad, blend modes y timeline
                if (!db.objectStoreNames.contains(STORE_LAYERS)) {
                    db.createObjectStore(STORE_LAYERS, { keyPath: 'canvasId' });
                }

                // 3. Backups rotativos silenciosos
                if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
                    const backupStore = db.createObjectStore(STORE_BACKUPS, { keyPath: 'backupKey' });
                    backupStore.createIndex('canvasId', 'canvasId', { unique: false });
                    backupStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // 4. Cola de sincronización diferida
                if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
                    const queueStore = db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
                    queueStore.createIndex('canvasId', 'canvasId', { unique: false });
                    queueStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // 5. Metadatos de lienzos creados localmente por usuarios sin sesión
                if (!db.objectStoreNames.contains(STORE_LOCAL_CANVASES)) {
                    const localStore = db.createObjectStore(STORE_LOCAL_CANVASES, { keyPath: 'uuid' });
                    localStore.createIndex('id', 'id', { unique: false });
                    localStore.createIndex('created_at', 'created_at', { unique: false });
                    localStore.createIndex('updated_at', 'updated_at', { unique: false });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };

            request.onerror = (e) => {
                console.warn('[CanvasStorageEngine] IndexedDB open error, using memory/localStorage fallback:', e);
                resolve(null);
            };
        });

        return this.dbPromise;
    }

    /**
     * Guarda el estado base64/binario del lienzo en IndexedDB
     */
    async saveCanvasState(canvasId, base64Data, width = 64, height = 64) {
        if (!canvasId || !base64Data) return false;
        const normId = this._normalizeCanvasId(canvasId);
        console.log('[TemplateDebug][CanvasStorageEngine] saveCanvasState:', {
            canvasId,
            normId,
            base64Length: base64Data?.length,
            base64Preview: base64Data?.substring(0, 40),
            width,
            height
        });
        try {
            const db = await this.getDB();
            if (!db) {
                console.warn('[TemplateDebug][CanvasStorageEngine] saveCanvasState failed: DB not available');
                return false;
            }

            return new Promise((resolve) => {
                const tx = db.transaction([STORE_STATE], 'readwrite');
                const store = tx.objectStore(STORE_STATE);
                const record = {
                    canvasId: normId,
                    base64: base64Data,
                    width: width,
                    height: height,
                    timestamp: Date.now()
                };
                const req = store.put(record);
                req.onsuccess = () => {
                    console.log('[TemplateDebug][CanvasStorageEngine] saveCanvasState SUCCESS for normId:', normId);
                    resolve(true);
                };
                req.onerror = (e) => {
                    console.error('[TemplateDebug][CanvasStorageEngine] saveCanvasState ERROR for normId:', normId, e);
                    resolve(false);
                };
            });
        } catch (e) {
            console.error('[TemplateDebug][CanvasStorageEngine] saveCanvasState EXCEPTION:', e);
            return false;
        }
    }

    /**
     * Obtiene el estado base64/binario del lienzo desde IndexedDB
     */
    async getCanvasState(canvasId) {
        if (!canvasId) return null;
        const normId = this._normalizeCanvasId(canvasId);
        console.log('[TemplateDebug][CanvasStorageEngine] getCanvasState requested for:', { canvasId, normId });
        try {
            const db = await this.getDB();
            if (!db) {
                console.warn('[TemplateDebug][CanvasStorageEngine] getCanvasState failed: DB not available');
                return null;
            }

            return new Promise((resolve) => {
                const tx = db.transaction([STORE_STATE], 'readonly');
                const store = tx.objectStore(STORE_STATE);
                const req = store.get(normId);
                req.onsuccess = () => {
                    const res = req.result || null;
                    console.log('[TemplateDebug][CanvasStorageEngine] getCanvasState SUCCESS for normId:', normId, {
                        found: !!res,
                        base64Length: res?.base64?.length,
                        base64Preview: res?.base64?.substring(0, 40)
                    });
                    resolve(res);
                };
                req.onerror = (e) => {
                    console.error('[TemplateDebug][CanvasStorageEngine] getCanvasState ERROR for normId:', normId, e);
                    resolve(null);
                };
            });
        } catch (e) {
            console.error('[TemplateDebug][CanvasStorageEngine] getCanvasState EXCEPTION:', e);
            return null;
        }
    }

    /**
     * Guarda la estructura de capas y timeline en IndexedDB + fallback seguro
     */
    async saveLayersData(canvasId, layersData) {
        if (!canvasId || !layersData) return false;
        const normId = this._normalizeCanvasId(canvasId);
        console.log('[TemplateDebug][CanvasStorageEngine] saveLayersData:', {
            canvasId,
            normId,
            layersData
        });

        // Fallback redundante a localStorage
        try {
            localStorage.setItem(`rosaura_layers_${normId}`, JSON.stringify(layersData));
        } catch (lsErr) {
            // Ignorar QuotaExceededError en localStorage ya que IndexedDB es la fuente principal
        }

        try {
            const db = await this.getDB();
            if (!db) return true;

            return new Promise((resolve) => {
                const tx = db.transaction([STORE_LAYERS], 'readwrite');
                const store = tx.objectStore(STORE_LAYERS);
                const record = {
                    canvasId: normId,
                    layersData: layersData,
                    timestamp: Date.now()
                };
                const req = store.put(record);
                req.onsuccess = () => {
                    console.log('[TemplateDebug][CanvasStorageEngine] saveLayersData SUCCESS for normId:', normId);
                    resolve(true);
                };
                req.onerror = (e) => {
                    console.error('[TemplateDebug][CanvasStorageEngine] saveLayersData ERROR for normId:', normId, e);
                    resolve(false);
                };
            });
        } catch (e) {
            console.error('[TemplateDebug][CanvasStorageEngine] saveLayersData EXCEPTION:', e);
            return false;
        }
    }

    /**
     * Obtiene la estructura de capas desde IndexedDB (con fallback a localStorage)
     */
    async getLayersData(canvasId) {
        if (!canvasId) return null;
        const normId = this._normalizeCanvasId(canvasId);
        console.log('[TemplateDebug][CanvasStorageEngine] getLayersData requested for:', { canvasId, normId });

        try {
            const db = await this.getDB();
            if (db) {
                const idbResult = await new Promise((resolve) => {
                    const tx = db.transaction([STORE_LAYERS], 'readonly');
                    const store = tx.objectStore(STORE_LAYERS);
                    const req = store.get(normId);
                    req.onsuccess = () => resolve(req.result ? req.result.layersData : null);
                    req.onerror = () => resolve(null);
                });
                if (idbResult) {
                    console.log('[TemplateDebug][CanvasStorageEngine] getLayersData returned from IndexedDB for normId:', normId, idbResult);
                    return idbResult;
                }
            }
        } catch (e) {}

        // Fallback a localStorage
        try {
            const stored = localStorage.getItem(`rosaura_layers_${normId}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                console.log('[TemplateDebug][CanvasStorageEngine] getLayersData returned from localStorage for normId:', normId, parsed);
                return parsed;
            }
        } catch (e) {}

        console.log('[TemplateDebug][CanvasStorageEngine] getLayersData NOT FOUND for normId:', normId);
        return null;
    }

    /**
     * Guarda o actualiza los metadatos de un lienzo local en IndexedDB
     */
    async saveLocalCanvas(meta) {
        if (!meta || !meta.uuid) return false;
        try {
            const db = await this.getDB();
            if (!db) return false;

            const now = new Date().toISOString();
            const record = {
                id: meta.id || meta.uuid,
                uuid: meta.uuid,
                name: meta.name || 'Canvas_' + Date.now(),
                size: meta.size || '64x64',
                privacy: meta.privacy || 'private',
                mode: 'offline',
                is_local: true,
                palette_id: meta.palette_id || 'default',
                tags: Array.isArray(meta.tags) ? meta.tags : [],
                template_id: meta.template_id || null,
                created_at: meta.created_at || now,
                updated_at: now,
                storage_bytes: meta.storage_bytes || 0,
                is_owner: true,
                is_favorite: !!meta.is_favorite,
                members_count: 1,
                online_players: 0,
                is_online_active: false,
                thumbnail_url: meta.thumbnail_url || null
            };

            return new Promise((resolve) => {
                const tx = db.transaction([STORE_LOCAL_CANVASES], 'readwrite');
                const store = tx.objectStore(STORE_LOCAL_CANVASES);
                const req = store.put(record);
                req.onsuccess = () => resolve(record);
                req.onerror = () => resolve(false);
            });
        } catch (e) {
            return false;
        }
    }

    /**
     * Obtiene un lienzo local por su UUID
     */
    async getLocalCanvas(uuid) {
        if (!uuid) return null;
        try {
            const db = await this.getDB();
            if (!db) return null;

            return new Promise((resolve) => {
                const tx = db.transaction([STORE_LOCAL_CANVASES], 'readonly');
                const store = tx.objectStore(STORE_LOCAL_CANVASES);
                const req = store.get(uuid);
                req.onsuccess = () => {
                    console.log('[TemplateDebug][CanvasStorageEngine] getLocalCanvas result for uuid:', uuid, req.result);
                    resolve(req.result || null);
                };
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

    /**
     * Obtiene todos los lienzos locales guardados en el dispositivo
     */
    async getAllLocalCanvases() {
        try {
            const db = await this.getDB();
            if (!db) return [];

            return new Promise((resolve) => {
                const tx = db.transaction([STORE_LOCAL_CANVASES], 'readonly');
                const store = tx.objectStore(STORE_LOCAL_CANVASES);
                const req = store.getAll();
                req.onsuccess = () => {
                    const list = req.result || [];
                    list.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
                    resolve(list);
                };
                req.onerror = () => resolve([]);
            });
        } catch (e) {
            return [];
        }
    }

    /**
     * Elimina un lienzo local y todos sus datos asociados (estado, capas, backups)
     */
    async deleteLocalCanvas(uuid) {
        if (!uuid) return false;
        const normId = this._normalizeCanvasId(uuid);
        try {
            const db = await this.getDB();
            if (!db) return false;

            // 1. Eliminar de local_canvases
            await new Promise((resolve) => {
                const tx = db.transaction([STORE_LOCAL_CANVASES], 'readwrite');
                const store = tx.objectStore(STORE_LOCAL_CANVASES);
                const req = store.delete(uuid);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            });

            // 2. Eliminar de canvas_state
            try {
                const tx = db.transaction([STORE_STATE], 'readwrite');
                tx.objectStore(STORE_STATE).delete(normId);
            } catch (e) {}

            // 3. Eliminar de canvas_layers
            try {
                const tx = db.transaction([STORE_LAYERS], 'readwrite');
                tx.objectStore(STORE_LAYERS).delete(normId);
            } catch (e) {}

            // 4. Limpiar backups asociados
            try {
                const tx = db.transaction([STORE_BACKUPS], 'readwrite');
                const store = tx.objectStore(STORE_BACKUPS);
                const index = store.index('canvasId');
                const req = index.getAll(normId);
                req.onsuccess = () => {
                    (req.result || []).forEach(b => store.delete(b.backupKey));
                };
            } catch (e) {}

            // 5. Limpiar claves redundantes de localStorage
            try {
                localStorage.removeItem(`rosaura_layers_${normId}`);
                localStorage.removeItem(`rosaura_custom_colors_${normId}`);
            } catch (e) {}

            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Descomprime un string base64 que potencialmente contiene flujo binario Gzip
     */
    async decompressBase64(base64Str) {
        if (!base64Str) return null;
        try {
            const binaryString = atob(base64Str);
            let bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Detectar magic bytes de Gzip (0x1F, 0x8B)
            if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
                if (typeof DecompressionStream !== 'undefined') {
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

    /**
     * Actualiza la miniatura de vista previa de un lienzo local
     */
    async updateLocalCanvasThumbnail(uuid, thumbnailDataUrl) {
        if (!uuid || !thumbnailDataUrl) return false;
        try {
            const canvas = await this.getLocalCanvas(uuid);
            if (!canvas) return false;
            canvas.thumbnail_url = thumbnailDataUrl;
            canvas.updated_at = new Date().toISOString();
            return await this.saveLocalCanvas(canvas);
        } catch (e) {
            return false;
        }
    }

    /**
     * Cuenta cuántos lienzos locales existen en IndexedDB
     */
    async countLocalCanvases() {
        try {
            const db = await this.getDB();
            if (!db) return 0;
            return new Promise((resolve) => {
                const tx = db.transaction([STORE_LOCAL_CANVASES], 'readonly');
                const req = tx.objectStore(STORE_LOCAL_CANVASES).count();
                req.onsuccess = () => resolve(req.result || 0);
                req.onerror = () => resolve(0);
            });
        } catch (e) {
            return 0;
        }
    }

    /**
     * Crea un Backup Silencioso e Interno con rotación automática (Máximo 10 por lienzo)
     * No muestra ninguna notificación al usuario ("el usuario no se debe enterar").
     */
    async createSilentBackup(canvasId, base64Data, layersData = null, type = 'auto') {
        if (!canvasId || !base64Data) return false;
        const normId = this._normalizeCanvasId(canvasId);

        // Generar hash simple rápido de contenido para evitar backups redundantes si no hubo cambios
        const dataSnippet = `${base64Data.slice(0, 80)}_${base64Data.slice(-80)}_${base64Data.length}`;
        const lastHash = this.lastBackupHashes.get(normId);
        if (lastHash === dataSnippet && type === 'auto') {
            return false; // Sin cambios desde el último backup
        }
        this.lastBackupHashes.set(normId, dataSnippet);

        try {
            const db = await this.getDB();
            if (!db) return false;

            const now = Date.now();
            const backupKey = `${normId}_${now}_${Math.random().toString(36).substring(2, 7)}`;
            
            let layerCount = 1;
            if (layersData) {
                if (Array.isArray(layersData)) layerCount = layersData.length;
                else if (Array.isArray(layersData.layers)) layerCount = layersData.layers.length;
            }

            const backupRecord = {
                backupKey: backupKey,
                canvasId: normId,
                timestamp: now,
                type: type,
                base64: base64Data,
                layersData: layersData,
                layerCount: layerCount
            };

            await new Promise((resolve) => {
                const tx = db.transaction([STORE_BACKUPS], 'readwrite');
                const store = tx.objectStore(STORE_BACKUPS);
                const req = store.put(backupRecord);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            });

            // Rotación: Podar backups viejos si superan MAX_BACKUPS_PER_CANVAS
            this._pruneOldBackups(db, normId);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Mantiene como máximo MAX_BACKUPS_PER_CANVAS backups por lienzo
     */
    async _pruneOldBackups(db, canvasId) {
        try {
            const normId = this._normalizeCanvasId(canvasId);
            const tx = db.transaction([STORE_BACKUPS], 'readwrite');
            const store = tx.objectStore(STORE_BACKUPS);
            const index = store.index('canvasId');
            const req = index.getAll(normId);

            req.onsuccess = () => {
                const backups = req.result || [];
                if (backups.length > MAX_BACKUPS_PER_CANVAS) {
                    // Ordenar por timestamp ascendente (los más antiguos primero)
                    backups.sort((a, b) => a.timestamp - b.timestamp);
                    const toDeleteCount = backups.length - MAX_BACKUPS_PER_CANVAS;
                    for (let i = 0; i < toDeleteCount; i++) {
                        store.delete(backups[i].backupKey);
                    }
                }
            };
        } catch (e) {}
    }

    /**
     * Recupera el backup válido más reciente (para autorrecuperación silenciosa en caso de desastre)
     */
    async getLatestValidBackup(canvasId) {
        if (!canvasId) return null;
        const normId = this._normalizeCanvasId(canvasId);

        try {
            const db = await this.getDB();
            if (!db) return null;

            return new Promise((resolve) => {
                const tx = db.transaction([STORE_BACKUPS], 'readonly');
                const store = tx.objectStore(STORE_BACKUPS);
                const index = store.index('canvasId');
                const req = index.getAll(normId);

                req.onsuccess = () => {
                    const backups = req.result || [];
                    if (backups.length === 0) {
                        resolve(null);
                        return;
                    }
                    backups.sort((a, b) => b.timestamp - a.timestamp);
                    const latest = backups.find(b => b.base64 && b.base64.length > 50);
                    resolve(latest || null);
                };
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

    /**
     * Encola una petición de guardado pendiente cuando ocurre error de red o 429
     */
    async enqueueOfflineSync(canvasId, endpoint, payload) {
        if (!canvasId || !payload) return false;
        const normId = this._normalizeCanvasId(canvasId);
        try {
            const db = await this.getDB();
            if (!db) return false;

            return new Promise((resolve) => {
                const tx = db.transaction([STORE_SYNC_QUEUE], 'readwrite');
                const store = tx.objectStore(STORE_SYNC_QUEUE);
                const record = {
                    canvasId: normId,
                    endpoint: endpoint,
                    payload: payload,
                    retryCount: 0,
                    createdAt: Date.now(),
                    nextRetry: Date.now() + 2000
                };
                const req = store.add(record);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            });
        } catch (e) {
            return false;
        }
    }

    /**
     * Procesa la cola de sincronización pendiente con retroceso adaptativo
     */
    async flushOfflineSyncQueue(apiClient) {
        if (this.isFlushingQueue || !apiClient) return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

        this.isFlushingQueue = true;

        try {
            const db = await this.getDB();
            if (!db) {
                this.isFlushingQueue = false;
                return;
            }

            const pending = await new Promise((resolve) => {
                const tx = db.transaction([STORE_SYNC_QUEUE], 'readonly');
                const store = tx.objectStore(STORE_SYNC_QUEUE);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            });

            const now = Date.now();
            for (const item of pending) {
                if (item.nextRetry > now) continue;

                try {
                    const resp = await apiClient.post(item.endpoint, item.payload);
                    if (resp && resp.success) {
                        // Éxito: eliminar de la cola
                        const delTx = db.transaction([STORE_SYNC_QUEUE], 'readwrite');
                        delTx.objectStore(STORE_SYNC_QUEUE).delete(item.id);
                    } else if (resp && (resp.isRateLimited || resp.http_code === 429)) {
                        // Rate limited: aplicar backoff exponencial (10s, 20s, 40s)
                        const nextDelay = Math.min(60000, 10000 * Math.pow(2, item.retryCount || 0));
                        item.retryCount = (item.retryCount || 0) + 1;
                        item.nextRetry = Date.now() + nextDelay;
                        const updateTx = db.transaction([STORE_SYNC_QUEUE], 'readwrite');
                        updateTx.objectStore(STORE_SYNC_QUEUE).put(item);
                        break; // Pausar vaciado para no seguir disparando 429
                    } else {
                        // Error de servidor u otro: reintentar en 5s
                        item.retryCount = (item.retryCount || 0) + 1;
                        item.nextRetry = Date.now() + 5000;
                        if (item.retryCount > 10) {
                            // Limitar reintentos excesivos pero preservar en backups
                            const delTx = db.transaction([STORE_SYNC_QUEUE], 'readwrite');
                            delTx.objectStore(STORE_SYNC_QUEUE).delete(item.id);
                        } else {
                            const updateTx = db.transaction([STORE_SYNC_QUEUE], 'readwrite');
                            updateTx.objectStore(STORE_SYNC_QUEUE).put(item);
                        }
                    }
                } catch (netErr) {
                    break;
                }
            }
        } catch (e) {
        } finally {
            this.isFlushingQueue = false;
        }
    }
}

export const CanvasStorageEngine = new CanvasStorageEngineClass();
