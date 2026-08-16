import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { restoreButton, setButtonLoading, showMessage } from '../../../core/utils/uiUtils.js';

export class AdminCampaignsController {
    constructor() {
        this.api = new ApiService();
        this.selectedCampaignId = null;
        this.selectedCampaignName = null;
        this.searchDebounceTimer = null;
        this.abortController = null;

        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('input', this.handleInputBound);
    }

    bindEvents() {
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('input', this.handleInputBound);
    }

    handleViewLoaded(e) {
        if (e.detail && e.detail.url && e.detail.url.includes('/admin/monetization-campaigns')) {
            this.clearSelection();
        }
    }

    handleClick(e) {
        if (!window.location.pathname.includes('/admin/monetization-campaigns')) return;

        const row = e.target.closest('[data-action="selectCampaignRow"]');
        if (row) {
            this.handleRowSelection(row);
            return;
        }

        const btnAdd = e.target.closest('[data-action="addCampaign"]');
        if (btnAdd) {
            this.openCreateModal();
            return;
        }

        const btnEdit = e.target.closest('[data-action="editCampaign"]');
        if (btnEdit) {
            this.openEditModal();
            return;
        }

        const btnToggleActive = e.target.closest('[data-action="toggleActiveCampaign"]');
        if (btnToggleActive) {
            this.toggleActive();
            return;
        }

        const btnDelete = e.target.closest('[data-action="deleteCampaign"]');
        if (btnDelete) {
            this.openDeleteModal();
            return;
        }

        const btnConfirmDelete = e.target.closest('[data-action="confirmDeleteCampaignBtn"]');
        if (btnConfirmDelete) {
            this.executeDelete(btnConfirmDelete);
            return;
        }

        const btnSubmit = e.target.closest('[data-action="submitCampaignForm"]');
        if (btnSubmit) {
            this.submitForm(btnSubmit);
            return;
        }

        const placementOpt = e.target.closest('[data-action="selectModalCampaignPlacement"]');
        if (placementOpt) {
            this.handlePlacementSelection(placementOpt);
            return;
        }

        const btnSearchToggle = e.target.closest('[data-action="searchCampaign"]');
        if (btnSearchToggle) {
            this.toggleSearchToolbar();
            return;
        }

        // Click outside table row clears selection
        const isWithinTable = e.target.closest('.component-table-wrapper') || e.target.closest('[data-ref="campaign-selection-actions"]');
        if (!isWithinTable && this.selectedCampaignId) {
            this.clearSelection();
        }
    }

    handleInput(e) {
        if (!window.location.pathname.includes('/admin/monetization-campaigns')) return;

        if (e.target && e.target.getAttribute('data-ref') === 'campaign-search-input') {
            const query = e.target.value.trim();
            if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = setTimeout(() => {
                const url = new URL(window.location.href);
                if (query) {
                    url.searchParams.set('q', query);
                } else {
                    url.searchParams.delete('q');
                }
                url.searchParams.delete('page');
                if (window.spaRouter) {
                    window.spaRouter.navigateTo(url.pathname + url.search);
                } else {
                    window.location.href = url.pathname + url.search;
                }
            }, 300);
        }
    }

    toggleSearchToolbar() {
        const toolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (toolbar) {
            toolbar.classList.toggle('disabled');
            if (!toolbar.classList.contains('disabled')) {
                const input = toolbar.querySelector('input');
                if (input) input.focus();
            }
        }
    }

    handleRowSelection(row) {
        const campaignId = row.getAttribute('data-campaign-id');
        const campaignName = row.getAttribute('data-campaign-name');

        if (this.selectedCampaignId === campaignId) {
            this.clearSelection();
            return;
        }

        document.querySelectorAll('[data-action="selectCampaignRow"]').forEach(r => r.classList.remove('active'));
        row.classList.add('active');

        this.selectedCampaignId = campaignId;
        this.selectedCampaignName = campaignName;

        const selectionActions = document.querySelector('[data-ref="campaign-selection-actions"]');
        const defaultActions = document.querySelector('[data-ref="header-default-actions"]');

        if (selectionActions && defaultActions) {
            selectionActions.classList.remove('disabled');
            selectionActions.classList.add('active');
            defaultActions.classList.add('disabled');
            defaultActions.classList.remove('active');
        }
    }

    clearSelection() {
        document.querySelectorAll('[data-action="selectCampaignRow"]').forEach(r => r.classList.remove('active'));
        this.selectedCampaignId = null;
        this.selectedCampaignName = null;

        const selectionActions = document.querySelector('[data-ref="campaign-selection-actions"]');
        const defaultActions = document.querySelector('[data-ref="header-default-actions"]');

        if (selectionActions && defaultActions) {
            selectionActions.classList.add('disabled');
            selectionActions.classList.remove('active');
            defaultActions.classList.remove('disabled');
            defaultActions.classList.add('active');
        }
    }

