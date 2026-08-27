import { ApiRoutes } from '../api/ApiRoutes.js';
import { ApiService } from '../api/ApiService.js';
import { closeDropdown, escapeHTML, filterMenuList, getAllPalettes, getDynamicTierName, restoreButton, setButtonLoading, showMessage } from '../utils/uiUtils.js';

export class CreateCanvasModalController {
    constructor(modalBox, data = {}) {
        this.modalBox = modalBox;
        this.data = data;
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.activeTab = data.initialTab || 'templates';
        this.templates = [];
        this.userTier = window.APP_USER?.subscription_tier ?? 0;
        this.tier3CanvasesCount = parseInt(data.tier3CanvasesCount ?? 0, 10);
        this.maxTier3Canvases = parseInt(data.maxTier3Canvases ?? 3, 10);

        this.formState = {
            name: '',
            size: '64x64',
            privacy: 'private',
            requires_approval: 'false',
            palette_id: 'default',
            limit: 10,
            cooldown_pixels_batch: 5,
            cooldown_seconds: 10,
            allow_chat: 1,
            tags: [],
            template_id: null
        };

        this.allowedTags = [
            'art', 'gaming', 'anime', 'flags', 'memes', 
            'pixelart', 'community', 'nature', 'scifi', 
            'fantasy', 'music', 'sports', 'popculture'
        ];

        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
        this.handlePaletteCreatedBound = null;
    }

    init() {
        this.setupDefaultValues();
        this.bindEvents();
        this.loadTemplates();
        this.renderPalettes();
        this.switchTab(this.activeTab);
    }

    destroy() {
        if (this.modalBox) {
            this.modalBox.removeEventListener('click', this.handleClickBound);
            this.modalBox.removeEventListener('input', this.handleInputBound);
            this.modalBox.removeEventListener('change', this.handleChangeBound);
        }
        if (this.handlePaletteCreatedBound) {
            window.removeEventListener('customPaletteCreated', this.handlePaletteCreatedBound);
        }
    }

    bindEvents() {
        if (!this.modalBox) return;
        this.modalBox.addEventListener('click', this.handleClickBound);
        this.modalBox.addEventListener('input', this.handleInputBound);
        this.modalBox.addEventListener('change', this.handleChangeBound);

        this.handlePaletteCreatedBound = (e) => {
            if (e.detail?.palette_key) {
                this.selectPalette(e.detail.palette_key);
                this.renderPalettes();
            }
        };
        window.addEventListener('customPaletteCreated', this.handlePaletteCreatedBound);
    }

    setupDefaultValues() {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        const defaultName = `Lienzo #${randNum}`;
        this.formState.name = defaultName;

        const displayEl = this.modalBox.querySelector('[data-ref="display-canvasname"]');
        const inputEl = this.modalBox.querySelector('[data-ref="input-canvasname"]');

        if (displayEl) displayEl.textContent = defaultName;
        if (inputEl) {
            inputEl.value = defaultName;
            inputEl.setAttribute('data-original-value', defaultName);
        }
    }

    async loadTemplates() {
        const grid = this.modalBox.querySelector('[data-ref="modal-create-templates-grid"]');
        try {
            const res = await fetch(`${this.basePath}/assets/config/canvas_templates.json`);
            if (res.ok) {
                this.templates = await res.json();
                if (grid) this.renderTemplatesGrid();
            }
        } catch (err) {
            console.error('Error loading canvas templates:', err);
        }
    }

