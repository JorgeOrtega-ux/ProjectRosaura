import { ApiRoutes }           from '../../../core/api/ApiRoutes.js';
import { ApiService }          from '../../../core/api/ApiServices.js';
import { BaseListController }   from '../../../core/base/BaseListController.js';
import { applySelectableTable } from '../../../core/mixins/SelectableTableMixin.js';
import { AdminModalTemplates }  from '../AdminModalTemplates.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

function _t(key) {
    return typeof window.__ === 'function' ? window.__(key) : key;
}

class AdminAdvertisementsController extends BaseListController {
    constructor() {
        super();
        this.selectedProviderId = null;
        this.currentModalStep = 1;
        this.selectedProviderType = 'network';
        this.selectedExpirationType = 0;
        this.providerExpirationDate = '';
        this.currentAdModalStep = 1;
        this.selectedAdFormat = 'feed';
        this.currentSlotModalStep = 1;
        this.selectedSlotFormat = 'feed';
        this.resourceIndexCounter = 1;
        this.activeFilters = {
            type: 'all',
            status: 'all'
        };
        this.handleChangeBound = this.handleGlobalChange.bind(this);
    }

    getViewPath()       { return '/admin/advertisements'; }
    getExcludePath()    { return '/admin/advertisement-'; }
    getSearchInputRef() { return 'provider-search-input'; }

    init() {
        if (window.modalSystem) {
            window.modalSystem.registerTemplates(AdminModalTemplates);
        }
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
        super.handleViewLoaded(e);
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
        const tableContainer     = document.querySelector('[data-ref="providers-table-wrapper"]');
        const emptyState         = document.querySelector('[data-ref="providers-empty-state"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        const containerToDisable = tableContainer || emptyState;

        if (containerToDisable) containerToDisable.classList.add('disabled-interaction');

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController?.signal ?? null });
            const doc  = new DOMParser().parseFromString(html, 'text/html');

            const viewContent = document.querySelector('[data-ref="manageAdvertisementsView"]');
            const newContent  = doc.querySelector('[data-ref="manageAdvertisementsView"]');

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
        const queryInput = document.querySelector('[data-ref="provider-search-input"]');
        const query      = (queryInput ? queryInput.value : '').trim();
        this.updateFilterButtonsState();

        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', '1');
        if (query) urlParams.set('q', query);
        else       urlParams.delete('q');

        if (this.activeFilters.type && this.activeFilters.type !== 'all') {
            urlParams.set('type', this.activeFilters.type);
        } else {
            urlParams.delete('type');
        }

        if (this.activeFilters.status && this.activeFilters.status !== 'all') {
            urlParams.set('status', this.activeFilters.status);
        } else {
            urlParams.delete('status');
        }

