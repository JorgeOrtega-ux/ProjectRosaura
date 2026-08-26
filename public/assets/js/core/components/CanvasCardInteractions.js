import { ApiRoutes } from '../api/ApiRoutes.js';
import { showMessage, renderSkeleton, getLockDetails, closeAllDropdowns, toggleDropdown, setButtonLoading, restoreButton } from '../utils/uiUtils.js';
import { CanvasApiService } from '../api/CanvasApiService.js';
import { CardTemplates } from './CardTemplates.js';
import { PromoService } from '../services/PromoCardService.js';
import { CanvasSyncChannel } from '../services/CanvasSyncChannel.js';
import { CanvasStorageEngine } from '../../modules/app/design/utils/CanvasStorageEngine.js';

export class CanvasCardInteractions {
    constructor(apiService, basePath, abortController) {
        this.api = new CanvasApiService();
        this.basePath = basePath || '';
        this.abortController = abortController;
        this.initCanvasInfoModuleEvents();
    }

    handleAction(action, btn) {
        if (action === 'toggleDynamicMenu') {
            this.toggleDynamicMenu(btn);
            return true;
        } else if (action === 'syncLocalCanvasToCloud') {
            this.syncLocalCanvasToCloud(btn);
            return true;
        } else if (action === 'deleteLocalCanvas') {
            this.deleteLocalCanvas(btn);
            return true;
        } else if (action === 'exportLocalCanvasPng') {
            this.exportLocalCanvasPng(btn);
            return true;
        } else if (action === 'menuGoToPage') {
            this.menuGoToPage(btn);
            return true;
        } else if (action === 'menuGoBack') {
            this.menuGoBack(btn);
            return true;
        } else if (action === 'viewCanvasInfo') {
            this.viewCanvasInfo(btn);
            return true;
        } else if (action === 'openCanvasNewTab') {
            this.openCanvasNewTab(btn);
            return true;
        } else if (action === 'copyCanvasLink') {
            this.copyCanvasLink(btn);
            return true;
        } else if (action === 'deleteCanvas') {
            this.deleteCanvas(btn);
            return true;
        } else if (action === 'leaveCanvas') {
            this.leaveCanvas(btn);
            return true;
        } else if (action === 'joinCanvas') {
            this.joinCanvas(btn);
            return true;
        } else if (action === 'viewCanvasSnapshots') {
            this.viewCanvasSnapshots(btn);
            return true;
        } else if (action === 'createSnapshotSelected') {
            this.createSnapshotSelected(btn);
            return true;
        } else if (action === 'toggleFavorite') {
            this.toggleFavorite(btn);
            return true;
        } else if (action === 'downgradeCanvas') {
            this.downgradeCanvas(btn);
            return true;
        } else if (action === 'toggleCardOnlineMode') {
            this.toggleCardOnlineMode(btn);
            return true;
        } else if (action === 'openCardResizeModal') {
            this.openCardResizeModal(btn);
            return true;
        } else if (action === 'openCardResetModal') {
            this.openCardResetModal(btn);
            return true;
        }
        return false;
    }

    menuGoToPage(btn) {
        const targetPage = btn.getAttribute('data-target-page');
        const menuModule = btn.closest('.component-module');
        if (!menuModule || !targetPage) return;
        menuModule.querySelectorAll('.component-menu-page').forEach(p => p.classList.remove('active'));
        const target = menuModule.querySelector(`[data-menu-page="${targetPage}"]`);
        if (target) target.classList.add('active');
    }

    menuGoBack(btn) {
        const menuModule = btn.closest('.component-module');
        if (!menuModule) return;
        menuModule.querySelectorAll('.component-menu-page').forEach(p => p.classList.remove('active'));
        const main = menuModule.querySelector('[data-menu-page="main"]');
        if (main) main.classList.add('active');
    }

    async toggleFavorite(btn) {
        if (btn.classList.contains('disabled-interaction')) return;
        
        const canvasId = btn.getAttribute('data-id');
        if (!canvasId) return;

        const wasFavorite = btn.classList.contains('is-favorite');
        if (wasFavorite) {
            btn.classList.remove('is-favorite');
        } else {
            btn.classList.add('is-favorite');
        }

        btn.classList.add('disabled-interaction');

        const res = await this.api.toggleFavorite(canvasId);

        btn.classList.remove('disabled-interaction');

        if (res && res.success) {
            
            if (res.data.action === 'added') {
                btn.classList.add('is-favorite');
            } else {
                btn.classList.remove('is-favorite');
            }
        } else {
            
            if (wasFavorite) {
                btn.classList.add('is-favorite');
            } else {
                btn.classList.remove('is-favorite');
            }
            showMessage(res.message, 'error');
        }
    }

    viewCanvasSnapshots(btn) {
        const uuid = btn.getAttribute('data-uuid');
        if (uuid) {
            this.closeDropdowns();
            if (window.spaRouter) {
                window.spaRouter.navigate(`${this.basePath}/design/s/${uuid}`);
            } else {
                window.location.href = `${this.basePath}/design/s/${uuid}`;
            }
        }
    }

