import { showMessage } from '../../../../core/utils/uiUtils.js';

export const InteractionOwnerTools = {
    toggleOwnerEraser() {
        if (!this.isOwner || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        if (this.interactionMode === 'owner_erasing') {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (btnEraser) btnEraser.classList.remove('active');
            if (typeof showMessage === 'function') showMessage(window.__('msg_eraser_mode_off'), 'info');
        } else {
            this.interactionMode = 'owner_erasing';
            this.activeBomb = null;
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (btnEraser) btnEraser.classList.add('active');
            if (typeof showMessage === 'function') showMessage(window.__('msg_eraser_mode_corner'), 'info');
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
        // Throttle render during drag to avoid lag on large canvases (4096+)
        if (!this._areaSelectRenderPending) {
            this._areaSelectRenderPending = true;
            requestAnimationFrame(() => {
                this._areaSelectRenderPending = false;
                this.requestRender();
            });
        }
    },

    executeOwnerClearArea() {
        if (!this.ownerEraserBox) return;

        const now = Date.now();
        if (this.ownerCooldowns && this.ownerCooldowns.clear && this.ownerCooldowns.clear > now) {
            const secondsLeft = Math.ceil((this.ownerCooldowns.clear - now) / 1000);
            if (typeof showMessage === 'function') {
                showMessage(`Borrador en cooldown. Espera ${secondsLeft} segundos.`, 'warning');
            }
            return;
        }

        const { x1: minX, y1: minY, x2: maxX, y2: maxY } = this.ownerEraserBox;
        const count = (maxX - minX + 1) * (maxY - minY + 1);
        const cooldownMs = Math.min(60000, 5000 + Math.floor(count / 100));

        // 2. Broadcast via WebSocket server or clear locally in offline mode
        if (this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'CLEAR_AREA',
                    payload: { x1: minX, y1: minY, x2: maxX, y2: maxY }
                });
            }
            if (this.offscreenCtx) {
                const w = Math.max(1, maxX - minX + 1);
                const h = Math.max(1, maxY - minY + 1);
                if (this.undoStack) {
                    const imgData = this.offscreenCtx.getImageData(minX, minY, w, h);
                    const bytes32 = new Uint32Array(imgData.data.buffer);
                    const diffs = [];
                    for (let y = 0; y < h; y++) {
                        for (let x = 0; x < w; x++) {
                            const val = bytes32[y * w + x];
                            if (val !== 0) {
                                diffs.push({ x: minX + x, y: minY + y, prev: val, next: 0 });
                            }
                        }
                    }
                    if (diffs.length > 0) {
                        this.undoStack.push({ type: 'clear', diffs });
                        this.redoStack = [];
                        if (this.undoStack.length > 50) this.undoStack.shift();
                    }
                }
                this.offscreenCtx.clearRect(minX, minY, w, h);
            }
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
        } else if (this.wsManager) {
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

        if (!this.isOfflineMode) {
            if (!this.ownerCooldowns) this.ownerCooldowns = {};
            this.ownerCooldowns.clear = Date.now() + cooldownMs;
            this.startOwnerCooldownTimer();
        }

        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        if (btnEraser) btnEraser.classList.remove('active');
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
        if (typeof showMessage === 'function') showMessage(window.__('msg_zone_cleared_success'), 'success');
    },

    toggleOwnerFreeze() {
        if (!this.isOwner || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const now = Date.now();
        if (this.ownerCooldowns && this.ownerCooldowns.freeze && this.ownerCooldowns.freeze > now) {
            const secondsLeft = Math.ceil((this.ownerCooldowns.freeze - now) / 1000);
            if (typeof showMessage === 'function') {
                showMessage(window.__('msg_freeze_cooldown').replace(':seconds', secondsLeft), 'warning');
            }
            return;
        }

        const nextFrozen = !this.isFrozen;
        if (this.wsManager) {
            this.wsManager.send({
                type: "toggle_freeze",
                frozen: nextFrozen
            });
        }

        if (!this.ownerCooldowns) this.ownerCooldowns = {};
        this.ownerCooldowns.freeze = Date.now() + 5000;
        this.startOwnerCooldownTimer();
    },

    toggleOwnerProtecting() {
        if (!this.isOwner || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        if (this.interactionMode === 'owner_protecting') {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (typeof showMessage === 'function') showMessage(window.__('msg_protect_mode_off'), 'info');
        } else {
            this.interactionMode = 'owner_protecting';
            this.activeBomb = null;
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (typeof showMessage === 'function') showMessage(window.__('msg_protect_mode_corner'), 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    executeOwnerProtectArea(protect = true, offsets = null) {
        if (!this.ownerEraserBox && (!offsets || offsets.length === 0)) return;

        const now = Date.now();
        if (this.ownerCooldowns && this.ownerCooldowns.protect && this.ownerCooldowns.protect > now) {
            const secondsLeft = Math.ceil((this.ownerCooldowns.protect - now) / 1000);
            if (typeof showMessage === 'function') {
                showMessage(`Protecci├│n de zona en cooldown. Espera ${secondsLeft} segundos.`, 'warning');
            }
            return;
        }

        let count = 0;
        if (offsets && offsets.length > 0) {
            count = offsets.length;
        } else if (this.ownerEraserBox) {
            count = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
        }
        const cooldownMs = Math.min(30000, 5000 + Math.floor((count * 5) / 100));

        if (this.wsManager) {
            const payload = {
                type: "protect_area",
                protect: protect
            };
            if (offsets && offsets.length > 0) {
                payload.offsets = offsets;
            } else if (this.ownerEraserBox) {
                const { x1: minX, y1: minY, x2: maxX, y2: maxY } = this.ownerEraserBox;
                payload.x1 = minX;
                payload.y1 = minY;
                payload.x2 = maxX;
                payload.y2 = maxY;
                payload.width = this.boardWidth || 64;
            }
            this.wsManager.send(payload);
        }

        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;

        if (!this.ownerCooldowns) this.ownerCooldowns = {};
        this.ownerCooldowns.protect = Date.now() + cooldownMs;
        this.startOwnerCooldownTimer();

        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    executeOwnerUnprotectArea(x1, y1, x2, y2) {
        if (this.wsManager) {
            this.wsManager.send({
                type: "protect_area",
                protect: false,
                x1: x1,
                y1: y1,
                x2: x2,
                y2: y2,
                width: this.boardWidth || 64
            });
        }
        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
        this.updateSelectionUI();
        this.requestRender();
    },

    executePlaceMines(pixels) {
        if (this.wsManager && pixels.length > 0) {
            this.wsManager.send({
                type: "place_mines",
                perk: "mines_1",
                pixels: pixels
            });
        }

        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.syncMinesToWorker();
        this.requestRender();
    },

    toggleMyProtectionsHighlight() {
        this.showMyProtectionsHighlight = !this.showMyProtectionsHighlight;
        if (typeof showMessage === 'function') {
            if (this.showMyProtectionsHighlight) {
                showMessage(window.__('msg_showing_protected_zones'), 'info');
            } else {
                showMessage(window.__('msg_hiding_protected_zones'), 'info');
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

    getContiguousProtectedRegion(startX, startY) {
        const w = this.boardWidth || 64;
        const h = this.boardHeight || 64;
        const startOffset = (startY * w) + startX;
        
        const hasOffset = (off) => {
            if (!this.protectedPixels) return false;
            return this.protectedPixels.has(off) || this.protectedPixels.has(String(off));
        };

        if (!hasOffset(startOffset)) {
            return [];
        }

        const visited = new Set();
        const queue = [];
        
        queue.push({ x: startX, y: startY, offset: startOffset });
        visited.add(startOffset);

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            
            const neighbors = [
                { x: curr.x + 1, y: curr.y },
                { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 },
                { x: curr.x, y: curr.y - 1 }
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < w && n.y >= 0 && n.y < h) {
                    const nOffset = (n.y * w) + n.x;
                    if (hasOffset(nOffset) && !visited.has(nOffset)) {
                        visited.add(nOffset);
                        queue.push({ x: n.x, y: n.y, offset: nOffset });
                    }
                }
            }
        }

        return Array.from(visited);
    },

    startOwnerCooldownTimer() {
        if (this.ownerCooldownTimerInterval) return;
        this.ownerCooldownTimerInterval = setInterval(() => {
            let active = false;
            const now = Date.now();
            if (this.ownerCooldowns) {
                for (const tool in this.ownerCooldowns) {
                    if (this.ownerCooldowns[tool] > now) {
                        active = true;
                    }
                }
            }
            if (active) {
                this.updatePerkBadges();
            } else {
                clearInterval(this.ownerCooldownTimerInterval);
                this.ownerCooldownTimerInterval = null;
                this.updatePerkBadges();
            }
        }, 1000);
    }
};
