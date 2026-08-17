import { ApiRoutes }           from '../../../core/api/ApiRoutes.js';
import { ApiService }          from '../../../core/api/ApiServices.js';
import { BaseListController }   from '../../../core/base/BaseListController.js';
import { applySelectableTable } from '../../../core/mixins/SelectableTableMixin.js';
import { AdminModalTemplates }  from '../AdminModalTemplates.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { PromoService }        from '../../../core/services/PromoCardService.js';

function _t(key) {
    return typeof window.__ === 'function' ? window.__(key) : key;
}

class AdminProviderAdsController extends BaseListController {
    constructor() {
        super();
        this.selectedAdUuid = null;
        this.providerUuid = null;
        this.providerType = 'direct';
        this.providerName = '';
        this.currentAdModalStep = 1;
        this.selectedAdFormat = 'feed';
        this.currentSlotModalStep = 1;
        this.selectedSlotFormat = 'feed';
        this.resourceIndexCounter = 1;
        this.activeFilters = {
            format: 'all',
            status: 'all'
        };
        this.handleChangeBound = this.handleGlobalChange.bind(this);
    }

    getViewPath()       { return '/admin/advertisement-items'; }
    getExcludePath()    { return ''; }
    getSearchInputRef() { return 'ad-search-input'; }

    init() {
        if (window.modalSystem) {
            window.modalSystem.registerTemplates(AdminModalTemplates);
        }
        this._readProviderInfo();
        super.init();
    }

    bindEvents() {
        super.bindEvents();
        document.addEventListener('change', this.handleChangeBound);
    }

    destroy() {
        super.destroy();
        document.removeEventListener('change', this.handleChangeBound);
    }

    handleViewLoaded(e) {
        if (window.modalSystem) {
            window.modalSystem.registerTemplates(AdminModalTemplates);
        }
        this._readProviderInfo();
        super.handleViewLoaded(e);
    }

    _readProviderInfo() {
        const viewEl = document.querySelector('[data-ref="manageProviderAdsView"]');
        if (viewEl) {
            this.providerUuid = viewEl.getAttribute('data-provider-uuid') || '';
            this.providerType = viewEl.getAttribute('data-provider-type') || 'direct';
            this.providerName = viewEl.getAttribute('data-provider-name') || '';
        }
    }

    _getActiveModal() {
        if (window.modalSystem && window.modalSystem.activeBox) {
            return window.modalSystem.activeBox;
        }
        const unstacked = document.querySelector('.component-modal-overlay:not(.disabled) .component-modal-box');
        if (unstacked) return unstacked;
        return document.querySelector('.component-modal-box') || document.querySelector('.modal-container');
    }

    async handlePagination(url) {
        const tableContainer     = document.querySelector('[data-ref="ads-table-wrapper"]');
        const emptyState         = document.querySelector('[data-ref="ads-empty-state"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        const containerToDisable = tableContainer || emptyState;

        if (containerToDisable) containerToDisable.classList.add('disabled-interaction');

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController?.signal ?? null });
            const doc  = new DOMParser().parseFromString(html, 'text/html');

            const viewContent = document.querySelector('[data-ref="manageProviderAdsView"]');
            const newContent  = doc.querySelector('[data-ref="manageProviderAdsView"]');

            if (viewContent && newContent) {
                const bottomContainer    = viewContent.querySelector('.component-bottom');
                const newBottomContainer = newContent.querySelector('.component-bottom');
                if (bottomContainer && newBottomContainer) {
                    bottomContainer.innerHTML = newBottomContainer.innerHTML;
                }

                const newPaginations = doc.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
                if (newPaginations.length > 0 && currentPaginations.length > 0) {
                    currentPaginations.forEach((container, index) => {
                        if (newPaginations[index]) {
                            container.innerHTML = newPaginations[index].innerHTML;
                            if (newPaginations[index].hasAttribute('data-tooltip')) {
                                container.setAttribute('data-tooltip', newPaginations[index].getAttribute('data-tooltip'));
                            }
                        }
                    });
                }
            }