    async createSnapshotSelected(btn) {
        if (btn.classList.contains('disabled-interaction') || btn.dataset.loading === 'true') return;
        const canvasId = btn.getAttribute('data-id');
        if (!canvasId) return;

        btn.dataset.loading = 'true';
        btn.classList.add('disabled-interaction');

        const spinnerDiv = document.createElement('div');
        spinnerDiv.className = 'component-menu-link-icon';
        spinnerDiv.innerHTML = '<div class="component-spinner"></div>';
        btn.appendChild(spinnerDiv);

        try {
            const route = ApiRoutes.Canvases.CreateSnapshot;
            const result = await this.api.post(route, { id: parseInt(canvasId, 10) }, this.abortController ? this.abortController.signal : null);

            if (result.aborted) return;

            if (result.success) {
                showMessage(result.message, 'success');
                this.pollSnapshotStatus(canvasId);
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            if (error && error.name === 'AbortError') return;
            showMessage(window.__('general_save_network_error'), 'error');
        } finally {
            spinnerDiv.remove();
            btn.classList.remove('disabled-interaction');
            btn.dataset.loading = 'false';
        }
    }

    async pollSnapshotStatus(canvasId) {
        const maxAttempts = 15;
        const intervalMs = 2000;
        const signal = this.abortController ? this.abortController.signal : null;
        
        setTimeout(async () => {
            if (signal && signal.aborted) return;
            showMessage(window.__('msg_captura_processing'), 'info');
        }, 1500);

        const route = ApiRoutes.Canvases.SnapshotStatus;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
            
            if (signal && signal.aborted) return;
            
            try {
                const res = await this.api.post(route, { id: parseInt(canvasId, 10) }, signal);
                if (res && res.success) {
                    if (res.status === 'idle') {
                        showMessage(window.__('msg_captura_success') || '¡Captura generada y guardada con éxito!', 'success');
                        window.dispatchEvent(new CustomEvent('snapshot-created', { detail: { canvasId } }));
                        return;
                    }
                }
            } catch (err) {
                console.error('Error checking snapshot status:', err);
            }
        }
        
        if (signal && signal.aborted) return;
        showMessage(window.__('msg_captura_timeout') || 'La captura está tardando más de lo esperado en procesarse, se completará en segundo plano.', 'warning');
    }

    openCanvasNewTab(btn) {
        const uuid = btn.getAttribute('data-uuid');
        if (uuid) {
            window.open(`${this.basePath}/design/${uuid}`, '_blank');
        }
    }

    async copyCanvasLink(btn) {
        const uuid = btn.getAttribute('data-uuid');
        if (uuid) {
            const url = `${window.location.origin}${this.basePath}/design/${uuid}`;
            try {
                await navigator.clipboard.writeText(url);
                showMessage(window.__('msg_link_copied'), 'success');
                this.closeDropdowns();
            } catch (err) {
                showMessage(window.__('err_default'), 'error');
            }
        }
    }

    async deleteCanvas(btn) {
        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        if (!uuid) return;

        this.closeDropdowns();

        if (window.modalSystem) {
            const confirm = await window.modalSystem.show('verifyPasswordDeleteCanvas', { uuid: uuid });
            if (!confirm.confirmed) return;
            
            const password = confirm.data['modal_verify_password'] ? confirm.data['modal_verify_password'].trim() : '';
            const credential = confirm.data['credential'] || confirm.data['google_token'] || '';

            if (!password && !credential) {
                showMessage(window.__('err_identity_verification_required') || window.__('err_password_required'), 'error');
                return;
            }

            const payload = {
                canvas_ids: [id],
                password: password,
                credential: credential,
                google_token: credential
            };

            const res = await this.api.post(ApiRoutes.Canvases.Delete, payload, this.abortController.signal);
            
            if (res.aborted) return;

            if (res.success) {
                showMessage(window.__('msg_canvas_deleted'), 'success');
                const card = document.querySelector(`.component-gallery-card[data-card-id="${id}"]`);
                if (card) card.remove();
            } else {
                showMessage(res.message, 'error');
            }
        }
    }

    async leaveCanvas(btn) {
        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        if (!uuid) return;

        this.closeDropdowns();

        if (window.modalSystem) {
            const confirm = await window.modalSystem.show('confirmLeaveCanvas', { uuid: uuid });
            if (!confirm.confirmed) return;
        }

        const res = await this.api.post(ApiRoutes.Canvases.Leave, { uuid: uuid }, this.abortController.signal);
        
        if (res.aborted) return;

        if (res.success) {
            showMessage(window.__('msg_canvas_left'), 'success');
            const card = document.querySelector(`.component-gallery-card[data-card-id="${id}"]`);
            if (card) {
                const privacy = card.getAttribute('data-privacy') || 'public';
                if (privacy === 'private') {
                    card.remove();
                } else {
                    const triggerBtn = card.querySelector(`button[data-action="toggleDynamicMenu"]`);
                    if (triggerBtn) {
                        triggerBtn.setAttribute('data-member', '0');
                    }
                    const countEl = card.querySelector('.member-count-val');
                    if (countEl) {
                        const currentVal = parseInt(countEl.textContent.replace(/,/g, '') || '0', 10);
                        countEl.textContent = Math.max(0, currentVal - 1).toLocaleString();
                    }
                }
            }
        } else {
            showMessage(res.message, 'error');
        }
    }

    async joinCanvas(btn) {
        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        if (!uuid || !id) return;

        this.closeDropdowns();

        if (window.modalSystem) {
            const res = await window.modalSystem.show('joinCanvasTerms');
            if (!res || !res.confirmed) return;
        }

        if (typeof setButtonLoading === 'function') setButtonLoading(btn);

        const response = await this.api.post(ApiRoutes.Canvases.RequestAccess, { canvas_id: id, terms_accepted: true }, this.abortController.signal);
        
        if (response.aborted) return;
        if (typeof restoreButton === 'function') restoreButton(btn);

        if (response.success) {
            if (typeof showMessage === 'function') showMessage(response.message, 'success');
            
            const card = document.querySelector(`.component-gallery-card[data-card-id="${id}"]`);
            if (card) {
                const triggerBtn = card.querySelector(`button[data-action="toggleDynamicMenu"]`);
                if (triggerBtn) {
                    triggerBtn.setAttribute('data-member', '1');
                }
                const countEl = card.querySelector('.member-count-val');
                if (countEl) {
                    const currentVal = parseInt(countEl.textContent.replace(/,/g, '') || '0', 10);
                    countEl.textContent = (currentVal + 1).toLocaleString();
                }
            }
        } else {
            if (typeof showMessage === 'function') showMessage(response.message, 'error');
        }
    }