        this.handlePagination(`${this.basePath}/admin/advertisements?${urlParams.toString()}`);
    }

    handleGlobalClick(e) {
        const selectTarget     = e.target.closest('[data-action="selectProviderRow"]');
        const searchBtn        = e.target.closest('[data-action="searchProvider"]');
        const addBtn           = e.target.closest('[data-action="addProvider"]');
        const editBtn          = e.target.closest('[data-action="editProvider"]');
        const delBtn           = e.target.closest('[data-action="deleteProvider"]');
        const toggleActiveBtn  = e.target.closest('[data-action="toggleProviderActive"]');
        const viewAdsBtn       = e.target.closest('[data-action="viewProviderAds"]');

        const stepTypeBtn      = e.target.closest('[data-action="selectProviderType"]');
        const stepExpBtn       = e.target.closest('[data-action="selectExpirationType"]');
        const stepNextBtn      = e.target.closest('[data-action="providerNextStep"]');
        const stepPrevBtn      = e.target.closest('[data-action="providerPrevStep"]');
        const calPickerBtn     = e.target.closest('[data-action="openProviderCalendarPicker"]');
        const submitCreateBtn  = e.target.closest('[data-action="submitCreateProvider"]');
        const submitEditBtn    = e.target.closest('[data-action="submitEditProvider"]');

        const openSubMenuBtn   = e.target.closest('[data-action="openFilterSubMenu"]');
        const backSubMenuBtn   = e.target.closest('[data-action="backToMainFilters"]');

        if (selectTarget)    this.handleRowSelection(selectTarget);
        if (searchBtn)       this.toggleSearchToolbar();
        if (addBtn)          this.openAddProviderModal();
        if (editBtn)         this.openEditProviderModal();
        if (delBtn)          this.deleteProvider(delBtn);
        if (toggleActiveBtn)  this.toggleProviderActive(toggleActiveBtn);
        if (viewAdsBtn)      this.navigateToProviderAds();

        if (stepTypeBtn)     this.handleProviderTypeSelection(stepTypeBtn);
        if (stepExpBtn)      this.handleExpirationTypeSelection(stepExpBtn);
        if (stepNextBtn)     this.handleProviderNextStep(stepNextBtn);
        if (stepPrevBtn)     this.handleProviderPrevStep(stepPrevBtn);
        if (calPickerBtn)    this.openProviderCalendarPicker(calPickerBtn);
        if (submitCreateBtn) this.submitCreateProvider(submitCreateBtn);
        if (submitEditBtn)   this.submitEditProvider(submitEditBtn);

        if (openSubMenuBtn)  this.handleOpenFilterSubMenu(openSubMenuBtn);
        if (backSubMenuBtn)  this.handleBackToMainFilters(backSubMenuBtn);

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && !searchToolbar.classList.contains('disabled')) {
            if (!e.target.closest('[data-ref="search-toolbar"]') && !searchBtn) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }

    handleGlobalInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'provider-search-input') {
            this.applyAllFilters();
        }
    }

    handleGlobalChange(e) {
        const radio = e.target.closest('.filter-radio');
        if (radio) {
            const filterCategory = radio.getAttribute('data-filter-type');
            const val = radio.value;

            if (filterCategory === 'type') {
                this.activeFilters.type = val;
            } else if (filterCategory === 'status') {
                this.activeFilters.status = val;
            }

            const moduleEl = radio.closest('[data-module="moduleProviderFilters"]');
            if (moduleEl) moduleEl.classList.add('disabled');

            this.executeServerFilters();
            return;
        }

        if (e.target && e.target.getAttribute('data-ref') === 'edit-toggle-expiration') {
            const modal = e.target.closest('.component-modal-box') || this._getActiveModal();
            const calGroup = modal ? modal.querySelector('[data-ref="edit-calendar-group"]') : null;
            if (calGroup) {
                calGroup.classList.toggle('disabled', !e.target.checked);
            }
        }
    }

    handleOpenFilterSubMenu(btn) {
        const targetRef = btn.getAttribute('data-target');
        const module = btn.closest('[data-module="moduleProviderFilters"]');
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
        const module = btn.closest('[data-module="moduleProviderFilters"]');
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

    handleRowSelection(target) {
        const providerId = target.getAttribute('data-provider-id');
        if (this.selectedProviderId === providerId) { 
            this.deselectAll(); 
            return; 
        }

        this.selectedProviderId = providerId;
        document.querySelectorAll('[data-action="selectProviderRow"]').forEach(row => {
            row.classList.toggle('selected', row.getAttribute('data-provider-id') === providerId);
        });
        this._toggleSelectionBar(true);
    }

    openAddProviderModal() {
        if (!window.modalSystem) return;
        window.modalSystem.registerTemplates(AdminModalTemplates);

        this.currentModalStep = 1;
        this.selectedProviderType = 'network';
        this.selectedExpirationType = 0;
        this.providerExpirationDate = '';

        window.modalSystem.show('createProviderModal');
    }

    handleProviderTypeSelection(btn) {
        const type = btn.getAttribute('data-type') || 'network';
        this.selectedProviderType = type;

        const modal = btn.closest('.component-modal-box') || this._getActiveModal();
        if (!modal) return;

        const links = modal.querySelectorAll('[data-action="selectProviderType"]');
        links.forEach(link => {
            const isTarget = link.getAttribute('data-type') === type;
            link.classList.toggle('active', isTarget);
            const check = link.querySelector('[data-ref^="check-"]');
            if (check) check.classList.toggle('disabled', !isTarget);
        });
    }

    handleExpirationTypeSelection(btn) {
        const exp = parseInt(btn.getAttribute('data-expiration') || '0', 10);
        this.selectedExpirationType = exp;

        const modal = btn.closest('.component-modal-box') || this._getActiveModal();
        if (!modal) return;

        const links = modal.querySelectorAll('[data-action="selectExpirationType"]');
        links.forEach(link => {
            const isTarget = parseInt(link.getAttribute('data-expiration'), 10) === exp;
            link.classList.toggle('active', isTarget);
            const check = link.querySelector('[data-ref^="check-"]');
            if (check) check.classList.toggle('disabled', !isTarget);
        });

        const calendarGroup = modal.querySelector('[data-ref="calendar-picker-group"]');
        if (calendarGroup) {
            calendarGroup.classList.toggle('disabled', exp !== 1);
        }
    }

    handleProviderNextStep(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (!modal) return;

        if (this.currentModalStep === 1) {
            const fieldsNetwork = modal.querySelector('[data-ref="fields-network"]');
            const fieldsDirect  = modal.querySelector('[data-ref="fields-direct"]');

            if (this.selectedProviderType === 'network') {
                if (fieldsNetwork) fieldsNetwork.classList.remove('disabled');
                if (fieldsDirect) fieldsDirect.classList.add('disabled');
            } else {
                if (fieldsNetwork) fieldsNetwork.classList.add('disabled');
                if (fieldsDirect) fieldsDirect.classList.remove('disabled');
            }

            this._setModalStep(2, modal);
        } else if (this.currentModalStep === 2) {
            if (this.selectedProviderType === 'network') {
                const netName = (modal.querySelector('[data-ref="input-network-name"]')?.value || '').trim();
                const netId   = (modal.querySelector('[data-ref="input-network-id"]')?.value || '').trim();
                if (!netName) {
                    showMessage(_t('err_provider_name_required'), 'error');
                    return;
                }
                if (!netId) {
                    showMessage(_t('err_network_id_required'), 'error');
                    return;
                }
            } else {
                const advName = (modal.querySelector('[data-ref="input-advertiser-name"]')?.value || '').trim();
                if (!advName) {
                    showMessage(_t('err_provider_name_required'), 'error');
                    return;
                }
            }

            this._setModalStep(3, modal);
        }
    }

    handleProviderPrevStep(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (this.currentModalStep > 1) {
            this._setModalStep(this.currentModalStep - 1, modal);
        }
    }

    _setModalStep(step, modal = null) {
        this.currentModalStep = step;
        const targetModal = modal || this._getActiveModal();
        if (!targetModal) return;

        targetModal.querySelectorAll('.step-modal-step[data-step]').forEach(s => {
            const sNum = parseInt(s.getAttribute('data-step') || '0', 10);
            const isActive = (sNum === step);
            s.classList.toggle('active', isActive);
            s.classList.toggle('disabled', !isActive);
        });

        targetModal.querySelectorAll('.step-modal-dot[data-dot]').forEach(d => {
            const dNum = parseInt(d.getAttribute('data-dot') || '0', 10);
            d.classList.toggle('active', dNum === step);
        });

        const btnPrev   = targetModal.querySelector('[data-ref="btn-modal-prev"]');
        const btnNext   = targetModal.querySelector('[data-ref="btn-modal-next"]');
        const btnFinish = targetModal.querySelector('[data-ref="btn-modal-finish"]');
        const descEl    = targetModal.querySelector('[data-ref="provider-step-desc"]');

        if (btnPrev) btnPrev.classList.toggle('disabled', step === 1);

        if (step === 3) {
            if (btnNext) btnNext.classList.add('disabled');
            if (btnFinish) btnFinish.classList.remove('disabled');
            if (descEl) descEl.textContent = _t('step_expiration_desc');
        } else {
            if (btnNext) btnNext.classList.remove('disabled');
            if (btnFinish) btnFinish.classList.add('disabled');
            if (descEl) descEl.textContent = step === 1 ? _t('step_provider_type_desc') : _t('step_provider_details_desc');
        }
    }

    async openProviderCalendarPicker(triggerBtn) {
        if (!window.modalSystem) return;
        const currentVal = triggerBtn.getAttribute('data-value') || '';

        const res = await window.modalSystem.show('calendarModal', {
            isoDate: currentVal,
            title: _t('lbl_select_expiration_date')
        });

        if (res && res.confirmed) {
            const data = res.data || {};
            const iso = data.isoString || '';
            const display = data.displayString || iso;

            triggerBtn.setAttribute('data-value', iso);
            this.providerExpirationDate = iso;

            const textEl = triggerBtn.querySelector('[data-ref$="expiration-text"]');
            if (textEl) textEl.textContent = display || _t('lbl_select_expiration_date');
        }
    }

    async submitCreateProvider(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (!modal) return;

        let name = '';
        let networkId = null;

        if (this.selectedProviderType === 'network') {
            name = (modal.querySelector('[data-ref="input-network-name"]')?.value || '').trim();
            networkId = (modal.querySelector('[data-ref="input-network-id"]')?.value || '').trim();
        } else {
            name = (modal.querySelector('[data-ref="input-advertiser-name"]')?.value || '').trim();
        }

        const payload = {
            name: name,
            provider_type: this.selectedProviderType,
            network_id: networkId,
            has_expiration: this.selectedExpirationType,
            expiration_date: this.selectedExpirationType === 1 ? this.providerExpirationDate : null,
            is_active: 1
        };

        if (btn) setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.CreateAdProvider, payload, this.abortController.signal);
            if (res.aborted) return;
            if (res.success) {
                showMessage(_t('msg_provider_created_success'), 'success');
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

    async openEditProviderModal() {
        if (!this.selectedProviderId || !window.modalSystem) return;
        window.modalSystem.registerTemplates(AdminModalTemplates);

        try {
            const res = await this.api.post(ApiRoutes.Admin.GetAdProviderDetails, { uuid: this.selectedProviderId }, this.abortController.signal);
            if (res && res.success && res.provider) {
                window.modalSystem.show('editProviderModal', { provider: res.provider });
            } else {
                showMessage(_t('err_provider_fetch_failed'), 'error');
            }
        } catch (err) {
            if (err.name !== 'AbortError') showMessage(_t('err_default'), 'error');
        }
    }

    async submitEditProvider(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (!modal) return;

        const form = modal.querySelector('[data-ref="edit-provider-form"]');
        if (!form) return;

        const uuid = form.getAttribute('data-uuid');
        const type = form.getAttribute('data-type');
        const name = (modal.querySelector('[data-ref="edit-provider-name"]')?.value || '').trim();
        const networkId = type === 'network' ? (modal.querySelector('[data-ref="edit-network-id"]')?.value || '').trim() : null;
        const toggleExp = modal.querySelector('[data-ref="edit-toggle-expiration"]');
        const hasExp = toggleExp ? (toggleExp.checked ? 1 : 0) : 0;
        const expTrigger = modal.querySelector('[data-ref="edit-provider-expiration-trigger"]');
        const expDate = expTrigger ? expTrigger.getAttribute('data-value') : null;

        if (!name) {
            showMessage(_t('err_provider_name_required'), 'error');
            return;
        }

        const payload = {
            uuid: uuid,
            name: name,
            network_id: networkId,
            has_expiration: hasExp,
            expiration_date: hasExp ? expDate : null
        };

        if (btn) setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.UpdateAdProvider, payload, this.abortController.signal);
            if (res.aborted) return;
            if (res.success) {
                showMessage(_t('msg_provider_updated_success'), 'success');
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

    async toggleProviderActive(btn = null) {
        if (!this.selectedProviderId) return;
        if (btn) setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.ToggleAdProviderActive, { uuid: this.selectedProviderId }, this.abortController.signal);
            if (res.aborted) return;
            if (res.success) {
                showMessage(_t(res.message_key || 'msg_provider_status_updated'), 'success');
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

    async deleteProvider(btn = null) {
        if (!this.selectedProviderId || !window.modalSystem) return;
        window.modalSystem.registerTemplates(AdminModalTemplates);

        const providerId = this.selectedProviderId;
        const selectedRow = document.querySelector(`[data-action="selectProviderRow"][data-provider-id="${providerId}"]`);
        const providerName = selectedRow ? selectedRow.getAttribute('data-provider-name') : _t('unknown_provider');

        const response = await window.modalSystem.show('confirmDeleteProviderModal', { providerName });
        if (response && response.confirmed) {
            if (btn) setButtonLoading(btn);
            try {
                const res = await this.api.post(ApiRoutes.Admin.DeleteAdProvider, { uuid: providerId }, this.abortController.signal);
                if (res.aborted) return;
                if (res.success) {
                    showMessage(_t('msg_provider_deleted_success'), 'success');
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

    navigateToProviderAds() {
        if (!this.selectedProviderId) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/advertisement-items/${this.selectedProviderId}`);
        } else {
            window.location.href = `${this.basePath}/admin/advertisement-items/${this.selectedProviderId}`;
        }
    }
}

applySelectableTable(AdminAdvertisementsController, {
    idProp:       'selectedProviderId',
    selectionRef: 'advertisement-selection-actions',
    rowSelector:  '[data-action="selectProviderRow"]',
});

export { AdminAdvertisementsController };
