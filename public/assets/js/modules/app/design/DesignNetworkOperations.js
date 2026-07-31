import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { PerksRegistry } from './PerksRegistry.js';

export const DesignNetworkOperations = {
    handleCanvasLockedInject(data) {
        this.isInjectLocked = true;

        if (this.canvas) {
            this.canvas.classList.add('component-canvas-blur');
        }

        this.updateLockBadges();

        this.selectedPixels.clear();
        this.updateSelectionUI();
        this.requestRender();

        if (this.lastInjectedTemplate) {
            showMessage(__('info_stamping_template'), 'warning');
        }

        if (this.injectTimeout) clearTimeout(this.injectTimeout);
        this.injectTimeout = setTimeout(() => {
            if (this.isInjectLocked) {
                this.isInjectLocked = false;
                if (this.canvas) {
                    this.canvas.classList.remove('component-canvas-blur');
                }
                this.updateLockBadges();
                showMessage(__('err_server_timeout'), 'error');
            }
        }, 60000);
    },

    async handleCanvasInjectCompleted(data) {
        if (this.injectTimeout) clearTimeout(this.injectTimeout);

        this.activeTemplateId = null;
        if (typeof this.updateTemplateUI === 'function') {
            this.updateTemplateUI();
        }

        const isOwner = !!this.lastInjectedTemplate;
        let tempCoords = null;

        if (isOwner) {
            tempCoords = this.lastInjectedTemplate;
        } else if (data.x !== undefined && data.y !== undefined && data.w && data.h && data.image_url) {
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                const loadPromise = new Promise((resolve) => {
                    img.onload = () => resolve(img);
                    img.onerror = () => {
                        if (img.crossOrigin) {
                            img.crossOrigin = null;
                            img.src = data.image_url;
                        } else {
                            resolve(null);
                        }
                    };
                });
                img.src = data.image_url;
                await loadPromise;
                const bitmap = await createImageBitmap(img);
                tempCoords = {
                    x: parseInt(data.x, 10),
                    y: parseInt(data.y, 10),
                    w: parseInt(data.w, 10),
                    h: parseInt(data.h, 10),
                    imageBitmap: bitmap
                };
            } catch (e) {
            }
        }

        try {
            const response = await this.api.post(ApiRoutes.Canvases.Get, { id: this.canvasIntId }, this.abortController.signal);
            if (response.aborted) return;

            if (response.success && response.data) {
                if (tempCoords && this.renderWorker) {
                    const payload = {
                        templateCoords: {
                            x: tempCoords.x,
                            y: tempCoords.y,
                            w: tempCoords.w,
                            h: tempCoords.h
                        },
                        imageBitmap: tempCoords.imageBitmap
                    };
                    const transfers = tempCoords.imageBitmap ? [tempCoords.imageBitmap] : [];
                    this.renderWorker.postMessage({
                        type: 'TRIGGER_INJECT_ANIMATION',
                        payload: payload
                    }, transfers);
                }

                if (typeof this.initCanvasData === 'function') {
                    this.initCanvasData(response.data, true);
                } else if (response.data.state_base64) {
                    this.hydrateCanvasState(response.data.state_base64);
                }
                
                this.lastInjectedTemplate = null;
            }
        } catch (error) {
        }

        this.isInjectLocked = false;

        if (this.canvas && !this.isPrivateBlocked) {
            this.canvas.classList.remove('component-canvas-blur');
        }

        this.updateLockBadges();
        this.requestRender();

        if (isOwner) {
            showMessage(__('msg_template_stamped'), 'success');
        }
    },

    handleCanvasInjectError(data) {
        if (this.injectTimeout) clearTimeout(this.injectTimeout);

        this.isInjectLocked = false;

        if (this.canvas) {
            this.canvas.classList.remove('component-canvas-blur');
        }

        this.updateLockBadges();
        showMessage(data.error || __('err_stamp_failed'), 'error');
    },

    async startLiveShare() {
        if (!this.activeTemplateId) {
            showMessage(__('err_select_template'), 'warning');
            return false;
        }

        try {
            const route = ApiRoutes.Canvases?.CreateLiveShare || 'canvas/live-share/create';
            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
            
            const response = await this.api.post(route, { 
                canvas_id: this.canvasIntId,
                img_url: tpl.img.src,
                x: tpl.x,
                y: tpl.y,
                w: tpl.w,
                h: tpl.h,
                opacity: 0.5,
                angle: tpl.angle || 0
            }, this.abortController.signal);
            
            if (response.aborted) return false;

            if (response.success && response.data?.code) {
                this.liveShareStatus = 'owner';
                this.liveShareCode = response.data.code;
                this.liveTemplateId = this.activeTemplateId;
                this.liveShareCountVal = 1;
                
                // Force standard opacity
                tpl.opacity = 0.5;
                
                if (this.wsManager) {
                    this.wsManager.send({ type: 'join_live_share', code: this.liveShareCode });
                }

                let badge = document.getElementById('live-share-badge');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'component-badge';
                    badge.id = 'live-share-badge';
                    badge.innerHTML = '<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso (1 en línea)</span>';
                    const badgesContainer = document.querySelector('[data-ref="badges-left"]');
                    if (badgesContainer) badgesContainer.appendChild(badge);
                } else {
                    badge.innerHTML = '<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso (1 en línea)</span>';
                }

                showMessage(__('msg_broadcasting').replace(':code', this.liveShareCode), 'success');
                return true;
            } else {
                showMessage(response.message || __('err_live_code_gen'), 'error');
                return false;
            }
        } catch (error) {
            showMessage(__('err_server_live_start'), 'error');
            return false;
        }
    },

    stopLiveShare() {
        if (this.liveShareStatus !== 'owner') return false;
        
        if (this.wsManager && this.liveShareCode) {
            this.wsManager.send({ type: 'end_live_share', code: this.liveShareCode });
        }

        this.liveShareStatus = 'none';
        this.liveShareCode = null;
        this.liveTemplateId = null;
        this.liveShareCountVal = null;

        const badge = document.getElementById('live-share-badge');
        if (badge) badge.remove();

        const codeBadge = document.getElementById('live-share-code-badge');
        if (codeBadge) codeBadge.remove();

        const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
        if (btnOpenJoinLive) {
            btnOpenJoinLive.classList.remove('disabled-interaction', 'disabled');
            btnOpenJoinLive.removeAttribute('title');
        }

        const btnToggleLive = document.querySelector('[data-action="toggleLiveBroadcast"]');
        if (btnToggleLive) {
            btnToggleLive.classList.remove('component-color-indicator');
            btnToggleLive.style.removeProperty('--active-color');
        }

        showMessage(__('msg_broadcast_stopped'), 'info');
        return true;
    },

    async joinLiveImageSession(code) {
        if (!code) return false;
        
        const btn = document.querySelector('[data-action="submitJoinLive"]');
        if (btn) setButtonLoading(btn);

        try {
            const route = ApiRoutes.Canvases?.JoinLiveShare || 'canvases.join_live_share';
            
            const response = await this.api.post(route, { 
                code: code,
                canvas_id: this.canvasIntId 
            }, this.abortController.signal);
            
            if (response.aborted) return false;

            if (response.success && response.data) {
                console.log('[DesignNetwork] joinLiveImageSession HTTP success:', response.data);
                this.liveShareStatus = 'spectator';
                this.liveShareCode = code;
                this.liveShareCountVal = null;
                
                const liveId = `live_tpl_${code}`;
                this.liveTemplateId = liveId;

                let tpl = this.templates.find(t => t.id === liveId);
                if (!tpl) {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    
                    await new Promise((resolve) => {
                        img.onload = () => {
                            this.templates.push({
                                id: liveId,
                                img: img,
                                x: response.data.x !== undefined && response.data.x !== null ? parseInt(response.data.x) : 0,
                                y: response.data.y !== undefined && response.data.y !== null ? parseInt(response.data.y) : 0,
                                w: response.data.w !== undefined && response.data.w !== null ? parseInt(response.data.w) : img.width,
                                h: response.data.h !== undefined && response.data.h !== null ? parseInt(response.data.h) : img.height,
                                opacity: response.data.empty ? 0 : (response.data.opacity !== undefined && response.data.opacity !== null ? parseFloat(response.data.opacity) : 0.5),
                                angle: response.data.angle !== undefined && response.data.angle !== null ? parseFloat(response.data.angle) : 0,
                                locked: true, 
                                url: img.src
                            });
                            this.activeTemplateId = liveId;
                            
                            let badge = document.getElementById('live-share-badge');
                            const countText = this.liveShareCountVal ? ` (${this.liveShareCountVal} en línea)` : '';
                            if (!badge) {
                                badge = document.createElement('div');
                                badge.className = 'component-badge';
                                badge.id = 'live-share-badge';
                                badge.innerHTML = `<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso${countText}</span>`;
                                const badgesContainer = document.querySelector('[data-ref="badges-left"]');
                                if (badgesContainer) badgesContainer.appendChild(badge);
                            } else {
                                badge.innerHTML = `<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso${countText}</span>`;
                            }
                            
                            resolve();
                        };
                        img.onerror = () => {
                            if (img.crossOrigin) {
                                img.crossOrigin = null;
                                img.src = response.data.img_url;
                            } else {
                                showMessage(__('err_load_live_img'), 'error');
                                resolve();
                            }
                        };
                        img.src = response.data.img_url;
                    });
                } else {
                    let badge = document.getElementById('live-share-badge');
                    if (!badge) {
                        badge = document.createElement('div');
                        badge.className = 'component-badge';
                        badge.id = 'live-share-badge';
                        badge.innerHTML = '<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso</span>';
                        const badgesContainer = document.querySelector('[data-ref="badges-left"]');
                        if (badgesContainer) badgesContainer.appendChild(badge);
                    }
                }

                if (this.wsManager) {
                    this.wsManager.send({ type: 'join_live_share', code: code });
                }

                showMessage(__('msg_joined_broadcast').replace(':code', code), 'success');
                this.requestRender();
                return true;

            } else {
                showMessage(response.message, 'error');
                return false;
            }
        } catch (error) {
            showMessage(__('err_join_session'), 'error');
            return false;
        } finally {
            if (btn) restoreButton(btn);
        }
    },
    
    leaveLiveImageSession() {
        if (this.liveShareStatus !== 'spectator') return false;
        
        if (this.wsManager && this.liveShareCode) {
            this.wsManager.send({ type: 'leave_live_share', code: this.liveShareCode });
        }

        if (this.liveTemplateId) {
            this.templates = this.templates.filter(t => t.id !== this.liveTemplateId);
            if (this.activeTemplateId === this.liveTemplateId) {
                this.activeTemplateId = null;
            }
        }

        this.liveShareStatus = 'none';
        this.liveShareCode = null;
        this.liveTemplateId = null;
        this.liveShareCountVal = null;

        const badge = document.getElementById('live-share-badge');
        if (badge) badge.remove();

        const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
        if (btnOpenJoinLive) {
            btnOpenJoinLive.classList.remove('component-color-indicator');
            btnOpenJoinLive.style.removeProperty('--active-color');
            btnOpenJoinLive.setAttribute('data-tooltip', (typeof window.__ === 'function' ? window.__('tooltip_join_live', []) : 'Unirse a transmisión') + ' [J]');
            const icon = btnOpenJoinLive.querySelector('.material-symbols-rounded');
            if (icon) icon.textContent = 'sensors';
        }

        if (typeof this.updateTemplateUI === 'function') this.updateTemplateUI();
        this.requestRender();

        const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
        showMessage(__('msg_left_live_share', [], 'Has abandonado la transmisión'), 'info');
        return true;
    },
    
    emitLiveImageUpdate() {
        if (this.liveShareStatus !== 'owner' || !this.liveShareCode || !this.wsManager) return;
        
        const tpl = this.templates.find(t => t.id === this.liveTemplateId);
        if (!tpl) {
            console.log('[DesignNetwork] emitLiveImageUpdate: sending empty update');
            this.wsManager.send({
                type: 'update_live_share',
                code: this.liveShareCode,
                empty: true
            });
            return;
        }

        console.log('[DesignNetwork] emitLiveImageUpdate: sending update with templates data', {
            x: tpl.x,
            y: tpl.y,
            w: tpl.w,
            h: tpl.h,
            opacity: tpl.opacity,
            angle: tpl.angle
        });
        this.wsManager.send({
            type: 'update_live_share',
            code: this.liveShareCode,
            img_url: tpl.url || tpl.src || (tpl.img ? tpl.img.src : null),
            x: tpl.x,
            y: tpl.y,
            w: tpl.w,
            h: tpl.h,
            opacity: 0.5,
            angle: tpl.angle || 0
        });
    },

    async handleLiveImageUpdate(data) {
        if (this.liveShareStatus === 'spectator' && this.liveShareCode === data.code) {
            let tpl = this.templates.find(t => t.id === this.liveTemplateId);
            if (data.empty) {
                if (tpl) {
                    tpl.opacity = 0; // Hide the template if the owner deleted it but kept the session open
                    this.requestRender();
                }
                return;
            }

            if (!tpl) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                await new Promise((resolve) => {
                    img.onload = () => {
                        tpl = {
                            id: this.liveTemplateId,
                            img: img,
                            x: data.x !== undefined && data.x !== null ? parseInt(data.x) : 0,
                            y: data.y !== undefined && data.y !== null ? parseInt(data.y) : 0,
                            w: data.w !== undefined && data.w !== null ? parseInt(data.w) : img.width,
                            h: data.h !== undefined && data.h !== null ? parseInt(data.h) : img.height,
                            opacity: data.opacity !== undefined && data.opacity !== null ? parseFloat(data.opacity) : 0.5,
                            angle: data.angle !== undefined && data.angle !== null ? parseFloat(data.angle) : 0,
                            locked: true,
                            url: img.src
                        };
                        this.templates.push(tpl);
                        this.activeTemplateId = this.liveTemplateId;
                        resolve();
                    };
                    img.onerror = () => {
                        if (img.crossOrigin) {
                            img.crossOrigin = null;
                            img.src = data.img_url;
                        } else {
                            resolve();
                        }
                    };
                    img.src = data.img_url;
                });
                this.requestRender();
                return;
            }

            if (data.img_url && tpl.url !== data.img_url) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                await new Promise((resolve) => {
                    img.onload = () => {
                        tpl.img = img;
                        tpl.url = img.src;
                        tpl.x = data.x !== undefined && data.x !== null ? parseInt(data.x) : tpl.x;
                        tpl.y = data.y !== undefined && data.y !== null ? parseInt(data.y) : tpl.y;
                        tpl.w = data.w !== undefined && data.w !== null ? parseInt(data.w) : tpl.w;
                        tpl.h = data.h !== undefined && data.h !== null ? parseInt(data.h) : tpl.h;
                        tpl.opacity = data.opacity !== undefined && data.opacity !== null ? parseFloat(data.opacity) : 0.5;
                        tpl.angle = data.angle !== undefined && data.angle !== null ? parseFloat(data.angle) : 0;
                        
                        if (tpl.imageBitmap) {
                            tpl.imageBitmap.close();
                        }
                        tpl.imageBitmap = null;
                        tpl._bitmapSentToWorker = false;
                        resolve();
                    };
                    img.onerror = () => {
                        if (img.crossOrigin) {
                            img.crossOrigin = null;
                            img.src = data.img_url;
                        } else {
                            resolve();
                        }
                    };
                    img.src = data.img_url;
                });
                this.requestRender();
                return;
            }

            tpl.x = data.x !== undefined && data.x !== null ? parseInt(data.x) : tpl.x;
            tpl.y = data.y !== undefined && data.y !== null ? parseInt(data.y) : tpl.y;
            tpl.w = data.w !== undefined && data.w !== null ? parseInt(data.w) : tpl.w;
            tpl.h = data.h !== undefined && data.h !== null ? parseInt(data.h) : tpl.h;
            tpl.opacity = data.opacity !== undefined && data.opacity !== null ? parseFloat(data.opacity) : 0.5;
            tpl.angle = data.angle !== undefined && data.angle !== null ? parseFloat(data.angle) : 0;
            this.requestRender();
        }
    },

    handleLiveSessionEnded(data) {
        if (this.liveShareStatus === 'spectator' && this.liveShareCode === data.code) {
            showMessage(__('info_live_ended'), 'info');
            this.liveShareStatus = 'none';
            this.liveShareCode = null;
            this.liveShareCountVal = null;
            
            const badge = document.getElementById('live-share-badge');
            if (badge) badge.remove();

            const codeBadge = document.getElementById('live-share-code-badge');
            if (codeBadge) codeBadge.remove();

            if (this.liveTemplateId) {
                this.templates = this.templates.filter(t => t.id !== this.liveTemplateId);
                if (this.activeTemplateId === this.liveTemplateId) {
                    this.activeTemplateId = null;
                }
                this.liveTemplateId = null;
            }
            
            this.canvas.classList.remove('component-cursor-move', 'component-cursor-nwse', 'component-cursor-nesw');
            
            const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
            if (btnOpenJoinLive) {
                btnOpenJoinLive.classList.remove('disabled-interaction', 'disabled', 'component-color-indicator');
                btnOpenJoinLive.style.removeProperty('--active-color');
                btnOpenJoinLive.removeAttribute('title');
                btnOpenJoinLive.setAttribute('data-tooltip', (typeof window.__ === 'function' ? window.__('tooltip_join_live', []) : 'Unirse a transmisión') + ' [J]');
                const icon = btnOpenJoinLive.querySelector('.material-symbols-rounded');
                if (icon) icon.textContent = 'sensors';
            }

            this.requestRender();
        }
    },

    handleLiveShareCount(data) {
        if (this.liveShareCode === data.code) {
            this.liveShareCountVal = data.count;
            const badge = document.getElementById('live-share-badge');
            if (badge) {
                badge.innerHTML = `<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso (${data.count} en línea)</span>`;
            }
        }
    },

    handleCooldownSync(data) {
        if (data.type === 'init_cooldown' && data.node_id) {
            console.log(`[Network] Connected to WebSocket server: ${data.node_id}`);
        }

        if (this.isSpectator) {
            return;
        }

        this.isCooldownSynced = true;
        if (data.balance !== undefined) this.cooldownBalance = data.balance;
        if (data.max_batch !== undefined) this.cooldownMax = data.max_batch;
        if (data.cooldown_sec !== undefined) this.cooldownSec = data.cooldown_sec;
        if (data.next_replenish_in !== undefined) {
            this.cooldownNextIn = data.next_replenish_in;
            this.lastSyncTime = Date.now();
        }

        if (data.type === 'cooldown_error') {
            showMessage(__('err_sync_limit'), 'warning');
        }

        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') {
            this.updatePerkBadges();
        }
    },

    triggerRefresh() {
        if (typeof this.onNeedsRefresh === 'function') {
            this.onNeedsRefresh();
        }
    },

    setLastInjectedTemplate(template) {
        this.lastInjectedTemplate = template;
    },

    handleBombWarning(data) {
        const cx = parseInt(data.x || 0, 10);
        const cy = parseInt(data.y || 0, 10);
        const perkId = data.perk || 'bomba_atomica_1';
        
        const perkConfig = typeof PerksRegistry !== 'undefined' ? PerksRegistry.get(perkId) : null;
        let durationSecs = parseInt(data.duration || perkConfig?.warning_seconds || 3, 10);
        if (isNaN(durationSecs) || durationSecs <= 0) durationSecs = 3;

        let r = data.radius || data.r;
        if (!r && typeof PerksRegistry !== 'undefined') {
            r = PerksRegistry.getExplosionRadius(perkId, this.boardWidth, this.boardHeight);
        }
        r = parseInt(r || 10, 10);
        if (isNaN(r) || r <= 0) r = 10;

        const targetKey = `${cx}_${cy}_${perkId}`;
        const now = Date.now();

        if (!this.nuclearWarnings) this.nuclearWarnings = [];
        const existing = this.nuclearWarnings.find(w => w.key === targetKey && now < w.endTime);
        if (existing) {
            return;
        }

        const durationMs = durationSecs * 1000;

        const warningObj = {
            key: targetKey,
            x: cx,
            y: cy,
            radius: r,
            startTime: now,
            endTime: now + durationMs,
            perkId: perkId
        };
        this.nuclearWarnings.push(warningObj);

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'BOMB_WARNING',
                payload: { key: targetKey, x: cx, y: cy, radius: r, durationMs: durationMs }
            });
        }

        const animateWarning = () => {
            const currentNow = Date.now();
            if (this.nuclearWarnings && this.nuclearWarnings.some(w => w === warningObj)) {
                this.requestRender();
                if (currentNow < warningObj.endTime) {
                    requestAnimationFrame(animateWarning);
                }
            }
        };
        requestAnimationFrame(animateWarning);

        // UI Badge flotante en la izquierda
        let container = document.querySelector('[data-ref="badges-left"]');
        if (!container) {
            container = document.createElement('div');
            container.className = 'canvas-badges-left';
            container.setAttribute('data-ref', 'badges-left');
            document.body.appendChild(container);
        }

        const existingBadge = container.querySelector(`[data-warning-perk="${perkId}"]`);
        if (!existingBadge) {
            const badge = document.createElement('div');
            badge.className = 'component-badge';
            badge.setAttribute('data-warning-perk', perkId);
            badge.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
            badge.style.color = '#ffffff';
            badge.style.border = '1px solid var(--color-error, #ef4444)';
            badge.style.animation = 'pulse 1s infinite';

            const details = typeof PerksRegistry !== 'undefined' && typeof PerksRegistry.getWarningDetails === 'function' 
                ? PerksRegistry.getWarningDetails(perkId) 
                : { icon: 'crisis_alert', text: 'Ataque de Perk' };

            let remaining = durationSecs;
            badge.style.display = 'flex';
            badge.innerHTML = `<span class="material-symbols-rounded">${details.icon}</span><span >${details.text} (${remaining}s)</span>`;
            container.appendChild(badge);

            const timerId = setInterval(() => {
                remaining--;
                if (remaining > 0) {
                    badge.innerHTML = `<span class="material-symbols-rounded">${details.icon}</span><span >${details.text} (${remaining}s)</span>`;
                } else {
                    clearInterval(timerId);
                    badge.remove();
                }
            }, 1000);
        }
    },

    handleNuclearWarning(data) {
        return this.handleBombWarning(data);
    },

    handleClearAreaEvent(data) {
        const x1 = parseInt(data.x1, 10);
        const y1 = parseInt(data.y1, 10);
        const x2 = parseInt(data.x2, 10);
        const y2 = parseInt(data.y2, 10);

        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return;

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'CLEAR_AREA',
                payload: { x1, y1, x2, y2 }
            });
        }

        if (this.offscreenCtx) {
            const w = Math.max(1, x2 - x1 + 1);
            const h = Math.max(1, y2 - y1 + 1);
            this.offscreenCtx.clearRect(x1, y1, w, h);
        }

        this.requestRender();
    }
};
