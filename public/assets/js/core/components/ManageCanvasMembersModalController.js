import { CanvasApiService } from '../api/CanvasApiService.js';
import { ApiService } from '../api/ApiService.js';
import { ApiRoutes } from '../api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton, escapeHTML } from '../utils/uiUtils.js';

export class ManageCanvasMembersModalController {
    constructor(modalBox, data = {}) {
        this.modalBox = modalBox;
        this.data = data;
        this.canvasUuid = data.canvasUuid || data.uuid || '';
        this.canvasId = data.canvasId || data.id || '';
        this.isOwner = !!data.isOwner;
        this.designNetwork = data.designNetwork || window.activeDesignNetwork || null;
        this.activeTab = data.initialTab || (this.designNetwork ? 'live' : 'members');
        
        this.selectedMemberIds = new Set();
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalMembers = 0;
        this.membersList = [];
        this.requestsList = [];
        this.liveSearchQuery = '';
        this.membersSearchQuery = '';

        this.api = new CanvasApiService();
        this.genericApi = new ApiService();

        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
        this.handleRoleUpdatedBound = this.handleRoleUpdated.bind(this);
        this.handlePresenceUpdateBound = this.handlePresenceUpdate.bind(this);
    }

    init() {
        if (!this.modalBox) return;

        this.modalBox.addEventListener('click', this.handleClickBound);
        this.modalBox.addEventListener('input', this.handleInputBound);
        window.addEventListener('canvasMemberRoleUpdated', this.handleRoleUpdatedBound);
        window.addEventListener('canvasPresenceUpdated', this.handlePresenceUpdateBound);

        // Preload data
        this.switchTab(this.activeTab);
        this.loadMembers(1);
        this.loadRequests();

        if (this.designNetwork) {
            this.renderLivePresence();
        }
    }

    destroy() {
        if (this.modalBox) {
            this.modalBox.removeEventListener('click', this.handleClickBound);
            this.modalBox.removeEventListener('input', this.handleInputBound);
        }
        window.removeEventListener('canvasMemberRoleUpdated', this.handleRoleUpdatedBound);
        window.removeEventListener('canvasPresenceUpdated', this.handlePresenceUpdateBound);
        this.selectedMemberIds.clear();
    }

    handlePresenceUpdate() {
        if (this.activeTab === 'live') {
            this.renderLivePresence();
        }
    }

    handleRoleUpdated() {
        this.loadMembers(this.currentPage);
    }

