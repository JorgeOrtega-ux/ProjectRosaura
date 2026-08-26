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
const DB_VERSION = 1;
const STORE_STATE = 'canvas_state';
const STORE_LAYERS = 'canvas_layers';
const STORE_BACKUPS = 'canvas_backups';
const STORE_SYNC_QUEUE = 'offline_sync_queue';
const MAX_BACKUPS_PER_CANVAS = 10;

class CanvasStorageEngineClass {
    constructor() {
        this.db = null;
        this.dbPromise = null;
        this.lastBackupHashes = new Map(); // canvasId -> last hash
        this.isFlushingQueue = false;
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
        try {
            const db = await this.getDB();
            if (!db) return false;

            return new Promise((resolve) => {
                const tx = db.transaction([STORE_STATE], 'readwrite');
                const store = tx.objectStore(STORE_STATE);
                const record = {
                    canvasId: parseInt(canvasId, 10),
                    base64: base64Data,
                    width: width,
                    height: height,
                    timestamp: Date.now()
                };
                const req = store.put(record);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            });
        } catch (e) {
            return false;
        }
    }

    /**
     * Obtiene el estado base64/binario del lienzo desde IndexedDB
     */
    async getCanvasState(canvasId) {
        if (!canvasId) return null;
        try {
            const db = await this.getDB();
            if (!db) return null;

            return new Promise((resolve) => {
                const tx = db.transaction([STORE_STATE], 'readonly');
                const store = tx.objectStore(STORE_STATE);
                const req = store.get(parseInt(canvasId, 10));
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

    /**
     * Guarda la estructura de capas y timeline en IndexedDB + fallback seguro
     */
    async saveLayersData(canvasId, layersData) {
        if (!canvasId || !layersData) return false;
        const cId = parseInt(canvasId, 10);

        // Fallback redundante a localStorage
        try {
            localStorage.setItem(`rosaura_layers_${cId}`, JSON.stringify(layersData));
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
                    canvasId: cId,
                    layersData: layersData,
                    timestamp: Date.now()
                };
                const req = store.put(record);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            });
        } catch (e) {
            return false;
        }
    }

    /**
     * Obtiene la estructura de capas desde IndexedDB (con fallback a localStorage)
     */
    async getLayersData(canvasId) {
        if (!canvasId) return null;
        const cId = parseInt(canvasId, 10);

        try {
            const db = await this.getDB();
            if (db) {
                const idbResult = await new Promise((resolve) => {
                    const tx = db.transaction([STORE_LAYERS], 'readonly');
                    const store = tx.objectStore(STORE_LAYERS);
                    const req = store.get(cId);
                    req.onsuccess = () => resolve(req.result ? req.result.layersData : null);
                    req.onerror = () => resolve(null);
                });
                if (idbResult) return idbResult;
            }
        } catch (e) {}

        // Fallback a localStorage
        try {
            const stored = localStorage.getItem(`rosaura_layers_${cId}`);
            if (stored) return JSON.parse(stored);
        } catch (e) {}

        return null;
    }

    /**
     * Crea un Backup Silencioso e Interno con rotación automática (Máximo 10 por lienzo)
     * No muestra ninguna notificación al usuario ("el usuario no se debe enterar").
     */
    async createSilentBackup(canvasId, base64Data, layersData = null, type = 'auto') {
        if (!canvasId || !base64Data) return false;
        const cId = parseInt(canvasId, 10);

        // Generar hash simple rápido de contenido para evitar backups redundantes si no hubo cambios
        const dataSnippet = `${base64Data.slice(0, 80)}_${base64Data.slice(-80)}_${base64Data.length}`;
        const lastHash = this.lastBackupHashes.get(cId);
        if (lastHash === dataSnippet && type === 'auto') {
            return false; // Sin cambios desde el último backup
        }
        this.lastBackupHashes.set(cId, dataSnippet);

        try {
            const db = await this.getDB();
            if (!db) return false;

            const now = Date.now();
            const backupKey = `${cId}_${now}_${Math.random().toString(36).substring(2, 7)}`;
            
            let layerCount = 1;
            if (layersData) {
                if (Array.isArray(layersData)) layerCount = layersData.length;
                else if (Array.isArray(layersData.layers)) layerCount = layersData.layers.length;
            }

            const backupRecord = {
                backupKey: backupKey,
                canvasId: cId,
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
            this._pruneOldBackups(db, cId);
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
            const tx = db.transaction([STORE_BACKUPS], 'readwrite');
            const store = tx.objectStore(STORE_BACKUPS);
            const index = store.index('canvasId');
            const req = index.getAll(canvasId);

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
        const cId = parseInt(canvasId, 10);

        try {
            const db = await this.getDB();
            if (!db) return null;

            return new Promise((resolve) => {
                const tx = db.transaction([STORE_BACKUPS], 'readonly');
                const store = tx.objectStore(STORE_BACKUPS);
                const index = store.index('canvasId');
                const req = index.getAll(cId);

                req.onsuccess = () => {
                    const backups = req.result || [];
                    if (backups.length === 0) {
                        resolve(null);
                        return;
                    }
                    // Ordenar por timestamp descendente
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
        try {
            const db = await this.getDB();
            if (!db) return false;

            return new Promise((resolve) => {
                const tx = db.transaction([STORE_SYNC_QUEUE], 'readwrite');
                const store = tx.objectStore(STORE_SYNC_QUEUE);
                const record = {
                    canvasId: parseInt(canvasId, 10),
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
