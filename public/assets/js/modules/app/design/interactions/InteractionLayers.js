import { showMessage } from '../../../../core/utils/uiUtils.js';

export const InteractionLayers = {
    layers: [],
    activeLayerId: null,
    isLayersPanelOpen: false,

    toggleLayersPanel() {
        if (!this.isOfflineMode) return;
        const panel = document.querySelector('[data-ref="layers-floating-panel"]');
        const btn = document.querySelector('[data-ref="btn-toggle-layers"]');
        if (!panel) return;

        const isCurrentlyOpen = !panel.classList.contains('disabled');
        if (isCurrentlyOpen) {
            panel.classList.add('disabled');
            if (btn) btn.classList.remove('active');
            this.isLayersPanelOpen = false;
        } else {
            panel.classList.remove('disabled');
            if (btn) btn.classList.add('active');
            this.isLayersPanelOpen = true;
            if (this.renderWorker) {
                this.renderWorker.postMessage({ type: 'GET_LAYERS_STATE' });
            }
        }
    },

    handleLayersStateChanged(payload) {
        if (!payload) return;
        this.layers = payload.layers || [];
        this.activeLayerId = payload.activeLayerId || null;
        this.renderLayersUI();

        const activeLayer = this.layers.find(l => l.id === this.activeLayerId);
        const nameEl = document.querySelector('[data-ref="layer-active-name"]');
        const dimEl = document.querySelector('[data-ref="layer-active-dimensions"]');
        if (nameEl && activeLayer) {
            nameEl.textContent = activeLayer.name;
        }
        if (dimEl && payload.boardWidth && payload.boardHeight) {
            dimEl.textContent = `${payload.boardWidth}x${payload.boardHeight} px`;
        }
    },

    handleLayerPreviewUpdated(payload) {
        if (!payload) return;
        const previewCanvas = document.querySelector('[data-ref="layer-preview-canvas"]');
        if (!previewCanvas) return;

        const ctx = previewCanvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        if (payload.imageBitmap) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(payload.imageBitmap, 0, 0, previewCanvas.width, previewCanvas.height);
        }

        const nameEl = document.querySelector('[data-ref="layer-active-name"]');
        if (nameEl && payload.layerName) {
            nameEl.textContent = payload.layerName;
        }
        const dimEl = document.querySelector('[data-ref="layer-active-dimensions"]');
        if (dimEl && payload.boardWidth && payload.boardHeight) {
            dimEl.textContent = `${payload.boardWidth}x${payload.boardHeight} px`;
        }
    },

    renderLayersUI() {
        const container = document.querySelector('[data-ref="layers-list-scroll"]');
        if (!container) return;

        container.innerHTML = '';

        if (!this.layers || this.layers.length === 0) return;

        this.layers.forEach((layer) => {
            const isActive = layer.id === this.activeLayerId;
            const isLocked = !!layer.locked;
            const isVisible = layer.visible !== false;

            const item = document.createElement('div');
            item.className = `component-layer-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`;
            item.setAttribute('data-layer-id', layer.id);
            item.draggable = true;

            // Drag handle
            const dragHandle = document.createElement('div');
            dragHandle.className = 'component-layer-item__drag';
            dragHandle.innerHTML = '<span class="material-symbols-rounded">drag_indicator</span>';

            // Drag & drop events for reordering
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', layer.id);
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('is-dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('is-dragging');
                container.querySelectorAll('.component-layer-item').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (e.clientY < midY) {
                    item.classList.add('drag-over-top');
                    item.classList.remove('drag-over-bottom');
                } else {
                    item.classList.add('drag-over-bottom');
                    item.classList.remove('drag-over-top');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over-top', 'drag-over-bottom');
                const draggedId = e.dataTransfer.getData('text/plain');
                if (!draggedId || draggedId === layer.id) return;

                const fromIdx = this.layers.findIndex(l => l.id === draggedId);
                let toIdx = this.layers.findIndex(l => l.id === layer.id);
                if (fromIdx < 0 || toIdx < 0) return;

                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const isBelow = e.clientY >= midY;

                const newLayers = [...this.layers];
                const [moved] = newLayers.splice(fromIdx, 1);
                
                let targetInsertIdx = this.layers.findIndex(l => l.id === layer.id);
                if (fromIdx < targetInsertIdx) targetInsertIdx--;
                if (isBelow) targetInsertIdx++;
                
                targetInsertIdx = Math.max(0, Math.min(newLayers.length, targetInsertIdx));
                newLayers.splice(targetInsertIdx, 0, moved);

                this.layers = newLayers;
                this.renderLayersUI();

                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'REORDER_LAYERS',
                        payload: { order: this.layers.map(l => l.id) }
                    });
                }
            });

            // Visibility toggle
            const visLabel = document.createElement('label');
            visLabel.className = 'component-layer-item__visibility';
            visLabel.setAttribute('data-tooltip', isVisible ? window.__('tooltip_layer_visibility') : window.__('tooltip_layer_visibility'));
            visLabel.setAttribute('data-position', 'top');

            const visInput = document.createElement('input');
            visInput.type = 'checkbox';
            visInput.checked = isVisible;
            visInput.setAttribute('data-action', 'toggleLayerVisibility');
            visInput.setAttribute('data-layer-id', layer.id);

            const iconVis = document.createElement('span');
            iconVis.className = 'material-symbols-rounded icon-visible';
            iconVis.textContent = 'visibility';

            const iconHid = document.createElement('span');
            iconHid.className = 'material-symbols-rounded icon-hidden';
            iconHid.textContent = 'visibility_off';

            visLabel.appendChild(visInput);
            visLabel.appendChild(iconVis);
            visLabel.appendChild(iconHid);

            // Layer content / Title
            const contentDiv = document.createElement('div');
            contentDiv.className = 'component-layer-item__content';
            contentDiv.setAttribute('data-action', 'selectLayer');
            contentDiv.setAttribute('data-layer-id', layer.id);

            const titleSpan = document.createElement('span');
            titleSpan.className = 'component-layer-item__title';
            titleSpan.setAttribute('data-ref', 'layer-title');
            titleSpan.setAttribute('data-layer-id', layer.id);
            titleSpan.textContent = layer.name;
            titleSpan.title = layer.name;

            // Double click to rename
            titleSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                titleSpan.setAttribute('contenteditable', 'true');
                titleSpan.focus();
                const range = document.createRange();
                range.selectNodeContents(titleSpan);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            });

            const finishRename = () => {
                if (titleSpan.getAttribute('contenteditable') === 'true') {
                    titleSpan.removeAttribute('contenteditable');
                    const newName = titleSpan.textContent.trim();
                    if (newName && newName !== layer.name) {
                        this.renameLayer(layer.id, newName);
                    } else {
                        titleSpan.textContent = layer.name;
                    }
                }
            };

            titleSpan.addEventListener('blur', finishRename);
            titleSpan.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    titleSpan.blur();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    titleSpan.textContent = layer.name;
                    titleSpan.removeAttribute('contenteditable');
                    titleSpan.blur();
                }
            });

            contentDiv.appendChild(titleSpan);

            // Lock button
            const lockBtn = document.createElement('button');
            lockBtn.className = `component-button component-button--icon component-button--h24 ${isLocked ? 'active' : ''}`;
            lockBtn.setAttribute('data-action', 'toggleLayerLock');
            lockBtn.setAttribute('data-layer-id', layer.id);
            lockBtn.setAttribute('data-tooltip', window.__('tooltip_layer_lock'));
            lockBtn.setAttribute('data-position', 'top');
            lockBtn.innerHTML = `<span class="material-symbols-rounded">${isLocked ? 'lock' : 'lock_open'}</span>`;

            item.appendChild(dragHandle);
            item.appendChild(visLabel);
            item.appendChild(contentDiv);
            item.appendChild(lockBtn);

            container.appendChild(item);
        });
    },

    addLayer() {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const count = (this.layers ? this.layers.length : 0) + 1;
        const defaultName = `${window.__('lbl_default_layer_name') || 'Capa'} ${count}`;
        this.renderWorker.postMessage({
            type: 'ADD_LAYER',
            payload: { name: defaultName }
        });
    },

    deleteLayer(layerId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        if (this.layers && this.layers.length <= 1) {
            showMessage(window.__('msg_layer_cannot_delete_last') || 'No se puede eliminar la única capa.', 'warning');
            return;
        }
        this.renderWorker.postMessage({
            type: 'DELETE_LAYER',
            payload: { layerId: targetId }
        });
    },

    selectLayer(layerId) {
        if (!this.isOfflineMode || !this.renderWorker || !layerId) return;
        if (this.activeLayerId === layerId) return;
        this.activeLayerId = layerId;
        this.renderWorker.postMessage({
            type: 'SELECT_LAYER',
            payload: { layerId }
        });
    },

    toggleLayerVisibility(layerId, visible = undefined) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'TOGGLE_LAYER_VISIBILITY',
            payload: { layerId: targetId, visible }
        });
    },

    toggleLayerLock(layerId, locked = undefined) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'TOGGLE_LAYER_LOCK',
            payload: { layerId: targetId, locked }
        });
    },

    renameLayer(layerId, name) {
        if (!this.isOfflineMode || !this.renderWorker || !name) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'RENAME_LAYER',
            payload: { layerId: targetId, name: name.trim() }
        });
    },

    moveLayerUp(layerId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'MOVE_LAYER_UP',
            payload: { layerId: targetId }
        });
    },

    moveLayerDown(layerId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'MOVE_LAYER_DOWN',
            payload: { layerId: targetId }
        });
    },

    duplicateLayer(layerId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'DUPLICATE_LAYER',
            payload: { layerId: targetId }
        });
    },

    mergeLayerUp(layerId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'MERGE_LAYER_UP',
            payload: { layerId: targetId }
        });
    },

    mergeLayerDown(layerId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'MERGE_LAYER_DOWN',
            payload: { layerId: targetId }
        });
    }
};