    renderTemplatesGrid() {
        const grid = this.modalBox.querySelector('[data-ref="modal-create-templates-grid"]');
        if (!grid) return;

        const t = (k, f) => (typeof window.__ === 'function' ? window.__(k) || f : f);

        const isEmptySelected = !this.formState.template_id;
        let html = `
            <div class="component-modal-template-card ${isEmptySelected ? 'active selected' : ''}" data-action="selectCreateTemplate" data-template-id="">
                <div class="component-modal-template-preview component-modal-template-preview--empty">
                    <span class="material-symbols-rounded">crop_free</span>
                </div>
                <span class="component-modal-template-check material-symbols-rounded">check_circle</span>
                <div class="component-modal-template-info">
                    <span class="component-modal-template-name">${t('lbl_empty_canvas', 'Lienzo en blanco')}</span>
                    <span class="component-modal-template-desc">${t('desc_empty_canvas', 'Lienzo limpio sin diseño previo.')}</span>
                </div>
            </div>
        `;

        (this.templates || []).forEach(tpl => {
            const isSelected = this.formState.template_id === tpl.id;
            const name = t(tpl.name_key, tpl.id);
            const desc = t(tpl.description_key, 'Plantilla predefinida con arte base.');
            const thumbnailSrc = `${this.basePath}${tpl.thumbnail}`;

            html += `
                <div class="component-modal-template-card ${isSelected ? 'active selected' : ''}" data-action="selectCreateTemplate" data-template-id="${escapeHTML(tpl.id)}">
                    <img class="component-modal-template-img image-lazy-fade" src="${escapeHTML(thumbnailSrc)}" alt="${escapeHTML(name)}" loading="lazy" onload="this.classList.add('image-loaded')" onerror="this.classList.add('image-loaded')">
                    <span class="component-modal-template-check material-symbols-rounded">check_circle</span>
                    <div class="component-modal-template-info">
                        <span class="component-modal-template-name">${escapeHTML(name)}</span>
                        <span class="component-modal-template-desc">${escapeHTML(desc)}</span>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    renderPalettes() {
        const grid = this.modalBox.querySelector('[data-ref="modal-create-palettes-grid"]');
        if (!grid) return;

        const palettes = getAllPalettes();
        const canUseCustomPalettes = window.APP_LIMITS && window.APP_LIMITS.custom_palettes === true;
        const t = (k, f) => (typeof window.__ === 'function' ? window.__(k) || f : f);

        let html = '';
        palettes.forEach(pal => {
            const isDefault = pal.id === 'default';
            let reqTier = pal.tier !== undefined ? pal.tier : 0;
            const isLocked = isDefault ? false : (pal.id.startsWith('custom_') || pal.is_custom ? !canUseCustomPalettes : (this.userTier < reqTier));
            const isSelected = this.formState.palette_id === pal.id;

            let name = t(pal.name_key, pal.name || pal.id);
            if (name === pal.name_key && typeof pal.name_key === 'string' && pal.name_key.startsWith('palette_')) {
                name = pal.name_key.replace(/^palette_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
            const rawColors = Array.isArray(pal.colors) ? pal.colors : [];
            const colors = rawColors.map(c => {
                if (typeof c === 'object' && c !== null) {
                    return c.hex || c.color || '#000000';
                }
                return c || '#000000';
            });

            const tierBadge = reqTier > 0 && isLocked
                ? `<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ${escapeHTML(getDynamicTierName(reqTier))}</span>`
                : '';

            html += `
                <div class="component-modal-palette-card ${isSelected ? 'active selected' : ''} ${isLocked ? 'disabled-interaction' : ''}" data-action="${isLocked ? '' : 'selectCreatePalette'}" data-palette-id="${escapeHTML(pal.id)}">
                    <div class="component-modal-palette-card-header">
                        <div class="component-modal-palette-title-group">
                            <span class="component-modal-palette-name">${escapeHTML(name)}</span>
                            ${tierBadge}
                        </div>
                    </div>
                    <div class="component-modal-palette-swatches">
                        ${colors.slice(0, 24).map(hex => `<span class="component-modal-palette-swatch" style="background-color: ${escapeHTML(hex)};"></span>`).join('')}
                    </div>
                    <span class="component-modal-palette-check material-symbols-rounded">check_circle</span>
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    closeAllDropdowns() {
        if (!this.modalBox) return;
        const modules = this.modalBox.querySelectorAll('.component-module--dropdown:not(.disabled)');
        modules.forEach(m => m.classList.add('disabled'));
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        const links = this.modalBox.querySelectorAll('.component-modal-settings-sidebar [data-action="switchCreateModalTab"]');
        links.forEach(link => {
            if (link.getAttribute('data-tab') === tabName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        const tabContents = this.modalBox.querySelectorAll('.component-modal-tab-content');
        tabContents.forEach(tc => {
            if (tc.getAttribute('data-ref') === `tab-create-${tabName}`) {
                tc.classList.remove('disabled');
                tc.classList.add('active');
            } else {
                tc.classList.remove('active');
                tc.classList.add('disabled');
            }
        });

        const t = (k, f) => (typeof window.__ === 'function' ? window.__(k) || f : f);
        const titles = {
            templates: t('canvas_template_modal_title', 'Elegir plantilla'),
            general: t('canvas_accordion_general_title', 'Información general'),
            dimensions: t('canvas_size_title', 'Dimensiones del lienzo'),
            access: t('canvas_accordion_access_title', 'Privacidad y acceso'),
            rules: t('canvas_accordion_rules_title', 'Reglas y cooldown'),
            palette: t('canvas_palette_modal_title', 'Paleta de colores')
        };

        const titleEl = this.modalBox.querySelector('[data-ref="modal-create-section-title"]');
        if (titleEl && titles[tabName]) {
            titleEl.textContent = titles[tabName];
        }
    }

    handleClick(e) {
        // Dropdown toggle
        const trigger = e.target.closest('[data-action="toggleModule"]');
        if (trigger) {
            e.preventDefault();
            e.stopPropagation();
            const targetName = trigger.getAttribute('data-target');
            const targetModule = this.modalBox.querySelector(`[data-module="${targetName}"]`);
            if (targetModule) {
                const isClosed = targetModule.classList.contains('disabled');
                this.closeAllDropdowns();
                if (isClosed) {
                    targetModule.classList.remove('disabled');
                }
            }
            return;
        }

        // Close dropdowns on outside click
        if (!e.target.closest('.component-module') && !e.target.closest('[data-action="toggleModule"]')) {
            this.closeAllDropdowns();
        }

        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');

        if (action === 'switchCreateModalTab') {
            e.preventDefault();
            const tab = actionBtn.getAttribute('data-tab');
            if (tab) this.switchTab(tab);
        } else if (action === 'toggleAccordion') {
            e.preventDefault();
            e.stopPropagation();
            const accordion = actionBtn.closest('.component-accordion');
            if (accordion) accordion.classList.toggle('active');
        } else if (action === 'toggleEditState') {
            e.preventDefault();
            e.stopPropagation();
            this.handleToggleEditState(actionBtn);
        } else if (action === 'saveCanvasName') {
            e.preventDefault();
            e.stopPropagation();
            this.saveCanvasName(actionBtn);
        } else if (action === 'selectCreateTemplate') {
            e.preventDefault();
            const templateId = actionBtn.getAttribute('data-template-id');
            this.selectTemplate(templateId, actionBtn);
        } else if (action === 'selectCreatePalette') {
            e.preventDefault();
            const paletteId = actionBtn.getAttribute('data-palette-id');
            this.selectPalette(paletteId);
        } else if (action === 'selectValue') {
            e.preventDefault();
            e.stopPropagation();
            this.selectDropdownValue(actionBtn);
        } else if (action === 'toggleTag') {
            e.preventDefault();
            e.stopPropagation();
            this.toggleTag(actionBtn);
        } else if (action === 'adjustLimit') {
            e.preventDefault();
            const step = parseInt(actionBtn.getAttribute('data-step') || '10', 10);
            this.adjustLimit(step);
        } else if (action === 'adjustCooldownBatch') {
            e.preventDefault();
            const step = parseInt(actionBtn.getAttribute('data-step') || '1', 10);
            this.adjustCooldownBatch(step);
        } else if (action === 'adjustCooldownSeconds') {
            e.preventDefault();
            const step = parseInt(actionBtn.getAttribute('data-step') || '1', 10);
            this.adjustCooldownSeconds(step);
        } else if (action === 'openCustomPaletteModal') {
            e.preventDefault();
            if (window.modalSystem) {
                window.modalSystem.show('createCustomPaletteModal', {
                    onCreated: (newPal) => {
                        if (newPal?.palette_key) {
                            this.selectPalette(newPal.palette_key);
                            this.renderPalettes();
                        }
                    }
                });
            }
        } else if (action === 'submitCreateCanvas' || action === 'createCanvas') {
            e.preventDefault();
            this.submitCanvas(actionBtn);
        }
    }

    handleInput(e) {
        if (e.target && e.target.matches('[data-ref$="-search"]')) {
            filterMenuList(e.target);
        }
    }

    handleChange(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'val_allow_chat') {
            this.formState.allow_chat = e.target.checked ? 1 : 0;
        }
    }

    handleToggleEditState(btn) {
        const target = btn.getAttribute('data-target');
        const container = btn.closest('.component-group-item--stateful');
        if (container) {
            const viewState = container.querySelector(`[data-state="${target}-view"]`);
            const editState = container.querySelector(`[data-state="${target}-edit"]`);
            if (viewState && editState) {
                viewState.classList.toggle('active');
                viewState.classList.toggle('disabled');
                editState.classList.toggle('active');
                editState.classList.toggle('disabled');
                if (editState.classList.contains('active')) {
                    const input = editState.querySelector('input');
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }
            }
        }
    }

    saveCanvasName(btn) {
        const container = btn.closest('.component-group-item--stateful');
        if (!container) return;

        const inputEl = container.querySelector('[data-ref="input-canvasname"]');
        const displayEl = container.querySelector('[data-ref="display-canvasname"]');

        if (inputEl && displayEl) {
            const newName = inputEl.value.trim();
            if (newName !== '') {
                displayEl.textContent = newName;
                inputEl.setAttribute('data-original-value', newName);
                this.formState.name = newName;
            } else {
                inputEl.value = inputEl.getAttribute('data-original-value') || '';
            }
        }

        const btnCancel = container.querySelector('[data-action="toggleEditState"]');
        if (btnCancel) {
            btnCancel.click();
        }
    }

    selectDropdownValue(btn) {
        const type = btn.getAttribute('data-type');
        const value = btn.getAttribute('data-value');
        const label = btn.getAttribute('data-label');
        const icon = btn.getAttribute('data-icon');

        const dropdownWrapper = btn.closest('.component-dropdown-wrapper');
        const menu = btn.closest('.component-menu-list');

        const t = (k, f) => (typeof window.__ === 'function' ? window.__(k) || f : f);

        if (type === 'size') {
            this.formState.size = value;
            if (dropdownWrapper) {
                const textRef = dropdownWrapper.querySelector('[data-ref="text-size"]');
                const iconRef = dropdownWrapper.querySelector('[data-ref="icon-size"]') || dropdownWrapper.querySelector('.component-dropdown-trigger .material-symbols-rounded');
                if (textRef) textRef.textContent = label;
                if (iconRef) iconRef.textContent = icon;
            }
        } else if (type === 'privacy') {
            this.formState.privacy = value;
            if (dropdownWrapper) {
                const textRef = dropdownWrapper.querySelector('[data-ref="text-privacy"]');
                const iconRef = dropdownWrapper.querySelector('[data-ref="icon-privacy"]');
                if (textRef) textRef.textContent = t(label, value === 'public' ? 'Público' : 'Privado');
                if (iconRef) iconRef.textContent = icon;
            }
        } else if (type === 'requires_approval') {
            this.formState.requires_approval = value;
            if (dropdownWrapper) {
                const textRef = dropdownWrapper.querySelector('[data-ref="text-approval"]');
                const iconRef = dropdownWrapper.querySelector('[data-ref="icon-approval"]');
                if (textRef) textRef.textContent = t(label, value === 'true' ? 'Requiere aprobación' : 'Sin aprobación');
                if (iconRef) iconRef.textContent = icon;
            }
        }

        if (menu) {
            menu.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
            btn.classList.add('active');
        }

        if (dropdownWrapper) {
            closeDropdown(dropdownWrapper.querySelector('.component-module--dropdown'));
        }
    }

    toggleTag(btn) {
        const val = btn.getAttribute('data-value');
        const index = this.formState.tags.indexOf(val);

        if (index > -1) {
            this.formState.tags.splice(index, 1);
        } else {
            if (this.formState.tags.length >= 8) {
                showMessage(window.__('max_tags_warning') || 'Máximo 8 etiquetas permitidas', 'warning');
                return;
            }
            this.formState.tags.push(val);
        }

        const iconRef = btn.querySelector('[data-ref="icon-check"]');
        if (iconRef) {
            iconRef.textContent = (index > -1) ? 'check_box_outline_blank' : 'check_box';
        }
        btn.classList.toggle('active', index === -1);

        const textRef = this.modalBox.querySelector('[data-ref="text-tags"]');
        if (textRef) {
            const count = this.formState.tags.length;
            textRef.textContent = count === 0 ? (window.__('ph_select_tags') || 'Seleccionar etiquetas') : `${count} seleccionadas`;
        }
    }

    adjustLimit(step) {
        let val = parseInt(this.formState.limit, 10) || 10;
        const min = 10;
        const max = (window.APP_LIMITS && window.APP_LIMITS.max_members_per_canvas !== -1) ? (window.APP_LIMITS.max_members_per_canvas || 50000) : 50000;
        val = Math.max(min, Math.min(max, val + step));
        this.formState.limit = val;

        const display = this.modalBox.querySelector('[data-ref="val_limit"]');
        if (display) {
            display.textContent = `${val}`;
            display.setAttribute('data-value', val);
        }
    }

    adjustCooldownBatch(step) {
        let val = parseInt(this.formState.cooldown_pixels_batch, 10) || 5;
        const max = (window.APP_LIMITS && window.APP_LIMITS.max_pixels_per_batch) ? window.APP_LIMITS.max_pixels_per_batch : 100;
        val = Math.max(1, Math.min(max, val + step));
        this.formState.cooldown_pixels_batch = val;

        const display = this.modalBox.querySelector('[data-ref="val_cooldown_batch"]');
        if (display) {
            display.textContent = `${val}`;
            display.setAttribute('data-value', val);
        }
    }

    adjustCooldownSeconds(step) {
        let val = parseInt(this.formState.cooldown_seconds, 10) || 10;
        val = Math.max(0, Math.min(3600, val + step));
        this.formState.cooldown_seconds = val;

        const display = this.modalBox.querySelector('[data-ref="val_cooldown_seconds"]');
        if (display) {
            display.textContent = `${val}`;
            display.setAttribute('data-value', val);
        }
    }

    selectTemplate(templateId, cardEl) {
        this.formState.template_id = templateId || null;

        const cards = this.modalBox.querySelectorAll('.component-modal-template-card');
        cards.forEach(c => {
            if (c === cardEl) {
                c.classList.add('active', 'selected');
            } else {
                c.classList.remove('active', 'selected');
            }
        });
    }

    selectPalette(paletteId) {
        this.formState.palette_id = paletteId || 'default';

        const paletteCards = this.modalBox.querySelectorAll('.component-modal-palette-card');
        paletteCards.forEach(c => {
            const isMatch = c.getAttribute('data-palette-id') === paletteId;
            if (isMatch) {
                c.classList.add('active', 'selected');
            } else {
                c.classList.remove('active', 'selected');
            }
        });
    }

    async submitCanvas(btn) {
        const inputEl = this.modalBox.querySelector('[data-ref="input-canvasname"]');
        if (inputEl && inputEl.value.trim()) {
            this.formState.name = inputEl.value.trim();
        }

        if (!this.formState.name) {
            showMessage('El nombre del lienzo es obligatorio.', 'error');
            this.switchTab('general');
            return;
        }

        setButtonLoading(btn, 'Creando lienzo...');

        try {
            const res = await this.api.post(ApiRoutes.Canvas.Create, this.formState);
            if (res && res.success) {
                showMessage(res.message || 'Lienzo creado con éxito.', 'success');
                if (window.modalSystem) {
                    window.modalSystem.closeCurrent(true);
                }
                const redirectUrl = res.redirect_url || (res.uuid ? `${this.basePath}/c/${res.uuid}` : `${this.basePath}/`);
                window.location.href = redirectUrl;
            } else {
                restoreButton(btn);
                showMessage(res?.message || 'Error al crear el lienzo.', 'error');
            }
        } catch (err) {
            restoreButton(btn);
            showMessage('Error de conexión al crear el lienzo.', 'error');
        }
    }
}
