import { showMessage } from '../../../core/utils/uiUtils.js';
import { PerksRegistry } from './PerksRegistry.js';

export const DesignInteractionsPlacing = {
    getMaxBalance() {
        if (this.isSandbox) {
            if (this.interactionMode === 'owner_erasing') return Infinity;
            if (this.perkNoCooldown) return Infinity;
            if (this.interactionMode === 'bombing') {
                return typeof PerksRegistry !== 'undefined' ? PerksRegistry.getTargetCount(this.activeBomb) : 1;
            }
            return this.cooldownMax;
        }
        if (this.interactionMode === 'owner_erasing') return Infinity;
        if (this.perkNoCooldown) return Infinity;
        if (this.interactionMode === 'protecting') return this.perkProtectionLeft || 0;
        if (this.interactionMode === 'erasing') return this.perkEraserLeft || 0;
        if (this.interactionMode === 'bombing') {
            return typeof PerksRegistry !== 'undefined' ? PerksRegistry.getTargetCount(this.activeBomb) : 1;
        }
        return Math.floor(this.cooldownBalance);
    },

    updateSelectionUI() {
        if (!this.btnPlacePixels || !this.txtPlacePixels) return;

        if (this.interactionMode === 'user_protecting') {
            this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--success');
            this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--success');

            const w = this.boardWidth || 64;
            const maxBudget = w <= 32 ? 16
                            : w <= 64 ? 25
                            : w <= 128 ? 36
                            : w <= 256 ? 49
                            : w <= 512 ? 64
                            : w <= 1024 ? 100
                            : w <= 2048 ? 144
                            : 256;

            let areaSize = 0;
            if (this.ownerEraserBox) {
                areaSize = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            }

            if (this.ownerEraserBox && this.ownerEraserStep === 2) {
                if (areaSize <= maxBudget) {
                    this.btnPlacePixels.classList.remove('disabled-interaction');
                    this.txtPlacePixels.textContent = `Proteger zona (${areaSize} px)`;
                } else {
                    this.btnPlacePixels.classList.add('disabled-interaction');
                    this.txtPlacePixels.textContent = `Excede presupuesto (máx ${maxBudget} px)`;
                }
            } else if (this.ownerEraserStep === 1) {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = `Definiendo zona (${areaSize} px)...`;
            } else {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = 'Haz clic en el lienzo';
            }
            return;
        }

        if (this.interactionMode === 'owner_erasing' || this.interactionMode === 'owner_protecting') {
            this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--danger');
            this.btnPlacePixels.classList.replace('component-button--success', 'component-button--danger');
            if (this.interactionMode === 'owner_protecting') {
                this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--success');
            }
            
            let areaSize = 0;
            if (this.ownerEraserBox) {
                areaSize = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            }

            if (this.ownerEraserBox && this.ownerEraserStep === 2) {
                this.btnPlacePixels.classList.remove('disabled-interaction');
                this.txtPlacePixels.textContent = this.interactionMode === 'owner_erasing' ? `Vaciar zona (${areaSize} px)` : `Modificar protección (${areaSize} px)`;
            } else if (this.ownerEraserStep === 1) {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = `Definiendo zona (${areaSize} px)...`;
            } else {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = 'Haz clic en el lienzo';
            }
            return;
        }

        let maxBalance = this.getMaxBalance();
        
        if (this.interactionMode === 'protecting') {
            this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--success');
            this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--success');
        } else if (this.interactionMode === 'erasing' || this.interactionMode === 'bombing') {
            this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--danger');
            this.btnPlacePixels.classList.replace('component-button--success', 'component-button--danger');
        } else {
            this.btnPlacePixels.classList.replace('component-button--success', 'component-button--primary');
            this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--primary');
        }

        if (this.selectedPixels.size > 0 && this.selectedPixels.size <= maxBalance) {
            this.btnPlacePixels.classList.remove('disabled-interaction');
            if (this.interactionMode === 'protecting') {
                this.txtPlacePixels.textContent = `${window.__('btn_protect') || window.__('protect')} (${this.selectedPixels.size})`;
            } else if (this.interactionMode === 'erasing') {
                this.txtPlacePixels.textContent = `${window.__('erase')} (${this.selectedPixels.size})`;
            } else if (this.interactionMode === 'bombing') {
                this.txtPlacePixels.textContent = PerksRegistry.getBombButtonLabel(this.activeBomb);
            } else {
                this.txtPlacePixels.textContent = window.__('btn_place_pixels');
            }
        } else {
            this.btnPlacePixels.classList.add('disabled-interaction');
            if (this.selectedPixels.size > maxBalance) {
                if (this.interactionMode === 'protecting' || this.interactionMode === 'erasing') {
                    this.txtPlacePixels.textContent = `Máx: ${maxBalance} usos`;
                } else {
                    this.txtPlacePixels.textContent = (__('lbl_max_pixels')).replace(':max', maxBalance === Infinity ? '∞' : maxBalance);
                }
            } else {
                this.txtPlacePixels.textContent = __('btn_select_pixels');
            }
        }
    },

    placePixels() {
        if ((this.selectedPixels.size === 0 && this.interactionMode !== 'owner_erasing' && this.interactionMode !== 'owner_protecting' && this.interactionMode !== 'user_protecting') || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;
        
        if (this.interactionMode === 'user_protecting') {
            if (!this.ownerEraserBox) return;
            const count = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            if (window.modalSystem) {
                window.modalSystem.show('confirmProtectAreaModal', { count }).then(result => {
                    const actStr = (typeof result === 'string') ? result : (result?.action || (result?.confirmed ? 'protect' : null));
                    if (actStr === 'protect') {
                        this.executeUserProtectArea();
                    }
                });
            } else {
                const act = confirm(`¿Estás seguro de proteger esta zona de ${count} píxeles por 24 horas usando tu ventaja?`);
                if (act) {
                    this.executeUserProtectArea();
                }
            }
            return;
        }

        if (this.interactionMode === 'owner_erasing') {
            if (!this.ownerEraserBox) return;
            const count = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            if (window.modalSystem) {
                window.modalSystem.show('confirmClearAreaModal', { count }).then(result => {
                    if (result && result.confirmed) {
                        this.executeOwnerClearArea();
                    }
                });
            } else if (confirm(`¿Estás seguro de vaciar esta zona de ${count} píxeles?`)) {
                this.executeOwnerClearArea();
            }
            return;
        }

        if (this.interactionMode === 'owner_protecting') {
            if (!this.ownerEraserBox) return;
            const count = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            if (window.modalSystem) {
                window.modalSystem.show('confirmProtectAreaModal', { count }).then(result => {
                    const actStr = (typeof result === 'string') ? result : (result?.action || (result?.confirmed ? 'protect' : null));
                    if (actStr === 'protect' || actStr === 'unprotect') {
                        this.executeOwnerProtectArea(actStr === 'protect');
                    }
                });
            } else {
                const act = confirm(`Aceptar para Proteger la zona (${count} px). Cancelar para Desproteger la zona.`);
                this.executeOwnerProtectArea(act);
            }
            return;
        }

        let maxBalance = this.getMaxBalance();

        if (this.selectedPixels.size > maxBalance) {
            showMessage(__('err_pixel_limit')?.replace(':limit', maxBalance === Infinity ? '∞' : maxBalance), 'warning');
            return;
        }

        if (this.interactionMode === 'bombing') {
            const requiredTargets = typeof PerksRegistry !== 'undefined' ? PerksRegistry.getTargetCount(this.activeBomb) : 1;
            if (this.selectedPixels.size < requiredTargets) {
                const msgKey = requiredTargets > 1 ? 'msg_select_targets_count' : 'msg_select_target';
                const msgText = (typeof window.__ === 'function' ? window.__(msgKey) : null)?.replace(':count', requiredTargets) || `Selecciona ${requiredTargets} objetivo(s)`;
                if (typeof showMessage === 'function') showMessage(msgText, 'warning');
                return;
            }
            const targets = Array.from(this.selectedPixels).map(key => ({
                x: key & 0xFFFF,
                y: key >> 16
            }));
            const usedPerk = this.activeBomb;
            const perkConfig = typeof PerksRegistry !== 'undefined' ? PerksRegistry.get(usedPerk) : null;
            const durationSecs = parseInt(perkConfig?.warning_seconds || 3, 10);
            const perkRadius = typeof PerksRegistry !== 'undefined' 
                ? PerksRegistry.getExplosionRadius(usedPerk, this.boardWidth, this.boardHeight) 
                : 10;

            targets.forEach(tgt => {
                const warningData = {
                    x: tgt.x,
                    y: tgt.y,
                    duration: durationSecs,
                    perk: usedPerk,
                    radius: perkRadius
                };
                if (typeof this.handleBombWarning === 'function') {
                    this.handleBombWarning(warningData);
                } else if (typeof this.handleNuclearWarning === 'function') {
                    this.handleNuclearWarning(warningData);
                }
            });

            if (this.isSandbox) {
                setTimeout(() => {
                    if (this.renderWorker) {
                        this.renderWorker.postMessage({
                            type: 'BOMB_PIXEL',
                            payload: { cX: targets[0]?.x ?? 0, cY: targets[0]?.y ?? 0, r: perkRadius, perkId: usedPerk }
                        });
                    }
                    if (typeof this.triggerExplosionEffect === 'function') {
                        this.triggerExplosionEffect(targets[0]?.x ?? 0, targets[0]?.y ?? 0, perkRadius, usedPerk);
                    }
                    this.persistBombExplosion(targets[0]?.x ?? 0, targets[0]?.y ?? 0, perkRadius);
                }, durationSecs * 1000);
            } else {
                if (this.wsManager) {
                    this.wsManager.send({
                        type: 'bomb_pixel',
                        targets: targets,
                        x: targets[0]?.x ?? 0,
                        y: targets[0]?.y ?? 0,
                        perk: usedPerk,
                        width: this.boardWidth,
                        userId: window.activeUserId || null
                    });
                }
                if (this.inventoryPerks && usedPerk) {
                    const perkObj = this.inventoryPerks.find(p => p.perk_id === usedPerk);
                    if (perkObj) {
                        perkObj.count = Math.max(0, parseInt(perkObj.count, 10) - 1);
                        if (perkObj.count === 0) {
                            this.inventoryPerks = this.inventoryPerks.filter(p => p.perk_id !== usedPerk);
                        }
                    }
                }
            }
            this.interactionMode = 'normal';
            this.activeBomb = null;
            this.perkBombReady = null;
            this.selectedPixels.clear();
            this.updateSelectionUI();
            this.requestRender();
            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            if (typeof this.loadUserPerks === 'function') this.loadUserPerks();
            return;
        }

        // Se envía el color hexadecimal directamente
        let colorHex = this.currentColor;

        let validPixels = [];
        let hitProtected = false;
        
        this.selectedPixels.forEach(key => {
            const x = key & 0xFFFF;
            const y = key >> 16;
            const offset = (y * this.boardWidth) + x;

            if (this.interactionMode === 'normal' || this.interactionMode === 'protecting') {
                if (this.protectedPixels && this.protectedPixels.has(offset)) {
                    if (!this.isOwner) {
                        hitProtected = true;
                        return;
                    }
                }
            } else if (this.interactionMode === 'erasing') {
                if (this.protectedPixels && !this.protectedPixels.has(offset)) {
                    return;
                }
            }
            validPixels.push({ key, x, y, offset });
        });
        
        if (hitProtected) {
            if (!this.lastProtectedToastTime || (Date.now() - this.lastProtectedToastTime > 2000)) {
                showMessage(__('err_pixel_protected'), 'warning');
                this.lastProtectedToastTime = Date.now();
            }
        }

        if (validPixels.length === 0) {
            this.selectedPixels.clear();
            this.updateSelectionUI();
            this.requestRender();
            return;
        }

        if (this.renderWorker) {
            const pixelsToPush = validPixels.map(p => ({
                x: p.x,
                y: p.y,
                color: this.interactionMode === 'normal' ? this.currentColor : 'transparent'
            }));
            this.renderWorker.postMessage({ type: 'PUSH_PIXELS', payload: { pixels: pixelsToPush } });
        } else if (this.offscreenCtx) {
            validPixels.forEach(p => {
                if (this.interactionMode === 'normal') {
                    this.offscreenCtx.fillStyle = this.currentColor;
                    this.offscreenCtx.clearRect(p.x, p.y, 1, 1);
                    this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
                }
            });
        }
        
        if (this.isSandbox) {
            (async () => {
                try {
                    const DesignSandboxDbModule = await import('./DesignSandboxDb.js');
                    const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;

                    const chunkSize = 512;
                    const chunkGroups = {};
                    
                    validPixels.forEach(p => {
                        const cx = Math.floor(p.x / chunkSize);
                        const cy = Math.floor(p.y / chunkSize);
                        const key = `${cx},${cy}`;
                        if (!chunkGroups[key]) {
                            chunkGroups[key] = [];
                        }
                        chunkGroups[key].push(p);
                    });

                    for (const [key, pixels] of Object.entries(chunkGroups)) {
                        const [cx, cy] = key.split(',').map(Number);
                        const actualW = Math.min(chunkSize, this.boardWidth - cx * chunkSize);
                        const actualH = Math.min(chunkSize, this.boardHeight - cy * chunkSize);

                        let base64 = await DesignSandboxDb.getChunk(key, this.sandboxUuid);
                        let bytes;
                        if (base64) {
                            bytes = await DesignSandboxDb.decompress(base64);
                        }
                        if (!bytes || bytes.length !== actualW * actualH * 4) {
                            bytes = new Uint8Array(actualW * actualH * 4);
                        }

                        const colorHex = this.interactionMode === 'erasing' ? '#000000' : this.currentColor;
                        const r = parseInt(colorHex.slice(1, 3), 16);
                        const g = parseInt(colorHex.slice(3, 5), 16);
                        const b = parseInt(colorHex.slice(5, 7), 16);
                        const a = this.interactionMode === 'erasing' ? 0 : 255;

                        pixels.forEach(p => {
                            const lx = p.x % chunkSize;
                            const ly = p.y % chunkSize;
                            const pixelOffset = (ly * actualW + lx) * 4;
                            if (pixelOffset >= 0 && pixelOffset + 3 < bytes.length) {
                                bytes[pixelOffset] = r;
                                bytes[pixelOffset + 1] = g;
                                bytes[pixelOffset + 2] = b;
                                bytes[pixelOffset + 3] = a;
                            }
                        });

                        const newBase64 = await DesignSandboxDb.compressAndEncode(bytes);
                        await DesignSandboxDb.saveChunk(key, newBase64, this.sandboxUuid);
                        if (this.dirtyChunks) {
                            this.dirtyChunks.add(key);
                        }
                    }

                    if (this.dirtyChunks && this.dirtyChunks.size > 0) {
                        const btnSync = document.querySelector('[data-ref="btn-sandbox-sync"]');
                        const icon = btnSync ? btnSync.querySelector('.material-symbols-rounded') : null;
                        if (icon) {
                            icon.textContent = 'cloud_upload';
                            icon.style.color = 'var(--color-warning, #ff9800)';
                        }
                        if (btnSync) btnSync.setAttribute('data-tooltip', 'Cambios sin sincronizar. Haz clic para guardar.');
                    }

                    // Capturar miniatura
                    const settings = await DesignSandboxDb.getSettings(this.sandboxUuid);
                    if (settings) {
                        settings.thumbnail = await this.generateSandboxThumbnail();
                        await DesignSandboxDb.saveSettings(settings, this.sandboxUuid);
                    }
                } catch (e) {
                    console.error('[Sandbox] Error saving pixels to IndexedDB:', e);
                }
            })();

            showMessage('Píxeles guardados localmente', 'success');

            this.selectedPixels.clear();
            this.updateSelectionUI();
            this.requestRender();
            return;
        }

        if (this.wsManager && validPixels.length > 0) {
            if (validPixels.length === 1) {
                const p = validPixels[0];
                let msgType = 'pixel';
                if (this.interactionMode === 'protecting') msgType = 'protect_pixel';
                if (this.interactionMode === 'erasing') msgType = 'erase_pixel';

                this.wsManager.send({
                    type: msgType,
                    x: p.x,
                    y: p.y,
                    color: colorHex,
                    width: this.boardWidth,
                    userId: window.activeUserId || null 
                });
            } else {
                let msgType = 'batch_pixels';
                if (this.interactionMode === 'protecting') msgType = 'batch_protect_pixels';
                if (this.interactionMode === 'erasing') msgType = 'batch_erase_pixels';

                this.wsManager.send({
                    type: msgType,
                    pixels: validPixels.map(p => ({ x: p.x, y: p.y })),
                    color: colorHex,
                    width: this.boardWidth,
                    userId: window.activeUserId || null
                });
            }
        }

        if (this.interactionMode === 'normal') {
            if (!this.perkNoCooldown) {
                this.cooldownBalance -= validPixels.length;
            }
            
            if (this.cooldownBalance < this.cooldownMax && this.cooldownNextIn <= 0) {
                this.cooldownNextIn = this.cooldownSec;
                this.lastSyncTime = Date.now();
            }
            showMessage(__('msg_pixels_placed'), 'success');
        } else if (this.interactionMode === 'protecting') {
            this.perkProtectionLeft -= validPixels.length;
            showMessage(window.__('msg_prot_applied'), 'success');
        } else if (this.interactionMode === 'erasing') {
            this.perkEraserLeft -= validPixels.length;
            showMessage(window.__('eraser_applied'), 'success');
        }

        this.selectedPixels.clear();

        if (this.interactionMode === 'protecting' && this.perkProtectionLeft <= 0) {
            this.cancelInteractionMode();
            if (typeof this.loadUserPerks === 'function') this.loadUserPerks();
        }
        if (this.interactionMode === 'erasing' && this.perkEraserLeft <= 0) {
            this.cancelInteractionMode();
            if (typeof this.loadUserPerks === 'function') this.loadUserPerks();
        }
        
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    cancelInteractionMode() {
        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
        this.activeBomb = null;
        this.perkBombReady = null;
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        if (typeof this.requestRender === 'function') this.requestRender();
        showMessage(window.__('special_mode_deactivated'), 'info');
    },

    ensureExplosionStyles() {
        // Estilos integrados en components.css (.nuclear-shake y .canvas-flash-overlay)
    },

    triggerExplosionEffect(cx, cy, r, perkId) {
        if (!this.explosions) this.explosions = [];
        this.explosions.push({
            x: cx,
            y: cy,
            maxRadius: r,
            perkId: perkId,
            startTime: Date.now(),
            duration: PerksRegistry.getExplosionDuration(perkId)
        });
        
        this.ensureExplosionStyles();

        if (PerksRegistry.hasScreenShake(perkId)) {
            if (this.canvas) {
                this.canvas.classList.add('nuclear-shake');
                setTimeout(() => {
                    this.canvas.classList.remove('nuclear-shake');
                }, PerksRegistry.getShakeDuration(perkId));
            }
        }
        
        if (PerksRegistry.hasScreenFlash(perkId)) {
            const flashMs = PerksRegistry.getFlashDuration(perkId);
            const flash = document.createElement('div');
            flash.style.position = 'fixed';
            flash.style.top = '0';
            flash.style.left = '0';
            flash.style.width = '100vw';
            flash.style.height = '100vh';
            flash.style.backgroundColor = 'white';
            flash.style.zIndex = '999999';
            flash.style.pointerEvents = 'none';
            flash.style.transition = `opacity ${flashMs / 1000}s ease-out`;
            document.body.appendChild(flash);
            void flash.offsetHeight;
            flash.style.opacity = '0';
            setTimeout(() => {
                if (flash.parentNode) flash.parentNode.removeChild(flash);
            }, flashMs + 100);
        }
        
        if (!this.renderWorker && !this.isExplosionLoopRunning) {
            this.isExplosionLoopRunning = true;
            const loop = () => {
                if (this.explosions && this.explosions.length > 0) {
                    this.explosions = this.explosions.filter(exp => (Date.now() - exp.startTime) < exp.duration);
                    this.requestRender();
                    requestAnimationFrame(loop);
                } else {
                    this.isExplosionLoopRunning = false;
                }
            };
            requestAnimationFrame(loop);
        }
    },

    async loadUserPerks() {
        if (this.isSandbox) {
            this.inventoryPerks = [
                { perk_id: 'pixel_misil_1', count: 999 },
                { perk_id: 'bomba_pixel_1', count: 999 },
                { perk_id: 'bomba_atomica_1', count: 999 },
                { perk_id: 'bomba_racimo_1', count: 999 },
                { perk_id: 'lluvia_meteoritos_1', count: 999 },
                { perk_id: 'proteccion_pixeles_1', count: 999 }
            ];
            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            return;
        }
        try {
            const result = await this.api.post('store.get_my_perks', {});
            if (result && result.success) {
                const grouped = {};
                result.data.forEach(p => {
                    if (!grouped[p.perk_id]) {
                        grouped[p.perk_id] = { ...p, count: 0 };
                    }
                    grouped[p.perk_id].count += parseInt(p.count) || 1;
                });
                this.inventoryPerks = Object.values(grouped);
                if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            }
        } catch (error) {
        }
    },

    async activatePerk(perkId, btn) {
        if (!perkId) return;

        if (perkId === 'proteccion_pixeles_1') {
            const owned = this.inventoryPerks ? this.inventoryPerks.find(p => p.perk_id === perkId) : null;
            const count = owned ? parseInt(owned.count, 10) : 0;
            if (count <= 0) {
                if (typeof showMessage === 'function') showMessage(window.__('err_perk_not_owned'), 'warning');
                return;
            }

            if (this.interactionMode === 'user_protecting') {
                this.interactionMode = 'normal';
                this.ownerEraserBox = null;
                this.ownerEraserStep = 0;
                this.ownerEraserStart = null;
                if (typeof showMessage === 'function') showMessage('Modo Protector de Píxeles desactivado', 'info');
            } else {
                this.interactionMode = 'user_protecting';
                this.activeBomb = null;
                this.ownerEraserBox = null;
                this.ownerEraserStep = 0;
                this.ownerEraserStart = null;
                if (typeof showMessage === 'function') showMessage('Modo Protector de Píxeles activado. Haz clic en el lienzo para definir la primera esquina.', 'info');
            }

            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            this.updateSelectionUI();
            this.requestRender();
            return;
        }

        if (PerksRegistry.isBomb(perkId)) {
            const owned = this.inventoryPerks ? this.inventoryPerks.find(p => p.perk_id === perkId) : null;
            const count = owned ? parseInt(owned.count, 10) : 0;
            if (count <= 0) {
                if (typeof showMessage === 'function') showMessage(window.__('err_perk_not_owned'), 'warning');
                return;
            }

            if (this.activeBomb === perkId && this.interactionMode === 'bombing') {
                this.perkBombReady = null;
                this.interactionMode = 'normal';
                this.activeBomb = null;
            } else {
                this.perkBombReady = perkId;
                this.interactionMode = 'bombing';
                this.activeBomb = perkId;
                if (typeof showMessage === 'function') showMessage(window.__('msg_perk_equipped_select_target'), 'info');
            }

            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            this.updateSelectionUI();
            return;
        }

        if (this.isSandbox) {
            if (perkId.includes('cooldown') || perkId.includes('no_cooldown')) {
                this.perkNoCooldown = true;
                this.perkNoCooldownExpires = Date.now() + 60000;
                showMessage('Ventaja Sin Cooldown activada (60s)', 'success');
            } else {
                showMessage('Ventaja activada con éxito', 'success');
            }
            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            this.updateSelectionUI();
            this.requestRender();
            return;
        }

        try {
            if (btn) btn.classList.add('loading');
            const result = await this.api.post('store.activate_perk', { perk_id: perkId });
            if (btn) btn.classList.remove('loading');
            
            if (result && result.success) {
                if (typeof showMessage === 'function') {
                    showMessage(window.__('msg_perk_activated_success'), 'success');
                }
                this.loadUserPerks(); 
            } else {
                if (typeof showMessage === 'function') showMessage(result?.message_key || window.__('err_activate_perk'), 'error');
            }
        } catch (error) {
            if (btn) btn.classList.remove('loading');
            if (typeof showMessage === 'function') showMessage(window.__('err_server_connection'), 'error');
        }
    },

    updatePerkBadges() {
        const badgesRight = document.querySelector('[data-ref="badges-right"]');
        if (!badgesRight) return;

        // Clear only non-timer badges to prevent layout shifting/disappearing of scheduled events
        Array.from(badgesRight.children).forEach(badge => {
            const badgeId = badge.getAttribute('data-badge-id');
            if (badgeId !== 'reset-timer' && badgeId !== 'resize-timer') {
                badge.remove();
            }
        });
        const PERK_ORDER = PerksRegistry.getDisplayOrder();
        let renderedInventoryCount = 0;

        PERK_ORDER.forEach(perkId => {
            let isActive = false;
            let activeHtml = '';
            let isToggledOn = false;
            let icon = PerksRegistry.getIcon(perkId);
            let clickHandler = null;

            if (PerksRegistry.isBomb(perkId)) {
                const owned = this.inventoryPerks ? this.inventoryPerks.find(p => p.perk_id === perkId) : null;
                const totalAmount = owned ? parseInt(owned.count, 10) : 0;
                const qtySuffix = this.isSandbox ? '' : ` (${totalAmount})`;
                
                isActive = (this.activeBomb === perkId && this.interactionMode === 'bombing');
                
                if (isActive) {
                    isToggledOn = true;
                    const titleText = PerksRegistry.getLabel(perkId);
                    activeHtml = `<span class="material-symbols-rounded component-text-danger">${icon}</span><span>${titleText}${qtySuffix}</span>`;
                    clickHandler = () => {
                        this.interactionMode = 'normal';
                        this.activeBomb = null;
                        this.perkBombReady = null;
                        this.updateSelectionUI();
                        this.updatePerkBadges();
                    };
                    if (this.showInventoryPerks) renderedInventoryCount++;
                } else if (totalAmount > 0 && this.showInventoryPerks) {
                    isActive = true; 
                    isToggledOn = false;
                    const titleText = PerksRegistry.getLabel(perkId);
                    activeHtml = `<span class="material-symbols-rounded">${icon}</span><span>${titleText}${qtySuffix}</span>`;
                    clickHandler = () => {
                        this.activatePerk(perkId);
                    };
                    renderedInventoryCount++;
                }
            } else if (perkId === 'proteccion_pixeles_1') {
                const owned = this.inventoryPerks ? this.inventoryPerks.find(p => p.perk_id === perkId) : null;
                const totalAmount = owned ? parseInt(owned.count, 10) : 0;
                const qtySuffix = this.isSandbox ? '' : ` (${totalAmount})`;
                
                isActive = (this.interactionMode === 'user_protecting');
                
                if (isActive) {
                    isToggledOn = true;
                    const titleText = PerksRegistry.getLabel(perkId);
                    activeHtml = `<span class="material-symbols-rounded component-text-success">${icon}</span><span>${titleText}${qtySuffix}</span>`;
                    clickHandler = () => {
                        this.interactionMode = 'normal';
                        this.ownerEraserBox = null;
                        this.ownerEraserStep = 0;
                        this.ownerEraserStart = null;
                        this.updateSelectionUI();
                        this.updatePerkBadges();
                        this.requestRender();
                    };
                    if (this.showInventoryPerks) renderedInventoryCount++;
                } else if (totalAmount > 0 && this.showInventoryPerks) {
                    isActive = true;
                    isToggledOn = false;
                    const titleText = PerksRegistry.getLabel(perkId);
                    activeHtml = `<span class="material-symbols-rounded">${icon}</span><span>${titleText}${qtySuffix}</span>`;
                    clickHandler = () => {
                        this.activatePerk(perkId);
                    };
                    renderedInventoryCount++;
                }
            }

            const invItem = this.inventoryPerks ? this.inventoryPerks.find(p => p.perk_id === perkId) : null;
            
            if (isActive) {
                const badge = document.createElement('div');
                badge.className = 'component-badge';
                badge.style.cursor = 'pointer';
                badge.innerHTML = activeHtml;
                if (isToggledOn) {
                    if (PerksRegistry.isBomb(perkId)) {
                        badge.style.border = '1px solid var(--color-error)';
                        badge.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    } else {
                        badge.style.border = '1px solid var(--color-success)';
                        badge.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                    }
                }
                if (clickHandler) badge.addEventListener('click', clickHandler);
                badgesRight.appendChild(badge);
            } 
            else if (invItem && parseInt(invItem.count, 10) > 0 && this.showInventoryPerks) {
                const badge = document.createElement('div');
                badge.className = 'component-badge inventory-badge-temp';
                badge.style.cursor = 'pointer';
                const titleText = PerksRegistry.getLabel(perkId);
                const qtySuffix = this.isSandbox ? '' : ` (${invItem.count})`;
                badge.innerHTML = `<span class="material-symbols-rounded">${icon}</span><span>${titleText}${qtySuffix}</span>`;
                badge.addEventListener('click', () => {
                    this.activatePerk(perkId, badge);
                });
                badgesRight.appendChild(badge);
                renderedInventoryCount++;
            }
        });

        if (this.showInventoryPerks && renderedInventoryCount === 0) {
            const emptyBadge = document.createElement('div');
            emptyBadge.className = 'component-badge component-badge--muted inventory-badge-temp';
            const rawTrans = window.__('badge_no_perks_available');
            const displayLabel = (rawTrans && rawTrans !== 'badge_no_perks_available') ? rawTrans : 'Sin ventajas disponibles';
            emptyBadge.innerHTML = `<span class="material-symbols-rounded">info</span><span>${displayLabel}</span>`;
            badgesRight.appendChild(emptyBadge);
        }

        // Badge de Zonas Protegidas del usuario (activo solo si tiene zonas protegidas)
        const myProtectedCount = this.myProtectedPixels ? this.myProtectedPixels.size : 0;
        if (myProtectedCount > 0) {
            const isHighlighting = !!this.showMyProtectionsHighlight;
            const protBadge = document.createElement('div');
            protBadge.className = 'component-badge component-badge--clickable';
            protBadge.style.cursor = 'pointer';
            if (isHighlighting) {
                protBadge.style.border = '1px solid var(--color-success)';
                protBadge.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                protBadge.innerHTML = `<span class="material-symbols-rounded component-text-success">shield</span><span>Zonas protegidas (${myProtectedCount})<span data-ref="my-protections-timer-label" style="font-family: monospace; font-size: 11px; margin-left: 4px; opacity: 0.8;"></span></span>`;
            } else {
                protBadge.innerHTML = `<span class="material-symbols-rounded">shield</span><span>Zonas protegidas (${myProtectedCount})<span data-ref="my-protections-timer-label" style="font-family: monospace; font-size: 11px; margin-left: 4px; opacity: 0.8;"></span></span>`;
            }
            protBadge.addEventListener('click', () => {
                this.toggleMyProtectionsHighlight();
            });
            badgesRight.appendChild(protBadge);

            this.myProtectionsTimerLabel = protBadge.querySelector('[data-ref="my-protections-timer-label"]');
            if (!this.myProtectionsTimerInterval) {
                this.myProtectionsTimerInterval = setInterval(() => {
                    this.updateMyProtectionsTimer();
                }, 1000);
            }
            this.updateMyProtectionsTimer();
        } else {
            this.myProtectionsTimerLabel = null;
            if (this.myProtectionsTimerInterval) {
                clearInterval(this.myProtectionsTimerInterval);
                this.myProtectionsTimerInterval = null;
            }
        }

        if (this.isOwner) {
            if (this.showOwnerTools || this.interactionMode === 'owner_erasing') {
                const isToggledOn = (this.interactionMode === 'owner_erasing');
                const colorClass = isToggledOn ? 'component-text-danger' : '';
                const badgeEl = document.createElement('div');
                badgeEl.className = 'component-badge component-badge--clickable owner-tool-badge';
                badgeEl.style.cursor = 'pointer';
                if (isToggledOn) {
                    badgeEl.style.border = '1px solid var(--color-error)';
                    badgeEl.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                }
                badgeEl.innerHTML = `<span class="material-symbols-rounded ${colorClass}">cleaning_services</span><span>${window.__('badge_owner_eraser')}</span>`;
                badgeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleOwnerEraser();
                });
                badgesRight.appendChild(badgeEl);
            }

            if ((this.showOwnerTools || this.isFrozen) && !this.isSandbox) {
                const isToggledOn = this.isFrozen;
                const colorClass = isToggledOn ? 'component-text-warning' : '';
                const badgeEl = document.createElement('div');
                badgeEl.className = 'component-badge component-badge--clickable owner-tool-badge owner-freeze-badge';
                badgeEl.style.cursor = 'pointer';
                if (isToggledOn) {
                    badgeEl.style.border = '1px solid var(--color-warning)';
                    badgeEl.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                }
                badgeEl.innerHTML = `<span class="material-symbols-rounded ${colorClass}">ac_unit</span><span>${isToggledOn ? (window.__('badge_owner_unfreeze') || 'Descongelar Actividad') : (window.__('badge_owner_freeze') || 'Congelar Actividad')}</span>`;
                badgeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleOwnerFreeze();
                });
                badgesRight.appendChild(badgeEl);
            }

            if (this.showOwnerTools || this.interactionMode === 'owner_protecting') {
                const isToggledOn = (this.interactionMode === 'owner_protecting');
                const colorClass = isToggledOn ? 'component-text-success' : '';
                const badgeEl = document.createElement('div');
                badgeEl.className = 'component-badge component-badge--clickable owner-tool-badge owner-protect-badge';
                badgeEl.style.cursor = 'pointer';
                if (isToggledOn) {
                    badgeEl.style.border = '1px solid var(--color-success)';
                    badgeEl.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                }
                badgeEl.innerHTML = `<span class="material-symbols-rounded ${colorClass}">admin_panel_settings</span><span>${window.__('badge_owner_protect') || 'Protección Administrativa'}</span>`;
                badgeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleOwnerProtecting();
                });
                badgesRight.appendChild(badgeEl);
            }
        }
    },

    async persistBombExplosion(cX, cY, r) {
        try {
            const DesignSandboxDbModule = await import('./DesignSandboxDb.js');
            const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;

            const chunkSize = 512;
            const rSq = r * r;

            const minCx = Math.max(0, Math.floor((cX - r) / chunkSize));
            const maxCx = Math.min(Math.floor((this.boardWidth - 1) / chunkSize), Math.floor((cX + r) / chunkSize));
            const minCy = Math.max(0, Math.floor((cY - r) / chunkSize));
            const maxCy = Math.min(Math.floor((this.boardHeight - 1) / chunkSize), Math.floor((cY + r) / chunkSize));

            for (let cx = minCx; cx <= maxCx; cx++) {
                for (let cy = minCy; cy <= maxCy; cy++) {
                    const key = `${cx},${cy}`;
                    const actualW = Math.min(chunkSize, this.boardWidth - cx * chunkSize);
                    const actualH = Math.min(chunkSize, this.boardHeight - cy * chunkSize);

                    let base64 = await DesignSandboxDb.getChunk(key, this.sandboxUuid);
                    let bytes;
                    if (base64) {
                        bytes = await DesignSandboxDb.decompress(base64);
                    }
                    if (!bytes || bytes.length !== actualW * actualH * 4) {
                        bytes = new Uint8Array(actualW * actualH * 4);
                    }

                    let chunkChanged = false;
                    const startX = cx * chunkSize;
                    const startY = cy * chunkSize;

                    for (let ly = 0; ly < actualH; ly++) {
                        const y = startY + ly;
                        const dy = y - cY;
                        if (Math.abs(dy) > r) continue;

                        for (let lx = 0; lx < actualW; lx++) {
                            const x = startX + lx;
                            const dx = x - cX;
                            if (dx * dx + dy * dy <= rSq) {
                                const offset = (ly * actualW + lx) * 4;
                                const offsetIndex = y * this.boardWidth + x;
                                const isProtected = (this.protectedPixels && this.protectedPixels.has(offsetIndex)) ||
                                                    (this.ownerProtectedPixels && this.ownerProtectedPixels.has(offsetIndex)) ||
                                                    (this.myProtectedPixels && this.myProtectedPixels.has(offsetIndex));
                                if (isProtected) {
                                    continue;
                                }
                                bytes[offset] = 0;
                                bytes[offset + 1] = 0;
                                bytes[offset + 2] = 0;
                                bytes[offset + 3] = 0;
                                chunkChanged = true;
                            }
                        }
                    }

                    if (chunkChanged) {
                        const newBase64 = await DesignSandboxDb.compressAndEncode(bytes);
                        await DesignSandboxDb.saveChunk(key, newBase64, this.sandboxUuid);
                    }
                }
            }

            // Capturar miniatura para la explosión de la bomba
            try {
                const settings = await DesignSandboxDb.getSettings(this.sandboxUuid);
                if (settings) {
                    settings.thumbnail = await this.generateSandboxThumbnail();
                    await DesignSandboxDb.saveSettings(settings, this.sandboxUuid);
                }
            } catch (err) {}

            if (this.loadedChunks) this.loadedChunks.clear();
            if (this.loadingChunks) this.loadingChunks.clear();
            this.updateVisibleChunks();
            this.requestRender();
        } catch (e) {
            console.error('[Sandbox] Failed to persist bomb explosion in IndexedDB:', e);
        }
    }
};