    handleClick(e) {
        // 1. Tab switching
        const tabBtn = e.target.closest('[data-action="switchMembersModalTab"]');
        if (tabBtn) {
            e.preventDefault();
            const tab = tabBtn.getAttribute('data-tab');
            if (tab) this.switchTab(tab);
            return;
        }

        // 2. Live Tab Actions
        const btnToggleAllCursors = e.target.closest('[data-action="modalToggleAllCursors"]');
        if (btnToggleAllCursors) {
            e.preventDefault();
            if (this.designNetwork && typeof this.designNetwork.toggleAllRemoteCursors === 'function') {
                this.designNetwork.toggleAllRemoteCursors();
                this.renderLivePresence();
            }
            return;
        }

        const btnSummonEveryone = e.target.closest('[data-action="modalSummonEveryone"]');
        if (btnSummonEveryone) {
            e.preventDefault();
            if (this.designNetwork && typeof this.designNetwork.summonEveryone === 'function') {
                this.designNetwork.summonEveryone();
            }
            return;
        }

        const btnTeleport = e.target.closest('[data-action="modalTeleportToUser"]');
        if (btnTeleport) {
            e.preventDefault();
            const userId = btnTeleport.getAttribute('data-user-id');
            if (this.designNetwork && typeof this.designNetwork.teleportToUser === 'function') {
                this.designNetwork.teleportToUser(userId);
            }
            return;
        }

        const btnToggleCursor = e.target.closest('[data-action="modalToggleUserCursor"]');
        if (btnToggleCursor) {
            e.preventDefault();
            const userId = btnToggleCursor.getAttribute('data-user-id');
            if (this.designNetwork && typeof this.designNetwork.toggleTrackUserCursor === 'function') {
                this.designNetwork.toggleTrackUserCursor(userId);
                this.renderLivePresence();
            }
            return;
        }

        // 3. Members Tab Actions
        const memberRow = e.target.closest('[data-action="selectModalMember"]');
        if (memberRow && !e.target.closest('button')) {
            this.handleMemberSelection(memberRow);
            return;
        }

        const btnChangeRoleSingle = e.target.closest('[data-action="modalChangeRoleSingle"]');
        if (btnChangeRoleSingle) {
            e.preventDefault();
            e.stopPropagation();
            const userUuid = btnChangeRoleSingle.getAttribute('data-member-uuid');
            const userId = btnChangeRoleSingle.getAttribute('data-member-id');
            this.changeMemberRole(userId, userUuid, btnChangeRoleSingle);
            return;
        }

        const btnRemoveMemberSingle = e.target.closest('[data-action="modalRemoveMemberSingle"]');
        if (btnRemoveMemberSingle) {
            e.preventDefault();
            e.stopPropagation();
            const userId = btnRemoveMemberSingle.getAttribute('data-member-id');
            this.removeMember([userId], btnRemoveMemberSingle);
            return;
        }

        const btnChangeRoleSelected = e.target.closest('[data-action="modalChangeMemberRole"]');
        if (btnChangeRoleSelected) {
            e.preventDefault();
            if (this.selectedMemberIds.size === 1) {
                const targetUserId = Array.from(this.selectedMemberIds)[0];
                const selectedRow = this.modalBox.querySelector(`[data-member-id="${targetUserId}"]`);
                const userUuid = selectedRow ? selectedRow.getAttribute('data-member-uuid') : null;
                this.changeMemberRole(targetUserId, userUuid, btnChangeRoleSelected);
            }
            return;
        }

        const btnRemoveSelected = e.target.closest('[data-action="modalRemoveMember"]');
        if (btnRemoveSelected) {
            e.preventDefault();
            if (this.selectedMemberIds.size > 0) {
                this.removeMember(Array.from(this.selectedMemberIds), btnRemoveSelected);
            }
            return;
        }

        const btnPrevPage = e.target.closest('[data-action="modalMembersPrevPage"]');
        if (btnPrevPage && this.currentPage > 1) {
            e.preventDefault();
            this.loadMembers(this.currentPage - 1);
            return;
        }

        const btnNextPage = e.target.closest('[data-action="modalMembersNextPage"]');
        if (btnNextPage && this.currentPage < this.totalPages) {
            e.preventDefault();
            this.loadMembers(this.currentPage + 1);
            return;
        }

        // 4. Requests Tab Actions
        const btnApproveReq = e.target.closest('[data-action="modalApproveRequest"]');
        if (btnApproveReq) {
            e.preventDefault();
            const reqId = btnApproveReq.getAttribute('data-request-id');
            this.processRequest('approve', reqId, btnApproveReq);
            return;
        }

        const btnRejectReq = e.target.closest('[data-action="modalRejectRequest"]');
        if (btnRejectReq) {
            e.preventDefault();
            const reqId = btnRejectReq.getAttribute('data-request-id');
            this.processRequest('reject', reqId, btnRejectReq);
            return;
        }
    }

