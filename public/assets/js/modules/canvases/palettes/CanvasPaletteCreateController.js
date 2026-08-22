import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { 
    handleOutsideSearchToolbarClick,
    restoreButton, 
    setButtonLoading, 
    showMessage, 
    toggleSearchToolbar 
} from '../../../core/utils/uiUtils.js';

class CanvasPaletteCreateController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false;

        this.colors = ['#D32029', '#206BD3', '#3EB352', '#FF8C00'];
        this.selectedIndices = new Set();
        this.searchQuery = '';

        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();

        this.bindEvents();
        this.render();
    }

    destroy() {
        if (!this.isInitialized) return;
        if (this.abortController) this.abortController.abort();

        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('input', this.handleInputBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);

        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('input', this.handleInputBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/canvases/palettes/create')) {
            this.selectedIndices.clear();
            this.render();
        }
    }

    render() {
        this.renderTable();
        this.updateCount();
        this.updateSelectionUI();
    }

    updateCount() {
        const countEl = document.querySelector('[data-ref="paletteColorCount"]');
        if (countEl) {
            countEl.textContent = `${this.colors.length} / 36`;
        }

        const addBtn = document.querySelector('[data-ref="btn-add-color"]');
        if (addBtn) {
            if (this.colors.length >= 36) {
                addBtn.classList.add('disabled-interaction');
            } else {
                addBtn.classList.remove('disabled-interaction');
            }
        }
    }

    renderTable() {
        const tbody = document.querySelector('[data-ref="paletteTableBody"]');
        if (!tbody) return;

        let visibleCount = 0;
        let html = '';

        this.colors.forEach((hex, index) => {
            if (this.searchQuery && !hex.toLowerCase().includes(this.searchQuery.toLowerCase())) {
                return;
            }

            visibleCount++;
            const isSelected = this.selectedIndices.has(index);
            const rowClass = isSelected ? 'component-table-row selected' : 'component-table-row';
            const rgb = this.hexToRgb(hex);
            const hsl = this.hexToHsl(hex);

            html += `
                <tr class="${rowClass}" data-action="selectColorRow" data-index="${index}">
                    <td>
                        <div class="component-badge component-badge--sm">#${index + 1}</div>
                    </td>
                    <td>
                        <div class="component-table-color-swatch" style="background-color: ${hex};"></div>
                    </td>
                    <td>
                        <span class="component-code-text search-target">${hex}</span>
                    </td>
                    <td>
                        <span class="component-subtext">rgb(${rgb.r}, ${rgb.g}, ${rgb.b})</span>
                    </td>
                    <td>
                        <span class="component-subtext">hsl(${hsl.h}°, ${hsl.s}%, ${hsl.l}%)</span>
                    </td>
                </tr>
            `;
        });

        if (visibleCount === 0) {
            html = `
                <tr>
                    <td colspan="5">
                        <div class="component-table-empty">
                            <span class="material-symbols-rounded">palette</span>
                            <p>${window.__('dt_zero_records')}</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        tbody.innerHTML = html;
    }

    handleColorSelection(rowElement) {
        const index = parseInt(rowElement.getAttribute('data-index'), 10);
        if (this.selectedIndices.has(index)) {
            this.selectedIndices.delete(index);
            rowElement.classList.remove('selected');
        } else {
            this.selectedIndices.add(index);
            rowElement.classList.add('selected');
        }
        this.updateSelectionUI();
    }

    deselectAll() {
        this.selectedIndices.clear();
        document.querySelectorAll('[data-action="selectColorRow"]').forEach(el => el.classList.remove('selected'));
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');
        const btnEdit = document.querySelector('[data-ref="btn-edit-color"]');

        if (this.selectedIndices.size > 0) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');

            if (btnEdit) {
                if (this.selectedIndices.size === 1) {
                    btnEdit.classList.remove('disabled-interaction');
                } else {
                    btnEdit.classList.add('disabled-interaction');
                }
            }
        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
        }
    }

    handleInput(e) {
        const searchInput = e.target.closest('[data-ref="color-search-input"]');
        if (searchInput) {
            this.searchQuery = searchInput.value.trim();
            this.renderTable();
        }
    }

    handleClick(e) {
        const searchBtn = e.target.closest('[data-action="searchColor"]');
        const selectTarget = e.target.closest('[data-action="selectColorRow"]');
        const editBtn = e.target.closest('[data-action="editSelectedColor"]');
        const deleteBtn = e.target.closest('[data-action="deleteSelectedColors"]');
        const addBtn = e.target.closest('[data-action="openAddColorModal"]');
        const saveBtn = e.target.closest('[data-action="savePaletteData"]');
        const backBtn = e.target.closest('[data-action="goBack"]');

        if (searchBtn) {
            toggleSearchToolbar('[data-ref="search-toolbar"]', '[data-ref="color-search-input"]');
        }

        if (backBtn) {
            this.goBack();
        }

        if (addBtn && !addBtn.classList.contains('disabled-interaction')) {
            this.openAddColorModal();
        }

        if (editBtn && !editBtn.classList.contains('disabled-interaction')) {
            this.editSelectedColor();
        }

        if (deleteBtn && !deleteBtn.classList.contains('disabled-interaction')) {
            this.deleteSelectedColors();
        }

        if (saveBtn && !saveBtn.classList.contains('disabled-interaction')) {
            this.savePalette(saveBtn);
        }

        if (selectTarget && !e.target.closest('button')) {
            this.handleColorSelection(selectTarget);
            return;
        }

        if (!e.target.closest('[data-ref="header-selection-actions"]') && 
            !e.target.closest('.component-modal-box') && 
            !e.target.closest('[data-ref="view-table"]')) {
            if (this.selectedIndices.size > 0) {
                this.deselectAll();
            }
        }

        handleOutsideSearchToolbarClick(e, searchBtn);
    }

    async openAddColorModal() {
        if (this.colors.length >= 36) {
            showMessage(window.__('msg_max_palette_colors'), 'warning');
            return;
        }

        const res = await window.modalSystem.show('editPaletteColorModal', {
            hex: '#3B82F6',
            title: window.__('canvas_palette_color_add_title'),
            desc: window.__('canvas_palette_color_add_desc'),
            confirmText: window.__('btn_add_new_color')
        });

        if (res && res.confirmed) {
            let selectedHex = (res.data?.selected_hex || '#3B82F6').toUpperCase();
            if (!selectedHex.startsWith('#')) selectedHex = '#' + selectedHex;
            this.colors.push(selectedHex);
            this.render();
        }
    }

    async editSelectedColor() {
        if (this.selectedIndices.size !== 1) return;

        const index = Array.from(this.selectedIndices)[0];
        const currentHex = this.colors[index];

        const res = await window.modalSystem.show('editPaletteColorModal', {
            hex: currentHex,
            title: window.__('canvas_palette_color_modal_title'),
            desc: window.__('canvas_palette_color_modal_desc'),
            confirmText: window.__('btn_save')
        });

        if (res && res.confirmed) {
            let selectedHex = (res.data?.selected_hex || currentHex).toUpperCase();
            if (!selectedHex.startsWith('#')) selectedHex = '#' + selectedHex;
            this.colors[index] = selectedHex;
            this.render();
        }
    }

    deleteSelectedColors() {
        if (this.selectedIndices.size === 0) return;

        const remainingCount = this.colors.length - this.selectedIndices.size;
        if (remainingCount < 4) {
            showMessage(window.__('msg_palette_min_colors'), 'warning');
            return;
        }

        this.colors = this.colors.filter((_, idx) => !this.selectedIndices.has(idx));
        this.selectedIndices.clear();
        this.render();
    }

    hexToRgb(hex) {
        let clean = hex.replace('#', '');
        if (clean.length === 3) {
            clean = clean.split('').map(c => c + c).join('');
        }
        const num = parseInt(clean, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    hexToHsl(hex) {
        const { r, g, b } = this.hexToRgb(hex);
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;

        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
                case gNorm: h = (bNorm - rNorm) / d + 2; break;
                case bNorm: h = (rNorm - gNorm) / d + 4; break;
            }
            h = Math.round(h * 60);
        }

        return {
            h: Math.round(h),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    async savePalette(btn) {
        const nameInput = document.querySelector('[data-ref="paletteNameInput"]');
        const name = nameInput ? nameInput.value.trim() : '';

        if (!name) {
            showMessage(window.__('msg_palette_name_required'), 'error');
            return;
        }

        if (this.colors.length < 4) {
            showMessage(window.__('msg_palette_min_colors'), 'error');
            return;
        }

        setButtonLoading(btn);

        const payload = {
            name: name,
            colors: this.colors
        };

        const res = await this.api.post(ApiRoutes.Canvases.CreateCustomPalette, payload, this.abortController.signal);

        if (res.aborted) return;

        restoreButton(btn);

        if (res.success) {
            showMessage(window.__('msg_palette_created'), 'success');

            if (!window.APP_CUSTOM_PALETTES) window.APP_CUSTOM_PALETTES = [];
            window.APP_CUSTOM_PALETTES.push({
                palette_key: res.data.palette_key,
                name: name,
                colors: this.colors
            });

            this.goBack();
        } else {
            showMessage(res.message, 'error');
        }
    }

    goBack() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/canvases/create`);
        } else {
            window.location.href = `${this.basePath}/canvases/create`;
        }
    }
}

export { CanvasPaletteCreateController };
