import { ApiRoutes } from '../../../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton, closeDropdown, localInputFormatToUtcString, parseUtcToLocalDate, formatLocalDateTimeToInput, getScheduledTimeDetails } from '../../../../core/utils/uiUtils.js';

export const InteractionOfflineWorkspace = {
    async openOfflineResizeModal() {
        if (!this.isOwner || this.isSpectator) return;

        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        const userTier = wrapper ? parseInt(wrapper.getAttribute('data-user-tier') || '0', 10) : (window.APP_USER?.subscription_tier ?? 0);
        const currentSize = `${this.boardWidth || 64}x${this.boardHeight || 64}`;

        await window.modalSystem.show('offlineResizeModal', {
            canvasId: this.canvasIntId,
            currentSize,
            userTier,
            boardWidth: this.boardWidth || 64,
            boardHeight: this.boardHeight || 64,
            isOfflineMode: !!this.isOfflineMode,
            resizeActive: !!this.resizeActive,
            nextResizeAt: this.nextResizeAt || '',
            resizeTargetSize: this.resizeTargetSize || currentSize
        });
    },

    async openOfflineResetModal() {
        if (!this.isOwner || this.isSpectator) return;

        await window.modalSystem.show('offlineResetModal', {
            canvasId: this.canvasIntId,
            canTakeSnapshot: true,
            isOfflineMode: !!this.isOfflineMode,
            resetActive: !!this.resetActive,
            nextResetAt: this.nextResetAt || ''
        });
    },

    async generateOfflineSnapshot(btn) {
        if (!this.isOwner || this.isSpectator) return;
        if (!this.canvasIntId) return;

        if (btn) setButtonLoading(btn);

        if (this.isOfflineMode && typeof this.saveOfflineCanvasState === 'function') {
            await this.saveOfflineCanvasState(true);
        }

        try {
            const result = await this.api.post(ApiRoutes.Canvases.CreateSnapshot, {
                id: parseInt(this.canvasIntId, 10)
            });

            if (result && result.success) {
                showMessage(result.message || window.__('msg_captura_order_sent'), 'success');
            } else {
                showMessage(result?.message || window.__('err_occurred'), 'error');
            }
        } catch (err) {
            showMessage(window.__('general_save_network_error') || window.__('err_occurred'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    },

    handleSelectResizeTypeOption(linkEl) {
        if (!linkEl || linkEl.classList.contains('disabled-interaction')) return;
        const val = linkEl.getAttribute('data-value') || 'instant';
        const label = linkEl.getAttribute('data-label') || '';
        const icon = linkEl.getAttribute('data-icon') || 'flash_on';

        const step1 = document.querySelector('[data-ref="offline-resize-step-1"]');
        if (step1) step1.setAttribute('data-selected-type', val);

        const trigger = document.querySelector('[data-ref="offline-resize-type-trigger"]');
        const labelRef = document.querySelector('[data-ref="offline-resize-type-label"]');
        const iconRef = document.querySelector('[data-ref="offline-resize-type-icon"]');

        if (trigger) trigger.setAttribute('data-value', val);
        if (labelRef && label) labelRef.textContent = label;
        if (iconRef && icon) iconRef.textContent = icon;

        const dateContainer = document.querySelector('[data-ref="offline-resize-scheduled-date-container"]');
        if (dateContainer) {
            if (val === 'scheduled') dateContainer.classList.remove('disabled');
            else dateContainer.classList.add('disabled');
        }

        const dropdown = linkEl.closest('.component-module--dropdown');
        if (dropdown && typeof closeDropdown === 'function') closeDropdown(dropdown);

        const links = linkEl.closest('.component-menu-list')?.querySelectorAll('.component-menu-link') || [];
        links.forEach(l => l.classList.toggle('active', l === linkEl));
    },

    handleSelectResetTypeOption(linkEl) {
        if (!linkEl || linkEl.classList.contains('disabled-interaction')) return;
        const val = linkEl.getAttribute('data-value') || 'instant';
        const label = linkEl.getAttribute('data-label') || '';
        const icon = linkEl.getAttribute('data-icon') || 'flash_on';

        const step1 = document.querySelector('[data-ref="offline-reset-step-1"]');
        if (step1) step1.setAttribute('data-selected-type', val);

        const trigger = document.querySelector('[data-ref="offline-reset-type-trigger"]');
        const labelRef = document.querySelector('[data-ref="offline-reset-type-label"]');
        const iconRef = document.querySelector('[data-ref="offline-reset-type-icon"]');

        if (trigger) trigger.setAttribute('data-value', val);
        if (labelRef && label) labelRef.textContent = label;
        if (iconRef && icon) iconRef.textContent = icon;

        const dateContainer = document.querySelector('[data-ref="offline-reset-scheduled-date-container"]');
        if (dateContainer) {
            if (val === 'scheduled') dateContainer.classList.remove('disabled');
            else dateContainer.classList.add('disabled');
        }

        const dropdown = linkEl.closest('.component-module--dropdown');
        if (dropdown && typeof closeDropdown === 'function') closeDropdown(dropdown);

        const links = linkEl.closest('.component-menu-list')?.querySelectorAll('.component-menu-link') || [];
        links.forEach(l => l.classList.toggle('active', l === linkEl));
    },

    handleOfflineResizeStep(direction) {
        const step1 = document.querySelector('[data-ref="offline-resize-step-1"]');
        const step2 = document.querySelector('[data-ref="offline-resize-step-2"]');
        if (!step1 || !step2) return;

        if (direction === 'next') {
            const selectedType = step1.getAttribute('data-selected-type') || 'instant';
            if (selectedType === 'scheduled') {
                const triggerDateTime = document.querySelector('[data-ref="offline-resize-datetime-trigger"]');
                const inputDateTime = document.querySelector('[data-ref="scheduled_resize_datetime"]');
                const localTimeStr = triggerDateTime ? triggerDateTime.getAttribute('data-value') : (inputDateTime ? inputDateTime.value : '');
                if (!localTimeStr) {
                    showMessage(window.__('err_resize_date_required') || 'Debe seleccionar una fecha y hora.', 'warning');
                    return;
                }
                const date = new Date(localTimeStr);
                const minFuture = new Date(Date.now() + 5 * 60 * 1000);
                if (isNaN(date.getTime()) || date < minFuture) {
                    showMessage(window.__('err_date_minimum_5_minutes') || 'La fecha debe ser al menos 5 minutos en el futuro.', 'error');
                    return;
                }
            }
            step1.classList.replace('active', 'disabled');
            step2.classList.replace('disabled', 'active');
        } else {
            step2.classList.replace('active', 'disabled');
            step1.classList.replace('disabled', 'active');
        }
    },

    handleOfflineResetStep(direction) {
        const step1 = document.querySelector('[data-ref="offline-reset-step-1"]');
        const step2 = document.querySelector('[data-ref="offline-reset-step-2"]');
        if (!step1 || !step2) return;

        if (direction === 'next') {
            const selectedType = step1.getAttribute('data-selected-type') || 'instant';
            if (selectedType === 'scheduled') {
                const triggerDateTime = document.querySelector('[data-ref="offline-reset-datetime-trigger"]');
                const inputDateTime = document.querySelector('[data-ref="scheduled_reset_datetime"]');
                const localTimeStr = triggerDateTime ? triggerDateTime.getAttribute('data-value') : (inputDateTime ? inputDateTime.value : '');
                if (!localTimeStr) {
                    showMessage(window.__('err_reset_date_required') || 'Debe seleccionar una fecha y hora.', 'warning');
                    return;
                }
                const date = new Date(localTimeStr);
                const minFuture = new Date(Date.now() + 5 * 60 * 1000);
                if (isNaN(date.getTime()) || date < minFuture) {
                    showMessage(window.__('err_date_minimum_5_minutes') || 'La fecha debe ser al menos 5 minutos en el futuro.', 'error');
                    return;
                }
            }
            step1.classList.replace('active', 'disabled');
            step2.classList.replace('disabled', 'active');
        } else {
            step2.classList.replace('active', 'disabled');
            step1.classList.replace('disabled', 'active');
        }
    },

    handleOfflineResizeSizeSelect(linkEl) {
        if (!linkEl || linkEl.classList.contains('disabled-interaction')) return;

        const val = linkEl.getAttribute('data-value');
        const label = linkEl.getAttribute('data-label');
        const icon = linkEl.getAttribute('data-icon');

        const trigger = document.querySelector('[data-ref="offline-resize-trigger"]');
        const labelRef = document.querySelector('[data-ref="offline-resize-label"]');
        const iconRef = document.querySelector('[data-ref="offline-resize-icon"]');

        if (trigger) trigger.setAttribute('data-value', val);
        if (labelRef) labelRef.textContent = label;
        if (iconRef) iconRef.textContent = icon;

        const dropdown = linkEl.closest('.component-module--dropdown');
        if (dropdown) closeDropdown(dropdown);

        const allLinks = document.querySelectorAll('.component-menu-link[data-type="offline_resize_size"]');
        allLinks.forEach(l => l.classList.remove('active'));
        linkEl.classList.add('active');

        const warning = document.querySelector('[data-ref="offline-resize-shrink-warning"]');
        if (warning) {
            const currWidth = this.boardWidth || 64;
            const nextWidth = parseInt(val.split('x')[0], 10);
            if (nextWidth < currWidth) {
                warning.classList.add('active');
            } else {
                warning.classList.remove('active');
            }
        }
    },

    handleScheduledResizeSizeSelect(linkEl) {
        if (!linkEl || linkEl.classList.contains('disabled-interaction')) return;

        const val = linkEl.getAttribute('data-value');
        const label = linkEl.getAttribute('data-label');
        const icon = linkEl.getAttribute('data-icon');

        const trigger = document.querySelector('[data-ref="scheduled-resize-trigger"]');
        const labelRef = document.querySelector('[data-ref="scheduled-resize-label"]');
        const iconRef = document.querySelector('[data-ref="scheduled-resize-icon"]');

        if (trigger) trigger.setAttribute('data-value', val);
        if (labelRef) labelRef.textContent = label;
        if (iconRef) iconRef.textContent = icon;

        const dropdown = linkEl.closest('.component-module--dropdown');
        if (dropdown) closeDropdown(dropdown);

        const allLinks = document.querySelectorAll('.component-menu-link[data-type="scheduled_resize_size"]');
        allLinks.forEach(l => l.classList.remove('active'));
        linkEl.classList.add('active');

        const warning = document.querySelector('[data-ref="scheduled-resize-shrink-warning"]');
        if (warning) {
            const currWidth = this.boardWidth || 64;
            const nextWidth = parseInt(val.split('x')[0], 10);
            if (nextWidth < currWidth) {
                warning.classList.add('active');
            } else {
                warning.classList.remove('active');
            }
        }
    },

    toggleScheduledResizeSection(input) {
        const fields = document.querySelector('[data-ref="scheduled_resize_fields"]');
        if (!fields) return;
        const isChecked = input ? input.checked : false;
        if (isChecked) {
            fields.classList.remove('disabled-interaction');
        } else {
            fields.classList.add('disabled-interaction');
        }
    },

    toggleScheduledResetSection(input) {
        const fields = document.querySelector('[data-ref="scheduled_reset_fields"]');
        if (!fields) return;
        const isChecked = input ? input.checked : false;
        if (isChecked) {
            fields.classList.remove('disabled-interaction');
        } else {
            fields.classList.add('disabled-interaction');
        }
    },

    async executeOfflineResize(btn) {
        const trigger = document.querySelector('[data-ref="offline-resize-trigger"]');
        const newSize = trigger ? trigger.getAttribute('data-value') : null;

        if (!newSize) {
            showMessage(window.__('err_invalid_canvas_size'), 'error');
            return;
        }

        const currentSize = `${this.boardWidth || 64}x${this.boardHeight || 64}`;
        if (newSize === currentSize) {
            showMessage(window.__('err_size_already_applied') || 'El lienzo ya tiene este tamaño.', 'info');
            return;
        }

        const parts = newSize.toLowerCase().split('x');
        const nextW = parseInt(parts[0], 10);
        const nextH = parts.length > 1 ? parseInt(parts[1], 10) : nextW;

        if (btn) setButtonLoading(btn);

        const result = await this.api.post(ApiRoutes.Canvases.Resize, {
            id: this.canvasIntId,
            size: newSize
        });

        if (btn) restoreButton(btn);

        if (result && result.success) {
            window.modalSystem.closeCurrent(true);
            showMessage(result.message || window.__('msg_resize_settings_updated'), 'success');

            this.boardWidth = nextW;
            this.boardHeight = nextH;

            const wrapper = document.querySelector('[data-ref="design-wrapper"]');
            if (wrapper) {
                wrapper.setAttribute('data-size', newSize);
            }

            if (this.offscreenCanvas) {
                const oldCanvas = this.offscreenCanvas;
                this.offscreenCanvas = document.createElement('canvas');
                this.offscreenCanvas.width = nextW;
                this.offscreenCanvas.height = nextH;
                this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
                if (this.offscreenCtx && oldCanvas) {
                    this.offscreenCtx.drawImage(oldCanvas, 0, 0);
                }
            }

            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'RESIZE_BOARD',
                    payload: {
                        boardWidth: nextW,
                        boardHeight: nextH
                    }
                });
            }

            this.selectedPixels.clear();
            if (typeof this.updateSelectionUI === 'function') this.updateSelectionUI();
            this.centerBoard();
            this.requestRender();

            if (this.isOfflineMode && typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
        } else {
            showMessage(result?.message || window.__('err_occurred'), 'error');
        }
    },

    async executeOfflineResizeUnified(btn) {
        const step1 = document.querySelector('[data-ref="offline-resize-step-1"]');
        const selectedType = step1 ? (step1.getAttribute('data-selected-type') || 'instant') : 'instant';
        if (selectedType === 'scheduled') {
            await this.executeScheduledResize(btn);
        } else {
            await this.executeOfflineResize(btn);
        }
    },

    async executeOfflineResetUnified(btn) {
        const step1 = document.querySelector('[data-ref="offline-reset-step-1"]');
        const selectedType = step1 ? (step1.getAttribute('data-selected-type') || 'instant') : 'instant';
        if (selectedType === 'scheduled') {
            await this.executeScheduledReset(btn);
        } else {
            await this.executeOfflineReset(btn);
        }
    },

    rescheduleOfflineResize() {
        const activeStep = document.querySelector('[data-ref="offline-resize-step-active"]');
        const step1 = document.querySelector('[data-ref="offline-resize-step-1"]');
        if (activeStep && step1) {
            activeStep.classList.replace('active', 'disabled');
            step1.classList.replace('disabled', 'active');
            step1.setAttribute('data-selected-type', 'scheduled');

            const dateContainer = document.querySelector('[data-ref="offline-resize-scheduled-date-container"]');
            if (dateContainer) dateContainer.classList.remove('disabled');

            const trigger = document.querySelector('[data-ref="offline-resize-type-trigger"]');
            const labelRef = document.querySelector('[data-ref="offline-resize-type-label"]');
            const iconRef = document.querySelector('[data-ref="offline-resize-type-icon"]');
            if (trigger) trigger.setAttribute('data-value', 'scheduled');
            if (labelRef) labelRef.textContent = window.__('canvas_resize_active_title') || 'Programada';
            if (iconRef) iconRef.textContent = 'schedule';
        }
    },

    backToActiveResizeStep() {
        const activeStep = document.querySelector('[data-ref="offline-resize-step-active"]');
        const step1 = document.querySelector('[data-ref="offline-resize-step-1"]');
        if (activeStep && step1) {
            step1.classList.replace('active', 'disabled');
            activeStep.classList.replace('disabled', 'active');
        }
    },

    async cancelScheduledResize(btn) {
        if (!this.isOwner || this.isSpectator || !this.canvasIntId) return;

        if (btn) setButtonLoading(btn);

        try {
            const result = await this.api.post(ApiRoutes.Canvases.UpdateResizeSettings, {
                id: this.canvasIntId,
                is_active: false,
                next_resize_at: null,
                target_size: this.resizeTargetSize || '64x64'
            });

            if (result && result.success) {
                this.resizeActive = false;
                this.nextResizeAt = null;

                if (this.resizeTimerInterval) {
                    clearInterval(this.resizeTimerInterval);
                    this.resizeTimerInterval = null;
                }
                if (typeof this.removeCanvasBadge === 'function') {
                    this.removeCanvasBadge('resize-timer', 'right');
                }

                const wrapper = document.querySelector('[data-ref="design-wrapper"]');
                if (wrapper) {
                    wrapper.setAttribute('data-resize-active', '0');
                    wrapper.setAttribute('data-resize-at', '');
                }

                window.modalSystem.closeCurrent(true);
                showMessage(result.message || window.__('msg_scheduled_resize_cancelled') || 'Expansión programada cancelada.', 'success');
            } else {
                showMessage(result?.message || window.__('err_occurred'), 'error');
            }
        } catch (err) {
            showMessage(window.__('general_save_network_error') || window.__('err_occurred'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    },

    rescheduleOfflineReset() {
        const activeStep = document.querySelector('[data-ref="offline-reset-step-active"]');
        const step1 = document.querySelector('[data-ref="offline-reset-step-1"]');
        if (activeStep && step1) {
            activeStep.classList.replace('active', 'disabled');
            step1.classList.replace('disabled', 'active');
            step1.setAttribute('data-selected-type', 'scheduled');

            const dateContainer = document.querySelector('[data-ref="offline-reset-scheduled-date-container"]');
            if (dateContainer) dateContainer.classList.remove('disabled');

            const trigger = document.querySelector('[data-ref="offline-reset-type-trigger"]');
            const labelRef = document.querySelector('[data-ref="offline-reset-type-label"]');
            const iconRef = document.querySelector('[data-ref="offline-reset-type-icon"]');
            if (trigger) trigger.setAttribute('data-value', 'scheduled');
            if (labelRef) labelRef.textContent = window.__('canvas_reset_active_title') || 'Programado';
            if (iconRef) iconRef.textContent = 'schedule';
        }
    },

    backToActiveResetStep() {
        const activeStep = document.querySelector('[data-ref="offline-reset-step-active"]');
        const step1 = document.querySelector('[data-ref="offline-reset-step-1"]');
        if (activeStep && step1) {
            step1.classList.replace('active', 'disabled');
            activeStep.classList.replace('disabled', 'active');
        }
    },

    async cancelScheduledReset(btn) {
        if (!this.isOwner || this.isSpectator || !this.canvasIntId) return;

        if (btn) setButtonLoading(btn);

        try {
            const result = await this.api.post(ApiRoutes.Canvases.UpdateResetSettings, {
                id: this.canvasIntId,
                is_active: false,
                next_reset_at: null,
                take_snapshot: false
            });

            if (result && result.success) {
                this.resetActive = false;
                this.nextResetAt = null;

                if (this.resetTimerInterval) {
                    clearInterval(this.resetTimerInterval);
                    this.resetTimerInterval = null;
                }
                if (typeof this.removeCanvasBadge === 'function') {
                    this.removeCanvasBadge('reset-timer', 'right');
                }

                const wrapper = document.querySelector('[data-ref="design-wrapper"]');
                if (wrapper) {
                    wrapper.setAttribute('data-reset-active', '0');
                    wrapper.setAttribute('data-reset-at', '');
                }

                window.modalSystem.closeCurrent(true);
                showMessage(result.message || window.__('msg_scheduled_reset_cancelled') || 'Reinicio programado cancelado.', 'success');
            } else {
                showMessage(result?.message || window.__('err_occurred'), 'error');
            }
        } catch (err) {
            showMessage(window.__('general_save_network_error') || window.__('err_occurred'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    },

    async executeScheduledResize(btn) {
        const trigger = document.querySelector('[data-ref="offline-resize-trigger"]') || document.querySelector('[data-ref="scheduled-resize-trigger"]');
        const targetSize = trigger ? trigger.getAttribute('data-value') : '64x64';
        const isActive = true;

        const triggerDateTime = document.querySelector('[data-ref="offline-resize-datetime-trigger"]');
        const inputDateTime = document.querySelector('[data-ref="scheduled_resize_datetime"]');
        const localTimeStr = triggerDateTime ? triggerDateTime.getAttribute('data-value') : (inputDateTime ? inputDateTime.value : '');

        if (!localTimeStr) {
            showMessage(window.__('err_resize_date_required') || 'Debe seleccionar una fecha y hora.', 'warning');
            return;
        }

        const date = new Date(localTimeStr);
        const now = new Date();
        const minFuture = new Date(now.getTime() + 5 * 60 * 1000);
        if (isNaN(date.getTime()) || date < minFuture) {
            showMessage(window.__('err_date_minimum_5_minutes') || 'La fecha debe ser al menos 5 minutos en el futuro.', 'error');
            return;
        }

        const nextResizeAt = localInputFormatToUtcString(localTimeStr);

        if (btn) setButtonLoading(btn);

        const result = await this.api.post(ApiRoutes.Canvases.UpdateResizeSettings, {
            id: this.canvasIntId,
            is_active: isActive,
            next_resize_at: nextResizeAt,
            target_size: targetSize
        });

        if (btn) restoreButton(btn);

        if (result && result.success) {
            this.resizeActive = isActive;
            this.nextResizeAt = nextResizeAt;
            this.resizeTargetSize = targetSize;

            const wrapper = document.querySelector('[data-ref="design-wrapper"]');
            if (wrapper) {
                wrapper.setAttribute('data-resize-active', '1');
                wrapper.setAttribute('data-resize-at', nextResizeAt);
                wrapper.setAttribute('data-resize-target', targetSize);
            }

            if (typeof this.startResizeTimer === 'function') {
                this.startResizeTimer();
            }

            window.modalSystem.closeCurrent(true);
            showMessage(result.message || window.__('msg_resize_settings_updated'), 'success');
        } else {
            showMessage(result?.message || window.__('err_occurred'), 'error');
        }
    },

    async executeOfflineReset(btn) {
        const snapshotCheckbox = document.querySelector('[data-ref="offline_reset_snapshot"]');
        const takeSnapshot = snapshotCheckbox ? snapshotCheckbox.checked : false;

        if (btn) setButtonLoading(btn);

        const result = await this.api.post(ApiRoutes.Canvases.ResetNow, {
            id: this.canvasIntId,
            take_snapshot: takeSnapshot
        });

        if (btn) restoreButton(btn);

        if (result && result.success) {
            window.modalSystem.closeCurrent(true);
            showMessage(result.message || window.__('msg_reset_order_sent'), 'success');

            if (this.offscreenCtx) {
                this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
            }

            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'DRAW_IMAGE_BUFFER',
                    payload: { imageBitmap: null }
                });
            }

            this.selectedPixels.clear();
            this.undoStack = [];
            this.redoStack = [];
            if (typeof this.updateSelectionUI === 'function') this.updateSelectionUI();
            this.requestRender();

            if (this.isOfflineMode) {
                if (this.canvasIntId) {
                    try {
                        localStorage.removeItem(`rosaura_layers_${this.canvasIntId}`);
                    } catch (e) {}
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
        } else {
            showMessage(result?.message || window.__('err_occurred'), 'error');
        }
    },

    async executeScheduledReset(btn) {
        const snapshotCheckbox = document.querySelector('[data-ref="offline_reset_snapshot"]') || document.querySelector('[data-ref="scheduled_reset_snapshot"]');
        const takeSnapshot = snapshotCheckbox ? snapshotCheckbox.checked : false;
        const isActive = true;

        const triggerDateTime = document.querySelector('[data-ref="offline-reset-datetime-trigger"]');
        const inputDateTime = document.querySelector('[data-ref="scheduled_reset_datetime"]');
        const localTimeStr = triggerDateTime ? triggerDateTime.getAttribute('data-value') : (inputDateTime ? inputDateTime.value : '');

        if (!localTimeStr) {
            showMessage(window.__('err_reset_date_required') || 'Debe seleccionar una fecha y hora.', 'warning');
            return;
        }

        const date = new Date(localTimeStr);
        const now = new Date();
        const minFuture = new Date(now.getTime() + 5 * 60 * 1000);
        if (isNaN(date.getTime()) || date < minFuture) {
            showMessage(window.__('err_date_minimum_5_minutes') || 'La fecha debe ser al menos 5 minutos en el futuro.', 'error');
            return;
        }

        const nextResetAt = localInputFormatToUtcString(localTimeStr);

        if (btn) setButtonLoading(btn);

        const result = await this.api.post(ApiRoutes.Canvases.UpdateResetSettings, {
            id: this.canvasIntId,
            is_active: isActive,
            next_reset_at: nextResetAt,
            take_snapshot: takeSnapshot
        });

        if (btn) restoreButton(btn);

        if (result && result.success) {
            this.resetActive = isActive;
            this.nextResetAt = nextResetAt;

            const wrapper = document.querySelector('[data-ref="design-wrapper"]');
            if (wrapper) {
                wrapper.setAttribute('data-reset-active', '1');
                wrapper.setAttribute('data-reset-at', nextResetAt);
            }

            if (typeof this.startResetTimer === 'function') {
                this.startResetTimer();
            }

            window.modalSystem.closeCurrent(true);
            showMessage(result.message || window.__('msg_reset_settings_updated'), 'success');
        } else {
            showMessage(result?.message || window.__('err_occurred'), 'error');
        }
    }
};