    handleInput(e) {
        if (e.target && e.target.getAttribute('data-action') === 'filterModalLiveMembers') {
            this.liveSearchQuery = (e.target.value || '').toLowerCase().trim();
            this.renderLivePresence();
            return;
        }

        if (e.target && e.target.getAttribute('data-ref') === 'modal-all-members-search') {
            this.membersSearchQuery = (e.target.value || '').toLowerCase().trim();
            this.filterMembersTable();
            return;
        }
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        const tabsContainer = this.modalBox.querySelector('[data-ref="canvas-members-modal-tabs"]');
        if (tabsContainer) {
            const btns = tabsContainer.querySelectorAll('[data-action="switchMembersModalTab"]');
            btns.forEach(btn => {
                if (btn.getAttribute('data-tab') === tabName) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        const tabContents = this.modalBox.querySelectorAll('.component-modal-tab-content');
        tabContents.forEach(tc => {
            if (tc.getAttribute('data-ref') === `tab-content-${tabName}`) {
                tc.classList.remove('disabled');
                tc.classList.add('active');
            } else {
                tc.classList.remove('active');
                tc.classList.add('disabled');
            }
        });

        if (tabName === 'live') {
            this.renderLivePresence();
        } else if (tabName === 'members') {
            this.renderMembersTable();
        } else if (tabName === 'requests') {
            this.renderRequestsTable();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // LIVE PRESENCE TAB
    // ─────────────────────────────────────────────────────────────
    renderLivePresence() {
        const container = this.modalBox.querySelector('[data-ref="modal-live-members-scroll"]');
        const quotaVal = this.modalBox.querySelector('[data-ref="modal-cursor-quota-val"]');
        const quotaBox = this.modalBox.querySelector('[data-ref="modal-cursor-quota-box"]');
        const countBadge = this.modalBox.querySelector('[data-ref="modal-live-count-badge"]');
        const btnToggleAll = this.modalBox.querySelector('[data-ref="modal-btn-toggle-all-cursors"]');

        if (!this.designNetwork || !this.designNetwork.onlineMembers) {
            if (container) {
                container.innerHTML = `
                    <div style="padding: 32px 16px; text-align: center; color: var(--text-muted, rgba(255, 255, 255, 0.5));">
                        <span class="material-symbols-rounded" style="font-size: 36px; opacity: 0.5; margin-bottom: 8px;">sensors_off</span>
                        <div style="font-size: 0.9rem; font-weight: 500;">Modo en vivo inactivo</div>
                        <div style="font-size: 0.75rem; margin-top: 4px; opacity: 0.8;">Abre este lienzo en vivo para ver a los colaboradores conectados y sus cursores en tiempo real.</div>
                    </div>
                `;
            }
            if (countBadge) countBadge.textContent = '0';
            if (quotaVal) quotaVal.textContent = '0 / 24';
            return;
        }

        const onlineMembers = this.designNetwork.onlineMembers;
        const trackedCursors = this.designNetwork.trackedCursorUserIds || new Set();
        const maxCursors = this.designNetwork.maxTrackedCursors || 24;
        const activeTrackedCount = trackedCursors.size;
        const totalOnline = onlineMembers.size;

        if (countBadge) countBadge.textContent = `${totalOnline}`;
        if (quotaVal) quotaVal.textContent = `${activeTrackedCount} / ${maxCursors}`;
        if (quotaBox) {
            if (activeTrackedCount >= maxCursors) quotaBox.classList.add('full');
            else quotaBox.classList.remove('full');
        }

        if (btnToggleAll) {
            const areHidden = this.designNetwork.areAllCursorsHidden || activeTrackedCount === 0;
            btnToggleAll.innerHTML = areHidden
                ? '<span class="material-symbols-rounded msr-visibility">visibility</span><span>Mostrar Todos</span>'
                : '<span class="material-symbols-rounded msr-visibility_off">visibility_off</span><span>Ocultar Todos</span>';
        }

        if (!container) return;

        const myUid = String(window.activeUserId || document.querySelector('meta[name="user-id"]')?.content || 'usr_local');
        const query = this.liveSearchQuery || '';

        let html = '';

        for (const [uid, member] of onlineMembers.entries()) {
            const name = member.username || `Usuario_${uid.slice(-4)}`;
            if (query && !name.toLowerCase().includes(query)) continue;

            const isSelf = member.isSelf || uid === myUid;
            const isWatching = trackedCursors.has(uid);
            const isDrawing = !!member.isDrawing;
            const userColor = member.color || '#3b82f6';
            const initial = (name.charAt(0) || 'U').toUpperCase();
            const isOwner = member.role === 'owner' || (this.data.canvasOwnerId && String(this.data.canvasOwnerId) === String(uid));

            const statusClass = isDrawing ? 'drawing' : (member.status === 'idle' ? 'idle' : 'online');
            const statusLabel = isDrawing ? '✏️ Dibujando...' : (isOwner ? '👑 Dueño' : 'En línea');

            html += `
            <div class="component-member-item ${isWatching ? 'is-watching' : ''} ${isOwner ? 'is-owner' : ''}" data-user-id="${escapeHTML(uid)}" style="--user-color: ${userColor}; display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; margin-bottom: 6px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="component-member-item__avatar" style="position: relative; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: ${userColor}; color: #fff; font-weight: bold; font-size: 13px;">
                        ${member.avatar ? `<img src="${escapeHTML(member.avatar)}" alt="${escapeHTML(name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.remove()">` : ''}
                        <span class="component-member-item__initial">${initial}</span>
                        <span class="component-live-status-dot ${statusClass}" title="${statusLabel}" style="position: absolute; bottom: -1px; right: -1px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--bg-surface);"></span>
                    </div>
                    <div class="component-member-item__info">
                        <div class="component-member-item__name-row" style="display: flex; align-items: center; gap: 6px;">
                            <span class="component-member-item__name" style="font-size: 0.85rem; font-weight: 600;">${escapeHTML(name)} ${isSelf ? '(Tú)' : ''}</span>
                            ${isOwner ? '<span class="component-badge component-badge--sm" style="font-size: 0.65rem; padding: 2px 6px;">👑 Dueño</span>' : ''}
                        </div>
                        <span class="component-member-item__status-text ${isDrawing ? 'drawing' : ''}" style="font-size: 0.72rem; color: var(--text-muted);">${statusLabel}</span>
                    </div>
                </div>
                <div class="component-member-item__actions" style="display: flex; gap: 6px;">
                    ${!isSelf ? `
                    <button type="button" class="component-button component-button--icon component-button--h28" data-action="modalTeleportToUser" data-user-id="${escapeHTML(uid)}" data-tooltip="Centrar lienzo en su posición" data-position="top">
                        <span class="material-symbols-rounded msr-my_location">my_location</span>
                    </button>
                    <button type="button" class="component-button component-button--icon component-button--h28 ${isWatching ? 'active' : ''}" data-action="modalToggleUserCursor" data-user-id="${escapeHTML(uid)}" data-tooltip="${isWatching ? 'Ocultar cursor' : 'Ver cursor en vivo'}" data-position="top">
                        <span class="material-symbols-rounded msr-${isWatching ? 'near_me' : 'near_me_disabled'}">${isWatching ? 'near_me' : 'near_me_disabled'}</span>
                    </button>
                    ` : ''}
                </div>
            </div>`;
        }

        if (!html) {
            html = `<div style="padding: 24px 8px; text-align: center; font-size: 0.75rem; color: var(--text-muted);">No se encontraron miembros activos.</div>`;
        }

        container.innerHTML = html;
    }

    // ─────────────────────────────────────────────────────────────
    // ALL MEMBERS TAB
    // ─────────────────────────────────────────────────────────────
    async loadMembers(page = 1) {
        const tbody = this.modalBox.querySelector('[data-ref="modal-members-table-body"]');
        if (tbody) {
            tbody.innerHTML = this.getSkeletonHTML();
        }

        try {
            const canvasTarget = this.canvasUuid || this.canvasId;
            const res = await this.api.getMembers(canvasTarget, page);
            if (res && res.success && res.data) {
                this.membersData = res.data;
                this.membersList = res.data.members || [];
                this.currentPage = res.data.page || 1;
                this.totalPages = res.data.totalPages || 1;
                this.totalMembers = res.data.totalMembers || this.membersList.length;
                this.canvasId = res.data.canvasId || this.canvasId;
                this.canvasUuid = res.data.canvasUuid || this.canvasUuid;

                const countBadge = this.modalBox.querySelector('[data-ref="modal-members-count-badge"]');
                if (countBadge) countBadge.textContent = `${this.totalMembers}`;

                this.renderMembersTable();
                this.renderMembersPagination();
            } else {
                if (tbody) {
                    tbody.innerHTML = `<tr><td colspan="4" class="component-empty-table-cell" style="text-align: center; padding: 24px;">${res?.message || 'Error al cargar miembros.'}</td></tr>`;
                }
            }
        } catch (err) {
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="4" class="component-empty-table-cell" style="text-align: center; padding: 24px;">Error de conexión.</td></tr>`;
            }
        }
    }

    renderMembersTable() {
        const tbody = this.modalBox.querySelector('[data-ref="modal-members-table-body"]');
        if (!tbody || !this.membersData) return;

        const members = this.membersData.members || [];
        const userDetails = this.membersData.userDetails || {};
        const memberRoles = this.membersData.memberRoles || {};
        const canvasOwnerId = this.membersData.canvasOwnerId;
        const appUrl = window.AppBasePath || '';

        if (members.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="component-empty-table-cell" style="text-align: center; padding: 32px 16px; color: var(--text-muted);">
                        <span class="material-symbols-rounded" style="font-size: 32px; opacity: 0.5;">group_off</span>
                        <div style="font-size: 0.85rem; margin-top: 6px;">No hay miembros registrados en este lienzo.</div>
                    </td>
                </tr>
            `;
            return;
        }

        const query = this.membersSearchQuery || '';
        let html = '';

        members.forEach(member => {
            const uInfo = userDetails[member.user_id] || {};
            const username = uInfo.username || `Usuario #${member.user_id}`;
            const avatar = uInfo.profile_picture || `${appUrl}/public/avatar/Um9zYXVyYVVzZXI6VQ`;
            const userUuidStr = uInfo.uuid || '';
            const subColor = uInfo.sub_bg || 'var(--text-muted)';
            const isCanvasOwner = member.user_id == canvasOwnerId;

            // Search filter
            if (query && !username.toLowerCase().includes(query)) return;

            const isSelected = this.selectedMemberIds.has(String(member.user_id));
            const mRoles = memberRoles[member.user_id] || [];

            let rolesHtml = '';
            if (mRoles.length === 0) {
                rolesHtml = `
                    <div class="component-badge component-badge--sm" style="font-size: 0.72rem;">
                        <span class="material-symbols-rounded" style="font-size: 14px;">person_off</span>
                        <span>Sin rol</span>
                    </div>
                `;
            } else {
                const primaryRole = mRoles[0];
                let icon = 'person';
                if (primaryRole.is_system) {
                    if (primaryRole.name === 'SuperAdministrator' || primaryRole.name === 'Administrator') icon = 'shield_person';
                    else if (primaryRole.name === 'Moderator') icon = 'local_police';
                } else {
                    icon = 'star';
                }
                const roleName = primaryRole.name;

                rolesHtml = `
                    <div style="display: inline-flex; align-items: center; gap: 4px;">
                        <div class="component-badge component-badge--sm" style="font-size: 0.72rem;">
                            <span class="material-symbols-rounded" style="font-size: 14px;">${icon}</span>
                            <span>${escapeHTML(roleName)}</span>
                        </div>
                        ${mRoles.length > 1 ? `<span class="component-badge component-badge--sm" style="font-size: 0.68rem;">+${mRoles.length - 1}</span>` : ''}
                    </div>
                `;
            }

            const joinedDate = member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '-';

            html += `
                <tr class="component-table-row ${isSelected ? 'selected' : ''}" data-action="selectModalMember" data-member-id="${escapeHTML(member.user_id)}" data-member-uuid="${escapeHTML(userUuidStr)}" style="cursor: pointer;">
                    <td>
                        <div class="td-user-info" style="display: flex; align-items: center; gap: 8px;">
                            <div class="component-avatar--static-sm" style="width: 28px; height: 28px; border-radius: 50%; overflow: hidden; border: 1.5px solid ${subColor}; flex-shrink: 0;">
                                <img src="${escapeHTML(avatar)}" alt="${escapeHTML(username)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='${appUrl}/public/avatar/Um9zYXVyYVVzZXI6VQ';">
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span class="search-target" style="font-size: 0.82rem; font-weight: 500;">${escapeHTML(username)}</span>
                                ${isCanvasOwner ? '<span class="material-symbols-rounded" style="font-size: 14px; color: #f59e0b;" title="Creador del lienzo">star</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td>${rolesHtml}</td>
                    <td><span style="font-size: 0.75rem; color: var(--text-muted);">${joinedDate}</span></td>
                    <td style="text-align: right;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                            ${!isCanvasOwner ? `
                            <button type="button" class="component-button component-button--icon component-button--h28" data-action="modalChangeRoleSingle" data-member-id="${escapeHTML(member.user_id)}" data-member-uuid="${escapeHTML(userUuidStr)}" data-tooltip="Cambiar Rol">
                                <span class="material-symbols-rounded msr-manage_accounts">manage_accounts</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h28 component-button--danger" data-action="modalRemoveMemberSingle" data-member-id="${escapeHTML(member.user_id)}" data-tooltip="Expulsar">
                                <span class="material-symbols-rounded msr-person_remove">person_remove</span>
                            </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });

        if (!html) {
            html = `<tr><td colspan="4" class="component-empty-table-cell" style="text-align: center; padding: 24px; color: var(--text-muted);">No se encontraron miembros coincidentes.</td></tr>`;
        }

        tbody.innerHTML = html;
        this.updateSelectionUI();
    }

    renderMembersPagination() {
        const pagContainer = this.modalBox.querySelector('[data-ref="modal-members-pagination"]');
        if (!pagContainer) return;

        if (this.totalPages <= 1) {
            pagContainer.innerHTML = '';
            return;
        }

        pagContainer.innerHTML = `
            <button type="button" class="component-button component-button--icon component-button--h28 ${this.currentPage <= 1 ? 'disabled-interaction' : ''}" data-action="modalMembersPrevPage" data-tooltip="Página anterior">
                <span class="material-symbols-rounded">chevron_left</span>
            </button>
            <span style="font-size: 0.75rem; font-weight: 500; color: var(--text-muted);">${this.currentPage} / ${this.totalPages}</span>
            <button type="button" class="component-button component-button--icon component-button--h28 ${this.currentPage >= this.totalPages ? 'disabled-interaction' : ''}" data-action="modalMembersNextPage" data-tooltip="Página siguiente">
                <span class="material-symbols-rounded">chevron_right</span>
            </button>
        `;
    }

    filterMembersTable() {
        this.renderMembersTable();
    }

    handleMemberSelection(rowElement) {
        const memberId = rowElement.getAttribute('data-member-id');
        if (!memberId) return;

        if (this.selectedMemberIds.has(memberId)) {
            this.selectedMemberIds.delete(memberId);
            rowElement.classList.remove('selected');
        } else {
            this.selectedMemberIds.add(memberId);
            rowElement.classList.add('selected');
        }

        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const selectionActions = this.modalBox.querySelector('[data-ref="modal-member-selection-actions"]');
        const btnChangeRole = this.modalBox.querySelector('[data-action="modalChangeMemberRole"]');
        const btnRemove = this.modalBox.querySelector('[data-action="modalRemoveMember"]');

        if (!selectionActions) return;

        if (this.selectedMemberIds.size > 0) {
            selectionActions.classList.remove('disabled');
            if (this.selectedMemberIds.size > 1) {
                if (btnChangeRole) btnChangeRole.classList.add('disabled-interaction');
                if (btnRemove) btnRemove.classList.remove('disabled-interaction');
            } else {
                if (btnChangeRole) btnChangeRole.classList.remove('disabled-interaction');
                if (btnRemove) btnRemove.classList.remove('disabled-interaction');
            }
        } else {
            selectionActions.classList.add('disabled');
        }
    }

    async changeMemberRole(userId, userUuid, btn) {
        if (!userUuid) {
            showMessage('Falta el identificador del usuario.', 'error');
            return;
        }

        if (btn) setButtonLoading(btn);
        try {
            const res = await this.genericApi.post(ApiRoutes.Canvases.GetMemberRoleData, {
                canvas_uuid: this.canvasUuid,
                target_user_uuid: userUuid
            });
            if (btn) restoreButton(btn);

            if (res && res.success && res.data) {
                await window.modalSystem.show('changeCanvasRoleModal', res.data);
            } else {
                showMessage(res?.message || 'Error al obtener roles.', 'error');
            }
        } catch (err) {
            if (btn) restoreButton(btn);
            showMessage('Error al conectar para cambiar roles.', 'error');
        }
    }

    async removeMember(userIds = [], btn) {
        if (!userIds || userIds.length === 0) return;

        const resultDialog = await window.modalSystem.show('confirmRemoveMembers', { count: userIds.length });
        if (!resultDialog || !resultDialog.confirmed) return;

        if (btn) setButtonLoading(btn);

        let successCount = 0;
        let failCount = 0;

        for (const uid of userIds) {
            try {
                const res = await this.api.removeMember(this.canvasId, uid);
                if (res && res.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                failCount++;
            }
        }

        if (btn) restoreButton(btn);

        if (successCount > 0) {
            showMessage(`Se expulsaron ${successCount} miembro(s) con éxito.`, 'success');
            this.selectedMemberIds.clear();
            this.loadMembers(this.currentPage);
            if (this.designNetwork) {
                this.renderLivePresence();
            }
        }
        if (failCount > 0) {
            showMessage(`Hubo un error al expulsar ${failCount} miembro(s).`, 'warning');
        }
    }

    // ─────────────────────────────────────────────────────────────
    // REQUESTS TAB
    // ─────────────────────────────────────────────────────────────
    async loadRequests() {
        const tbody = this.modalBox.querySelector('[data-ref="modal-requests-table-body"]');
        if (tbody) {
            tbody.innerHTML = this.getSkeletonHTML();
        }

        try {
            const res = await this.api.getPendingRequests(this.canvasId || this.canvasUuid);
            if (res && res.success && res.data) {
                this.requestsList = res.data;
                const countBadge = this.modalBox.querySelector('[data-ref="modal-requests-count-badge"]');
                if (countBadge) countBadge.textContent = `${this.requestsList.length}`;
                this.renderRequestsTable();
            } else {
                if (tbody) {
                    tbody.innerHTML = `<tr><td colspan="3" class="component-empty-table-cell" style="text-align: center; padding: 24px;">${res?.message || 'Error al cargar solicitudes.'}</td></tr>`;
                }
            }
        } catch (err) {
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="3" class="component-empty-table-cell" style="text-align: center; padding: 24px;">Error de conexión.</td></tr>`;
            }
        }
    }

    renderRequestsTable() {
        const tbody = this.modalBox.querySelector('[data-ref="modal-requests-table-body"]');
        if (!tbody) return;

        if (!this.requestsList || this.requestsList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="component-empty-table-cell" style="text-align: center; padding: 32px 16px; color: var(--text-muted);">
                        <span class="material-symbols-rounded" style="font-size: 32px; opacity: 0.5;">front_hand</span>
                        <div style="font-size: 0.85rem; margin-top: 6px;">No hay solicitudes pendientes en este momento.</div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        this.requestsList.forEach(req => {
            const reqDate = req.created_at ? new Date(req.created_at).toLocaleDateString() : '-';
            const username = req.username || `Usuario #${req.user_id}`;

            html += `
                <tr class="component-table-row" data-request-id="${escapeHTML(req.id)}">
                    <td>
                        <div class="td-user-info" style="display: flex; align-items: center; gap: 8px;">
                            <div class="component-badge component-badge--sm" style="font-size: 0.8rem;">
                                <span class="material-symbols-rounded" style="font-size: 14px;">person</span>
                                <span>${escapeHTML(username)}</span>
                            </div>
                        </div>
                    </td>
                    <td><span style="font-size: 0.75rem; color: var(--text-muted);">${reqDate}</span></td>
                    <td style="text-align: right;">
                        <div style="display: flex; gap: 6px; justify-content: flex-end;">
                            <button type="button" class="component-button component-button--icon component-button--h28 component-button--success" data-action="modalApproveRequest" data-request-id="${escapeHTML(req.id)}" data-tooltip="Aprobar acceso">
                                <span class="material-symbols-rounded msr-check">check</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h28 component-button--danger" data-action="modalRejectRequest" data-request-id="${escapeHTML(req.id)}" data-tooltip="Rechazar">
                                <span class="material-symbols-rounded msr-close">close</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    async processRequest(type, requestId, btn) {
        if (!requestId) return;

        if (btn) setButtonLoading(btn);

        try {
            let res;
            if (type === 'approve') {
                res = await this.api.approveCanvasRequest(requestId);
            } else {
                res = await this.api.rejectCanvasRequest(requestId);
            }

            if (btn) restoreButton(btn);

            if (res && res.success) {
                const actionMsg = type === 'approve' ? 'Solicitud aprobada con éxito.' : 'Solicitud rechazada.';
                showMessage(res.message || actionMsg, 'success');
                this.loadRequests();
                if (type === 'approve') {
                    this.loadMembers(this.currentPage);
                }
            } else {
                showMessage(res?.message || 'Error al procesar la solicitud.', 'error');
            }
        } catch (err) {
            if (btn) restoreButton(btn);
            showMessage('Error al procesar la solicitud.', 'error');
        }
    }

    getSkeletonHTML() {
        return `
            <tr>
                <td><div class="component-skeleton component-skeleton--text-short" style="height: 16px; border-radius: 4px;"></div></td>
                <td><div class="component-skeleton component-skeleton--text-short" style="height: 16px; border-radius: 4px;"></div></td>
                <td><div class="component-skeleton component-skeleton--text-short" style="height: 16px; border-radius: 4px;"></div></td>
                <td></td>
            </tr>
            <tr>
                <td><div class="component-skeleton component-skeleton--text-short" style="height: 16px; border-radius: 4px;"></div></td>
                <td><div class="component-skeleton component-skeleton--text-short" style="height: 16px; border-radius: 4px;"></div></td>
                <td><div class="component-skeleton component-skeleton--text-short" style="height: 16px; border-radius: 4px;"></div></td>
                <td></td>
            </tr>
        `;
    }
}
