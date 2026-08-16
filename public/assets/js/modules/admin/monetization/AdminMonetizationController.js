import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { restoreButton, setButtonLoading, showMessage } from '../../../core/utils/uiUtils.js';

export class AdminMonetizationController {
    constructor() {
        this.api = new ApiService();
        this.initialState = null;
        this.state = {};
        this.abortController = null;

        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
        if (window.location.pathname.includes('/admin/monetization')) {
            this.loadData();
        }
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('change', this.handleChangeBound);
        document.removeEventListener('input', this.handleInputBound);
    }

    bindEvents() {
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('change', this.handleChangeBound);
        document.addEventListener('input', this.handleInputBound);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/monetization')) {
            this.loadData();
        }
    }

    handleClick(e) {
        if (!window.location.pathname.includes('/admin/monetization')) return;

        const btnAdjust = e.target.closest('[data-action="adjustConfig"]');
        if (btnAdjust) {
            this.handleAdjustment(btnAdjust);
            return;
        }

        const btnSave = e.target.closest('[data-action="submitMonetizationConfig"]');
        if (btnSave) {
            this.submitConfig(btnSave);
            return;
        }

        const btnReset = e.target.closest('[data-action="resetMonetizationConfig"]');
        if (btnReset) {
            this.resetConfig(btnReset);
            return;
        }

        const btnTest = e.target.closest('[data-action="testAdBreak"]');
        if (btnTest) {
            this.testAdBreak();
            return;
        }

        const providerOption = e.target.closest('[data-action="selectProvider"]');
        if (providerOption) {
            this.handleProviderSelection(providerOption);
            return;
        }
    }

    handleChange(e) {
        if (!window.location.pathname.includes('/admin/monetization')) return;

        if (e.target && e.target.getAttribute('data-action') === 'toggleConfig') {
            const field = e.target.getAttribute('data-field');
            if (field) {
                this.state[field] = e.target.checked ? 1 : 0;
                this.checkForChanges();
            }
        }
    }

    handleInput(e) {
        if (!window.location.pathname.includes('/admin/monetization')) return;

        if (e.target && e.target.getAttribute('data-action') === 'updateTextConfig') {
            const field = e.target.getAttribute('data-field');
            if (field) {
                this.state[field] = e.target.value;
                this.checkForChanges();
            }
        }
    }

    handleAdjustment(btn) {
        const targetField = btn.getAttribute('data-field');
        const step = parseInt(btn.getAttribute('data-step'), 10) || 1;
        const min = parseInt(btn.getAttribute('data-min'), 10) || 0;
        const max = parseInt(btn.getAttribute('data-max'), 10) || 999999;

        if (this.state[targetField] !== undefined) {
            let currentVal = parseInt(this.state[targetField], 10);
            let newVal = currentVal + step;
            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;
            this.state[targetField] = newVal;
            this.renderValues();
            this.checkForChanges();
        }
    }

    renderValues() {
        document.querySelectorAll('[data-ref^="val_"]').forEach(el => {
            const key = el.getAttribute('data-ref').replace('val_', '');
            if (this.state[key] !== undefined) {
                const val = this.state[key];
                el.setAttribute('data-value', val.toString());
                if (key.includes('seconds') || key.includes('cooldown') || key.includes('duration')) {
                    el.textContent = `${val}s`;
                } else {
                    el.textContent = val.toString();
                }
            }
        });
    }

    updateProviderSections() {
        document.querySelectorAll('[data-provider-section]').forEach(el => {
            const section = el.getAttribute('data-provider-section');
            const type = el.getAttribute('data-provider-type');
            const currentSelected = this.state[section] || 'mock';

            if (type === currentSelected) {
                el.classList.remove('disabled');
            } else {
                el.classList.add('disabled');
            }
        });
    }

    handleProviderSelection(option) {
        const field = option.getAttribute('data-target-field');
        const textRef = option.getAttribute('data-target-text');
        const val = option.getAttribute('data-value');
        const text = option.querySelector('.component-menu-link-text')?.textContent || val;

        if (field) {
            this.state[field] = val;
            const textEl = document.querySelector(`[data-ref="${textRef}"]`);
            if (textEl) {
                textEl.textContent = text;
            }

            const menu = option.closest('.component-menu-list');
            if (menu) {
                menu.querySelectorAll('.component-menu-link').forEach(link => link.classList.remove('active'));
                option.classList.add('active');
            }

            const moduleEl = option.closest('.component-module');
            if (moduleEl) {
                moduleEl.classList.add('disabled');
            }

            this.updateProviderSections();
            this.checkForChanges();
        }
    }

    loadData() {
        const state = {};

        document.querySelectorAll('input[data-action="toggleConfig"]').forEach(input => {
            const field = input.getAttribute('data-field');
            if (field) {
                state[field] = input.checked ? 1 : 0;
            }
        });

        document.querySelectorAll('input[data-action="updateTextConfig"], textarea[data-action="updateTextConfig"]').forEach(input => {
            const field = input.getAttribute('data-field');
            if (field) {
                state[field] = input.value;
            }
        });

        document.querySelectorAll('[data-ref^="val_"]').forEach(el => {
            const field = el.getAttribute('data-ref').replace('val_', '');
            const rawVal = el.getAttribute('data-value');
            if (field && rawVal !== null) {
                state[field] = isNaN(Number(rawVal)) ? rawVal : Number(rawVal);
            }
        });

        this.state = state;
        this.initialState = JSON.parse(JSON.stringify(this.state));
        this.renderValues();
        this.updateProviderSections();
        this.checkForChanges();
    }

    checkForChanges() {
        const saveBtn = document.querySelector('[data-ref="btn-save-monetization"]');
        if (!saveBtn || !this.initialState) return;

        let hasChanges = false;
        for (const key in this.state) {
            if (this.state[key] !== this.initialState[key]) {
                hasChanges = true;
                break;
            }
        }

        if (hasChanges) {
            saveBtn.classList.remove('disabled-interaction');
        } else {
            saveBtn.classList.add('disabled-interaction');
        }
    }

    async submitConfig(btn) {
        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.UpdateMonetizationConfig, {
                config: this.state
            }, this.abortController?.signal);

            if (res && res.success) {
                showMessage(window.__('admin_monetization_saved_success'), 'success');
                this.initialState = JSON.parse(JSON.stringify(this.state));
                this.checkForChanges();

                if (window.APP_MONETIZATION_CONFIG) {
                    Object.assign(window.APP_MONETIZATION_CONFIG, this.state);
                }
                if (window.adManager && typeof window.adManager.syncConfig === 'function') {
                    window.adManager.syncConfig(this.state);
                }
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

    async resetConfig(btn) {
        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Admin.ResetMonetizationConfig, {}, this.abortController?.signal);
            if (res && res.success && res.config) {
                showMessage(window.__('admin_monetization_reset_success'), 'success');
                if (window.spaRouter) {
                    window.spaRouter.reload();
                } else {
                    window.location.reload();
                }
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

    testAdBreak() {
        if (window.adManager && typeof window.adManager.showInterstitial === 'function') {
            window.adManager.showInterstitial({
                force: true,
                duration: this.state.modal_ad_duration_seconds || 5,
                sponsorTitle: this.state.modal_mock_sponsor_title,
                sponsorTagline: this.state.modal_mock_sponsor_tagline,
                sponsorUrl: this.state.modal_mock_sponsor_url
            });
        }
    }
}
