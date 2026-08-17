import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { BaseListController } from '../../../core/base/BaseListController.js';
import { applySelectableTable } from '../../../core/mixins/SelectableTableMixin.js';
import { PromoService } from '../../../core/services/PromoCardService.js';
import { backToMainFilters, closeDropdown, handleOutsideSearchToolbarClick, openFilterSubMenu, restoreButton, setButtonLoading, showMessage } from '../../../core/utils/uiUtils.js';
import { AdminModalTemplates } from '../AdminModalTemplates.js';

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
        this.activeFilters = {
            type: 'all',
            status: 'all'
        };
        this.handleChangeBound = this.handleGlobalChange.bind(this);
    }

    getViewPath() {
        return '/admin/advertisements';
    }

    getExcludePath() {
        return '/admin/advertisement-';
    }

    getSearchInputRef() {
        return 'provider-search-input';
    }

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
        const tableContainer = document.querySelector('[data-ref="providers-table-wrapper"]');
        const emptyState = document.querySelector('[data-ref="providers-empty-state"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        const containerToDisable = tableContainer || emptyState;

        if (containerToDisable) containerToDisable.classList.add('disabled-interaction');

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController?.signal ?? null });
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const viewContent = document.querySelector('[data-ref="manageAdvertisementsView"]');
            const newContent = doc.querySelector('[data-ref="manageAdvertisementsView"]');

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
        const queryInput = document.querySelector('[data-ref="provider-search-input"]');
        const query = (queryInput ? queryInput.value : '').trim();
        this.updateFilterButtonsState();

        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', '1');
        if (query) urlParams.set('q', query);
        else urlParams.delete('q');

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
        const selectTarget = e.target.closest('[data-action="selectProviderRow"]');
        const searchBtn = e.target.closest('[data-action="searchProvider"]');
        const downloadGenMetricsBtn = e.target.closest('[data-action="downloadGeneralMetrics"]');
        const addBtn = e.target.closest('[data-action="addProvider"]');
        const editBtn = e.target.closest('[data-action="editProvider"]');
        const delBtn = e.target.closest('[data-action="deleteProvider"]');
        const toggleActiveBtn = e.target.closest('[data-action="toggleProviderActive"]');
        const viewAdsBtn = e.target.closest('[data-action="viewProviderAds"]');

        const stepTypeBtn = e.target.closest('[data-action="selectProviderType"]');
        const stepExpBtn = e.target.closest('[data-action="selectExpirationType"]');
        const stepNextBtn = e.target.closest('[data-action="providerNextStep"]');
        const stepPrevBtn = e.target.closest('[data-action="providerPrevStep"]');
        const calPickerBtn = e.target.closest('[data-action="openProviderCalendarPicker"]');
        const submitProviderBtn = e.target.closest('[data-action="submitProvider"], [data-action="submitCreateProvider"], [data-action="submitEditProvider"]');

        const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
        const backSubMenuBtn = e.target.closest('[data-action="backToMainFilters"]');
        const selectPeriodBtn = e.target.closest('[data-action="selectMetricsPeriod"]');
        const confirmDownloadBtn = e.target.closest('[data-action="confirmDownloadMetrics"], [data-action="confirmDownloadGeneralMetrics"]');

        if (selectTarget) this.handleRowSelection(selectTarget);
        if (searchBtn) this.toggleSearchToolbar();
        if (downloadGenMetricsBtn) this.downloadGeneralMetrics(downloadGenMetricsBtn);
        if (selectPeriodBtn) this.handleMetricsPeriodSelection(selectPeriodBtn);
        if (confirmDownloadBtn) this.confirmDownloadGeneralMetrics(confirmDownloadBtn);
        if (addBtn) this.openAddProviderModal();
        if (editBtn) this.openEditProviderModal(editBtn);
        if (delBtn) this.deleteProvider(delBtn);
        if (toggleActiveBtn) this.toggleProviderActive(toggleActiveBtn);
        if (viewAdsBtn) this.navigateToProviderAds();

        if (stepTypeBtn) this.handleProviderTypeDropdownSelection(stepTypeBtn);
        if (stepExpBtn) this.handleExpirationDropdownSelection(stepExpBtn);
        if (stepNextBtn) this.handleProviderNextStep(stepNextBtn);
        if (stepPrevBtn) this.handleProviderPrevStep(stepPrevBtn);
        if (calPickerBtn) this.openProviderCalendarPicker(calPickerBtn);
        if (submitProviderBtn) this.submitProvider(submitProviderBtn);

        if (openSubMenuBtn) openFilterSubMenu(openSubMenuBtn);
        if (backSubMenuBtn) backToMainFilters('menuMainFilters', 'moduleProviderFilters');

        handleOutsideSearchToolbarClick(e, searchBtn);
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

            closeDropdown('moduleProviderFilters');
            this.executeServerFilters();
        }
    }

    handleRowSelection(target) {
        const providerId = target.getAttribute('data-provider-id');
        if (this.selectedProviderId === providerId) {
            this.deselectAll();
            return;
        }
        this.selectTableRow(providerId, target);
    }

    openAddProviderModal() {
        if (!window.modalSystem) return;
        this.currentModalStep = 1;
        this.selectedProviderType = 'network';
        this.selectedExpirationType = 0;
        this.providerExpirationDate = '';
        window.modalSystem.show('providerModal');
    }

    async openEditProviderModal(btn = null) {
        if (!this.selectedProviderId || !window.modalSystem) return;
        if (btn) setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.GetAdProviderDetails, { uuid: this.selectedProviderId }, this.abortController.signal);
            if (res && res.success && res.provider) {
                const p = res.provider;
                this.currentModalStep = 1;
                this.selectedProviderType = p.provider_type || 'direct';
                this.selectedExpirationType = parseInt(p.has_expiration, 10) || 0;
                this.providerExpirationDate = p.expiration_date || '';

                window.modalSystem.show('providerModal', { provider: p });
            } else {
                showMessage(_t('err_provider_fetch_failed'), 'error');
            }
        } catch (err) {
            if (err.name !== 'AbortError') showMessage(_t('err_default'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    }

    handleProviderTypeDropdownSelection(btn) {
        const type = btn.getAttribute('data-type') || 'network';
        const label = btn.getAttribute('data-label') || '';
        const icon = btn.getAttribute('data-icon') || 'hub';
        this.selectedProviderType = type;

        const modal = btn.closest('.component-modal-box') || this._getActiveModal();
        if (!modal) return;

        modal.querySelectorAll('[data-action="selectProviderType"]').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-type') === type);
        });

        const textEl = modal.querySelector('[data-ref="provider-type-text"]');
        if (textEl) {
            textEl.textContent = label;
            textEl.setAttribute('data-value', type);
        }
        const iconEl = modal.querySelector('[data-ref="provider-type-icon"]');
        if (iconEl) {
            iconEl.textContent = icon;
        }

        const networkGroup = modal.querySelector('[data-ref="provider-network-id-group"]');
        if (networkGroup) {
            networkGroup.classList.toggle('disabled', type !== 'network');
        }

        const labelName = modal.querySelector('[data-ref="provider-name-label"]');
        if (labelName) {
            labelName.textContent = type === 'network' ? _t('lbl_network_name') : _t('lbl_advertiser_name');
        }

        closeDropdown(btn.closest('.component-module--dropdown'));
    }

    handleExpirationDropdownSelection(btn) {
        const exp = parseInt(btn.getAttribute('data-expiration') || '0', 10);
        const label = btn.getAttribute('data-label') || '';
        const icon = btn.getAttribute('data-icon') || 'all_inclusive';
        this.selectedExpirationType = exp;

        const modal = btn.closest('.component-modal-box') || this._getActiveModal();
        if (!modal) return;

        modal.querySelectorAll('[data-action="selectExpirationType"]').forEach(link => {
            link.classList.toggle('active', parseInt(link.getAttribute('data-expiration'), 10) === exp);
        });

        const textEl = modal.querySelector('[data-ref="provider-exp-text"]');
        if (textEl) {
            textEl.textContent = label;
            textEl.setAttribute('data-value', exp);
        }
        const iconEl = modal.querySelector('[data-ref="provider-exp-icon"]');
        if (iconEl) {
            iconEl.textContent = icon;
        }

        const calendarGroup = modal.querySelector('[data-ref="provider-calendar-picker-group"]');
        if (calendarGroup) {
            calendarGroup.classList.toggle('disabled', exp !== 1);
        }

        closeDropdown(btn.closest('.component-module--dropdown'));
    }

    handleProviderNextStep(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (!modal) return;

        if (this.currentModalStep === 1) {
            const name = (modal.querySelector('[data-ref="provider-name"]')?.value || '').trim();
            const netId = (modal.querySelector('[data-ref="provider-network-id"]')?.value || '').trim();

            if (!name) {
                showMessage(_t('err_provider_name_required'), 'error');
                return;
            }
            if (this.selectedProviderType === 'network' && !netId) {
                showMessage(_t('err_network_id_required'), 'error');
                return;
            }

            this._setModalStep(2, modal);
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

        const btnPrev = targetModal.querySelector('[data-ref="btn-modal-prev"]');
        const btnNext = targetModal.querySelector('[data-ref="btn-modal-next"]');
        const btnFinish = targetModal.querySelector('[data-ref="btn-modal-finish"]');
        const descEl = targetModal.querySelector('[data-ref="provider-step-desc"]');

        if (btnPrev) btnPrev.classList.toggle('disabled', step === 1);

        if (step === 2) {
            if (btnNext) btnNext.classList.add('disabled');
            if (btnFinish) btnFinish.classList.remove('disabled');
            if (descEl) descEl.textContent = _t('step_expiration_desc');
        } else {
            if (btnNext) btnNext.classList.remove('disabled');
            if (btnFinish) btnFinish.classList.add('disabled');
            if (descEl) descEl.textContent = _t('step_provider_details_desc');
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
            const display = data.displayString || (iso ? iso.split('T')[0] : '');

            triggerBtn.setAttribute('data-value', iso);
            this.providerExpirationDate = iso;

            const textEl = triggerBtn.querySelector('[data-ref="provider-expiration-text"]');
            if (textEl) textEl.textContent = display || _t('lbl_select_expiration_date');
        }
    }

    async submitProvider(btn = null) {
        const modal = btn ? btn.closest('.component-modal-box') : this._getActiveModal();
        if (!modal) return;

        const form = modal.querySelector('[data-ref="provider-form"]');
        if (!form) return;

        const uuid = form.getAttribute('data-uuid');
        const isEdit = form.getAttribute('data-mode') === 'edit' && !!uuid;

        const name = (modal.querySelector('[data-ref="provider-name"]')?.value || '').trim();
        const networkId = this.selectedProviderType === 'network' ? (modal.querySelector('[data-ref="provider-network-id"]')?.value || '').trim() : null;
        const expTrigger = modal.querySelector('[data-ref="provider-expiration-trigger"]');
        const expDate = this.selectedExpirationType === 1 ? (this.providerExpirationDate || (expTrigger ? expTrigger.getAttribute('data-value') : null)) : null;

        if (!name) {
            showMessage(_t('err_provider_name_required'), 'error');
            return;
        }

        const payload = {
            name: name,
            provider_type: this.selectedProviderType,
            network_id: networkId,
            has_expiration: this.selectedExpirationType,
            expiration_date: expDate
        };

        if (isEdit) {
            payload.uuid = uuid;
        } else {
            payload.is_active = 1;
        }

        const route = isEdit ? ApiRoutes.Admin.UpdateAdProvider : ApiRoutes.Admin.CreateAdProvider;
        const successMsgKey = isEdit ? 'msg_provider_updated_success' : 'msg_provider_created_success';

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

    async toggleProviderActive(btn = null) {
        if (!this.selectedProviderId) return;
        if (btn) setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.ToggleAdProviderActive, { uuid: this.selectedProviderId }, this.abortController.signal);
            if (res.aborted) return;
            if (res.success) {
                showMessage(_t(res.message_key || 'msg_provider_status_updated'), 'success');
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

    async deleteProvider(btn = null) {
        if (!this.selectedProviderId || !window.modalSystem) return;

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

    navigateToProviderAds() {
        if (!this.selectedProviderId) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/advertisement-items/${this.selectedProviderId}`);
        } else {
            window.location.href = `${this.basePath}/admin/advertisement-items/${this.selectedProviderId}`;
        }
    }

    downloadGeneralMetrics(btn = null) {
        if (window.modalSystem) {
            window.modalSystem.show('downloadMetricsPeriodModal', {
                targetName: 'Publicidad Global',
                targetUuid: '',
                isGlobal: true
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

    async confirmDownloadGeneralMetrics(btn = null) {
        const modal = this._getActiveModal();
        const triggerText = modal ? modal.querySelector('[data-ref="period-text"]') : null;
        const period = triggerText ? (triggerText.getAttribute('data-value') || '30') : '30';

        if (btn) setButtonLoading(btn);

        const filename = `Reporte_Metricas_Globales_Publicidad_${period}d_${new Date().toISOString().slice(0, 10)}.pdf`;

        try {
            const result = await this.api.downloadFile(
                ApiRoutes.Admin.DownloadGeneralAdMetrics,
                { period: period },
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

applySelectableTable(AdminAdvertisementsController, {
    idProp: 'selectedProviderId',
    selectionRef: 'advertisement-selection-actions',
    rowSelector: '[data-action="selectProviderRow"]',
});

export { AdminAdvertisementsController };