    async downgradeCanvas(btn) {
        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        if (!uuid) return;

        this.closeDropdowns();

        if (window.modalSystem && window.modalSystem.show) {
            const confirmRes = await window.modalSystem.show('downgradeCanvasModal');

            if (!confirmRes || !confirmRes.confirmed) return;

            const password = confirmRes.data && confirmRes.data.modal_verify_password ? confirmRes.data.modal_verify_password.trim() : '';
            const credential = confirmRes.data && (confirmRes.data.credential || confirmRes.data.google_token) ? (confirmRes.data.credential || confirmRes.data.google_token) : '';

            if (!password && !credential) {
                if (typeof showMessage === 'function') showMessage(window.__('err_identity_verification_required') || window.__('err_password_required'), 'error');
                return;
            }

            const res = await this.api.post(ApiRoutes.Canvases.Downgrade, { uuid: uuid, password: password, credential: credential, google_token: credential }, this.abortController.signal);
            
            if (res.aborted) return;

            if (res.success) {
                if (typeof showMessage === 'function') showMessage(res.message, 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                if (typeof showMessage === 'function') showMessage(res.message, 'error');
            }
        }
    }

    closeDropdowns() {
        closeAllDropdowns();
        document.querySelectorAll('.component-module--dropdown').forEach(el => {
            const mainPage = el.querySelector('[data-menu-page="main"]');
            if (mainPage) {
                el.querySelectorAll('.component-menu-page').forEach(p => p.classList.remove('active'));
                mainPage.classList.add('active');
            }
            if (el.dataset.module?.startsWith('snapshot-menu-') || el.closest('.component-gallery-actions-wrapper')) {
                setTimeout(() => el.remove(), 250);
            }
        });
    }

    toggleDynamicMenu(btn) {
        const wrapper = btn.closest('.component-dropdown-wrapper');
        if (!wrapper) return;
        
        let moduleEl = wrapper.querySelector('.component-module');
        
        if (moduleEl) {
            const isCurrentlyActive = moduleEl.classList.contains('active');
            this.closeDropdowns();
            if (!isCurrentlyActive) {
                moduleEl.remove();
            } else {
                return;
            }
        } else {
            this.closeDropdowns();
        }

        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        const isOwner = btn.getAttribute('data-owner') === '1';
        const isLocked = btn.getAttribute('data-locked') === '1';
        const isMember = btn.getAttribute('data-member') === '1';
        const isOnline = btn.getAttribute('data-online') === '1';
        const isLocal = btn.getAttribute('data-local') === '1' || (uuid && String(uuid).startsWith('local_'));

        if (isLocal) {
            const html = `
                <div class="component-module component-module--dropdown disabled" data-module="snapshot-menu-${id}">
                    <div class="component-menu component-menu--w265">
                        <div class="pill-container"><div class="drag-handle"></div></div>

                        <div class="component-menu-page active" data-menu-page="main">
                            <div class="component-menu-list">
                                <button type="button" class="component-menu-link" data-nav="${this.basePath}/design/${uuid}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">brush</span></div>
                                    <div class="component-menu-link-text"><span>${window.__('lbl_open_canvas') || 'Abrir lienzo'}</span></div>
                                </button>

                                <button type="button" class="component-menu-link" data-action="syncLocalCanvasToCloud" data-uuid="${uuid}" data-id="${id}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded component-text-accent">cloud_upload</span></div>
                                    <div class="component-menu-link-text"><span>${window.__('btn_sync_cloud') || 'Sincronizar con la nube'}</span></div>
                                </button>

                                <button type="button" class="component-menu-link" data-action="exportLocalCanvasPng" data-uuid="${uuid}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">image</span></div>
                                    <div class="component-menu-link-text"><span>${window.__('btn_export_png') || 'Exportar imagen PNG'}</span></div>
                                </button>

                                <div class="component-menu-divider"></div>

                                <button type="button" class="component-menu-link component-menu-link--bordered component-text-notice--danger" data-action="deleteLocalCanvas" data-uuid="${uuid}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">delete</span></div>
                                    <div class="component-menu-link-text"><span>${window.__('lbl_delete_local_canvas') || 'Eliminar del dispositivo'}</span></div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            this.closeDropdowns();
            wrapper.insertAdjacentHTML('beforeend', html);
            const newModule = wrapper.querySelector(`[data-module="snapshot-menu-${id}"]`);
            if (newModule) {
                if (window.appInstance && window.appInstance.moduleManager) {
                    window.appInstance.moduleManager.open(newModule, btn);
                } else {
                    newModule.classList.remove('disabled');
                    newModule.classList.add('active');
                }
            }
            if (window.app && typeof window.app.initModules === 'function') window.app.initModules(wrapper);
            if (window.router && typeof window.router.bindLinks === 'function') window.router.bindLinks(wrapper);
            return;
        }

        let actionButtonHtml = '';
        if (window.activeUserId) {
            if (isOwner) {
                actionButtonHtml = `<button type="button" class="component-menu-link component-menu-link--bordered" data-action="deleteCanvas" data-id="${id}" data-uuid="${uuid}">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">delete</span></div>
                        <div class="component-menu-link-text"><span>${window.__('delete_canvas')}</span></div>
                   </button>`;
            } else if (isMember) {
                actionButtonHtml = `<button type="button" class="component-menu-link component-menu-link--bordered" data-action="leaveCanvas" data-id="${id}" data-uuid="${uuid}">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">logout</span></div>
                        <div class="component-menu-link-text"><span>${window.__('leave_canvas')}</span></div>
                   </button>`;
            } else {
                actionButtonHtml = `<button type="button" class="component-menu-link component-menu-link--bordered component-text-notice--info" data-action="joinCanvas" data-id="${id}" data-uuid="${uuid}">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">login</span></div>
                        <div class="component-menu-link-text"><span>${window.__('join_canvas')}</span></div>
                   </button>`;
            }
        }

        let onlineModeOption = '';
        if (isOwner) {
            if (isOnline) {
                onlineModeOption = `
                    <button type="button" class="component-menu-link" data-action="toggleCardOnlineMode" data-id="${id}" data-uuid="${uuid}" data-target-mode="offline">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">cloud_off</span></div>
                        <div class="component-menu-link-text"><span>${window.__('menu_change_to_studio') || 'Cambiar a modo Estudio'}</span></div>
                    </button>
                `;
            } else {
                onlineModeOption = `
                    <button type="button" class="component-menu-link" data-action="toggleCardOnlineMode" data-id="${id}" data-uuid="${uuid}" data-target-mode="online">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">sensors</span></div>
                        <div class="component-menu-link-text"><span>${window.__('menu_activate_online') || 'Activar modo En Vivo'}</span></div>
                    </button>
                `;
            }
        }

        let warningMenuOption = '';
        if (isLocked && isOwner) {
            warningMenuOption = `
                <button type="button" class="component-menu-link component-menu-link--bordered component-text-notice--warning" data-action="downgradeCanvas" data-id="${id}" data-uuid="${uuid}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">build_circle</span></div>
                    <div class="component-menu-link-text"><span>${window.__('convert_to_basic')}</span></div>
                </button>
            `;
        }

        let manageSubmenuHtml = '';
        if (isOwner) {
            const rolesLock = getLockDetails('feat_advanced_roles', 'link');
            const rolesClass = rolesLock.isLocked ? ` ${rolesLock.classStr}` : '';
            const rolesAttrs = rolesLock.isLocked ? ` ${rolesLock.attributesStr}` : '';
            const rolesBadge = rolesLock.isLocked ? rolesLock.badgeHtml : '';
            const rolesNav = rolesLock.isLocked ? '' : `${this.basePath}/canvases/manage/roles/${uuid}`;

            manageSubmenuHtml = `
                <div class="component-menu-page" data-menu-page="manage">
                    <div class="component-menu-list">
                        <button type="button" class="component-menu-link component-menu-link--bordered nav-item" data-action="menuGoBack">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded msr-arrow_back">arrow_back</span></div>
                            <div class="component-menu-link-text"><span>Volver</span></div>
                        </button>
                        <div class="component-menu-divider"></div>
                        <button type="button" class="component-menu-link" data-nav="${this.basePath}/canvases/edit/${uuid}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">edit</span></div>
                            <div class="component-menu-link-text"><span>${window.__('tooltip_edit_canvas')}</span></div>
                        </button>
                        <button type="button" class="component-menu-link" data-action="openCardResizeModal" data-id="${id}" data-uuid="${uuid}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">expand</span></div>
                            <div class="component-menu-link-text"><span>${window.__('tooltip_resize_canvas')}</span></div>
                        </button>
                        <button type="button" class="component-menu-link" data-action="openCardResetModal" data-id="${id}" data-uuid="${uuid}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">update</span></div>
                            <div class="component-menu-link-text"><span>${window.__('tooltip_manage_resets')}</span></div>
                        </button>
                        <button type="button" class="component-menu-link" data-action="createSnapshotSelected" data-id="${id}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">photo_camera</span></div>
                            <div class="component-menu-link-text"><span>${window.__('btn_create_captura')}</span></div>
                        </button>
                        <div class="component-menu-divider"></div>
                        <button type="button" class="component-menu-link" data-nav="${this.basePath}/canvases/members/${uuid}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">group</span></div>
                            <div class="component-menu-link-text"><span>${window.__('tooltip_manage_members')}</span></div>
                        </button>
                        <button type="button" class="component-menu-link${rolesClass}" data-nav="${rolesNav}"${rolesAttrs}>
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">shield_person</span></div>
                            <div class="component-menu-link-text"><span>${window.__('tooltip_manage_roles')}</span>${rolesBadge}</div>
                        </button>
                        <button type="button" class="component-menu-link" data-nav="${this.basePath}/canvases/manage/invites/${uuid}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">link</span></div>
                            <div class="component-menu-link-text"><span>${window.__('tooltip_manage_invites')}</span></div>
                        </button>
                        <button type="button" class="component-menu-link" data-nav="${this.basePath}/canvases/manage/sanctions/${uuid}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">gavel</span></div>
                            <div class="component-menu-link-text"><span>${window.__('tooltip_manage_sanctions')}</span></div>
                        </button>
                    </div>
                </div>
            `;
        }

        const html = `
            <div class="component-module component-module--dropdown disabled" data-module="snapshot-menu-${id}">
                <div class="component-menu component-menu--w265">
                    <div class="pill-container"><div class="drag-handle"></div></div>

                    <div class="component-menu-page active" data-menu-page="main">
                        <div class="component-menu-list">
                            <button type="button" class="component-menu-link" data-action="openCanvasNewTab" data-uuid="${uuid}">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">open_in_new</span></div>
                                <div class="component-menu-link-text"><span>${window.__('open_in_new_tab')}</span></div>
                            </button>

                            <button type="button" class="component-menu-link" data-action="viewCanvasInfo" data-id="${id}" data-uuid="${uuid}">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">info</span></div>
                                <div class="component-menu-link-text"><span>Ver información</span></div>
                            </button>

                            <button type="button" class="component-menu-link" data-action="copyCanvasLink" data-uuid="${uuid}">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">content_copy</span></div>
                                <div class="component-menu-link-text"><span>${window.__('copy_link')}</span></div>
                            </button>

                            <button type="button" class="component-menu-link" data-nav="${this.basePath}/design/s/${uuid}">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">collections</span></div>
                                <div class="component-menu-link-text"><span>${window.__('view_capturas_gallery')}</span></div>
                            </button>

                            ${onlineModeOption}

                            ${warningMenuOption}

                            ${isOwner ? `
                            <div class="component-menu-divider"></div>
                            <button type="button" class="component-menu-link${isLocked ? ' disabled-interaction' : ''}" ${isLocked ? '' : 'data-action="menuGoToPage" data-target-page="manage"'}>
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">settings</span></div>
                                <div class="component-menu-link-text"><span>Gestionar lienzo</span></div>
                                ${isLocked ? '' : '<div class="component-menu-link-arrow"><span class="material-symbols-rounded">chevron_right</span></div>'}
                            </button>
                            ` : ''}

                            ${actionButtonHtml}
                        </div>
                    </div>

                    ${manageSubmenuHtml}
                </div>
            </div>
        `;

        this.closeDropdowns();
        wrapper.insertAdjacentHTML('beforeend', html);
        
        const newModule = wrapper.querySelector(`[data-module="snapshot-menu-${id}"]`);
        if (newModule) {
            if (window.appInstance && window.appInstance.moduleManager) {
                window.appInstance.moduleManager.open(newModule, btn);
            } else {
                newModule.classList.remove('disabled');
                newModule.classList.add('active');
            }
        }
        
        if (window.app && typeof window.app.initModules === 'function') {
            window.app.initModules(wrapper);
        }
        
        if (window.router && typeof window.router.bindLinks === 'function') {
            window.router.bindLinks(wrapper);
        }
    }

    async toggleCardOnlineMode(btn) {
        if (btn.dataset.loading === 'true' || btn.classList.contains('disabled-interaction')) return;
        const id = btn.getAttribute('data-id');
        const targetMode = btn.getAttribute('data-target-mode');
        if (!id) return;

        btn.dataset.loading = 'true';
        btn.classList.add('disabled-interaction');

        const spinnerDiv = document.createElement('div');
        spinnerDiv.className = 'component-menu-link-icon';
        spinnerDiv.innerHTML = '<div class="component-spinner"></div>';
        btn.appendChild(spinnerDiv);

        try {
            const route = targetMode === 'online' ? ApiRoutes.Canvases.ActivateOnline : ApiRoutes.Canvases.DeactivateOnline;
            const res = await this.api.post(route, { canvas_id: id }, this.abortController?.signal);

            if (res && res.aborted) return;

            if (res && res.success) {
                const successMsg = res.message || (targetMode === 'online' 
                    ? (window.__('msg_canvas_online_activated') || 'Lienzo activado en modo En Vivo con éxito.') 
                    : (window.__('msg_canvas_offline_deactivated') || 'Lienzo guardado y puesto en modo Estudio Offline.'));
                showMessage(successMsg, 'success');

                const isNowOnline = targetMode === 'online';
                const nextTargetMode = isNowOnline ? 'offline' : 'online';

                btn.setAttribute('data-target-mode', nextTargetMode);
                const iconEl = btn.querySelector('.component-menu-link-icon .material-symbols-rounded');
                if (iconEl) {
                    iconEl.textContent = isNowOnline ? 'cloud_off' : 'sensors';
                }
                const textEl = btn.querySelector('.component-menu-link-text span');
                if (textEl) {
                    textEl.textContent = isNowOnline 
                        ? (window.__('menu_change_to_studio') || 'Cambiar a modo Estudio')
                        : (window.__('menu_activate_online') || 'Activar modo En Vivo');
                }

                const card = document.querySelector(`.component-gallery-card[data-card-id="${id}"]`);
                if (card) {
                    const triggerBtn = card.querySelector(`button[data-action="toggleDynamicMenu"]`);
                    if (triggerBtn) {
                        triggerBtn.setAttribute('data-online', isNowOnline ? '1' : '0');
                    }
                    const badge = card.querySelector('.component-badge--glass');
                    if (badge) {
                        const modeSegment = isNowOnline
                            ? `<span class="material-symbols-rounded">sensors</span><span>0 ${window.__('online') || 'online'}</span>`
                            : `<span class="material-symbols-rounded component-text-accent">brush</span><span>${window.__('badge_studio') || 'Estudio'}</span>`;
                        
                        const memberEl = badge.querySelector('.member-count-val');
                        const membersCount = memberEl ? memberEl.textContent : '0';
                        const spans = badge.querySelectorAll('span');
                        const likesCount = spans.length > 0 ? spans[spans.length - 1].textContent : '0';

                        badge.innerHTML = `
                            ${modeSegment}
                            <span class="component-badge-divider">|</span>
                            <span class="material-symbols-rounded">group</span>
                            <span class="member-count-val">${membersCount}</span>
                            <span class="component-badge-divider">|</span>
                            <span class="material-symbols-rounded component-text-accent">favorite</span>
                            <span>${likesCount}</span>
                        `;
                    }
                }

                CanvasSyncChannel.broadcast({
                    type: 'canvas_mode_changed',
                    canvasId: id,
                    mode: isNowOnline ? 'online' : 'offline',
                    is_online: isNowOnline ? 1 : 0
                });
            } else {
                showMessage(res?.message || (window.__('err_occurred') || 'Error al cambiar modo de lienzo'), 'error');
            }
        } catch (error) {
            if (error && error.name === 'AbortError') return;
            showMessage(window.__('err_occurred') || 'Error al cambiar modo de lienzo', 'error');
        } finally {
            spinnerDiv.remove();
            btn.classList.remove('disabled-interaction');
            btn.dataset.loading = 'false';
        }
    }

    initCanvasInfoModuleEvents() {
        if (window.CanvasInfoModuleEventsBound) return;
        window.CanvasInfoModuleEventsBound = true;

        document.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('[data-action="toggleInfoDetails"]');
            if (toggleBtn) {
                e.preventDefault();
                const container = toggleBtn.closest('.component-details-card')?.querySelector('.component-details-rows-container');
                if (container) {
                    const isCollapsed = container.classList.contains('collapsed');
                    if (isCollapsed) {
                        container.classList.remove('collapsed');
                        container.classList.add('expanded');
                        toggleBtn.classList.add('expanded');
                    } else {
                        container.classList.remove('expanded');
                        container.classList.add('collapsed');
                        toggleBtn.classList.remove('expanded');
                    }
                }
            }
        });
    }

    async viewCanvasInfo(btn) {
        const canvasId = btn.getAttribute('data-id');
        if (!canvasId) return;

        this.closeDropdowns();

        const moduleEl = document.querySelector('[data-module="moduleCanvasInfo"]');
        if (!moduleEl) return;

        const loaderEl = moduleEl.querySelector('[data-ref="canvas-info-loader"]');
        const contentEl = moduleEl.querySelector('[data-ref="canvas-info-content"]');
        const titleEl = moduleEl.querySelector('[data-ref="canvas-info-title"]');
        const imgEl = moduleEl.querySelector('[data-ref="canvas-info-image"]');
        const dimensionsEl = moduleEl.querySelector('[data-ref="canvas-info-dimensions"]');
        const ownerEl = moduleEl.querySelector('[data-ref="canvas-info-owner"]');
        const createdEl = moduleEl.querySelector('[data-ref="canvas-info-created"]');
        const typeEl = moduleEl.querySelector('[data-ref="canvas-info-type"]');
        const membersEl = moduleEl.querySelector('[data-ref="canvas-info-members"]');
        const cooldownEl = moduleEl.querySelector('[data-ref="canvas-info-cooldown"]');
        const privacyEl = moduleEl.querySelector('[data-ref="canvas-info-privacy"]');
        const favoritesEl = moduleEl.querySelector('[data-ref="canvas-info-favorites"]');
        const totalPixelsEl = moduleEl.querySelector('[data-ref="canvas-info-total-pixels"]');
        const headerContentEl = moduleEl.querySelector('[data-ref="canvas-info-header-content"]');
        const headerSkeletonEl = moduleEl.querySelector('[data-ref="canvas-info-header-skeleton"]');

        if (loaderEl) {
            renderSkeleton(loaderEl, 'detailsSkeleton');
            loaderEl.classList.remove('disabled');
            loaderEl.classList.add('active');
        }
        if (contentEl) {
            contentEl.classList.remove('active');
            contentEl.classList.add('disabled');
        }

        if (headerContentEl) headerContentEl.classList.add('disabled');
        if (headerSkeletonEl) headerSkeletonEl.classList.remove('disabled');

        const detailsToggleBtn = moduleEl.querySelector('[data-action="toggleInfoDetails"]');
        const detailsRowsContainer = moduleEl.querySelector('.component-details-rows-container');
        if (detailsToggleBtn && detailsRowsContainer) {
            detailsToggleBtn.classList.remove('expanded');
            detailsRowsContainer.classList.remove('expanded');
            detailsRowsContainer.classList.add('collapsed');
        }

        if (window.appInstance && typeof window.appInstance.openModule === 'function') {
            window.appInstance.openModule(moduleEl);
        } else {
            moduleEl.classList.replace('disabled', 'active');
        }

        const targetMenu = moduleEl.querySelector('[data-ref="menu-canvas-info"]');
        if (targetMenu) {
            moduleEl.querySelectorAll('.component-menu').forEach(m => {
                m.classList.remove('active');
                m.classList.add('disabled');
            });
            targetMenu.classList.remove('disabled');
            targetMenu.classList.add('active');
        }

        try {
            const res = await this.api.post(ApiRoutes.Canvases.Get, { id: canvasId }, this.abortController.signal);

            if (res && res.success && res.data) {
                const canvas = res.data;

                if (titleEl) titleEl.textContent = canvas.name || 'Información del lienzo';

                if (imgEl) {
                    imgEl.classList.remove('loaded');
                    const fallbackImg = this.basePath + '/assets/img/fallbacks/canvas-default.png';
                    const srcUrl = canvas.thumbnail_url ? canvas.thumbnail_url : fallbackImg;
                    imgEl.src = srcUrl;
                    imgEl.onload = () => {
                        imgEl.classList.add('loaded');
                    };
                    imgEl.onerror = () => {
                        imgEl.src = fallbackImg;
                        imgEl.classList.add('loaded');
                    };
                }

                if (typeEl) {
                    typeEl.textContent = 'Lienzo personal';
                }

                if (dimensionsEl) {
                    const width = canvas.width || '-';
                    const height = canvas.height || '-';
                    dimensionsEl.textContent = `${width} x ${height} px`;
                }

                if (ownerEl) {
                    ownerEl.textContent = canvas.owner_username || '-';
                }

                if (createdEl) {
                    let formattedDate = '-';
                    if (canvas.created_at) {
                        try {
                            const dateObj = new Date(canvas.created_at.replace(' ', 'T'));
                            if (!isNaN(dateObj.getTime())) {
                                const day = dateObj.getDate();
                                const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                                const monthName = months[dateObj.getMonth()];
                                const year = dateObj.getFullYear();
                                formattedDate = `${day} ${monthName} ${year}`;
                            } else {
                                formattedDate = canvas.created_at;
                            }
                        } catch (e) {
                            formattedDate = canvas.created_at;
                        }
                    }
                    createdEl.textContent = formattedDate;
                }

                if (membersEl) {
                    const current = canvas.members_count || 0;
                    const max = canvas.max_participants || canvas.max_members || 0;
                    membersEl.textContent = `${current} / ${max}`;
                }

                if (cooldownEl) {
                    cooldownEl.textContent = canvas.cooldown_seconds ? `${canvas.cooldown_seconds}s` : 'Sin espera';
                }

                if (privacyEl) {
                    const priv = canvas.privacy || 'public';
                    privacyEl.textContent = priv === 'public' ? 'Público' : 'Privado';
                }

                if (favoritesEl) {
                    favoritesEl.textContent = canvas.favorites_count || 0;
                }

                if (totalPixelsEl) {
                    totalPixelsEl.textContent = (canvas.total_pixels !== undefined) ? Number(canvas.total_pixels).toLocaleString() : '0';
                }
            } else {
                if (titleEl) titleEl.textContent = 'Error';
                showMessage(res?.message || 'Error al cargar la información del lienzo', 'error');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                if (titleEl) titleEl.textContent = 'Error';
                showMessage('Error al cargar la información del lienzo', 'error');
            }
        } finally {
            if (headerContentEl) headerContentEl.classList.remove('disabled');
            if (headerSkeletonEl) headerSkeletonEl.classList.add('disabled');
            if (loaderEl) {
                loaderEl.classList.remove('active');
                loaderEl.classList.add('disabled');
            }
            if (contentEl) {
                contentEl.classList.remove('disabled');
                contentEl.classList.add('active');
            }
        }
    }

    async openCardResizeModal(btn) {
        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        if (!id) return;
        this.closeDropdowns();

        const card = document.querySelector(`[data-card-id="${id}"]`) || btn.closest('.component-card');
        const isOffline = card ? card.getAttribute('data-mode') === 'offline' : false;
        const currentSize = card ? card.getAttribute('data-size') || '64x64' : '64x64';
        const userTier = window.APP_USER?.subscription_tier ?? 0;

        let resizeActive = false;
        let nextResizeAt = '';
        let targetSize = currentSize;

        try {
            const res = await this.api.post(ApiRoutes.Canvases.GetResizeSettings, { id: parseInt(id, 10) });
            if (res && res.success && res.data) {
                resizeActive = !!res.data.is_active;
                nextResizeAt = res.data.next_resize_at || '';
                targetSize = res.data.target_size || currentSize;
            }
        } catch (e) {
            // fallback
        }

        await window.modalSystem.show('offlineResizeModal', {
            canvasId: id,
            currentSize,
            userTier,
            isOfflineMode: isOffline,
            resizeActive,
            nextResizeAt,
            resizeTargetSize: targetSize,
            onConfirm: async (payload, submitBtn) => {
                if (submitBtn) setButtonLoading(submitBtn);
                try {
                    let result;
                    if (payload.mode === 'cancel_schedule') {
                        result = await this.api.post(ApiRoutes.Canvases.UpdateResizeSettings, {
                            id: parseInt(id, 10),
                            is_active: false,
                            next_resize_at: null,
                            target_size: targetSize
                        });
                        if (result && result.success) {
                            window.modalSystem.closeCurrent(true);
                            showMessage(result.message || window.__('msg_scheduled_resize_cancelled'), 'success');
                            return;
                        }
                    } else if (payload.mode === 'instant') {
                        result = await this.api.post(ApiRoutes.Canvases.Resize, { id: parseInt(id, 10), size: payload.size });
                        if (result && result.success && card) {
                            card.setAttribute('data-size', payload.size);
                        }
                    } else {
                        result = await this.api.post(ApiRoutes.Canvases.UpdateResizeSettings, {
                            id: parseInt(id, 10),
                            is_active: payload.isActive,
                            next_resize_at: payload.nextResizeAt,
                            target_size: payload.targetSize
                        });
                    }
                    if (result && result.success) {
                        window.modalSystem.closeCurrent(true);
                        showMessage(result.message || window.__('msg_resize_settings_updated'), 'success');
                    } else {
                        showMessage(result?.message || window.__('err_occurred'), 'error');
                    }
                } catch (err) {
                    showMessage(window.__('general_save_network_error') || window.__('err_occurred'), 'error');
                } finally {
                    if (submitBtn) restoreButton(submitBtn);
                }
            }
        });
    }

    async openCardResetModal(btn) {
        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        if (!id) return;
        this.closeDropdowns();

        const card = document.querySelector(`[data-card-id="${id}"]`) || btn.closest('.component-card');
        const isOffline = card ? card.getAttribute('data-mode') === 'offline' : false;

        let resetActive = false;
        let nextResetAt = '';

        try {
            const res = await this.api.post(ApiRoutes.Canvases.GetResetSettings, { id: parseInt(id, 10) });
            if (res && res.success && res.data) {
                resetActive = !!res.data.is_active;
                nextResetAt = res.data.next_reset_at || '';
            }
        } catch (e) {
            // fallback
        }

        await window.modalSystem.show('offlineResetModal', {
            canvasId: id,
            canTakeSnapshot: true,
            isOfflineMode: isOffline,
            resetActive,
            nextResetAt,
            onConfirm: async (payload, submitBtn) => {
                if (submitBtn) setButtonLoading(submitBtn);
                try {
                    let result;
                    if (payload.mode === 'cancel_schedule') {
                        result = await this.api.post(ApiRoutes.Canvases.UpdateResetSettings, {
                            id: parseInt(id, 10),
                            is_active: false,
                            next_reset_at: null,
                            take_snapshot: false
                        });
                        if (result && result.success) {
                            window.modalSystem.closeCurrent(true);
                            showMessage(result.message || window.__('msg_scheduled_reset_cancelled'), 'success');
                            return;
                        }
                    } else if (payload.mode === 'instant') {
                        result = await this.api.post(ApiRoutes.Canvases.ResetNow, {
                            id: parseInt(id, 10),
                            take_snapshot: payload.takeSnapshot
                        });
                    } else {
                        result = await this.api.post(ApiRoutes.Canvases.UpdateResetSettings, {
                            id: parseInt(id, 10),
                            is_active: payload.isActive,
                            next_reset_at: payload.nextResetAt,
                            take_snapshot: payload.takeSnapshot
                        });
                    }
                    if (result && result.success) {
                        window.modalSystem.closeCurrent(true);
                        showMessage(result.message || window.__('msg_reset_settings_updated'), 'success');
                    } else {
                        showMessage(result?.message || window.__('err_occurred'), 'error');
                    }
                } catch (err) {
                    showMessage(window.__('general_save_network_error') || window.__('err_occurred'), 'error');
                } finally {
                    if (submitBtn) restoreButton(submitBtn);
                }
            }
        });
    }

    async syncLocalCanvasToCloud(btn) {
        if (btn.classList.contains('disabled-interaction') || btn.dataset.syncing === 'true') return;

        const uuid = btn.getAttribute('data-uuid') || btn.getAttribute('data-id');
        if (!uuid) return;

        if (!window.activeUserId) {
            showMessage(window.__('msg_sync_login_required') || 'Inicia sesión o crea una cuenta para sincronizar tus lienzos con la nube.', 'info');
            setTimeout(() => {
                if (window.spaRouter) {
                    window.spaRouter.navigate(`${this.basePath}/login`);
                } else {
                    window.location.href = `${this.basePath}/login`;
                }
            }, 1200);
            return;
        }

        btn.dataset.syncing = 'true';
        btn.classList.add('disabled-interaction');
        setButtonLoading(btn);

        try {
            const localMeta = await CanvasStorageEngine.getLocalCanvas(uuid);
            const localState = await CanvasStorageEngine.getCanvasState(uuid);
            const localLayers = await CanvasStorageEngine.getLayersData(uuid);

            if (!localMeta && !localState) {
                restoreButton(btn);
                btn.classList.remove('disabled-interaction');
                btn.dataset.syncing = 'false';
                showMessage('No se encontraron los datos locales del lienzo.', 'error');
                return;
            }

            const payload = {
                name: localMeta?.name || 'Canvas',
                size: localMeta?.size || '64x64',
                privacy: localMeta?.privacy || 'private',
                palette_id: localMeta?.palette_id || 'default',
                tags: localMeta?.tags || [],
                state_base64: localState?.base64 || '',
                layers_data: localLayers || null,
                local_uuid: uuid
            };

            const res = await this.api.post(ApiRoutes.Canvases.SyncLocal, payload, this.abortController?.signal);

            restoreButton(btn);
            btn.classList.remove('disabled-interaction');
            btn.dataset.syncing = 'false';

            if (res && res.success) {
                await CanvasStorageEngine.deleteLocalCanvas(uuid);

                showMessage(window.__('msg_canvas_synced_success') || '¡Lienzo sincronizado con la nube exitosamente!', 'success');

                if (window.location.pathname.includes(`/design/${uuid}`)) {
                    if (window.spaRouter) {
                        window.spaRouter.navigate(`${this.basePath}/design/${res.data.uuid}`);
                    } else {
                        window.location.href = `${this.basePath}/design/${res.data.uuid}`;
                    }
                    return;
                }

                const card = btn.closest('.component-gallery-card');
                if (card) {
                    const newCanvasObj = {
                        id: res.data.id,
                        uuid: res.data.uuid,
                        name: res.data.name,
                        size: res.data.size,
                        thumbnail_url: localMeta?.thumbnail_url || null,
                        mode: 'offline',
                        is_owner: true,
                        members_count: 1,
                        favorites_count: 0,
                        online_players: 0,
                        is_online_active: false
                    };
                    const newCardHtml = CardTemplates.canvasCard(newCanvasObj, { basePath: this.basePath });
                    card.outerHTML = newCardHtml;
                }
            } else {
                const errMsg = res?.message || window.__('err_occurred') || 'Error al sincronizar con la nube.';
                showMessage(errMsg, 'error');
            }
        } catch (err) {
            restoreButton(btn);
            btn.classList.remove('disabled-interaction');
            btn.dataset.syncing = 'false';
            showMessage('Error al procesar la sincronización local.', 'error');
        }
    }

    async deleteLocalCanvas(btn) {
        const uuid = btn.getAttribute('data-uuid') || btn.getAttribute('data-id');
        if (!uuid) return;

        const confirmMsg = window.__('confirm_delete_local_canvas') || '¿Estás seguro de que deseas eliminar este lienzo local de tu dispositivo?';
        if (!confirm(confirmMsg)) return;

        try {
            await CanvasStorageEngine.deleteLocalCanvas(uuid);
            showMessage(window.__('msg_local_canvas_deleted') || 'Lienzo local eliminado del dispositivo.', 'success');
            this.closeDropdowns();

            const card = btn.closest('.component-gallery-card');
            if (card) {
                card.remove();
            }
        } catch (err) {
            showMessage('Error al eliminar el lienzo local.', 'error');
        }
    }

    async exportLocalCanvasPng(btn) {
        const uuid = btn.getAttribute('data-uuid') || btn.getAttribute('data-id');
        if (!uuid) return;

        try {
            const localMeta = await CanvasStorageEngine.getLocalCanvas(uuid);
            const localState = await CanvasStorageEngine.getCanvasState(uuid);
            const sizeStr = localMeta?.size || '64x64';
            const parts = sizeStr.toLowerCase().split('x');
            const w = parseInt(parts[0], 10) || 64;
            const h = parseInt(parts[1] || parts[0], 10) || 64;

            if (localMeta?.thumbnail_url && localMeta.thumbnail_url.startsWith('data:image')) {
                const a = document.createElement('a');
                a.href = localMeta.thumbnail_url;
                a.download = `${(localMeta.name || 'canvas').replace(/\s+/g, '_')}.png`;
                a.click();
                return;
            }

            if (localState?.base64) {
                const binaryStr = atob(localState.base64);
                const bytes = new Uint8ClampedArray(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                const offscreen = document.createElement('canvas');
                offscreen.width = w;
                offscreen.height = h;
                const ctx = offscreen.getContext('2d');
                const imgData = ctx.createImageData(w, h);
                imgData.data.set(bytes.subarray(0, imgData.data.length));
                ctx.putImageData(imgData, 0, 0);

                const a = document.createElement('a');
                a.href = offscreen.toDataURL('image/png');
                a.download = `${(localMeta?.name || 'canvas').replace(/\s+/g, '_')}.png`;
                a.click();
            }
        } catch (e) {
            showMessage('Error al exportar PNG del lienzo.', 'error');
        }
    }
}