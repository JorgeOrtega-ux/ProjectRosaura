import { ApiRoutes } from '../api/ApiRoutes.js';
import { showMessage, renderSkeleton } from '../utils/uiUtils.js';
import { CanvasApiService } from '../api/CanvasApiService.js';

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
        if (btn.classList.contains('disabled-interaction')) return;
        const canvasId = btn.getAttribute('data-id');
        if (!canvasId) return;

        btn.classList.add('disabled-interaction');
        if (typeof setButtonLoading === 'function') setButtonLoading(btn);

        try {
            const route = (ApiRoutes.Canvases && ApiRoutes.Canvases.CreateSnapshot) ? ApiRoutes.Canvases.CreateSnapshot : 'canvases.create_snapshot';
            const result = await this.api.post(route, { id: parseInt(canvasId, 10) }, this.abortController ? this.abortController.signal : null);

            if (result.aborted) return;

            if (result.success) {
                showMessage(result.message, 'success');
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            if (error && error.name === 'AbortError') return;
            showMessage(window.__('general_save_network_error'), 'error');
        } finally {
            btn.classList.remove('disabled-interaction');
            if (typeof restoreButton === 'function') restoreButton(btn);
            this.closeDropdowns();
        }
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
            if (!password) {
                showMessage(window.__('err_password_required'), 'error');
                return;
            }

            const payload = {
                canvas_ids: [id],
                password: password
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
            if (card) card.remove();
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
            
            const triggerBtn = document.querySelector(`button[data-action="toggleDynamicMenu"][data-id="${id}"]`);
            if (triggerBtn) {
                triggerBtn.setAttribute('data-member', '1');
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
            if (!password) {
                if (typeof showMessage === 'function') showMessage(window.__('err_password_required'), 'error');
                return;
            }

            const res = await this.api.post(ApiRoutes.Canvases.Downgrade, { uuid: uuid, password: password }, this.abortController.signal);
            
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
        document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
            el.classList.remove('active');
            el.classList.add('disabled');
            // Remove dynamic card menus from DOM
            if (el.closest('.component-dropdown-wrapper')) {
                setTimeout(() => el.remove(), 250); // Le damos tiempo a la animación de cierre
            }
        });
    }

    toggleDynamicMenu(btn) {
        const wrapper = btn.closest('.component-dropdown-wrapper');
        if (!wrapper) return;
        
        let moduleEl = wrapper.querySelector('.component-module');
        
        if (moduleEl) {
            if (moduleEl.classList.contains('active')) {
                moduleEl.classList.remove('active');
                moduleEl.classList.add('disabled');
                setTimeout(() => moduleEl.remove(), 250);
            } else {
                this.closeDropdowns();
                moduleEl.classList.remove('disabled');
                moduleEl.classList.add('active');
            }
            return;
        }

        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        const isOwner = btn.getAttribute('data-owner') === '1';
        const isLocked = btn.getAttribute('data-locked') === '1';
        const isMember = btn.getAttribute('data-member') === '1';

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
            manageSubmenuHtml = `
                <div class="component-menu-page" data-menu-page="manage">
                    <div class="component-menu-list">
                        <button type="button" class="component-menu-link" data-action="menuGoBack">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">arrow_back</span></div>
                            <div class="component-menu-link-text"><span>Volver</span></div>
                        </button>
                        <div class="component-menu-divider"></div>
                        <button type="button" class="component-menu-link" data-nav="${this.basePath}/canvases/edit/${uuid}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">edit</span></div>
                            <div class="component-menu-link-text"><span>${window.__('tooltip_edit_canvas')}</span></div>
                        </button>
                        <button type="button" class="component-menu-link" data-nav="${this.basePath}/canvases/manage/resize/${uuid}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">expand</span></div>
                            <div class="component-menu-link-text"><span>${window.__('tooltip_resize_canvas')}</span></div>
                        </button>
                        <button type="button" class="component-menu-link" data-nav="${this.basePath}/canvases/manage/resets/${uuid}">
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
                        <button type="button" class="component-menu-link" data-nav="${this.basePath}/canvases/manage/roles/${uuid}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">shield_person</span></div>
                            <div class="component-menu-link-text"><span>${window.__('tooltip_manage_roles')}</span></div>
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
            <div class="component-module component-module--dropdown component-module--dropdown-left component-module--dropdown-fixed active" data-module="snapshot-menu-${id}">
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

                            ${warningMenuOption}

                            ${isOwner ? `
                            <div class="component-menu-divider"></div>
                            <button type="button" class="component-menu-link" data-action="menuGoToPage" data-target-page="manage">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">settings</span></div>
                                <div class="component-menu-link-text"><span>Gestionar lienzo</span></div>
                                <div class="component-menu-link-arrow"><span class="material-symbols-rounded">chevron_right</span></div>
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
        
        // Let the global app re-init events for this new module if necessary, or just rely on global delegation
        if (window.app && typeof window.app.initModules === 'function') {
            window.app.initModules(wrapper);
        } else if (window.uiUtils && typeof window.uiUtils.initDropdowns === 'function') {
            window.uiUtils.initDropdowns(wrapper);
        }
        
        if (window.router && typeof window.router.bindLinks === 'function') {
            window.router.bindLinks(wrapper);
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
}