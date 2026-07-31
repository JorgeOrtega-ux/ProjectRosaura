import { showMessage } from '../../../core/utils/uiUtils.js';

export const DesignInteractionsOwner = {
    toggleOwnerEraser() {
        if (!this.isOwner || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        if (this.interactionMode === 'owner_erasing') {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (typeof showMessage === 'function') showMessage(window.__('msg_eraser_mode_off'), 'info');
        } else {
            this.interactionMode = 'owner_erasing';
            this.activeBomb = null;
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (typeof showMessage === 'function') showMessage('Modo Borrador de Lienzo activado. Haz clic en la primera esquina para definir la zona.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    selectOwnerArea(x1, y1, x2, y2, append = false) {
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;

        const minX = Math.max(0, Math.min(x1, x2));
        const maxX = Math.min(bw - 1, Math.max(x1, x2));
        const minY = Math.max(0, Math.min(y1, y2));
        const maxY = Math.min(bh - 1, Math.max(y1, y2));

        if (!append) {
            this.selectedPixels.clear();
        }

        // Optimization: Do NOT populate this.selectedPixels.
        // It freezes the browser for large selections. 
        // We only use ownerEraserBox.
        this.ownerEraserBox = { x1: minX, y1: minY, x2: maxX, y2: maxY };
        this.updateSelectionUI();
        this.requestRender();
    },

    executeOwnerClearArea() {
        if (!this.ownerEraserBox) return;

        // Implement cooldown of 5 seconds
        const now = Date.now();
        if (this.lastOwnerEraseTime && now - this.lastOwnerEraseTime < 5000) {
            const secondsLeft = Math.ceil((5000 - (now - this.lastOwnerEraseTime)) / 1000);
            if (typeof showMessage === 'function') {
                showMessage(`Espera ${secondsLeft} segundos antes de usar el borrador de nuevo.`, 'warning');
            }
            return;
        }
        this.lastOwnerEraseTime = now;

        const { x1: minX, y1: minY, x2: maxX, y2: maxY } = this.ownerEraserBox;

        // 2. Broadcast via WebSocket server
        if (this.wsManager) {
            this.wsManager.send({
                type: 'clear_area',
                x1: minX,
                y1: minY,
                x2: maxX,
                y2: maxY,
                width: this.boardWidth || 64,
                canvasId: this.canvasIntId
            });
        }

        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
        this.updateSelectionUI();
        this.requestRender();
        if (typeof showMessage === 'function') showMessage('Zona vaciada con éxito', 'success');
    },

    toggleOwnerFreeze() {
        if (!this.isOwner || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const nextFrozen = !this.isFrozen;
        if (this.wsManager) {
            this.wsManager.send({
                type: "toggle_freeze",
                frozen: nextFrozen
            });
        }
    },

    toggleOwnerProtecting() {
        if (!this.isOwner || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        if (this.interactionMode === 'owner_protecting') {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (typeof showMessage === 'function') showMessage('Modo Protector de Zonas desactivado', 'info');
        } else {
            this.interactionMode = 'owner_protecting';
            this.activeBomb = null;
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (typeof showMessage === 'function') showMessage('Modo Protector de Zonas activado. Haz clic en la primera esquina para definir la zona.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    executeOwnerProtectArea(protect = true) {
        if (!this.ownerEraserBox) return;

        const { x1: minX, y1: minY, x2: maxX, y2: maxY } = this.ownerEraserBox;

        if (this.wsManager) {
            this.wsManager.send({
                type: "protect_area",
                x1: minX,
                y1: minY,
                x2: maxX,
                y2: maxY,
                width: this.boardWidth || 64,
                protect: protect
            });
        }

        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;

        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    executeUserProtectArea() {
        if (!this.ownerEraserBox) return;

        const { x1: minX, y1: minY, x2: maxX, y2: maxY } = this.ownerEraserBox;

        if (this.wsManager) {
            this.wsManager.send({
                type: "use_pixel_protection",
                perk: "proteccion_pixeles_1",
                x1: minX,
                y1: minY,
                x2: maxX,
                y2: maxY
            });
        }

        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;

        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    toggleMyProtectionsHighlight() {
        this.showMyProtectionsHighlight = !this.showMyProtectionsHighlight;
        if (typeof showMessage === 'function') {
            if (this.showMyProtectionsHighlight) {
                showMessage('Mostrando tus zonas protegidas', 'info');
            } else {
                showMessage('Ocultando tus zonas protegidas', 'info');
            }
        }
        this.updatePerkBadges();
        if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
        this.requestRender();
    },

    updateMyProtectionsTimer() {
        if (!this.myProtectedExpiries || Object.keys(this.myProtectedExpiries).length === 0) {
            if (this.myProtectionsTimerLabel) {
                this.myProtectionsTimerLabel.textContent = '';
            }
            return;
        }

        const nowSecs = Math.floor(Date.now() / 1000);
        let minExpiry = Infinity;
        let hasExpiredAny = false;

        for (const off in this.myProtectedExpiries) {
            const exp = this.myProtectedExpiries[off];
            if (exp <= nowSecs) {
                if (this.myProtectedPixels) this.myProtectedPixels.delete(parseInt(off, 10));
                delete this.myProtectedExpiries[off];
                hasExpiredAny = true;
            } else if (exp < minExpiry) {
                minExpiry = exp;
            }
        }

        if (hasExpiredAny) {
            this.updatePerkBadges();
            if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
            this.requestRender();
        }

        if (minExpiry === Infinity) {
            if (this.myProtectionsTimerLabel) this.myProtectionsTimerLabel.textContent = '';
            return;
        }

        const diff = minExpiry - nowSecs;
        const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');

        const timeStr = ` - ${hrs}:${mins}:${secs}`;
        if (this.myProtectionsTimerLabel) {
            this.myProtectionsTimerLabel.textContent = timeStr;
        }
    },

    async openSandboxSettingsModal() {
        if (!window.modalSystem) return;

        try {
            const res = await window.modalSystem.show('sandboxSettingsModal', {
                width: this.boardWidth,
                height: this.boardHeight,
                paletteId: this.canvasPaletteId,
                cooldownBatch: this.cooldownMax
            });

            if (res && res.confirmed && res.data) {
                const newWidth = parseInt(res.data.sandbox_width, 10);
                const newHeight = parseInt(res.data.sandbox_height, 10);
                const newPalette = res.data.sandbox_palette;
                const newLimit = parseInt(res.data.sandbox_cooldown_batch, 10);

                if (isNaN(newWidth) || newWidth < 1 || newWidth > 4096 || isNaN(newHeight) || newHeight < 1 || newHeight > 4096) {
                    showMessage('Dimensiones inválidas (deben ser entre 1 y 4096 px)', 'error');
                    return;
                }
                if (isNaN(newLimit) || newLimit < 1) {
                    showMessage('Límite de lote inválido', 'error');
                    return;
                }

                const DesignSandboxDbModule = await import('./DesignSandboxDb.js');
                const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;

                const widthChanged = this.boardWidth !== newWidth;
                const heightChanged = this.boardHeight !== newHeight;

                if (widthChanged || heightChanged) {
                    try {
                        await DesignSandboxDb.migrateChunks(this.boardWidth, this.boardHeight, newWidth, newHeight, this.sandboxUuid);
                    } catch (e) {
                        console.error('[Sandbox] Chunk migration failed:', e);
                    }
                }

                await DesignSandboxDb.saveSettings({
                    width: newWidth,
                    height: newHeight,
                    paletteId: newPalette,
                    cooldownBatch: newLimit
                }, this.sandboxUuid);
                
                this.boardWidth = newWidth;
                this.boardHeight = newHeight;
                this.canvasPaletteId = newPalette;
                this.cooldownMax = newLimit;
                this.cooldownBalance = newLimit;

                this.renderColorPalette(this.canvasPaletteId);

                this.setupCanvas();
                this.centerBoard();

                if (this.loadedChunks) this.loadedChunks.clear();
                if (this.loadingChunks) this.loadingChunks.clear();

                if (this.renderWorker) {
                    if (widthChanged || heightChanged) {
                        this.renderWorker.postMessage({
                            type: 'RESIZE_BOARD',
                            payload: { boardWidth: this.boardWidth, boardHeight: this.boardHeight }
                        });
                    }
                }

                this.updateVisibleChunks();
                this.requestRender();
                showMessage('Ajustes del Sandbox actualizados con éxito', 'success');
            }
        } catch (e) {
            console.error('[Sandbox] Error saving settings from modal:', e);
        }
    }
};