    openCreateModal() {
        if (window.modalSystem) {
            window.modalSystem.show('campaignBuilderModal', {
                uuid: null,
                campaign: {
                    placement: 'feed',
                    is_active: 1,
                    priority: 1,
                    badge_text: 'Patrocinado',
                    cta_text: 'Ver oferta'
                }
            });
        }
    }

    async openEditModal() {
        if (!this.selectedCampaignId) return;

        try {
            const res = await this.api.post(ApiRoutes.Admin.GetCampaignDetails, {
                uuid: this.selectedCampaignId
            }, this.abortController?.signal);

            if (res && res.success && res.campaign) {
                if (window.modalSystem) {
                    window.modalSystem.show('campaignBuilderModal', {
                        uuid: this.selectedCampaignId,
                        campaign: res.campaign
                    });
                }
            } else {
                showMessage(res?.message || window.__('err_campaign_not_found'), 'error');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                showMessage(window.__('admin_monetization_saved_error'), 'error');
            }
        }
    }

    handlePlacementSelection(opt) {
        const val = opt.getAttribute('data-value');
        const text = opt.querySelector('.component-menu-link-text')?.textContent || val;

        const inputPlacement = document.querySelector('[data-ref="val_campaign_placement"]');
        const textPlacement = document.querySelector('[data-ref="text_campaign_placement"]');

        if (inputPlacement) inputPlacement.value = val;
        if (textPlacement) textPlacement.textContent = text;

        const menu = opt.closest('.component-menu-list');
        if (menu) {
            menu.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
            opt.classList.add('active');
        }

        const moduleEl = opt.closest('.component-module');
        if (moduleEl) {
            moduleEl.classList.add('disabled');
        }
    }

    async submitForm(btn) {
        const form = document.querySelector('[data-ref="campaignForm"]');
        if (!form) return;

        const formData = new FormData(form);
        const payload = {
            uuid: formData.get('uuid') || null,
            name: formData.get('name'),
            placement: formData.get('placement') || 'feed',
            title: formData.get('title') || '',
            description: formData.get('description') || '',
            media_url: formData.get('media_url') || '',
            target_url: formData.get('target_url') || '',
            badge_text: formData.get('badge_text') || 'Patrocinado',
            cta_text: formData.get('cta_text') || 'Ver oferta',
            priority: parseInt(formData.get('priority'), 10) || 1,
            html_content: formData.get('html_content') || '',
            is_active: form.querySelector('input[name="is_active"]')?.checked ? 1 : 0
        };

        if (!payload.name) {
            showMessage(window.__('validation.required_fields'), 'error');
            return;
        }

        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.SaveCampaign, payload, this.abortController?.signal);
            if (res && res.success) {
                showMessage(res.message || window.__('admin_campaign_saved_success'), 'success');
                if (window.modalSystem) {
                    window.modalSystem.close();
                }
                this.reloadPage();
            } else {
                showMessage(res?.message || window.__('admin_monetization_saved_error'), 'error');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                showMessage(window.__('admin_monetization_saved_error'), 'error');
            }
        } finally {
            restoreButton(btn);
        }
    }

    async toggleActive() {
        if (!this.selectedCampaignId) return;

        try {
            const res = await this.api.post(ApiRoutes.Admin.ToggleCampaignActive, {
                uuid: this.selectedCampaignId
            }, this.abortController?.signal);

            if (res && res.success) {
                showMessage(res.message || window.__('admin_campaign_status_updated'), 'success');
                this.reloadPage();
            } else {
                showMessage(res?.message || window.__('admin_monetization_saved_error'), 'error');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                showMessage(window.__('admin_monetization_saved_error'), 'error');
            }
        }
    }

    openDeleteModal() {
        if (!this.selectedCampaignId) return;

        if (window.modalSystem) {
            window.modalSystem.show('confirmDeleteCampaign', {
                uuid: this.selectedCampaignId,
                name: this.selectedCampaignName
            });
        }
    }

    async executeDelete(btn) {
        const uuid = btn.getAttribute('data-uuid') || this.selectedCampaignId;
        if (!uuid) return;

        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.DeleteCampaign, {
                uuid: uuid
            }, this.abortController?.signal);

            if (res && res.success) {
                showMessage(res.message || window.__('admin_campaign_deleted_success'), 'success');
                if (window.modalSystem) {
                    window.modalSystem.close();
                }
                this.reloadPage();
            } else {
                showMessage(res?.message || window.__('admin_monetization_saved_error'), 'error');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                showMessage(window.__('admin_monetization_saved_error'), 'error');
            }
        } finally {
            restoreButton(btn);
        }
    }

    reloadPage() {
        if (window.spaRouter) {
            window.spaRouter.reload();
        } else {
            window.location.reload();
        }
    }
}
