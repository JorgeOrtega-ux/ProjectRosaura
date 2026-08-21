import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { 
    handleOutsideSearchToolbarClick,
    restoreButton, 
    setButtonLoading, 
    showMessage,
    toggleSearchToolbar 
} from '../../../core/utils/uiUtils.js';

class AdminSubscriptionColorController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false;

        this.tierUuid = '';
        this.angle = 0;
        this.colors = [{ hex: '#808080', percentage: 100 }];
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

        this.loadInitialData();
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
        if (e.detail.url.includes('/admin/subscription-color')) {
            this.loadInitialData();
            this.selectedIndices.clear();
            this.render();
        }
    }

    loadInitialData() {
        const view = document.querySelector('[data-ref="adminSubscriptionColorView"]');
        if (view) {
            this.tierUuid = view.getAttribute('data-uuid') || '';
        }

        let rawColors = [];
        const configEl = document.querySelector('[data-ref="tierColorConfigJson"]');
        if (configEl) {
            try {
                const parsed = JSON.parse(configEl.textContent);
                if (parsed) {
                    if (Array.isArray(parsed.colors) && parsed.colors.length > 0) {
                        rawColors = parsed.colors;
                    }
                    if (parsed.angle !== undefined) {
                        this.angle = parseInt(parsed.angle, 10) || 0;
                    }
                }
            } catch (e) {}
        } else {
            const scriptEl = document.querySelector('[data-ref="tierColorsJson"]');
            if (scriptEl) {
                try {
                    const parsed = JSON.parse(scriptEl.textContent);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        rawColors = parsed;
                    }
                } catch (e) {}
            }
        }

        if (rawColors.length > 0) {
            this.colors = rawColors.map(item => {
                if (typeof item === 'string') {
                    return { hex: item.toUpperCase(), percentage: 0 };
                }
                return {
                    hex: (item.hex || '#808080').toUpperCase(),
                    percentage: parseInt(item.percentage || 0, 10)
                };
            });
            this.ensurePercentages();
        } else {
            this.colors = [{ hex: '#808080', percentage: 100 }];
        }
    }

    ensurePercentages() {
        const count = this.colors.length;
        if (count === 1) {
            this.colors[0].percentage = 100;
            return;
        }

        const sum = this.colors.reduce((acc, c) => acc + (c.percentage || 0), 0);
        if (sum !== 100) {
            this.autoDistributePercentages();
        }
    }

    autoDistributePercentages() {
        const count = this.colors.length;
        if (count === 0) return;
        if (count === 1) {
            this.colors[0].percentage = 100;
            return;
        }

        const base = Math.floor(100 / count);
        const rem = 100 % count;
        this.colors.forEach((c, idx) => {
            c.percentage = base + (idx < rem ? 1 : 0);
        });
    }

    render() {
        this.renderTable();
        this.updateSelectionUI();
        this.updateLivePreview();
    }

    renderTable() {
        const tbody = document.querySelector('[data-ref="subscriptionColorsTableBody"]');
        if (!tbody) return;

        const count = this.colors.length;
        const controlDisabled = count === 1 ? 'disabled-interaction' : '';

        let visibleCount = 0;
        let html = '';

        this.colors.forEach((item, index) => {
            const hex = item.hex;
            const percentage = item.percentage;

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
                        <div class="component-inline-control component-inline-control--fixed ${controlDisabled}" data-ref="percentageControl">
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustColorPercent" data-index="${index}" data-step="-5">
                                    <span class="material-symbols-rounded">chevron_left</span>
                                </button>
                            </div>
                            <div class="component-inline-control__center" data-val="${percentage}">
                                <span data-ref="percentageDisplay">${percentage}</span>%
                            </div>
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustColorPercent" data-index="${index}" data-step="5">
                                    <span class="material-symbols-rounded">chevron_right</span>
                                </button>
                            </div>
                        </div>
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
                    <td colspan="6">
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

    setGradientAngle(val) {
        this.angle = parseInt(val, 10) || 0;
        const trigger = document.querySelector('[data-ref="gradientAngleTrigger"]');
        const text = document.querySelector('[data-ref="gradientAngleText"]');
        if (trigger) trigger.dataset.value = this.angle;
        if (text) text.textContent = `${this.angle}°`;

        document.querySelectorAll('[data-module="moduleGradientAngle"] [data-action="setGradientAngle"]').forEach(link => {
            if (parseInt(link.dataset.value, 10) === this.angle) link.classList.add('active');
            else link.classList.remove('active');
        });

        this.updateLivePreview();
    }

    adjustPercentage(index, step) {
        if (this.colors.length <= 1 || index < 0 || index >= this.colors.length) return;

        const currentVal = this.colors[index].percentage;
        const newVal = Math.max(5, Math.min(95, currentVal + step));
        const diff = newVal - currentVal;
        if (diff === 0) return;

        this.colors[index].percentage = newVal;

        const otherIndices = this.colors.map((_, i) => i).filter(i => i !== index);
        let remainingDiff = -diff;

        while (remainingDiff !== 0) {
            const stepSign = remainingDiff > 0 ? 1 : -1;
            let distributed = false;

            for (const i of otherIndices) {
                if (remainingDiff === 0) break;
                const canChange = stepSign > 0 
                    ? this.colors[i].percentage < 95 
                    : this.colors[i].percentage > 5;

                if (canChange) {
                    this.colors[i].percentage += stepSign;
                    remainingDiff -= stepSign;
                    distributed = true;
                }
            }

            if (!distributed) break;
        }

        this.render();
    }

    updateLivePreview() {
        const count = this.colors.length;
        const angleWrapper = document.querySelector('[data-ref="gradientAngleDropdownWrapper"]');
        if (angleWrapper) {
            if (count > 1) angleWrapper.classList.remove('disabled');
            else angleWrapper.classList.add('disabled');
        }

        let cssBg = '#808080';
        if (count === 1) {
            cssBg = this.colors[0].hex;
        } else if (count > 1) {
            let prevStop = 0;
            const segments = this.colors.map(item => {
                const endStop = prevStop + item.percentage;
                const seg = `${item.hex} ${prevStop}% ${endStop}%`;
                prevStop = endStop;
                return seg;
            });
            cssBg = `conic-gradient(from ${this.angle}deg, ${segments.join(', ')})`;
        }

        const avatar = document.querySelector('[data-ref="subscriptionLivePreviewAvatar"]');
        if (avatar) {
            avatar.dataset.subBg = cssBg;
            avatar.style.setProperty('--active-subscription-bg', cssBg);
        }
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
        const percentBtn = e.target.closest('[data-action="adjustColorPercent"]');
        const searchBtn = e.target.closest('[data-action="searchColor"]');
        const selectTarget = e.target.closest('[data-action="selectColorRow"]');
        const editBtn = e.target.closest('[data-action="editSelectedColor"]');
        const deleteBtn = e.target.closest('[data-action="deleteSelectedColors"]');
        const addBtn = e.target.closest('[data-action="openAddColorModal"]');
        const saveBtn = e.target.closest('[data-action="saveColorData"]');
        const angleBtn = e.target.closest('[data-action="setGradientAngle"]');

        if (percentBtn) {
            e.stopPropagation();
            const index = parseInt(percentBtn.dataset.index, 10);
            const step = parseInt(percentBtn.dataset.step, 10);
            this.adjustPercentage(index, step);
            return;
        }

        if (angleBtn) {
            this.setGradientAngle(angleBtn.dataset.value);
            return;
        }

        if (searchBtn) {
            toggleSearchToolbar('[data-ref="search-toolbar"]', '[data-ref="color-search-input"]');
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
            this.saveColors(saveBtn);
        }

        if (selectTarget && !e.target.closest('button') && !e.target.closest('.component-inline-control')) {
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
        if (this.colors.length >= 12) {
            showMessage(window.__('admin_max_colors_reached', [], 'Límite máximo de colores alcanzado (12)'), 'warning');
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
            this.colors.push({ hex: selectedHex, percentage: 0 });
            this.autoDistributePercentages();
            this.render();
        }
    }

    async editSelectedColor() {
        if (this.selectedIndices.size !== 1) return;

        const index = Array.from(this.selectedIndices)[0];
        const currentHex = this.colors[index].hex;

        const res = await window.modalSystem.show('editPaletteColorModal', {
            hex: currentHex,
            title: window.__('canvas_palette_color_modal_title'),
            desc: window.__('canvas_palette_color_modal_desc'),
            confirmText: window.__('btn_save')
        });

        if (res && res.confirmed) {
            let selectedHex = (res.data?.selected_hex || currentHex).toUpperCase();
            if (!selectedHex.startsWith('#')) selectedHex = '#' + selectedHex;
            this.colors[index].hex = selectedHex;
            this.render();
        }
    }

    deleteSelectedColors() {
        if (this.selectedIndices.size === 0) return;

        const remainingCount = this.colors.length - this.selectedIndices.size;
        if (remainingCount < 1) {
            showMessage(window.__('msg_subscription_min_colors'), 'warning');
            return;
        }

        this.colors = this.colors.filter((_, idx) => !this.selectedIndices.has(idx));
        this.selectedIndices.clear();
        this.autoDistributePercentages();
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

    async saveColors(btn) {
        if (!this.tierUuid) {
            showMessage(window.__('err_default'), 'error');
            return;
        }

        if (this.colors.length < 1) {
            showMessage(window.__('msg_subscription_min_colors'), 'error');
            return;
        }

        this.ensurePercentages();
        setButtonLoading(btn);

        const payload = {
            uuid: this.tierUuid,
            angle: this.angle,
            colors: this.colors
        };

        const res = await this.api.post(ApiRoutes.Admin.SaveSubscriptionColor, payload, this.abortController.signal);

        if (res.aborted) return;

        restoreButton(btn);

        if (res.success) {
            showMessage(window.__('admin_subscription_color_updated'), 'success');
            setTimeout(() => this.goBack(), 1200);
        } else {
            showMessage(res.message || window.__('err_default'), 'error');
        }
    }

    goBack() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/subscription-edit/${this.tierUuid}`);
        } else {
            window.location.href = `${this.basePath}/admin/subscription-edit/${this.tierUuid}`;
        }
    }
}

export { AdminSubscriptionColorController };