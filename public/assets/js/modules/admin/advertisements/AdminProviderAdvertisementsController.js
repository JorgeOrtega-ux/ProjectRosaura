import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { BaseListController } from '../../../core/base/BaseListController.js';
import { applySelectableTable } from '../../../core/mixins/SelectableTableMixin.js';
import { PromoService } from '../../../core/services/PromoCardService.js';
import { backToMainFilters, closeDropdown, handleOutsideSearchToolbarClick, openFilterSubMenu, restoreButton, setButtonLoading, showMessage } from '../../../core/utils/uiUtils.js';
import { AdminModalTemplates } from '../AdminModalTemplates.js';

function _t(key) {
    return typeof window.__ === 'function' ? window.__(key) : key;
}

class AdminProviderAdvertisementsController extends BaseListController {
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
        this.handleDragStartBound = this.handleGlobalDragStart.bind(this);
        this.handleDragOverBound = this.handleGlobalDragOver.bind(this);
        this.handleDragEndBound = this.handleGlobalDragEnd.bind(this);
        this.draggedRow = null;
    }

    getViewPath() {
        return '/admin/advertisement-items';
    }

    getExcludePath() {
        return '';
    }

    getSearchInputRef() {
        return 'ad-search-input';
    }

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
        document.addEventListener('dragstart', this.handleDragStartBound);
        document.addEventListener('dragover', this.handleDragOverBound);
        document.addEventListener('dragend', this.handleDragEndBound);
    }

    destroy() {
        super.destroy();
        document.removeEventListener('change', this.handleChangeBound);
        document.removeEventListener('dragstart', this.handleDragStartBound);
        document.removeEventListener('dragover', this.handleDragOverBound);
        document.removeEventListener('dragend', this.handleDragEndBound);
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
        const tableContainer = document.querySelector('[data-ref="ads-table-wrapper"]');
        const emptyState = document.querySelector('[data-ref="ads-empty-state"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        const containerToDisable = tableContainer || emptyState;

        if (containerToDisable) containerToDisable.classList.add('disabled-interaction');

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController?.signal ?? null });
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const viewContent = document.querySelector('[data-ref="manageProviderAdsView"]');
            const newContent = doc.querySelector('[data-ref="manageProviderAdsView"]');

            if (viewContent && newContent) {
                const bottomContainer = viewContent.querySelector('.component-bottom');
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
        const query = (queryInput ? queryInput.value : '').trim();
        this.updateFilterButtonsState();

        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', '1');
        if (query) urlParams.set('q', query);
        else urlParams.delete('q');

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
        const selectTarget = e.target.closest('[data-action="selectAdRow"]');
        const searchBtn = e.target.closest('[data-action="searchAd"]');
        const downloadMetricsBtn = e.target.closest('[data-action="downloadAdMetrics"]');
        const editBtn = e.target.closest('[data-action="editAd"]');
        const toggleActiveBtn = e.target.closest('[data-action="toggleAdStatus"]');
        const delBtn = e.target.closest('[data-action="deleteAd"]');

        const openCreateAdBtn = e.target.closest('[data-action="openCreateAdModal"]');
        const selectAdFmtBtn = e.target.closest('[data-action="selectAdFormat"]');
        const selectGeoModeBtn = e.target.closest('[data-action="selectGeoMode"]');
        const toggleAdExpBtn = e.target.closest('[data-action="toggleAdExpiration"]');
        const adNextBtn = e.target.closest('[data-action="adNextStep"]');
        const adPrevBtn = e.target.closest('[data-action="adPrevStep"]');
        const addResourceBtn = e.target.closest('[data-action="addResourceRow"]');
        const removeResourceBtn = e.target.closest('[data-action="removeResourceRow"]');
        const moveResUpBtn = e.target.closest('[data-action="moveResourceUp"]');
        const moveResDownBtn = e.target.closest('[data-action="moveResourceDown"]');
        const openMediaLibBtn = e.target.closest('[data-action="openServerMediaLibrary"]');
        const selectMediaItemBtn = e.target.closest('[data-action="selectMediaItem"]');
        const submitAdBtn = e.target.closest('[data-action="submitAd"], [data-action="submitCreateAd"], [data-action="submitEditAd"]');

        const openCreateSlotBtn = e.target.closest('[data-action="openCreateNetworkSlotModal"]');
        const selectSlotFmtBtn = e.target.closest('[data-action="selectSlotFormat"]');
        const selectSlotGeoModeBtn = e.target.closest('[data-action="selectSlotGeoMode"]');
        const slotNextBtn = e.target.closest('[data-action="slotNextStep"]');
        const slotPrevBtn = e.target.closest('[data-action="slotPrevStep"]');
        const submitSlotBtn = e.target.closest('[data-action="submitNetworkSlot"], [data-action="submitCreateNetworkSlot"], [data-action="submitEditNetworkSlot"]');

        const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
        const backSubMenuBtn = e.target.closest('[data-action="backToMainFilters"]');
        const selectPeriodBtn = e.target.closest('[data-action="selectMetricsPeriod"]');
        const confirmDownloadBtn = e.target.closest('[data-action="confirmDownloadMetrics"], [data-action="confirmDownloadAdMetrics"]');

        if (selectTarget) this.handleRowSelection(selectTarget);
        if (searchBtn) this.toggleSearchToolbar();
        if (downloadMetricsBtn) this.downloadAdMetrics(downloadMetricsBtn);
        if (selectPeriodBtn) this.handleMetricsPeriodSelection(selectPeriodBtn);
        if (confirmDownloadBtn) this.confirmDownloadAdMetrics(confirmDownloadBtn);
        if (editBtn) this.openEditAdModal();
        if (toggleActiveBtn) this.toggleAdStatus(toggleActiveBtn);
        if (delBtn) this.deleteAd(delBtn);

        if (openCreateAdBtn) this.openCreateAdModal(openCreateAdBtn.getAttribute('data-provider-uuid'));
        if (selectAdFmtBtn) this.handleAdFormatDropdownSelection(selectAdFmtBtn);
        if (selectGeoModeBtn) this.handleGeoModeDropdownSelection(selectGeoModeBtn);
        if (toggleAdExpBtn) this.toggleAdExpirationFields(toggleAdExpBtn);
        if (adNextBtn) this.handleAdNextStep(adNextBtn);
        if (adPrevBtn) this.handleAdPrevStep(adPrevBtn);
        if (addResourceBtn) this.addResourceRow(addResourceBtn);
        if (removeResourceBtn) this.removeResourceRow(removeResourceBtn);
        if (moveResUpBtn) this.moveResourceRow(moveResUpBtn, 'up');
        if (moveResDownBtn) this.moveResourceRow(moveResDownBtn, 'down');
        if (openMediaLibBtn) this.openServerMediaLibraryModal(openMediaLibBtn);
        if (selectMediaItemBtn) this.handleMediaItemSelection(selectMediaItemBtn);
        if (submitAdBtn) this.submitAd(submitAdBtn);

        if (openCreateSlotBtn) this.openCreateNetworkSlotModal(openCreateSlotBtn.getAttribute('data-provider-uuid'));
        if (selectSlotFmtBtn) this.handleSlotFormatDropdownSelection(selectSlotFmtBtn);
        if (selectSlotGeoModeBtn) this.handleSlotGeoModeDropdownSelection(selectSlotGeoModeBtn);
        if (slotNextBtn) this.handleSlotNextStep(slotNextBtn);
        if (slotPrevBtn) this.handleSlotPrevStep(slotPrevBtn);
        if (submitSlotBtn) this.submitNetworkSlot(submitSlotBtn);

        if (openSubMenuBtn) openFilterSubMenu(openSubMenuBtn);
        if (backSubMenuBtn) backToMainFilters('menuMainFilters', 'moduleAdFilters');

        handleOutsideSearchToolbarClick(e, searchBtn);
    }

    handleGlobalInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'ad-search-input') {
            this.applyAllFilters();
        }
        if (e.target && e.target.getAttribute('data-action') === 'filterCountryList') {
            this.filterCountryList(e.target);
        }
        if (e.target && e.target.getAttribute('data-action') === 'resourceInputUrlChange') {
            this.updateResourceThumbnail(e.target);
        }
    }

    handleGlobalChange(e) {
        const fileInput = e.target.closest('[data-action="uploadResourceFile"]');
        if (fileInput) {
            this.handleResourceFileUpload(fileInput);
            return;
        }

        const urlInput = e.target.closest('[data-action="resourceInputUrlChange"]');
        if (urlInput) {
            this.updateResourceThumbnail(urlInput);
        }

        const countryCheckbox = e.target.closest('.geo-country-checkbox');
        if (countryCheckbox) {
            this.updateSelectedCountriesLabel(countryCheckbox);
        }

        const radio = e.target.closest('.filter-radio');
        if (radio) {
            const filterCategory = radio.getAttribute('data-filter-type');
            const val = radio.value;

            if (filterCategory === 'format') {
                this.activeFilters.format = val;
            } else if (filterCategory === 'status') {
                this.activeFilters.status = val;
            }

            closeDropdown('moduleAdFilters');
            this.executeServerFilters();
        }
    }

    handleRowSelection(target) {
        const adUuid = target.getAttribute('data-ad-uuid');
        if (this.selectedAdUuid === adUuid) {
            this.deselectAll();
            return;
        }
        this.selectTableRow(adUuid, target);
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

        const selectedRow = document.querySelector(`[data-action="selectAdRow"][data-ad-uuid="${this.selectedAdUuid}"]`);
        if (!selectedRow) return;

        const name = selectedRow.getAttribute('data-ad-name') || '';
        const title = selectedRow.getAttribute('data-ad-title') || name;
        const description = selectedRow.getAttribute('data-ad-desc') || '';
        const targetUrl = selectedRow.getAttribute('data-ad-url') || '';
        const sponsorLabel = selectedRow.getAttribute('data-ad-sponsor') || '';
        const format = selectedRow.getAttribute('data-ad-format') || 'feed';
        const resourcesRaw = selectedRow.getAttribute('data-ad-resources') || '[]';
        const settingsRaw = selectedRow.getAttribute('data-ad-settings') || '{}';

        let resources = [];
        try {
            resources = JSON.parse(resourcesRaw);
        } catch (e) {
            resources = [];
        }

        let settings = {};
        try {
            settings = JSON.parse(settingsRaw);
        } catch (e) {
            settings = {};
        }

        const hasExpiration = selectedRow.getAttribute('data-ad-has-expiration') || '0';
        const startDate = selectedRow.getAttribute('data-ad-start-date') || '';
        const expirationDate = selectedRow.getAttribute('data-ad-expiration-date') || '';

        const adData = {
            uuid: this.selectedAdUuid,
            name: name,
            title: title,
            description: description,
            target_url: targetUrl,
            sponsor_label: sponsorLabel,
            format: format,
            has_expiration: hasExpiration,
            start_date: startDate,
            expiration_date: expirationDate,
            resources: resources,
            settings: settings
        };

        this.selectedAdFormat = format;
        this.selectedSlotFormat = format;
        this.currentAdModalStep = 1;
        this.currentSlotModalStep = 1;
        this.resourceIndexCounter = resources.length + 1;

        if (this.providerType === 'network') {
            window.modalSystem.show('networkSlotModal', { ad: adData, resources, settings });
        } else {
            window.modalSystem.show('adModal', { ad: adData, resources, settings });
        }
    }

    openCreateAdModal(providerUuid) {
        const targetUuid = providerUuid || this.providerUuid;
        if (!targetUuid || !window.modalSystem) return;
        this.currentAdModalStep = 1;
        this.selectedAdFormat = 'feed';
        this.resourceIndexCounter = 1;
        window.modalSystem.show('adModal', { providerUuid: targetUuid });
    }

    openCreateNetworkSlotModal(providerUuid) {
        const targetUuid = providerUuid || this.providerUuid;
        if (!targetUuid || !window.modalSystem) return;
        this.currentSlotModalStep = 1;
        this.selectedSlotFormat = 'feed';
        window.modalSystem.show('networkSlotModal', { providerUuid: targetUuid });
    }

    handleAdFormatDropdownSelection(btn) {
        const format = btn.getAttribute('data-format') || 'feed';
        const label = btn.getAttribute('data-label') || '';
        const icon = btn.getAttribute('data-icon') || 'view_carousel';
        this.selectedAdFormat = format;

        const modal = btn.closest('.component-modal-box') || this._getActiveModal();
        if (!modal) return;

        modal.querySelectorAll('[data-action="selectAdFormat"]').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-format') === format);
        });

        const textEl = modal.querySelector('[data-ref="ad-format-text"]');
        if (textEl) {
            textEl.textContent = label;
            textEl.setAttribute('data-value', format);
        }
        const iconEl = modal.querySelector('[data-ref="ad-format-icon"]');
        if (iconEl) {
            iconEl.textContent = icon;
        }

        closeDropdown(btn.closest('.component-module--dropdown'));
    }

    handleSlotFormatDropdownSelection(btn) {
        const format = btn.getAttribute('data-format') || 'feed';
        const label = btn.getAttribute('data-label') || '';
        const icon = btn.getAttribute('data-icon') || 'grid_view';
        this.selectedSlotFormat = format;

        const modal = btn.closest('.component-modal-box') || this._getActiveModal();
        if (!modal) return;

        modal.querySelectorAll('[data-action="selectSlotFormat"]').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-format') === format);
        });

        const textEl = modal.querySelector('[data-ref="slot-format-text"]');
        if (textEl) {
            textEl.textContent = label;
            textEl.setAttribute('data-value', format);
        }
        const iconEl = modal.querySelector('[data-ref="slot-format-icon"]');
        if (iconEl) {
            iconEl.textContent = icon;
        }

        closeDropdown(btn.closest('.component-module--dropdown'));
    }

    handleGeoModeDropdownSelection(btn) {
        const mode = btn.getAttribute('data-mode') || 'all';
        const label = btn.getAttribute('data-label') || '';
        const icon = btn.getAttribute('data-icon') || 'public';

        const modal = btn.closest('.component-modal-box') || this._getActiveModal();
        if (!modal) return;

        modal.querySelectorAll('[data-action="selectGeoMode"]').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-mode') === mode);
        });

        const textEl = modal.querySelector('[data-ref="geo-mode-text"]');
        if (textEl) {
            textEl.textContent = label;
            textEl.setAttribute('data-value', mode);
        }
        const iconEl = modal.querySelector('[data-ref="geo-mode-icon"]');
        if (iconEl) {
            iconEl.textContent = icon;
        }

        const countriesContainer = modal.querySelector('[data-ref="geo-countries-container"]');
        if (countriesContainer) {
            countriesContainer.classList.toggle('disabled', mode === 'all');
        }

        closeDropdown(btn.closest('.component-module--dropdown'));
    }

    handleSlotGeoModeDropdownSelection(btn) {
        const mode = btn.getAttribute('data-mode') || 'all';
        const label = btn.getAttribute('data-label') || '';
        const icon = btn.getAttribute('data-icon') || 'public';

        const modal = btn.closest('.component-modal-box') || this._getActiveModal();
        if (!modal) return;

        modal.querySelectorAll('[data-action="selectSlotGeoMode"]').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-mode') === mode);
        });

        const textEl = modal.querySelector('[data-ref="slot-geo-mode-text"]');
        if (textEl) {
            textEl.textContent = label;
            textEl.setAttribute('data-value', mode);
        }
        const iconEl = modal.querySelector('[data-ref="slot-geo-mode-icon"]');
        if (iconEl) {
            iconEl.textContent = icon;
        }

        const countriesContainer = modal.querySelector('[data-ref="slot-geo-countries-container"]');
        if (countriesContainer) {
            countriesContainer.classList.toggle('disabled', mode === 'all');
        }

        closeDropdown(btn.closest('.component-module--dropdown'));
    }

    filterCountryList(input) {
        const term = (input.value || '').toLowerCase().trim();
        const menu = input.closest('.component-menu') || input.closest('.component-module--dropdown');
        if (!menu) return;

        menu.querySelectorAll('.country-item').forEach(item => {
            const code = (item.getAttribute('data-code') || '').toLowerCase();
            const name = (item.getAttribute('data-name') || '').toLowerCase();
            const matches = !term || code.includes(term) || name.includes(term);
            item.style.display = matches ? '' : 'none';
        });
    }

    updateSelectedCountriesLabel(checkbox) {
        const modal = checkbox.closest('.component-modal-box') || this._getActiveModal();
        if (!modal) return;

        const checkedBoxes = modal.querySelectorAll('.geo-country-checkbox:checked');
        const count = checkedBoxes.length;

        const labelEl = modal.querySelector('[data-ref="target-countries-text"], [data-ref="slot-target-countries-text"]');
        if (labelEl) {
            labelEl.textContent = count > 0 ? `${count} ${_t('lbl_targeting_allowed') || 'seleccionados'}` : _t('lbl_select_countries');
        }
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
        } else if (this.currentAdModalStep === 5) {
            this._setAdModalStep(6, modal);
        } else if (this.currentAdModalStep === 6) {
            this._setAdModalStep(7, modal);
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

        const btnPrev = targetModal.querySelector('[data-ref="btn-ad-modal-prev"]');
        const btnNext = targetModal.querySelector('[data-ref="btn-ad-modal-next"]');
        const btnFinish = targetModal.querySelector('[data-ref="btn-ad-modal-finish"]');
        const descEl = targetModal.querySelector('[data-ref="ad-step-desc"]');

        if (btnPrev) btnPrev.classList.toggle('disabled', step === 1);

        if (step === 7) {
            if (btnNext) btnNext.classList.add('disabled');
            if (btnFinish) btnFinish.classList.remove('disabled');
            if (descEl) descEl.textContent = _t('step_ad_targeting_desc');
        } else {
            if (btnNext) btnNext.classList.remove('disabled');
            if (btnFinish) btnFinish.classList.add('disabled');
            if (descEl) {
                if (step === 1) descEl.textContent = _t('step_ad_format_desc');
                else if (step === 2) descEl.textContent = _t('step_ad_name_desc');
                else if (step === 3) descEl.textContent = _t('step_ad_description_desc');
                else if (step === 4) descEl.textContent = _t('step_ad_target_desc');
                else if (step === 5) descEl.textContent = _t('step_ad_creatives_desc');
                else if (step === 6) descEl.textContent = _t('step_ad_validity_desc');
            }
        }
    }

    moveResourceRow(btn, direction) {
        const row = btn.closest('.component-resource-row');
        if (!row) return;
        if (direction === 'up' && row.previousElementSibling) {
            row.previousElementSibling.before(row);
        } else if (direction === 'down' && row.nextElementSibling) {
            row.nextElementSibling.after(row);
        }
    }

    handleGlobalDragStart(e) {
        const row = e.target.closest('.component-resource-row');
        if (row) {
            this.draggedRow = row;
            row.classList.add('dragging');
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', row.getAttribute('data-index') || '');
            }
        }
    }

    handleGlobalDragOver(e) {
        if (!this.draggedRow) return;
        const row = e.target.closest('.component-resource-row');
        if (row && row !== this.draggedRow) {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            const rect = row.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            if (e.clientY < midY) {
                row.before(this.draggedRow);
            } else {
                row.after(this.draggedRow);
            }
        }
    }

    handleGlobalDragEnd(e) {
        if (this.draggedRow) {
            this.draggedRow.classList.remove('dragging');
            this.draggedRow = null;
        }
    }

    toggleAdExpirationFields(target) {
        const modal = target.closest('.component-modal-box') || this._getActiveModal();
        if (!modal) return;
        const fields = modal.querySelector('[data-ref="ad-expiration-fields"]');
        if (fields) {
            fields.classList.toggle('disabled', !target.checked);
        }
    }

    async openServerMediaLibraryModal(btn) {
        const row = btn.closest('.component-resource-row');
        const targetRowIndex = row ? row.getAttribute('data-index') : (btn.getAttribute('data-index') || '0');

        try {
            const res = await this.api.post(ApiRoutes.Admin.ListAdvertisementMediaLibrary, {});
            if (res && res.success && window.modalSystem) {
                window.modalSystem.show('serverMediaLibraryModal', {
                    media: res.media || [],
                    targetRowIndex: targetRowIndex
                });
            } else {
                showMessage(res.message || _t(res.message_key || 'err_default'), 'error');
            }
        } catch (err) {
            showMessage(_t('err_default'), 'error');
        }
    }

    handleMediaItemSelection(itemEl) {
        const url = itemEl.getAttribute('data-url') || '';
        const targetIndex = itemEl.getAttribute('data-target-index') || '0';

        const row = document.querySelector(`.component-resource-row[data-index="${targetIndex}"]`);
        if (row) {
            const urlInput = row.querySelector('[data-action="resourceInputUrlChange"], [data-ref^="res-url-"]');
            if (urlInput) {
                urlInput.value = url;
                this.updateResourceThumbnail(urlInput);
            }
        }
        if (window.modalSystem) {
            window.modalSystem.closeCurrent();
        }
    }

    async handleResourceFileUpload(input) {
        const file = input.files && input.files[0];
        if (!file) return;

        const row = input.closest('.component-resource-row');
        const labelBtn = input.closest('label');
        if (labelBtn) setButtonLoading(labelBtn);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await this.api.postForm(ApiRoutes.Admin.UploadAdvertisementMedia, formData);
            if (res && res.success && res.url) {
                if (row) {
                    const urlInput = row.querySelector('[data-action="resourceInputUrlChange"], [data-ref^="res-url-"]');
                    if (urlInput) {
                        urlInput.value = res.url;
                        this.updateResourceThumbnail(urlInput);
                    }
                }
                showMessage(_t(res.message_key || 'msg_media_uploaded_success'), 'success');
            } else {
                showMessage(res.message || _t(res.message_key || 'err_media_upload_failed'), 'error');
            }
        } catch (err) {
            showMessage(_t('err_media_upload_failed'), 'error');
        } finally {
            if (labelBtn) restoreButton(labelBtn);
            input.value = '';
        }
    }

    updateResourceThumbnail(input) {
        const row = input.closest('.component-resource-row');
        if (!row) return;

        const url = (input.value || '').trim();
        const thumbBox = row.querySelector('.component-resource-thumb-box');
        if (!thumbBox) return;

        const img = thumbBox.querySelector('.component-resource-thumb-img');
        const video = thumbBox.querySelector('.component-resource-thumb-video');
        const fallback = thumbBox.querySelector('.component-resource-thumb-fallback');

        const isVideo = url.endsWith('.mp4') || url.endsWith('.webm');

        if (!url) {
            if (img) { img.src = ''; img.classList.add('hidden'); }
            if (video) { video.src = ''; video.classList.add('hidden'); }
            if (fallback) fallback.classList.remove('hidden');
            return;
        }

        if (isVideo) {
            if (img) { img.src = ''; img.classList.add('hidden'); }
            if (video) { video.src = url; video.classList.remove('hidden'); }
            if (fallback) fallback.classList.add('hidden');
        } else {
            if (video) { video.src = ''; video.classList.add('hidden'); }
            if (img) {
                img.src = url;
                img.classList.remove('hidden');
            }
            if (fallback) fallback.classList.add('hidden');
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
        row.setAttribute('data-index', idx.toString());
        row.setAttribute('draggable', 'true');
        row.innerHTML = `
            <div class="component-resource-drag-handle" data-action="dragHandle" title="${_t('lbl_drag_to_reorder')}">
                <span class="material-symbols-rounded">drag_indicator</span>
            </div>
            <div class="component-resource-order-actions">
                <button type="button" class="component-button component-button--icon component-button--h24" data-action="moveResourceUp" title="${_t('btn_move_up')}">
                    <span class="material-symbols-rounded">keyboard_arrow_up</span>
                </button>
                <button type="button" class="component-button component-button--icon component-button--h24" data-action="moveResourceDown" title="${_t('btn_move_down')}">
                    <span class="material-symbols-rounded">keyboard_arrow_down</span>
                </button>
            </div>
            <div class="component-resource-thumb-box" data-ref="thumb-box-${idx}">
                <img class="component-resource-thumb-img hidden" src="" alt="" onerror="this.classList.add('hidden'); this.parentElement.querySelector('.component-resource-thumb-fallback').classList.remove('hidden');">
                <video class="component-resource-thumb-video hidden" src="" muted playsinline></video>
                <span class="material-symbols-rounded component-resource-thumb-fallback">image</span>
            </div>
            <div class="component-input-group component-input-group--flex">
                <input class="component-input-field" data-action="resourceInputUrlChange" data-ref="res-url-${idx}" type="text" placeholder=" " value="/assets/img/showcase/creative_tools.jpg" required>
                <label class="component-input-label">${_t('lbl_resource_url')}</label>
            </div>
            <div class="component-resource-row-actions">
                <label class="component-button component-button--icon component-button--h34" data-tooltip="${_t('btn_upload_media')}" data-position="bottom">
                    <span class="material-symbols-rounded">upload_file</span>
                    <input type="file" class="hidden-file-input" data-action="uploadResourceFile" data-index="${idx}" accept="image/*,video/mp4,video/webm" style="display:none;">
                </label>
                <button type="button" class="component-button component-button--icon component-button--h34" data-action="openServerMediaLibrary" data-index="${idx}" data-tooltip="${_t('btn_media_library')}" data-position="bottom">
                    <span class="material-symbols-rounded">photo_library</span>
                </button>
                <button type="button" class="component-button component-button--icon component-button--h34 component-button--danger" data-action="removeResourceRow" data-index="${idx}" data-tooltip="${_t('btn_delete')}" data-position="bottom">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </div>
        `;
        container.appendChild(row);
        this.updateResourceThumbnail(row.querySelector('[data-action="resourceInputUrlChange"]'));
    }

    removeResourceRow(btn) {
        const row = btn.closest('.component-resource-row');
        if (!row) return;
        const container = row.parentElement;
        row.remove();
        if (container && container.children.length === 0) {
            this.addResourceRow(container.parentElement.querySelector('[data-action="addResourceRow"]'));
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
        } else if (this.currentSlotModalStep === 4) {
            this._setSlotModalStep(5, modal);
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

        const btnPrev = targetModal.querySelector('[data-ref="btn-slot-modal-prev"]');
        const btnNext = targetModal.querySelector('[data-ref="btn-slot-modal-next"]');
        const btnFinish = targetModal.querySelector('[data-ref="btn-slot-modal-finish"]');
        const descEl = targetModal.querySelector('[data-ref="slot-step-desc"]');

        if (btnPrev) btnPrev.classList.toggle('disabled', step === 1);

        if (step === 5) {
            if (btnNext) btnNext.classList.add('disabled');
            if (btnFinish) btnFinish.classList.remove('disabled');
            if (descEl) descEl.textContent = _t('step_network_slot_targeting_desc');
        } else {
            if (btnNext) btnNext.classList.remove('disabled');
            if (btnFinish) btnFinish.classList.add('disabled');
            if (descEl) {
                if (step === 1) descEl.textContent = _t('step_network_slot_format_desc');
                else if (step === 2) descEl.textContent = _t('step_network_slot_name_desc');
                else if (step === 3) descEl.textContent = _t('step_network_slot_id_desc');
                else if (step === 4) descEl.textContent = _t('step_network_slot_code_desc');
            }
        }
    }



    async submitNetworkSlot(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (!modal) return;

        const form = modal.querySelector('[data-ref="network-slot-form"]');
        if (!form) return;

        const adUuid = form.getAttribute('data-ad-uuid');
        const isEdit = form.getAttribute('data-mode') === 'edit' && !!adUuid;
        const providerUuid = form.getAttribute('data-provider-uuid') || this.providerUuid;

        const slotName = (modal.querySelector('[data-ref="slot-name"]')?.value || '').trim();
        const slotId = (modal.querySelector('[data-ref="slot-id"]')?.value || '').trim();
        const slotCode = (modal.querySelector('[data-ref="slot-code"]')?.value || '').trim();
        const format = this.selectedSlotFormat || 'feed';
        const settings = this._collectAdSettings(modal);

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
            ad: {
                name: slotName,
                title: slotName,
                description: slotId ? `Slot ID: ${slotId}` : '',
                target_url: '',
                sponsor_label: '',
                format: format,
                status: 'active',
                settings: settings
            },
            resources: resources
        };

        if (isEdit) {
            payload.uuid = adUuid;
        } else {
            payload.provider_uuid = providerUuid;
        }

        const route = isEdit ? ApiRoutes.Admin.UpdateAdvertisement : ApiRoutes.Admin.CreateAdvertisement;
        const successMsgKey = isEdit ? 'msg_ad_updated_success' : 'msg_ad_created_success';

        if (btn) setButtonLoading(btn);

        try {
            const res = await this.api.post(route, payload, this.abortController.signal);
            if (res.aborted) return;
            if (res.success) {
                showMessage(_t(successMsgKey), 'success');
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

    downloadAdMetrics(btn = null) {
        if (!this.selectedAdUuid) {
            showMessage(_t('err_ad_not_found'), 'warning');
            return;
        }

        const selectedRow = document.querySelector(`[data-action="selectAdRow"][data-ad-uuid="${this.selectedAdUuid}"]`);
        const adName = selectedRow ? (selectedRow.getAttribute('data-ad-name') || selectedRow.getAttribute('data-ad-title')) : 'Anuncio';

        if (window.modalSystem) {
            window.modalSystem.show('downloadMetricsPeriodModal', {
                targetName: adName,
                targetUuid: this.selectedAdUuid,
                isGlobal: false
            });
        }
    }

    handleMetricsPeriodSelection(target) {
        const value = target.getAttribute('data-value') || '30';
        const label = target.getAttribute('data-label') || '';
        const modal = this._getActiveModal();
        if (!modal) return;

        const triggerText = modal.querySelector('[data-ref="period-text"]');
        if (triggerText) {
            triggerText.textContent = label;
            triggerText.setAttribute('data-value', value);
        }

        modal.querySelectorAll('[data-action="selectMetricsPeriod"]').forEach(item => {
            item.classList.toggle('active', item === target);
        });

        closeDropdown(modal.querySelector('[data-module="dropdownMetricsPeriod"]'));
    }

    async confirmDownloadAdMetrics(btn = null) {
        const modal = this._getActiveModal();
        const form = modal ? modal.querySelector('[data-ref="download-metrics-form"]') : null;
        const triggerText = modal ? modal.querySelector('[data-ref="period-text"]') : null;
        const period = triggerText ? (triggerText.getAttribute('data-value') || '30') : '30';
        const adUuid = form ? (form.getAttribute('data-target-uuid') || this.selectedAdUuid) : this.selectedAdUuid;

        if (!adUuid) {
            showMessage(_t('err_ad_not_found'), 'warning');
            return;
        }

        const targetName = form ? form.getAttribute('data-target-name') : '';
        const selectedRow = document.querySelector(`[data-action="selectAdRow"][data-ad-uuid="${adUuid}"]`);
        const adName = targetName || (selectedRow ? (selectedRow.getAttribute('data-ad-name') || selectedRow.getAttribute('data-ad-title')) : 'Anuncio');
        const cleanName = adName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `Reporte_Metricas_${cleanName}_${period}d.pdf`;

        if (btn) setButtonLoading(btn);

        try {
            const result = await this.api.downloadFile(
                ApiRoutes.Admin.DownloadAdMetrics,
                { ad_uuid: adUuid, period: period },
                filename,
                this.abortController ? this.abortController.signal : null
            );
            if (result && !result.success && !result.aborted) {
                showMessage(result.message || _t(result.message_key || 'admin_ad_metrics_download_error'), 'error');
            } else {
                if (window.modalSystem) window.modalSystem.closeCurrent();
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

applySelectableTable(AdminProviderAdvertisementsController, {
    idProp: 'selectedAdUuid',
    selectionRef: 'ad-selection-actions',
    rowSelector: '[data-action="selectAdRow"]',
});

export { AdminProviderAdvertisementsController };