            window.history.pushState({ path: url, fromDynamicPagination: true }, '', url);
            this.updateFilterButtonsState();
            this.deselectAll();
        } catch (error) {
            if (error.name === 'AbortError') return;
            if (window.spaRouter) window.spaRouter.navigate(url);
            else window.location.href = url;
        } finally {
            if (containerToDisable) containerToDisable.classList.remove('disabled-interaction');
        }
    }

    executeServerFilters() {
        this._readProviderInfo();
        const queryInput = document.querySelector('[data-ref="ad-search-input"]');
        const query      = (queryInput ? queryInput.value : '').trim();
        this.updateFilterButtonsState();

        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', '1');
        if (query) urlParams.set('q', query);
        else       urlParams.delete('q');

        if (this.activeFilters.format && this.activeFilters.format !== 'all') {
            urlParams.set('format', this.activeFilters.format);
        } else {
            urlParams.delete('format');
        }

        if (this.activeFilters.status && this.activeFilters.status !== 'all') {
            urlParams.set('status', this.activeFilters.status);
        } else {
            urlParams.delete('status');
        }

        const targetProvider = this.providerUuid || urlParams.get('uuid') || '';
        this.handlePagination(`${this.basePath}/admin/advertisement-items/${targetProvider}?${urlParams.toString()}`);
    }

    handleGlobalClick(e) {
        const selectTarget     = e.target.closest('[data-action="selectAdRow"]');
        const searchBtn        = e.target.closest('[data-action="searchAd"]');
        const downloadMetricsBtn = e.target.closest('[data-action="downloadAdMetrics"]');
        const editBtn          = e.target.closest('[data-action="editAd"]');
        const toggleActiveBtn  = e.target.closest('[data-action="toggleAdStatus"]');
        const delBtn           = e.target.closest('[data-action="deleteAd"]');

        const openCreateAdBtn  = e.target.closest('[data-action="openCreateAdModal"]');
        const selectAdFmtBtn   = e.target.closest('[data-action="selectAdFormat"]');
        const adNextBtn        = e.target.closest('[data-action="adNextStep"]');
        const adPrevBtn        = e.target.closest('[data-action="adPrevStep"]');
        const addResourceBtn   = e.target.closest('[data-action="addResourceRow"]');
        const removeResourceBtn= e.target.closest('[data-action="removeResourceRow"]');
        const submitCreateAd   = e.target.closest('[data-action="submitCreateAd"]');
        const submitEditAdBtn  = e.target.closest('[data-action="submitEditAd"]');

        const openCreateSlotBtn = e.target.closest('[data-action="openCreateNetworkSlotModal"]');
        const selectSlotFmtBtn  = e.target.closest('[data-action="selectSlotFormat"]');
        const slotNextBtn       = e.target.closest('[data-action="slotNextStep"]');
        const slotPrevBtn       = e.target.closest('[data-action="slotPrevStep"]');
        const submitCreateSlot  = e.target.closest('[data-action="submitCreateNetworkSlot"]');
        const submitEditSlotBtn = e.target.closest('[data-action="submitEditNetworkSlot"]');

        const openSubMenuBtn   = e.target.closest('[data-action="openFilterSubMenu"]');
        const backSubMenuBtn   = e.target.closest('[data-action="backToMainFilters"]');

        if (selectTarget)        this.handleRowSelection(selectTarget);
        if (searchBtn)           this.toggleSearchToolbar();
        if (downloadMetricsBtn)  this.downloadAdMetrics(downloadMetricsBtn);
        if (editBtn)             this.openEditAdModal();
        if (toggleActiveBtn)   this.toggleAdStatus(toggleActiveBtn);
        if (delBtn)            this.deleteAd(delBtn);

        if (openCreateAdBtn)   this.openCreateAdModal(openCreateAdBtn.getAttribute('data-provider-uuid'));
        if (selectAdFmtBtn)    this.handleAdFormatDropdownSelection(selectAdFmtBtn);
        if (adNextBtn)         this.handleAdNextStep(adNextBtn);
        if (adPrevBtn)         this.handleAdPrevStep(adPrevBtn);
        if (addResourceBtn)    this.addResourceRow(addResourceBtn);
        if (removeResourceBtn) this.removeResourceRow(removeResourceBtn);
        if (submitCreateAd)    this.submitCreateAd(submitCreateAd);
        if (submitEditAdBtn)   this.submitEditAd(submitEditAdBtn);

        if (openCreateSlotBtn) this.openCreateNetworkSlotModal(openCreateSlotBtn.getAttribute('data-provider-uuid'));
        if (selectSlotFmtBtn)  this.handleSlotFormatDropdownSelection(selectSlotFmtBtn);
        if (slotNextBtn)       this.handleSlotNextStep(slotNextBtn);
        if (slotPrevBtn)       this.handleSlotPrevStep(slotPrevBtn);
        if (submitCreateSlot)  this.submitCreateNetworkSlot(submitCreateSlot);
        if (submitEditSlotBtn) this.submitEditNetworkSlot(submitEditSlotBtn);

        if (openSubMenuBtn)    this.handleOpenFilterSubMenu(openSubMenuBtn);
        if (backSubMenuBtn)    this.handleBackToMainFilters(backSubMenuBtn);

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && !searchToolbar.classList.contains('disabled')) {
            if (!e.target.closest('[data-ref="search-toolbar"]') && !searchBtn) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }

    handleGlobalInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'ad-search-input') {
            this.applyAllFilters();
        }
    }

    handleGlobalChange(e) {
        const radio = e.target.closest('.filter-radio');
        if (radio) {
            const filterCategory = radio.getAttribute('data-filter-type');
            const val = radio.value;

            if (filterCategory === 'format') {
                this.activeFilters.format = val;
            } else if (filterCategory === 'status') {
                this.activeFilters.status = val;
            }

            const moduleEl = radio.closest('[data-module="moduleAdFilters"]');
            if (moduleEl) moduleEl.classList.add('disabled');

            this.executeServerFilters();
        }
    }

    handleRowSelection(target) {
        const adUuid = target.getAttribute('data-ad-uuid');
        if (this.selectedAdUuid === adUuid) {
            this.deselectAll();
            return;
        }

        this.selectedAdUuid = adUuid;
        document.querySelectorAll('[data-action="selectAdRow"]').forEach(row => {
            row.classList.toggle('selected', row.getAttribute('data-ad-uuid') === adUuid);
        });
        this._toggleSelectionBar(true);
    }

    handleOpenFilterSubMenu(btn) {
        const targetRef = btn.getAttribute('data-target');
        const module = btn.closest('[data-module="moduleAdFilters"]');
        if (!module || !targetRef) return;

        module.querySelectorAll('.component-menu').forEach(menu => {
            if (menu.getAttribute('data-ref') === targetRef) {
                menu.classList.remove('disabled');
                menu.classList.add('active');
            } else {
                menu.classList.remove('active');
                menu.classList.add('disabled');
            }
        });
    }

    handleBackToMainFilters(btn) {
        const module = btn.closest('[data-module="moduleAdFilters"]');
        if (!module) return;

        module.querySelectorAll('.component-menu').forEach(menu => {
            if (menu.getAttribute('data-ref') === 'menuMainFilters') {
                menu.classList.remove('disabled');
                menu.classList.add('active');
            } else {
                menu.classList.remove('active');
                menu.classList.add('disabled');
            }
        });
    }

    async toggleAdStatus(btn = null) {
        if (!this.selectedAdUuid) return;
        if (btn) setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.ToggleAdvertisementStatus, { uuid: this.selectedAdUuid }, this.abortController.signal);
            if (res.aborted) return;
            if (res.success) {
                showMessage(_t(res.message_key || 'msg_ad_status_updated'), 'success');
                PromoService.loadActiveAds(true).catch(() => {});
                await this.handlePagination(window.location.href);
            } else {
                showMessage(res.message || _t(res.message_key || 'err_default'), 'error');
            }
        } catch (err) {
            if (err.name !== 'AbortError') showMessage(_t('err_default'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    }

    async deleteAd(btn = null) {
        if (!this.selectedAdUuid || !window.modalSystem) return;
        window.modalSystem.registerTemplates(AdminModalTemplates);

        const adUuid = this.selectedAdUuid;
        const selectedRow = document.querySelector(`[data-action="selectAdRow"][data-ad-uuid="${adUuid}"]`);
        const adName = selectedRow ? (selectedRow.getAttribute('data-ad-title') || selectedRow.getAttribute('data-ad-name')) : _t('unknown_ad');

        const response = await window.modalSystem.show('confirmDeleteAdModal', { adName });
        if (response && response.confirmed) {
            if (btn) setButtonLoading(btn);
            try {
                const res = await this.api.post(ApiRoutes.Admin.DeleteAdvertisement, { uuid: adUuid }, this.abortController.signal);
                if (res.aborted) return;
                if (res.success) {
                    showMessage(_t('msg_ad_deleted_success'), 'success');
                    PromoService.loadActiveAds(true).catch(() => {});
                    await this.handlePagination(window.location.href);
                } else {
                    showMessage(res.message || _t(res.message_key || 'err_default'), 'error');
                }
            } catch (err) {
                if (err.name !== 'AbortError') showMessage(_t('err_default'), 'error');
            } finally {
                if (btn) restoreButton(btn);
            }
        }
    }

    openEditAdModal() {
        if (!this.selectedAdUuid || !window.modalSystem) return;
        window.modalSystem.registerTemplates(AdminModalTemplates);

        const selectedRow = document.querySelector(`[data-action="selectAdRow"][data-ad-uuid="${this.selectedAdUuid}"]`);
        if (!selectedRow) return;

        const name = selectedRow.getAttribute('data-ad-name') || '';
        const title = selectedRow.getAttribute('data-ad-title') || name;
        const description = selectedRow.getAttribute('data-ad-desc') || '';
        const targetUrl = selectedRow.getAttribute('data-ad-url') || '';
        const sponsorLabel = selectedRow.getAttribute('data-ad-sponsor') || '';
        const format = selectedRow.getAttribute('data-ad-format') || 'feed';
        const resourcesRaw = selectedRow.getAttribute('data-ad-resources') || '[]';

        let resources = [];
        try {
            resources = JSON.parse(resourcesRaw);
        } catch (e) {
            resources = [];
        }

        const adData = {
            uuid: this.selectedAdUuid,
            name: name,
            title: title,
            description: description,
            target_url: targetUrl,
            sponsor_label: sponsorLabel,
            format: format,
            resources: resources
        };

        this.selectedAdFormat = format;
        this.selectedSlotFormat = format;
        this.currentAdModalStep = 1;
        this.currentSlotModalStep = 1;
        this.resourceIndexCounter = resources.length + 1;

        if (this.providerType === 'network') {
            window.modalSystem.show('editNetworkSlotModal', { ad: adData, resources });
        } else {
            window.modalSystem.show('editAdModal', { ad: adData, resources });
        }
    }

    openCreateAdModal(providerUuid) {
        const targetUuid = providerUuid || this.providerUuid;
        if (!targetUuid || !window.modalSystem) return;
        this.currentAdModalStep = 1;
        this.selectedAdFormat = 'feed';
        this.resourceIndexCounter = 1;
        window.modalSystem.show('createAdModal', { providerUuid: targetUuid });
    }

    openCreateNetworkSlotModal(providerUuid) {
        const targetUuid = providerUuid || this.providerUuid;
        if (!targetUuid || !window.modalSystem) return;
        this.currentSlotModalStep = 1;
        this.selectedSlotFormat = 'feed';
        window.modalSystem.show('createNetworkSlotModal', { providerUuid: targetUuid });
    }

    handleAdFormatDropdownSelection(btn) {
        const format = btn.getAttribute('data-format') || 'feed';
        const label  = btn.getAttribute('data-label') || '';
        const icon   = btn.getAttribute('data-icon') || 'view_carousel';
        this.selectedAdFormat = format;

        const modal = btn.closest('.component-modal-box') || this._getActiveModal();
        if (!modal) return;

        modal.querySelectorAll('[data-action="selectAdFormat"]').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-format') === format);
        });

        const textEl = modal.querySelector('[data-ref="create-ad-format-text"]');
        if (textEl) {
            textEl.textContent = label;
            textEl.setAttribute('data-value', format);
        }
        const iconEl = modal.querySelector('[data-ref="create-ad-format-icon"]');
        if (iconEl) {
            iconEl.textContent = icon;
        }

        const dropdown = btn.closest('.component-module--dropdown');
        if (dropdown) dropdown.classList.add('disabled');
    }

    handleSlotFormatDropdownSelection(btn) {
        const format = btn.getAttribute('data-format') || 'feed';
        const label  = btn.getAttribute('data-label') || '';
        const icon   = btn.getAttribute('data-icon') || 'grid_view';
        this.selectedSlotFormat = format;

        const modal = btn.closest('.component-modal-box') || this._getActiveModal();
        if (!modal) return;

        modal.querySelectorAll('[data-action="selectSlotFormat"]').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-format') === format);
        });

        const textEl = modal.querySelector('[data-ref="create-slot-format-text"]');
        if (textEl) {
            textEl.textContent = label;
            textEl.setAttribute('data-value', format);
        }
        const iconEl = modal.querySelector('[data-ref="create-slot-format-icon"]');
        if (iconEl) {
            iconEl.textContent = icon;
        }

        const dropdown = btn.closest('.component-module--dropdown');
        if (dropdown) dropdown.classList.add('disabled');
    }

    handleAdNextStep(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (!modal) return;

        if (this.currentAdModalStep === 1) {
            this._setAdModalStep(2, modal);
        } else if (this.currentAdModalStep === 2) {
            const adName = (modal.querySelector('[data-ref="ad-name"]')?.value || '').trim();
            if (!adName) {
                showMessage(_t('err_ad_name_required'), 'error');
                return;
            }
            this._setAdModalStep(3, modal);
        } else if (this.currentAdModalStep === 3) {
            this._setAdModalStep(4, modal);
        } else if (this.currentAdModalStep === 4) {
            const targetUrl = (modal.querySelector('[data-ref="ad-target-url"]')?.value || '').trim();
            if (!targetUrl) {
                showMessage(_t('err_ad_url_required'), 'error');
                return;
            }
            this._setAdModalStep(5, modal);
        }
    }

    handleAdPrevStep(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (this.currentAdModalStep > 1) {
            this._setAdModalStep(this.currentAdModalStep - 1, modal);
        }
    }

    _setAdModalStep(step, modal = null) {
        this.currentAdModalStep = step;
        const targetModal = modal || this._getActiveModal();
        if (!targetModal) return;

        targetModal.querySelectorAll('.step-modal-step[data-ad-step]').forEach(s => {
            const sNum = parseInt(s.getAttribute('data-ad-step') || '0', 10);
            const isActive = (sNum === step);
            s.classList.toggle('active', isActive);
            s.classList.toggle('disabled', !isActive);
        });

        const btnPrev   = targetModal.querySelector('[data-ref="btn-ad-modal-prev"]');
        const btnNext   = targetModal.querySelector('[data-ref="btn-ad-modal-next"]');
        const btnFinish = targetModal.querySelector('[data-ref="btn-ad-modal-finish"]');
        const descEl    = targetModal.querySelector('[data-ref="ad-step-desc"]');

        if (btnPrev) btnPrev.classList.toggle('disabled', step === 1);

        if (step === 5) {
            if (btnNext) btnNext.classList.add('disabled');
            if (btnFinish) btnFinish.classList.remove('disabled');
            if (descEl) descEl.textContent = _t('step_ad_creatives_desc');
        } else {
            if (btnNext) btnNext.classList.remove('disabled');
            if (btnFinish) btnFinish.classList.add('disabled');
            if (descEl) {
                if (step === 1) descEl.textContent = _t('step_ad_format_desc');
                else if (step === 2) descEl.textContent = _t('step_ad_name_desc');
                else if (step === 3) descEl.textContent = _t('step_ad_description_desc');
                else if (step === 4) descEl.textContent = _t('step_ad_target_desc');
            }
        }
    }

    handleSlotNextStep(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (!modal) return;

        if (this.currentSlotModalStep === 1) {
            this._setSlotModalStep(2, modal);
        } else if (this.currentSlotModalStep === 2) {
            const slotName = (modal.querySelector('[data-ref="slot-name"]')?.value || '').trim();
            if (!slotName) {
                showMessage(_t('err_ad_name_required'), 'error');
                return;
            }
            this._setSlotModalStep(3, modal);
        } else if (this.currentSlotModalStep === 3) {
            this._setSlotModalStep(4, modal);
        }
    }

    handleSlotPrevStep(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (this.currentSlotModalStep > 1) {
            this._setSlotModalStep(this.currentSlotModalStep - 1, modal);
        }
    }

    _setSlotModalStep(step, modal = null) {
        this.currentSlotModalStep = step;
        const targetModal = modal || this._getActiveModal();
        if (!targetModal) return;

        targetModal.querySelectorAll('.step-modal-step[data-slot-step]').forEach(s => {
            const sNum = parseInt(s.getAttribute('data-slot-step') || '0', 10);
            const isActive = (sNum === step);
            s.classList.toggle('active', isActive);
            s.classList.toggle('disabled', !isActive);
        });

        const btnPrev   = targetModal.querySelector('[data-ref="btn-slot-modal-prev"]');
        const btnNext   = targetModal.querySelector('[data-ref="btn-slot-modal-next"]');
        const btnFinish = targetModal.querySelector('[data-ref="btn-slot-modal-finish"]');
        const descEl    = targetModal.querySelector('[data-ref="slot-step-desc"]');

        if (btnPrev) btnPrev.classList.toggle('disabled', step === 1);

        if (step === 4) {
            if (btnNext) btnNext.classList.add('disabled');
            if (btnFinish) btnFinish.classList.remove('disabled');
            if (descEl) descEl.textContent = _t('step_network_slot_code_desc');
        } else {
            if (btnNext) btnNext.classList.remove('disabled');
            if (btnFinish) btnFinish.classList.add('disabled');
            if (descEl) {
                if (step === 1) descEl.textContent = _t('step_network_slot_format_desc');
                else if (step === 2) descEl.textContent = _t('step_network_slot_name_desc');
                else if (step === 3) descEl.textContent = _t('step_network_slot_id_desc');
            }
        }
    }

    addResourceRow(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (!modal) return;

        const container = modal.querySelector('[data-ref="resources-builder-container"]');
        if (!container) return;

        const idx = this.resourceIndexCounter++;
        const row = document.createElement('div');
        row.className = 'component-resource-row';
        row.setAttribute('data-index', idx);
        row.innerHTML = `
            <div class="component-input-group">
                <input class="component-input-field" data-ref="res-url-${idx}" type="text" placeholder=" " value="/assets/img/showcase/creative_tools.jpg" required>
                <label class="component-input-label">${_t('lbl_resource_url')}</label>
            </div>
            <button class="component-button component-button--icon component-button--h34 component-button--danger" data-action="removeResourceRow" data-index="${idx}" type="button">
                <span class="material-symbols-rounded">delete</span>
            </button>
        `;
        container.appendChild(row);
    }

    removeResourceRow(btn) {
        const row = btn.closest('.component-resource-row');
        if (row) row.remove();
    }

    async submitCreateAd(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (!modal) return;

        const form = modal.querySelector('[data-ref="create-ad-form"]');
        if (!form) return;

        const providerUuid = form.getAttribute('data-provider-uuid') || this.providerUuid;
        const name = (modal.querySelector('[data-ref="ad-name"]')?.value || '').trim();
        const desc = (modal.querySelector('[data-ref="ad-description"]')?.value || '').trim();
        const targetUrl = (modal.querySelector('[data-ref="ad-target-url"]')?.value || '').trim();
        const sponsorLabel = (modal.querySelector('[data-ref="ad-sponsor-label"]')?.value || '').trim();
        const format = this.selectedAdFormat || 'feed';

        if (!name) {
            showMessage(_t('err_ad_name_required'), 'error');
            return;
        }

        const resources = [];
        modal.querySelectorAll('.component-resource-row').forEach((row, idx) => {
            const urlInput = row.querySelector('[data-ref^="res-url-"]');
            const url = urlInput ? urlInput.value.trim() : '';
            if (url) {
                const isVideo = url.endsWith('.mp4') || url.endsWith('.webm');
                resources.push({
                    resource_type: isVideo ? 'video' : 'image',
                    content_url: url,
                    alt_text: name,
                    sort_order: idx
                });
            }
        });

        const payload = {
            provider_uuid: providerUuid,
            ad: {
                name: name,
                title: name,
                description: desc,
                target_url: targetUrl || '/upgrade',
                sponsor_label: sponsorLabel,
                format: format,
                status: 'active'
            },
            resources: resources
        };

        if (btn) setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.CreateAdvertisement, payload, this.abortController.signal);
            if (res.aborted) return;
            if (res.success) {
                showMessage(_t('msg_ad_created_success'), 'success');
                PromoService.loadActiveAds(true).catch(() => {});
                if (window.modalSystem) window.modalSystem.closeCurrent();
                await this.handlePagination(window.location.href);
            } else {
                showMessage(res.message || _t(res.message_key || 'err_default'), 'error');
            }
        } catch (err) {
            if (err.name !== 'AbortError') showMessage(_t('err_default'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    }

    async submitEditAd(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (!modal) return;

        const form = modal.querySelector('[data-ref="edit-ad-form"]');
        if (!form) return;

        const adUuid = form.getAttribute('data-ad-uuid');
        const name = (modal.querySelector('[data-ref="ad-name"]')?.value || '').trim();
        const desc = (modal.querySelector('[data-ref="ad-description"]')?.value || '').trim();
        const targetUrl = (modal.querySelector('[data-ref="ad-target-url"]')?.value || '').trim();
        const sponsorLabel = (modal.querySelector('[data-ref="ad-sponsor-label"]')?.value || '').trim();
        const format = this.selectedAdFormat || 'feed';

        if (!name) {
            showMessage(_t('err_ad_name_required'), 'error');
            return;
        }

        const resources = [];
        modal.querySelectorAll('.component-resource-row').forEach((row, idx) => {
            const urlInput = row.querySelector('[data-ref^="res-url-"]');
            const url = urlInput ? urlInput.value.trim() : '';
            if (url) {
                const isVideo = url.endsWith('.mp4') || url.endsWith('.webm');
                resources.push({
                    resource_type: isVideo ? 'video' : 'image',
                    content_url: url,
                    alt_text: name,
                    sort_order: idx
                });
            }
        });

        const payload = {
            uuid: adUuid,
            ad: {
                name: name,
                title: name,
                description: desc,
                target_url: targetUrl || '/upgrade',
                sponsor_label: sponsorLabel,
                format: format,
                status: 'active'
            },
            resources: resources
        };

        if (btn) setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.UpdateAdvertisement, payload, this.abortController.signal);
            if (res.aborted) return;
            if (res.success) {
                showMessage(_t('msg_ad_updated_success'), 'success');
                PromoService.loadActiveAds(true).catch(() => {});
                if (window.modalSystem) window.modalSystem.closeCurrent();
                await this.handlePagination(window.location.href);
            } else {
                showMessage(res.message || _t(res.message_key || 'err_default'), 'error');
            }
        } catch (err) {
            if (err.name !== 'AbortError') showMessage(_t('err_default'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    }

    async submitCreateNetworkSlot(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (!modal) return;

        const form = modal.querySelector('[data-ref="create-network-slot-form"]');
        if (!form) return;

        const providerUuid = form.getAttribute('data-provider-uuid') || this.providerUuid;
        const slotName = (modal.querySelector('[data-ref="slot-name"]')?.value || '').trim();
        const slotId   = (modal.querySelector('[data-ref="slot-id"]')?.value || '').trim();
        const slotCode = (modal.querySelector('[data-ref="slot-code"]')?.value || '').trim();
        const format   = this.selectedSlotFormat || 'feed';

        if (!slotName) {
            showMessage(_t('err_ad_name_required'), 'error');
            return;
        }

        const resources = [
            {
                resource_type: 'script',
                content_url: slotId,
                raw_content: slotCode,
                alt_text: slotName,
                sort_order: 0
            }
        ];

        const payload = {
            provider_uuid: providerUuid,
            ad: {
                name: slotName,
                title: slotName,
                description: slotId ? `Slot ID: ${slotId}` : '',
                target_url: '',
                sponsor_label: '',
                format: format,
                status: 'active'
            },
            resources: resources
        };

        if (btn) setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.CreateAdvertisement, payload, this.abortController.signal);
            if (res.aborted) return;
            if (res.success) {
                showMessage(_t('msg_ad_created_success'), 'success');
                PromoService.loadActiveAds(true).catch(() => {});
                if (window.modalSystem) window.modalSystem.closeCurrent();
                await this.handlePagination(window.location.href);
            } else {
                showMessage(res.message || _t(res.message_key || 'err_default'), 'error');
            }
        } catch (err) {
            if (err.name !== 'AbortError') showMessage(_t('err_default'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    }

    async submitEditNetworkSlot(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (!modal) return;

        const form = modal.querySelector('[data-ref="edit-network-slot-form"]');
        if (!form) return;

        const adUuid = form.getAttribute('data-ad-uuid');
        const slotName = (modal.querySelector('[data-ref="slot-name"]')?.value || '').trim();
        const slotId   = (modal.querySelector('[data-ref="slot-id"]')?.value || '').trim();
        const slotCode = (modal.querySelector('[data-ref="slot-code"]')?.value || '').trim();
        const format   = this.selectedSlotFormat || 'feed';

        if (!slotName) {
            showMessage(_t('err_ad_name_required'), 'error');
            return;
        }

        const resources = [
            {
                resource_type: 'script',
                content_url: slotId,
                raw_content: slotCode,
                alt_text: slotName,
                sort_order: 0
            }
        ];

        const payload = {
            uuid: adUuid,
            ad: {
                name: slotName,
                title: slotName,
                description: slotId ? `Slot ID: ${slotId}` : '',
                target_url: '',
                sponsor_label: '',
                format: format,
                status: 'active'
            },
            resources: resources
        };

        if (btn) setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.UpdateAdvertisement, payload, this.abortController.signal);
            if (res.aborted) return;
            if (res.success) {
                showMessage(_t('msg_ad_updated_success'), 'success');
                PromoService.loadActiveAds(true).catch(() => {});
                if (window.modalSystem) window.modalSystem.closeCurrent();
                await this.handlePagination(window.location.href);
            } else {
                showMessage(res.message || _t(res.message_key || 'err_default'), 'error');
            }
        } catch (err) {
            if (err.name !== 'AbortError') showMessage(_t('err_default'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    }

    async downloadAdMetrics(btn = null) {
        if (!this.selectedAdUuid) {
            showMessage(_t('err_ad_not_found'), 'warning');
            return;
        }

        const selectedRow = document.querySelector(`[data-ad-uuid="${this.selectedAdUuid}"]`);
        const adName = selectedRow ? (selectedRow.getAttribute('data-ad-name') || selectedRow.getAttribute('data-ad-title') || 'Anuncio') : 'Anuncio';
        const cleanName = adName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `Reporte_Metricas_${cleanName}.pdf`;

        if (btn) setButtonLoading(btn);

        try {
            const result = await this.api.downloadFile(
                ApiRoutes.Admin.DownloadAdMetrics,
                { ad_uuid: this.selectedAdUuid },
                filename,
                this.abortController ? this.abortController.signal : null
            );
            if (result && !result.success && !result.aborted) {
                showMessage(result.message || _t(result.message_key || 'admin_ad_metrics_download_error'), 'error');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage(_t('admin_ad_metrics_download_error'), 'error');
            }
        } finally {
            if (btn) restoreButton(btn);
        }
    }
}

applySelectableTable(AdminProviderAdsController, {
    idProp:       'selectedAdUuid',
    selectionRef: 'ad-selection-actions',
    rowSelector:  '[data-action="selectAdRow"]',
});

export { AdminProviderAdsController };
