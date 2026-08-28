import { CanvasApiService } from '../api/CanvasApiService.js';
import { ApiService } from '../api/ApiService.js';
import { ApiRoutes } from '../api/ApiRoutes.js';
import { CardTemplates } from './CardTemplates.js';
import { CalendarSystem } from './CalendarSystem.js';
import { AvatarUtils } from '../utils/AvatarUtils.js';
import {
    showMessage,
    setButtonLoading,
    restoreButton,
    escapeHTML,
    getDynamicTierName,
    parseUtcToLocalDate,
    formatLocalDateTimeToInput,
    localInputFormatToUtcString,
    getScheduledTimeDetails,
    getAllPalettes,
    closeDropdown
} from '../utils/uiUtils.js';

export class CanvasSettingsModalController {
    constructor(modalBox, data = {}) {
        this.modalBox = modalBox;
        this.data = data;
        this.canvasUuid = data.canvasUuid || data.uuid || '';
        this.canvasId = data.canvasId || data.id || '';
        this.canvasTitle = data.title || '';
        this.isOwner = !!data.isOwner;
        this.permissions = Array.isArray(data.permissions) ? data.permissions : [];
        const hasPerm = (p) => this.isOwner || this.permissions.includes(p);
        this.canManageSettings = this.isOwner || hasPerm('manage_settings');
        this.canManageResets = this.isOwner || hasPerm('manage_resets') || hasPerm('manage_settings');
        this.canManageMembers = this.isOwner || hasPerm('manage_members');
        this.canManageInvites = this.isOwner || hasPerm('manage_invites') || hasPerm('manage_members');
        this.canManageRoles = this.isOwner || hasPerm('manage_roles');
        this.canAssignRoles = this.isOwner || hasPerm('assign_roles') || hasPerm('manage_roles');
        this.canManageSanctions = this.isOwner || hasPerm('manage_sanctions') || hasPerm('manage_members') || hasPerm('manage_settings');

        this.isOffline = data.isOfflineMode !== false && (data.isOffline || false);
        this.currentSize = data.currentSize || '64x64';
        this.userTier = parseInt(data.userTier ?? (window.APP_USER?.subscription_tier ?? 0), 10);
        this.designNetwork = data.designNetwork || window.activeDesignNetwork || null;
        
        let initialTab = data.initialTab || (this.canManageSettings ? 'edit' : (this.canManageMembers ? 'members' : (this.canManageSanctions ? 'sanctions' : 'live')));
        if ((initialTab === 'edit' || initialTab === 'general' || initialTab === 'resize') && !this.canManageSettings) {
            initialTab = this.canManageMembers ? 'members' : (this.canManageSanctions ? 'sanctions' : 'live');
        } else if (initialTab === 'reset' && !this.canManageResets) {
            initialTab = this.canManageMembers ? 'members' : (this.canManageSanctions ? 'sanctions' : 'live');
        } else if ((initialTab === 'members' || initialTab === 'requests') && !this.canManageMembers) {
            initialTab = this.canManageSanctions ? 'sanctions' : 'live';
        } else if (initialTab === 'invites' && !this.canManageInvites) {
            initialTab = this.canManageMembers ? 'members' : 'live';
        } else if (initialTab === 'roles' && !this.canManageRoles) {
            initialTab = this.canManageMembers ? 'members' : 'live';
        } else if (initialTab === 'sanctions' && !this.canManageSanctions) {
            initialTab = this.canManageMembers ? 'members' : 'live';
        } else if ((initialTab === 'danger' || initialTab === 'critical') && !this.isOwner) {
            initialTab = this.canManageMembers ? 'members' : 'live';
        }
        this.activeTab = initialTab;

        // Edit Canvas State
        this.editState = {
            name: this.canvasTitle || '',
            privacy: data.privacy || 'private',
            requires_approval: !!data.requires_approval,
            palette_id: data.palette_id || 'default',
            max_members: data.max_members || 10,
            cooldown_pixels_batch: data.cooldown_pixels_batch || 5,
            cooldown_seconds: data.cooldown_seconds || 10,
            allow_chat: data.allow_chat ? 1 : 0,
            tags: Array.isArray(data.tags) ? [...data.tags] : [],
            isLoaded: false
        };

        // Subview / Step States
        this.rolesSubView = 'list'; // 'list' | 'builder' | 'permissions'
        this.resizeStep = 'step-1'; // 'step-1' | 'step-calendar' | 'step-time' | 'step-2'
        this.resetStep = 'step-1'; // 'step-1' | 'step-calendar' | 'step-time' | 'step-2'

        // Members & Requests State
        this.selectedMemberIds = new Set();
        this.selectedRequestIds = new Set();
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalMembers = 0;
        this.membersList = [];
        this.requestsList = [];
        this.liveSearchQuery = '';
        this.membersSearchQuery = '';
        this.requestsSearchQuery = '';

        // Invites State
        this.invitesList = [];
        this.selectedInviteIds = new Set();
        this.invitesSearchQuery = '';

        // Roles & Permissions State
        this.rolesData = null;
        this.selectedRoleIds = new Set();
        this.rolesSearchQuery = '';
        this.editingRole = null;
        this.allPermissions = [];
        this.activeRolePermissions = [];

        // Sanctions State
        this.sanctionsData = null;
        this.selectedSanctionUserIds = new Set();
        this.sanctionsSearchQuery = '';
        this.sanctionsPage = 1;

        // Resize State
        this.selectedResizeSize = this.currentSize;
        this.resizeType = 'instant'; // 'instant' | 'scheduled'
        this.resizeActive = !!data.resizeActive;
        this.nextResizeAt = data.nextResizeAt || '';
        this.resizeTargetSize = data.resizeTargetSize || this.currentSize;

        // Reset State
        this.resetType = 'instant'; // 'instant' | 'scheduled'
        this.resetTakeSnapshot = true;
        this.resetActive = !!data.resetActive;
        this.nextResetAt = data.nextResetAt || '';

        this.calendarSystem = null;

        this.api = new CanvasApiService();
        this.genericApi = new ApiService();

        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
        this.handleRoleUpdatedBound = this.handleRoleUpdated.bind(this);
        this.handlePresenceUpdateBound = this.handlePresenceUpdate.bind(this);
        this.handlePaletteCreatedBound = this.handlePaletteCreated.bind(this);
    }

    init() {
        if (!this.modalBox) return;

        this.modalBox.addEventListener('click', this.handleClickBound);
        this.modalBox.addEventListener('input', this.handleInputBound);
        this.modalBox.addEventListener('change', this.handleChangeBound);
        window.addEventListener('canvasMemberRoleUpdated', this.handleRoleUpdatedBound);
        window.addEventListener('canvasPresenceUpdated', this.handlePresenceUpdateBound);
        window.addEventListener('customPaletteCreated', this.handlePaletteCreatedBound);

        // Preload data based on permissions
        this.switchTab(this.activeTab);
        if (this.canManageSettings) this.loadEditData();
        if (this.canManageMembers) {
            this.loadMembers(1);
            this.loadRequests();
        }
        if (this.canManageSettings) this.loadResizeSettings();
        if (this.canManageResets) this.loadResetSettings();

        if (this.designNetwork) {
            this.renderLivePresence();
        }
    }

    destroy() {
        if (this.modalBox) {
            this.modalBox.removeEventListener('click', this.handleClickBound);
            this.modalBox.removeEventListener('input', this.handleInputBound);
            this.modalBox.removeEventListener('change', this.handleChangeBound);
        }
        window.removeEventListener('canvasMemberRoleUpdated', this.handleRoleUpdatedBound);
        window.removeEventListener('canvasPresenceUpdated', this.handlePresenceUpdateBound);
        window.removeEventListener('customPaletteCreated', this.handlePaletteCreatedBound);
        this.selectedMemberIds.clear();
        this.selectedRequestIds.clear();
        this.selectedInviteIds.clear();
        this.selectedRoleIds.clear();
        this.selectedSanctionUserIds.clear();
    }

    handlePresenceUpdate() {
        if (this.activeTab === 'live') {
            this.renderLivePresence();
        }
    }

    handleRoleUpdated() {
        this.loadMembers(this.currentPage);
        this.loadRoles();
    }

    closeAllDropdowns() {
        if (!this.modalBox) return;
        const modules = this.modalBox.querySelectorAll('.component-module--dropdown:not(.disabled)');
        modules.forEach(m => m.classList.add('disabled'));
    }

    handleClick(e) {
        // 0. Dropdown toggling
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

        // 1. Tab switching
        const tabBtn = e.target.closest('[data-action="switchMembersModalTab"]');
        if (tabBtn) {
            e.preventDefault();
            const tab = tabBtn.getAttribute('data-tab');
            if (tab) this.switchTab(tab);
            return;
        }

        // 1.1 Upgrade Modal trigger
        const btnUpgrade = e.target.closest('[data-action="openUpgradeModal"]') || e.target.closest('[data-modal-action="openUpgradeModal"]');
        if (btnUpgrade) {
            e.preventDefault();
            if (window.modalSystem) {
                window.modalSystem.show('upgradePlansModal');
            }
            return;
        }

        // 2. Multi-step Resize Actions
        const resizeTypeOpt = e.target.closest('[data-action="selectResizeTypeOption"]');
        if (resizeTypeOpt) {
            e.preventDefault();
            this.handleSelectResizeType(resizeTypeOpt);
            return;
        }

        const resizeSizeOpt = e.target.closest('[data-action="selectOfflineResizeSize"]');
        if (resizeSizeOpt) {
            e.preventDefault();
            this.handleSelectResizeSize(resizeSizeOpt);
            return;
        }

        const btnResizeDateStep = e.target.closest('[data-action="offlineResizeDateStep"]');
        if (btnResizeDateStep) {
            e.preventDefault();
            this.handleResizeDateStep();
            return;
        }

        const btnResizeTimeStep = e.target.closest('[data-action="offlineResizeTimeStep"]');
        if (btnResizeTimeStep) {
            e.preventDefault();
            this.handleResizeTimeStep();
            return;
        }

        const btnResizeConfirmTime = e.target.closest('[data-action="offlineResizeConfirmTime"]') || e.target.closest('[data-action="offlineResizePrevTimeStep"]');
        if (btnResizeConfirmTime) {
            e.preventDefault();
            this.handleResizeConfirmTime();
            return;
        }

        const btnResizePrevDateStep = e.target.closest('[data-action="offlineResizePrevDateStep"]');
        if (btnResizePrevDateStep) {
            e.preventDefault();
            this.handleResizePrevDateStep();
            return;
        }

        const btnResizeConfirmDate = e.target.closest('[data-action="offlineResizeConfirmDate"]');
        if (btnResizeConfirmDate) {
            e.preventDefault();
            this.handleResizeConfirmDate();
            return;
        }

        const btnResizeNextStep = e.target.closest('[data-action="offlineResizeNextStep"]');
        if (btnResizeNextStep) {
            e.preventDefault();
            this.handleResizeNextStep();
            return;
        }

        const btnResizePrevStep = e.target.closest('[data-action="offlineResizePrevStep"]');
        if (btnResizePrevStep) {
            e.preventDefault();
            this.handleResizePrevStep();
            return;
        }

        const btnSubmitResize = e.target.closest('[data-action="submitOfflineResizeUnified"]');
        if (btnSubmitResize) {
            e.preventDefault();
            this.submitOfflineResizeUnified(btnSubmitResize);
            return;
        }

        const btnCancelActiveResize = e.target.closest('[data-action="cancelScheduledResize"]');
        if (btnCancelActiveResize) {
            e.preventDefault();
            this.cancelScheduledResize(btnCancelActiveResize);
            return;
        }

        // 3. Multi-step Reset Actions
        const resetTypeOpt = e.target.closest('[data-action="selectResetTypeOption"]');
        if (resetTypeOpt) {
            e.preventDefault();
            this.handleSelectResetType(resetTypeOpt);
            return;
        }

        const resetSnapshotOpt = e.target.closest('[data-action="toggleResetSnapshotOption"]');
        if (resetSnapshotOpt) {
            e.preventDefault();
            this.handleToggleResetSnapshot(resetSnapshotOpt);
            return;
        }

        const btnResetDateStep = e.target.closest('[data-action="offlineResetDateStep"]');
        if (btnResetDateStep) {
            e.preventDefault();
            this.handleResetDateStep();
            return;
        }

        const btnResetTimeStep = e.target.closest('[data-action="offlineResetTimeStep"]');
        if (btnResetTimeStep) {
            e.preventDefault();
            this.handleResetTimeStep();
            return;
        }

        const btnResetConfirmTime = e.target.closest('[data-action="offlineResetConfirmTime"]') || e.target.closest('[data-action="offlineResetPrevTimeStep"]');
        if (btnResetConfirmTime) {
            e.preventDefault();
            this.handleResetConfirmTime();
            return;
        }

        const btnResetPrevDateStep = e.target.closest('[data-action="offlineResetPrevDateStep"]');
        if (btnResetPrevDateStep) {
            e.preventDefault();
            this.handleResetPrevDateStep();
            return;
        }

        const btnResetConfirmDate = e.target.closest('[data-action="offlineResetConfirmDate"]');
        if (btnResetConfirmDate) {
            e.preventDefault();
            this.handleResetConfirmDate();
            return;
        }

        const btnResetNextStep = e.target.closest('[data-action="offlineResetNextStep"]');
        if (btnResetNextStep) {
            e.preventDefault();
            this.handleResetNextStep();
            return;
        }

        const btnResetPrevStep = e.target.closest('[data-action="offlineResetPrevStep"]');
        if (btnResetPrevStep) {
            e.preventDefault();
            this.handleResetPrevStep();
            return;
        }

        const btnSubmitReset = e.target.closest('[data-action="submitOfflineResetUnified"]');
        if (btnSubmitReset) {
            e.preventDefault();
            this.submitOfflineResetUnified(btnSubmitReset);
            return;
        }

        const btnCancelActiveReset = e.target.closest('[data-action="cancelScheduledReset"]');
        if (btnCancelActiveReset) {
            e.preventDefault();
            this.cancelScheduledReset(btnCancelActiveReset);
            return;
        }

        // 4. Live Cursors Actions
        const btnToggleAllCursors = e.target.closest('[data-action="modalToggleAllCursors"]');
        if (btnToggleAllCursors) {
            e.preventDefault();
            this.closeAllDropdowns();
            if (this.designNetwork) {
                if (typeof this.designNetwork.toggleAllRemoteCursors === 'function') {
                    this.designNetwork.toggleAllRemoteCursors();
                }
                this.renderLivePresence();
            }
            return;
        }

        const btnSummonEveryone = e.target.closest('[data-action="modalSummonEveryone"]');
        if (btnSummonEveryone) {
            e.preventDefault();
            this.closeAllDropdowns();
            if (this.designNetwork && typeof this.designNetwork.summonEveryone === 'function') {
                this.designNetwork.summonEveryone();
                showMessage(window.__('msg_summon_sent') || 'Se reunió la vista de todos los colaboradores.', 'success');
            }
            return;
        }

        const btnTeleport = e.target.closest('[data-action="modalTeleportToUser"]');
        if (btnTeleport) {
            e.preventDefault();
            const targetUid = btnTeleport.getAttribute('data-user-id');
            if (targetUid && this.designNetwork && typeof this.designNetwork.teleportToUser === 'function') {
                this.designNetwork.teleportToUser(targetUid);
            }
            return;
        }

        const btnToggleUserCursor = e.target.closest('[data-action="modalToggleUserCursor"]');
        if (btnToggleUserCursor) {
            e.preventDefault();
            const targetUid = btnToggleUserCursor.getAttribute('data-user-id');
            if (targetUid && this.designNetwork && typeof this.designNetwork.toggleTrackUserCursor === 'function') {
                this.designNetwork.toggleTrackUserCursor(targetUid);
                this.renderLivePresence();
            }
            return;
        }

        // 5. Members Actions
        const memberRow = e.target.closest('[data-action="selectModalMember"]');
        if (memberRow && !e.target.closest('button')) {
            this.handleMemberSelection(memberRow);
            return;
        }

        const btnChangeRole = e.target.closest('[data-action="modalChangeMemberRole"]');
        if (btnChangeRole) {
            e.preventDefault();
            if (this.selectedMemberIds.size === 1) {
                const targetId = Array.from(this.selectedMemberIds)[0];
                const selectedRow = this.modalBox.querySelector(`[data-member-id="${targetId}"]`);
                const userUuid = selectedRow ? selectedRow.getAttribute('data-member-uuid') : '';
                this.changeMemberRole(targetId, userUuid, btnChangeRole);
            }
            return;
        }

        const btnRemoveMember = e.target.closest('[data-action="modalRemoveMember"]');
        if (btnRemoveMember) {
            e.preventDefault();
            if (this.selectedMemberIds.size > 0) {
                this.removeMember(Array.from(this.selectedMemberIds), btnRemoveMember);
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

        // 6. Requests Actions (Selection Driven)
        const requestRow = e.target.closest('[data-action="selectModalRequest"]');
        if (requestRow && !e.target.closest('button')) {
            this.handleRequestSelection(requestRow);
            return;
        }

        const btnApproveSelectedRequests = e.target.closest('[data-action="modalApproveSelectedRequests"]');
        if (btnApproveSelectedRequests) {
            e.preventDefault();
            this.processSelectedRequests('approve', btnApproveSelectedRequests);
            return;
        }

        const btnRejectSelectedRequests = e.target.closest('[data-action="modalRejectSelectedRequests"]');
        if (btnRejectSelectedRequests) {
            e.preventDefault();
            this.processSelectedRequests('reject', btnRejectSelectedRequests);
            return;
        }

        // 7. Invites Actions (Selection Driven)
        const inviteRow = e.target.closest('[data-action="selectModalInvite"]');
        if (inviteRow && !e.target.closest('button')) {
            this.handleInviteSelection(inviteRow);
            return;
        }

        const btnCopySelectedInvite = e.target.closest('[data-action="modalCopySelectedInvite"]');
        if (btnCopySelectedInvite) {
            e.preventDefault();
            if (this.selectedInviteIds.size > 0) {
                const targetInviteId = Array.from(this.selectedInviteIds)[0];
                const selectedRow = this.modalBox.querySelector(`[data-invite-id="${targetInviteId}"]`);
                const code = selectedRow ? selectedRow.getAttribute('data-code') : '';
                if (code) this.copyInviteCode(code);
            }
            return;
        }

        const btnRevokeSelectedInvite = e.target.closest('[data-action="modalRevokeSelectedInvite"]');
        if (btnRevokeSelectedInvite) {
            e.preventDefault();
            if (this.selectedInviteIds.size > 0) {
                const targetInviteId = Array.from(this.selectedInviteIds)[0];
                this.revokeInvite(targetInviteId, btnRevokeSelectedInvite);
            }
            return;
        }

        const btnOpenGenerateInvite = e.target.closest('[data-action="modalOpenGenerateInvite"]');
        if (btnOpenGenerateInvite) {
            e.preventDefault();
            this.openGenerateInviteModal();
            return;
        }

        // 8. Roles Actions (Selection Driven)
        const roleRow = e.target.closest('[data-action="selectModalRole"]');
        if (roleRow && !e.target.closest('button')) {
            this.handleRoleSelection(roleRow);
            return;
        }

        const btnCreateRole = e.target.closest('[data-action="modalCreateRole"]');
        if (btnCreateRole) {
            e.preventDefault();
            this.openRoleBuilder(null);
            return;
        }

        const btnEditSelectedRole = e.target.closest('[data-action="modalEditSelectedRole"]');
        if (btnEditSelectedRole) {
            e.preventDefault();
            const roleId = Array.from(this.selectedRoleIds)[0];
            const role = this.getRoleById(roleId);
            if (role) this.openRoleBuilder(role);
            return;
        }

        const btnEditSelectedRolePerms = e.target.closest('[data-action="modalEditSelectedRolePermissions"]');
        if (btnEditSelectedRolePerms) {
            e.preventDefault();
            const roleId = Array.from(this.selectedRoleIds)[0];
            const role = this.getRoleById(roleId);
            if (role) this.openRolePermissions(role);
            return;
        }

        const btnDeleteSelectedRole = e.target.closest('[data-action="modalDeleteSelectedRole"]');
        if (btnDeleteSelectedRole) {
            e.preventDefault();
            const roleId = Array.from(this.selectedRoleIds)[0];
            if (roleId) this.deleteRole(roleId, btnDeleteSelectedRole);
            return;
        }

        const btnBackToRolesList = e.target.closest('[data-action="modalBackToRolesList"]');
        if (btnBackToRolesList) {
            e.preventDefault();
            this.showRolesListView();
            return;
        }

        const btnSaveRole = e.target.closest('[data-action="modalSaveRole"]');
        if (btnSaveRole) {
            e.preventDefault();
            this.saveRoleData(btnSaveRole);
            return;
        }

        const btnSavePermissions = e.target.closest('[data-action="modalSavePermissions"]');
        if (btnSavePermissions) {
            e.preventDefault();
            this.saveRolePermissions(btnSavePermissions);
            return;
        }

        const btnAdjustRoleWeight = e.target.closest('[data-action="adjustModalRoleWeight"]');
        if (btnAdjustRoleWeight) {
            e.preventDefault();
            const step = parseInt(btnAdjustRoleWeight.getAttribute('data-step') || '1', 10);
            this.adjustRoleWeight(step);
            return;
        }

        // 9. Sanctions Actions (Selection Driven)
        const sanctionRow = e.target.closest('[data-action="selectModalSanction"]');
        if (sanctionRow && !e.target.closest('button')) {
            this.handleSanctionSelection(sanctionRow);
            return;
        }

        const btnEditSelectedSanction = e.target.closest('[data-action="modalEditSelectedSanction"]');
        if (btnEditSelectedSanction) {
            e.preventDefault();
            const userId = Array.from(this.selectedSanctionUserIds)[0];
            if (userId) this.openEditSanctionModal(userId);
            return;
        }

        const btnLiftSelectedSanction = e.target.closest('[data-action="modalLiftSelectedSanction"]');
        if (btnLiftSelectedSanction) {
            e.preventDefault();
            const userId = Array.from(this.selectedSanctionUserIds)[0];
            if (userId) this.liftSanction(userId, btnLiftSelectedSanction);
            return;
        }

        // 10. Calendar controls
        const btnCalPrev = e.target.closest('[data-action="calendarPrevMonth"]');
        if (btnCalPrev && this.calendarSystem) {
            e.preventDefault();
            this.calendarSystem.prevMonth();
            return;
        }

        const btnCalNext = e.target.closest('[data-action="calendarNextMonth"]');
        if (btnCalNext && this.calendarSystem) {
            e.preventDefault();
            this.calendarSystem.nextMonth();
            return;
        }

        const btnAdjHours = e.target.closest('[data-action="adjustCalendarHours"]');
        if (btnAdjHours) {
            e.preventDefault();
            const step = parseInt(btnAdjHours.getAttribute('data-step') || '1', 10);
            this.handleAdjustCalendarHours(btnAdjHours, step);
            return;
        }

        const btnAdjMinutes = e.target.closest('[data-action="adjustCalendarMinutes"]');
        if (btnAdjMinutes) {
            e.preventDefault();
            const step = parseInt(btnAdjMinutes.getAttribute('data-step') || '1', 10);
            this.handleAdjustCalendarMinutes(btnAdjMinutes, step);
            return;
        }

        // 11. Edit Canvas Actions
        const btnAccordion = e.target.closest('[data-action="toggleAccordion"]');
        if (btnAccordion) {
            e.preventDefault();
            e.stopPropagation();
            const accordion = btnAccordion.closest('.component-accordion');
            if (accordion) accordion.classList.toggle('active');
            return;
        }

        const btnToggleEditState = e.target.closest('[data-action="toggleEditState"]');
        if (btnToggleEditState) {
            e.preventDefault();
            e.stopPropagation();
            this.handleToggleEditState(btnToggleEditState);
            return;
        }

        const btnSaveCanvasName = e.target.closest('[data-action="saveCanvasName"]');
        if (btnSaveCanvasName) {
            e.preventDefault();
            e.stopPropagation();
            this.saveCanvasName(btnSaveCanvasName);
            return;
        }

        const btnToggleEditTag = e.target.closest('[data-action="toggleEditTag"]');
        if (btnToggleEditTag) {
            e.preventDefault();
            e.stopPropagation();
            this.toggleEditTag(btnToggleEditTag);
            return;
        }

        const btnSelectEditVal = e.target.closest('[data-action="selectEditValue"]');
        if (btnSelectEditVal) {
            e.preventDefault();
            e.stopPropagation();
            this.selectEditValue(btnSelectEditVal);
            return;
        }

        const btnAdjEditLimit = e.target.closest('[data-action="adjustEditLimit"]');
        if (btnAdjEditLimit) {
            e.preventDefault();
            e.stopPropagation();
            const step = parseInt(btnAdjEditLimit.getAttribute('data-step') || '10', 10);
            this.adjustEditLimit(btnAdjEditLimit, step);
            return;
        }

        const btnAdjEditBatch = e.target.closest('[data-action="adjustEditCooldownBatch"]');
        if (btnAdjEditBatch) {
            e.preventDefault();
            e.stopPropagation();
            const step = parseInt(btnAdjEditBatch.getAttribute('data-step') || '1', 10);
            this.adjustEditCooldownBatch(btnAdjEditBatch, step);
            return;
        }

        const btnAdjEditSecs = e.target.closest('[data-action="adjustEditCooldownSeconds"]');
        if (btnAdjEditSecs) {
            e.preventDefault();
            e.stopPropagation();
            const step = parseInt(btnAdjEditSecs.getAttribute('data-step') || '1', 10);
            this.adjustEditCooldownSeconds(btnAdjEditSecs, step);
            return;
        }

        const btnOpenEditPalette = e.target.closest('[data-action="openCanvasEditPaletteModal"]');
        if (btnOpenEditPalette) {
            e.preventDefault();
            e.stopPropagation();
            this.openCanvasEditPaletteModal();
            return;
        }

        const btnSaveSettings = e.target.closest('[data-action="saveCanvasSettings"]');
        if (btnSaveSettings) {
            e.preventDefault();
            e.stopPropagation();
            this.saveCanvasSettings(btnSaveSettings);
            return;
        }

        const btnDeleteCanvas = e.target.closest('[data-action="modalDeleteCanvas"]');
        if (btnDeleteCanvas) {
            e.preventDefault();
            e.stopPropagation();
            this.handleDeleteCanvas(btnDeleteCanvas);
            return;
        }
    }

    handleInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'modal-members-search') {
            const query = e.target.value.toLowerCase().trim();
            if (this.activeTab === 'live') {
                this.liveSearchQuery = query;
                this.renderLivePresence();
            } else if (this.activeTab === 'members') {
                this.membersSearchQuery = query;
                this.renderMembersTable();
            } else if (this.activeTab === 'requests') {
                this.requestsSearchQuery = query;
                this.renderRequestsTable();
            } else if (this.activeTab === 'invites') {
                this.invitesSearchQuery = query;
                this.renderInvitesTable();
            } else if (this.activeTab === 'roles') {
                this.rolesSearchQuery = query;
                this.renderRolesTable();
            } else if (this.activeTab === 'sanctions') {
                this.sanctionsSearchQuery = query;
                this.renderSanctionsTable();
            }
        }
    }

    handleChange(e) {
        // Toggle select all in permissions
        if (e.target && e.target.getAttribute('data-action') === 'toggleAllPermissions') {
            const isChecked = e.target.checked;
            const checkboxes = this.modalBox.querySelectorAll('input[data-ref="modalPermCheckbox"]');
            checkboxes.forEach(cb => { cb.checked = isChecked; });
        }
    }

    switchTab(tabName) {
        if ((tabName === 'edit' || tabName === 'general' || tabName === 'resize') && !this.canManageSettings) {
            tabName = this.canManageMembers ? 'members' : (this.canManageSanctions ? 'sanctions' : 'live');
        } else if (tabName === 'reset' && !this.canManageResets) {
            tabName = this.canManageMembers ? 'members' : (this.canManageSanctions ? 'sanctions' : 'live');
        } else if ((tabName === 'members' || tabName === 'requests') && !this.canManageMembers) {
            tabName = this.canManageSanctions ? 'sanctions' : 'live';
        } else if (tabName === 'invites' && !this.canManageInvites) {
            tabName = this.canManageMembers ? 'members' : 'live';
        } else if (tabName === 'roles' && !this.canManageRoles) {
            tabName = this.canManageMembers ? 'members' : 'live';
        } else if (tabName === 'sanctions' && !this.canManageSanctions) {
            tabName = this.canManageMembers ? 'members' : 'live';
        } else if ((tabName === 'danger' || tabName === 'critical') && !this.isOwner) {
            tabName = this.canManageMembers ? 'members' : 'live';
        }

        this.activeTab = tabName;
        this.rolesSubView = 'list';
        this.resizeStep = 'step-1';
        this.resetStep = 'step-1';
        this.closeAllDropdowns();

        const links = this.modalBox.querySelectorAll('.component-modal-settings-sidebar [data-action="switchMembersModalTab"]');
        links.forEach(link => {
            if (link.getAttribute('data-tab') === tabName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

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

        const t = (k, f) => {
            if (typeof window.__ === 'function') {
                const r = window.__(k);
                if (r && r !== k) return r;
            }
            return f || k;
        };

        const tabTitles = {
            edit: t('canvas_edit_title', 'Editar configuración'),
            general: t('canvas_edit_title', 'Editar configuración'),
            resize: t('canvas_resize_title', 'Redimensionar lienzo'),
            reset: t('canvas_resets_title', 'Reiniciar lienzo'),
            members: t('tab_members_title', 'Gestionar miembros'),
            requests: t('tab_requests_title', 'Gestionar solicitudes'),
            invites: t('lbl_invites_management', 'Gestionar invitaciones'),
            live: t('tab_live_presence', 'Colaboradores en vivo'),
            roles: t('tab_roles_title', 'Gestionar roles'),
            sanctions: t('tab_sanctions_title', 'Gestionar sanciones'),
            danger: t('tab_danger_zone', 'Configuración crítica'),
            critical: t('tab_danger_zone', 'Configuración crítica')
        };

        // Update Section Title in Header
        const titleText = this.modalBox.querySelector('[data-ref="modal-section-title-text"]');
        if (titleText && tabTitles[tabName]) {
            titleText.textContent = tabTitles[tabName];
        }

        const isRolesLocked = (tabName === 'roles' && this.userTier < 2);
        const nonSearchableTabs = ['resize', 'reset', 'edit', 'general', 'danger', 'critical'];
        const isNonSearchable = nonSearchableTabs.includes(tabName) || isRolesLocked;

        const searchContainer = this.modalBox.querySelector('[data-ref="modal-search-container"]');
        if (searchContainer) {
            if (isNonSearchable) searchContainer.classList.add('disabled');
            else searchContainer.classList.remove('disabled');
        }

        // Data preloads for option tabs
        if (tabName === 'edit' || tabName === 'general') {
            this.loadEditData();
        } else if (tabName === 'resize') {
            this.loadResizeSettings();
        } else if (tabName === 'reset') {
            this.loadResetSettings();
        }

        // Top contextual actions visibility
        const liveActions = this.modalBox.querySelector('[data-ref="modal-live-actions"]');
        const selectionActions = this.modalBox.querySelector('[data-ref="modal-member-selection-actions"]');
        const requestsActions = this.modalBox.querySelector('[data-ref="modal-requests-actions"]');
        const invitesActions = this.modalBox.querySelector('[data-ref="modal-invites-actions"]');
        const rolesActions = this.modalBox.querySelector('[data-ref="modal-roles-actions"]');
        const sanctionsActions = this.modalBox.querySelector('[data-ref="modal-sanctions-actions"]');
        
        if (liveActions) {
            if (tabName === 'live') liveActions.classList.remove('disabled');
            else liveActions.classList.add('disabled');
        }

        if (selectionActions) {
            if (tabName === 'members' && this.selectedMemberIds.size > 0) {
                selectionActions.classList.remove('disabled');
            } else {
                selectionActions.classList.add('disabled');
            }
        }

        if (requestsActions) {
            if (tabName === 'requests') requestsActions.classList.remove('disabled');
            else requestsActions.classList.add('disabled');
        }

        if (invitesActions) {
            if (tabName === 'invites') invitesActions.classList.remove('disabled');
            else invitesActions.classList.add('disabled');
        }

        if (rolesActions) {
            if (tabName === 'roles' && !isRolesLocked) rolesActions.classList.remove('disabled');
            else rolesActions.classList.add('disabled');
        }

        if (sanctionsActions) {
            if (tabName === 'sanctions') sanctionsActions.classList.remove('disabled');
            else sanctionsActions.classList.add('disabled');
        }

        // Update search placeholder & value
        const searchInput = this.modalBox.querySelector('[data-ref="modal-members-search"]');
        if (searchInput) {
            if (tabName === 'live') {
                searchInput.placeholder = t('search_live_placeholder', 'Buscar colaboradores en vivo...');
                searchInput.value = this.liveSearchQuery;
            } else if (tabName === 'members') {
                searchInput.placeholder = t('search_member_placeholder', 'Buscar miembros...');
                searchInput.value = this.membersSearchQuery;
            } else if (tabName === 'requests') {
                searchInput.placeholder = t('search_requests_placeholder', 'Buscar peticiones...');
                searchInput.value = this.requestsSearchQuery;
            } else if (tabName === 'invites') {
                searchInput.placeholder = t('search_invites_placeholder', 'Buscar invitaciones...');
                searchInput.value = this.invitesSearchQuery;
            } else if (tabName === 'roles') {
                searchInput.placeholder = t('search_roles_placeholder', 'Buscar roles...');
                searchInput.value = this.rolesSearchQuery;
            } else if (tabName === 'sanctions') {
                searchInput.placeholder = t('search_sanctions_placeholder', 'Buscar usuarios sancionados...');
                searchInput.value = this.sanctionsSearchQuery;
            }
        }

        // Update bottom action bar for tab
        this.updateBottomBar();

        if (tabName === 'live') {
            this.renderLivePresence();
        } else if (tabName === 'members') {
            this.renderMembersTable();
        } else if (tabName === 'requests') {
            this.renderRequestsTable();
        } else if (tabName === 'invites') {
            this.loadInvites();
        } else if (tabName === 'roles') {
            if (isRolesLocked) {
                this.renderRolesLockedState();
            } else {
                this.showRolesListView();
                this.loadRoles();
            }
        } else if (tabName === 'sanctions') {
            this.loadSanctions(1);
        }
    }

    renderRolesLockedState() {
        const container = this.modalBox.querySelector('[data-ref="tab-content-roles"]');
        if (!container) return;

        const tierName = getDynamicTierName(2);
        container.innerHTML = `
            <div class="component-modal-settings-content">
                ${CardTemplates.emptyState({
                    type: 'roles',
                    icon: 'shield_person',
                    title: `Suscripción ${tierName} Requerida`,
                    message: `La creación de roles personalizados y configuración de permisos avanzados está disponible a partir del plan ${tierName}.`,
                    actions: `
                        <button type="button" class="component-button component-button--primary component-button--h36" data-action="openUpgradeModal">
                            <span class="material-symbols-rounded">workspace_premium</span>
                            <span>${window.__('lbl_upgrade_plan') || 'Mejorar Plan'}</span>
                        </button>
                    `
                })}
            </div>
        `;
    }

    updateBottomBar() {
        const bottomBar = this.modalBox.querySelector('[data-ref="modal-members-bottom-bar"]');
        const actionsContainer = this.modalBox.querySelector('[data-ref="modal-bottom-actions"]');
        const paginationContainer = this.modalBox.querySelector('[data-ref="modal-members-pagination"]');

        if (!bottomBar) return;

        const t = (k, f) => {
            if (typeof window.__ === 'function') {
                const r = window.__(k);
                if (r && r !== k) return r;
            }
            return f || k;
        };

        if (this.activeTab === 'danger' || this.activeTab === 'critical') {
            bottomBar.classList.add('disabled');
            if (paginationContainer) paginationContainer.innerHTML = '';
            if (actionsContainer) actionsContainer.innerHTML = '';
        } else if (this.activeTab === 'edit' || this.activeTab === 'general') {
            bottomBar.classList.remove('disabled');
            if (paginationContainer) paginationContainer.innerHTML = '';
            if (actionsContainer) {
                actionsContainer.innerHTML = `
                    <button type="button" class="component-button component-button--primary component-button--h40" data-action="saveCanvasSettings">
                        <span class="material-symbols-rounded">save</span>
                        <span>${t('btn_save_changes', 'Guardar cambios')}</span>
                    </button>
                `;
            }
        } else if (this.activeTab === 'members') {
            bottomBar.classList.remove('disabled');
            if (actionsContainer) actionsContainer.innerHTML = '';
            this.renderMembersPagination();
        } else if (this.activeTab === 'resize') {
            bottomBar.classList.remove('disabled');
            if (paginationContainer) paginationContainer.innerHTML = '';
            if (actionsContainer) {
                if (this.resizeStep === 'step-1') {
                    actionsContainer.innerHTML = `
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="offlineResizeNextStep">
                            <span>${t('btn_continue', 'Continuar')}</span>
                        </button>
                    `;
                } else if (this.resizeStep === 'step-calendar') {
                    actionsContainer.innerHTML = `
                        <button type="button" class="component-button component-button--h40" data-action="offlineResizePrevDateStep">
                            <span>${t('btn_back', 'Atrás')}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="offlineResizeConfirmDate">
                            <span>${t('btn_accept', 'Aceptar')}</span>
                        </button>
                    `;
                } else if (this.resizeStep === 'step-time') {
                    actionsContainer.innerHTML = `
                        <button type="button" class="component-button component-button--h40" data-action="offlineResizePrevTimeStep">
                            <span>${t('btn_back', 'Atrás')}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="offlineResizeConfirmTime">
                            <span>${t('btn_accept', 'Aceptar')}</span>
                        </button>
                    `;
                } else if (this.resizeStep === 'step-2') {
                    actionsContainer.innerHTML = `
                        <button type="button" class="component-button component-button--h40" data-action="offlineResizePrevStep">
                            <span>${t('btn_back', 'Atrás')}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="submitOfflineResizeUnified">
                            <span class="material-symbols-rounded msr-check">check</span>
                            <span>${t('btn_confirm', 'Confirmar')}</span>
                        </button>
                    `;
                }
            }
        } else if (this.activeTab === 'reset') {
            bottomBar.classList.remove('disabled');
            if (paginationContainer) paginationContainer.innerHTML = '';
            if (actionsContainer) {
                if (this.resetStep === 'step-1') {
                    actionsContainer.innerHTML = `
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="offlineResetNextStep">
                            <span>${t('btn_continue', 'Continuar')}</span>
                        </button>
                    `;
                } else if (this.resetStep === 'step-calendar') {
                    actionsContainer.innerHTML = `
                        <button type="button" class="component-button component-button--h40" data-action="offlineResetPrevDateStep">
                            <span>${t('btn_back', 'Atrás')}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="offlineResetConfirmDate">
                            <span>${t('btn_accept', 'Aceptar')}</span>
                        </button>
                    `;
                } else if (this.resetStep === 'step-time') {
                    actionsContainer.innerHTML = `
                        <button type="button" class="component-button component-button--h40" data-action="offlineResetPrevTimeStep">
                            <span>${t('btn_back', 'Atrás')}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="offlineResetConfirmTime">
                            <span>${t('btn_accept', 'Aceptar')}</span>
                        </button>
                    `;
                } else if (this.resetStep === 'step-2') {
                    actionsContainer.innerHTML = `
                        <button type="button" class="component-button component-button--h40" data-action="offlineResetPrevStep">
                            <span>${t('btn_back', 'Atrás')}</span>
                        </button>
                        <button type="button" class="component-button component-button--danger component-button--h40" data-action="submitOfflineResetUnified">
                            <span class="material-symbols-rounded msr-restart_alt">restart_alt</span>
                            <span>${t('btn_confirm', 'Confirmar')}</span>
                        </button>
                    `;
                }
            }
        } else if (this.activeTab === 'roles' && this.rolesSubView !== 'list') {
            bottomBar.classList.remove('disabled');
            if (paginationContainer) paginationContainer.innerHTML = '';
            if (actionsContainer) {
                if (this.rolesSubView === 'builder') {
                    const isSystem = this.editingRole ? (this.editingRole.is_system == 1 || this.editingRole.canvas_id === null) : false;
                    actionsContainer.innerHTML = `
                        <button type="button" class="component-button component-button--h40" data-action="modalBackToRolesList">
                            <span>${t('btn_cancel', 'Cancelar')}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="modalSaveRole" ${isSystem ? 'disabled' : ''}>
                            <span class="material-symbols-rounded">save</span>
                            <span>${t('btn_save_role', 'Guardar Rol')}</span>
                        </button>
                    `;
                } else if (this.rolesSubView === 'permissions') {
                    actionsContainer.innerHTML = `
                        <button type="button" class="component-button component-button--h40" data-action="modalBackToRolesList">
                            <span>${t('btn_cancel', 'Cancelar')}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="modalSavePermissions">
                            <span class="material-symbols-rounded">save</span>
                            <span>${t('btn_save_permissions', 'Guardar Permisos')}</span>
                        </button>
                    `;
                }
            }
        } else {
            bottomBar.classList.add('disabled');
            if (actionsContainer) actionsContainer.innerHTML = '';
            if (paginationContainer) paginationContainer.innerHTML = '';
        }
    }

    // ─────────────────────────────────────────────────────────────
    // MULTI-STEP: RESIZE & EXPANSIONS
    // ─────────────────────────────────────────────────────────────
    handleSelectResizeType(item) {
        const val = item.getAttribute('data-value') || 'instant';
        const label = item.getAttribute('data-label') || (val === 'instant' ? 'Inmediata' : 'Programada');
        const icon = item.getAttribute('data-icon') || (val === 'instant' ? 'flash_on' : 'schedule');

        this.resizeType = val;

        const step1 = this.modalBox.querySelector('[data-ref="offline-resize-step-1"]');
        if (step1) step1.setAttribute('data-selected-type', val);

        const trigger = this.modalBox.querySelector('[data-ref="offline-resize-type-trigger"]');
        if (trigger) {
            trigger.setAttribute('data-value', val);
            const iconEl = trigger.querySelector('[data-ref="offline-resize-type-icon"]');
            const labelEl = trigger.querySelector('[data-ref="offline-resize-type-label"]');
            if (iconEl) iconEl.textContent = icon;
            if (labelEl) labelEl.textContent = label;
        }

        const dateContainer = this.modalBox.querySelector('[data-ref="offline-resize-scheduled-date-container"]');
        if (dateContainer) {
            if (val === 'scheduled') {
                dateContainer.classList.remove('disabled');
            } else {
                dateContainer.classList.add('disabled');
            }
        }

        const list = item.closest('.component-menu-list');
        if (list) {
            list.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
            item.classList.add('active');
        }

        this.closeAllDropdowns();
    }

    handleSelectResizeSize(item) {
        const val = item.getAttribute('data-value');
        const label = item.getAttribute('data-label');
        const icon = item.getAttribute('data-icon');

        if (!val) return;

        this.selectedResizeSize = val;

        const trigger = this.modalBox.querySelector('[data-ref="offline-resize-trigger"]');
        if (trigger) {
            trigger.setAttribute('data-value', val);
            const iconEl = trigger.querySelector('[data-ref="offline-resize-icon"]');
            const labelEl = trigger.querySelector('[data-ref="offline-resize-label"]');
            if (iconEl) iconEl.textContent = icon;
            if (labelEl) labelEl.textContent = label;
        }

        const list = item.closest('.component-menu-list');
        if (list) {
            list.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
            item.classList.add('active');
        }

        const warningEl = this.modalBox.querySelector('[data-ref="offline-resize-shrink-warning"]');
        if (warningEl) {
            const currentW = parseInt(this.currentSize.split('x')[0], 10) || 64;
            const newW = parseInt(val.split('x')[0], 10) || 64;
            if (newW < currentW) warningEl.classList.remove('disabled');
            else warningEl.classList.add('disabled');
        }

        this.closeAllDropdowns();
    }

    handleResizeDateStep() {
        this.resizeStep = 'step-calendar';
        const step1 = this.modalBox.querySelector('[data-ref="offline-resize-step-1"]');
        const stepCal = this.modalBox.querySelector('[data-ref="offline-resize-step-calendar"]');
        if (step1) step1.classList.add('disabled');
        if (stepCal) stepCal.classList.remove('disabled');

        const trigger = this.modalBox.querySelector('[data-ref="offline-resize-datetime-trigger"]');
        const currentIso = trigger ? trigger.getAttribute('data-value') : null;
        const initialDate = currentIso ? parseUtcToLocalDate(currentIso) : new Date(Date.now() + 86400000);

        const calContainer = this.modalBox.querySelector('[data-ref="tab-content-resize"]');
        this.calendarSystem = new CalendarSystem(calContainer, {
            minDate: new Date(),
            selectedDate: initialDate,
            onSelectDate: (selectedDate) => {
                this.updateCalendarTimeDisplay('offline-resize');
            }
        });
        this.calendarSystem.init();
        this.updateBottomBar();
    }

    handleResizeTimeStep() {
        this.resizeStep = 'step-time';
        const stepCal = this.modalBox.querySelector('[data-ref="offline-resize-step-calendar"]');
        const stepTime = this.modalBox.querySelector('[data-ref="offline-resize-step-time"]');
        if (stepCal) stepCal.classList.add('disabled');
        if (stepTime) stepTime.classList.remove('disabled');
        this.updateBottomBar();
    }

    handleResizeConfirmTime() {
        this.resizeStep = 'step-calendar';
        const stepTime = this.modalBox.querySelector('[data-ref="offline-resize-step-time"]');
        const stepCal = this.modalBox.querySelector('[data-ref="offline-resize-step-calendar"]');
        if (stepTime) stepTime.classList.add('disabled');
        if (stepCal) stepCal.classList.remove('disabled');

        this.updateCalendarTimeDisplay('offline-resize');
        this.updateBottomBar();
    }

    handleResizePrevDateStep() {
        this.resizeStep = 'step-1';
        const stepCal = this.modalBox.querySelector('[data-ref="offline-resize-step-calendar"]');
        const step1 = this.modalBox.querySelector('[data-ref="offline-resize-step-1"]');
        if (stepCal) stepCal.classList.add('disabled');
        if (step1) step1.classList.remove('disabled');
        this.updateBottomBar();
    }

    handleResizeConfirmDate() {
        if (!this.calendarSystem || !this.calendarSystem.selectedDate) {
            showMessage(window.__('err_select_date') || 'Por favor selecciona una fecha.', 'warning');
            return;
        }

        const stepTime = this.modalBox.querySelector('[data-ref="offline-resize-step-time"]');
        const hoursEl = stepTime ? stepTime.querySelector('[data-ref="calendar-modal-hours-val"]') : null;
        const minutesEl = stepTime ? stepTime.querySelector('[data-ref="calendar-modal-minutes-val"]') : null;
        const h = hoursEl ? parseInt(hoursEl.getAttribute('data-value') || '23', 10) : 23;
        const m = minutesEl ? parseInt(minutesEl.getAttribute('data-value') || '59', 10) : 59;

        const combinedDate = new Date(this.calendarSystem.selectedDate);
        combinedDate.setHours(h, m, 0, 0);

        const isoFormatted = formatLocalDateTimeToInput(combinedDate);
        const details = getScheduledTimeDetails(combinedDate);

        const trigger = this.modalBox.querySelector('[data-ref="offline-resize-datetime-trigger"]');
        if (trigger) {
            trigger.setAttribute('data-value', isoFormatted);
            const textEl = trigger.querySelector('[data-ref="offline-resize-datetime-text"]');
            if (textEl) textEl.textContent = details.formattedDateShort || details.formattedDate;
        }

        this.updateScheduleInfo('offline-resize', isoFormatted);

        this.resizeStep = 'step-1';
        const stepCal = this.modalBox.querySelector('[data-ref="offline-resize-step-calendar"]');
        const step1 = this.modalBox.querySelector('[data-ref="offline-resize-step-1"]');
        if (stepCal) stepCal.classList.add('disabled');
        if (step1) step1.classList.remove('disabled');
        this.updateBottomBar();
    }

    handleResizeNextStep() {
        this.resizeStep = 'step-2';
        const step1 = this.modalBox.querySelector('[data-ref="offline-resize-step-1"]');
        const step2 = this.modalBox.querySelector('[data-ref="offline-resize-step-2"]');
        if (step1) step1.classList.add('disabled');
        if (step2) step2.classList.remove('disabled');
        this.updateBottomBar();
    }

    handleResizePrevStep() {
        this.resizeStep = 'step-1';
        const step1 = this.modalBox.querySelector('[data-ref="offline-resize-step-1"]');
        const step2 = this.modalBox.querySelector('[data-ref="offline-resize-step-2"]');
        if (step2) step2.classList.add('disabled');
        if (step1) step1.classList.remove('disabled');
        this.updateBottomBar();
    }

    async submitOfflineResizeUnified(btn) {
        if (this.resizeType === 'instant') {
            if (this.selectedResizeSize === this.currentSize) {
                showMessage(window.__('msg_same_canvas_size') || 'El lienzo ya tiene ese tamaño.', 'info');
                return;
            }

            setButtonLoading(btn);
            try {
                const res = await this.api.resizeCanvas(this.canvasId, this.selectedResizeSize);
                restoreButton(btn);

                if (res && res.success) {
                    showMessage(res.message || 'Lienzo redimensionado con éxito.', 'success');
                    this.currentSize = this.selectedResizeSize;
                    const badge = this.modalBox.querySelector('[data-ref="modal-resize-current-badge"]');
                    if (badge) badge.textContent = this.currentSize;

                    if (window.activeCanvasManager && typeof window.activeCanvasManager.onCanvasResized === 'function') {
                        window.activeCanvasManager.onCanvasResized(this.currentSize);
                    }
                    this.handleResizePrevStep();
                } else {
                    showMessage(res?.message || 'Error al redimensionar.', 'error');
                }
            } catch (err) {
                restoreButton(btn);
                showMessage('Error de conexión al redimensionar.', 'error');
            }
        } else {
            // Scheduled
            const dateTrigger = this.modalBox.querySelector('[data-ref="offline-resize-datetime-trigger"]');
            const localIso = dateTrigger ? dateTrigger.getAttribute('data-value') : null;
            if (!localIso) {
                showMessage(window.__('err_select_date') || 'Por favor selecciona una fecha.', 'warning');
                return;
            }

            const utcString = localInputFormatToUtcString(localIso);
            const payload = {
                id: this.canvasId,
                is_active: true,
                next_resize_at: utcString,
                target_size: this.selectedResizeSize
            };

            setButtonLoading(btn);
            try {
                const res = await this.genericApi.post(ApiRoutes.Canvases.UpdateResizeSettings, payload);
                restoreButton(btn);

                if (res && res.success) {
                    showMessage(res.message || 'Expansión programada con éxito.', 'success');
                    this.resizeActive = true;
                    this.nextResizeAt = utcString;
                    this.resizeTargetSize = this.selectedResizeSize;
                    this.renderActiveResizeBanner();
                    this.handleResizePrevStep();
                } else {
                    showMessage(res?.message || 'Error al programar expansión.', 'error');
                }
            } catch (err) {
                restoreButton(btn);
                showMessage('Error de conexión al programar.', 'error');
            }
        }
    }

    async loadResizeSettings() {
        if (!this.canvasId) return;
        try {
            const res = await this.genericApi.post(ApiRoutes.Canvases.GetResizeSettings, { id: this.canvasId });
            if (res && res.success && res.data) {
                this.resizeActive = !!res.data.is_active;
                this.nextResizeAt = res.data.next_resize_at || '';
                this.resizeTargetSize = res.data.target_size || this.currentSize;
                this.renderActiveResizeBanner();
            }
        } catch (e) {}
    }

    renderActiveResizeBanner() {
        const container = this.modalBox.querySelector('[data-ref="modal-resize-active-schedule-container"]');
        if (!container) return;

        if (!this.resizeActive || !this.nextResizeAt) {
            container.innerHTML = '';
            container.classList.add('disabled');
            return;
        }

        const localDate = parseUtcToLocalDate(this.nextResizeAt);
        const details = getScheduledTimeDetails(localDate);

        container.className = 'component-alert component-alert--warning active';
        container.innerHTML = `
            <div class="component-alert-icon">
                <span class="material-symbols-rounded">schedule</span>
            </div>
            <div class="component-alert-text">
                <div style="font-weight: 600;">Expansión programada a ${escapeHTML(this.resizeTargetSize)}</div>
                <div class="component-text-muted" style="font-size: 0.72rem; margin-top: 2px;">
                    <span>${details.formattedDate} (${details.relativeTimeStr})</span>
                </div>
            </div>
            <div class="component-alert-actions">
                <button type="button" class="component-button component-button--sm component-button--danger" data-action="cancelScheduledResize">
                    <span>Cancelar</span>
                </button>
            </div>
        `;
        container.classList.remove('disabled');
    }

    async cancelScheduledResize(btn) {
        if (!this.canvasId) return;
        if (btn) setButtonLoading(btn);
        try {
            const res = await this.genericApi.post(ApiRoutes.Canvases.UpdateResizeSettings, {
                id: this.canvasId,
                is_active: false,
                next_resize_at: null,
                target_size: this.currentSize
            });
            if (btn) restoreButton(btn);

            if (res && res.success) {
                showMessage('Expansión programada cancelada.', 'success');
                this.resizeActive = false;
                this.nextResizeAt = '';
                this.renderActiveResizeBanner();
            } else {
                showMessage(res?.message || 'Error al cancelar expansión.', 'error');
            }
        } catch (err) {
            if (btn) restoreButton(btn);
            showMessage('Error al cancelar.', 'error');
        }
    }

    // ─────────────────────────────────────────────────────────────
    // MULTI-STEP: RESET & CLEANING
    // ─────────────────────────────────────────────────────────────
    handleSelectResetType(item) {
        const val = item.getAttribute('data-value') || 'instant';
        const label = item.getAttribute('data-label') || (val === 'instant' ? 'Inmediato' : 'Programado');
        const icon = item.getAttribute('data-icon') || (val === 'instant' ? 'flash_on' : 'schedule');

        this.resetType = val;

        const step1 = this.modalBox.querySelector('[data-ref="offline-reset-step-1"]');
        if (step1) step1.setAttribute('data-selected-type', val);

        const trigger = this.modalBox.querySelector('[data-ref="offline-reset-type-trigger"]');
        if (trigger) {
            trigger.setAttribute('data-value', val);
            const iconEl = trigger.querySelector('[data-ref="offline-reset-type-icon"]');
            const labelEl = trigger.querySelector('[data-ref="offline-reset-type-label"]');
            if (iconEl) iconEl.textContent = icon;
            if (labelEl) labelEl.textContent = label;
        }

        const dateContainer = this.modalBox.querySelector('[data-ref="offline-reset-scheduled-date-container"]');
        if (dateContainer) {
            if (val === 'scheduled') {
                dateContainer.classList.remove('disabled');
            } else {
                dateContainer.classList.add('disabled');
            }
        }

        const list = item.closest('.component-menu-list');
        if (list) {
            list.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
            item.classList.add('active');
        }

        this.closeAllDropdowns();
    }

    handleToggleResetSnapshot(item) {
        const val = item.getAttribute('data-value');
        const label = item.getAttribute('data-label');
        const icon = item.getAttribute('data-icon');

        this.resetTakeSnapshot = (val === '1');

        const trigger = this.modalBox.querySelector('[data-ref="offline-reset-snapshot-trigger"]');
        if (trigger) {
            trigger.setAttribute('data-value', val);
            const iconEl = trigger.querySelector('[data-ref="offline-reset-snapshot-icon"]');
            const labelEl = trigger.querySelector('[data-ref="offline-reset-snapshot-label"]');
            if (iconEl) iconEl.textContent = icon;
            if (labelEl) labelEl.textContent = label;
        }

        const list = item.closest('.component-menu-list');
        if (list) {
            list.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
            item.classList.add('active');
        }

        this.closeAllDropdowns();
    }

    handleResetDateStep() {
        this.resetStep = 'step-calendar';
        const step1 = this.modalBox.querySelector('[data-ref="offline-reset-step-1"]');
        const stepCal = this.modalBox.querySelector('[data-ref="offline-reset-step-calendar"]');
        if (step1) step1.classList.add('disabled');
        if (stepCal) stepCal.classList.remove('disabled');

        const trigger = this.modalBox.querySelector('[data-ref="offline-reset-datetime-trigger"]');
        const currentIso = trigger ? trigger.getAttribute('data-value') : null;
        const initialDate = currentIso ? parseUtcToLocalDate(currentIso) : new Date(Date.now() + 86400000);

        const calContainer = this.modalBox.querySelector('[data-ref="tab-content-reset"]');
        this.calendarSystem = new CalendarSystem(calContainer, {
            minDate: new Date(),
            selectedDate: initialDate,
            onSelectDate: (selectedDate) => {
                this.updateCalendarTimeDisplay('offline-reset');
            }
        });
        this.calendarSystem.init();
        this.updateBottomBar();
    }

    handleResetTimeStep() {
        this.resetStep = 'step-time';
        const stepCal = this.modalBox.querySelector('[data-ref="offline-reset-step-calendar"]');
        const stepTime = this.modalBox.querySelector('[data-ref="offline-reset-step-time"]');
        if (stepCal) stepCal.classList.add('disabled');
        if (stepTime) stepTime.classList.remove('disabled');
        this.updateBottomBar();
    }

    handleResetConfirmTime() {
        this.resetStep = 'step-calendar';
        const stepTime = this.modalBox.querySelector('[data-ref="offline-reset-step-time"]');
        const stepCal = this.modalBox.querySelector('[data-ref="offline-reset-step-calendar"]');
        if (stepTime) stepTime.classList.add('disabled');
        if (stepCal) stepCal.classList.remove('disabled');

        this.updateCalendarTimeDisplay('offline-reset');
        this.updateBottomBar();
    }

    handleResetPrevDateStep() {
        this.resetStep = 'step-1';
        const stepCal = this.modalBox.querySelector('[data-ref="offline-reset-step-calendar"]');
        const step1 = this.modalBox.querySelector('[data-ref="offline-reset-step-1"]');
        if (stepCal) stepCal.classList.add('disabled');
        if (step1) step1.classList.remove('disabled');
        this.updateBottomBar();
    }

    handleResetConfirmDate() {
        if (!this.calendarSystem || !this.calendarSystem.selectedDate) {
            showMessage(window.__('err_select_date') || 'Por favor selecciona una fecha.', 'warning');
            return;
        }

        const stepTime = this.modalBox.querySelector('[data-ref="offline-reset-step-time"]');
        const hoursEl = stepTime ? stepTime.querySelector('[data-ref="calendar-modal-hours-val"]') : null;
        const minutesEl = stepTime ? stepTime.querySelector('[data-ref="calendar-modal-minutes-val"]') : null;
        const h = hoursEl ? parseInt(hoursEl.getAttribute('data-value') || '23', 10) : 23;
        const m = minutesEl ? parseInt(minutesEl.getAttribute('data-value') || '59', 10) : 59;

        const combinedDate = new Date(this.calendarSystem.selectedDate);
        combinedDate.setHours(h, m, 0, 0);

        const isoFormatted = formatLocalDateTimeToInput(combinedDate);
        const details = getScheduledTimeDetails(combinedDate);

        const trigger = this.modalBox.querySelector('[data-ref="offline-reset-datetime-trigger"]');
        if (trigger) {
            trigger.setAttribute('data-value', isoFormatted);
            const textEl = trigger.querySelector('[data-ref="offline-reset-datetime-text"]');
            if (textEl) textEl.textContent = details.formattedDateShort || details.formattedDate;
        }

        this.updateScheduleInfo('offline-reset', isoFormatted);

        this.resetStep = 'step-1';
        const stepCal = this.modalBox.querySelector('[data-ref="offline-reset-step-calendar"]');
        const step1 = this.modalBox.querySelector('[data-ref="offline-reset-step-1"]');
        if (stepCal) stepCal.classList.add('disabled');
        if (step1) step1.classList.remove('disabled');
        this.updateBottomBar();
    }

    handleResetNextStep() {
        this.resetStep = 'step-2';
        const step1 = this.modalBox.querySelector('[data-ref="offline-reset-step-1"]');
        const step2 = this.modalBox.querySelector('[data-ref="offline-reset-step-2"]');
        if (step1) step1.classList.add('disabled');
        if (step2) step2.classList.remove('disabled');
        this.updateBottomBar();
    }

    handleResetPrevStep() {
        this.resetStep = 'step-1';
        const step1 = this.modalBox.querySelector('[data-ref="offline-reset-step-1"]');
        const step2 = this.modalBox.querySelector('[data-ref="offline-reset-step-2"]');
        if (step2) step2.classList.add('disabled');
        if (step1) step1.classList.remove('disabled');
        this.updateBottomBar();
    }

    async submitOfflineResetUnified(btn) {
        if (this.resetType === 'instant') {
            setButtonLoading(btn);
            try {
                const res = await this.genericApi.post(ApiRoutes.Canvases.ResetNow, {
                    id: this.canvasId,
                    take_snapshot: this.resetTakeSnapshot
                });
                restoreButton(btn);

                if (res && res.success) {
                    showMessage(res.message || 'Lienzo reiniciado con éxito.', 'success');
                    if (window.activeCanvasManager && typeof window.activeCanvasManager.onCanvasReset === 'function') {
                        window.activeCanvasManager.onCanvasReset();
                    }
                    this.handleResetPrevStep();
                } else {
                    showMessage(res?.message || 'Error al reiniciar el lienzo.', 'error');
                }
            } catch (err) {
                restoreButton(btn);
                showMessage('Error de conexión al reiniciar.', 'error');
            }
        } else {
            // Scheduled
            const dateTrigger = this.modalBox.querySelector('[data-ref="offline-reset-datetime-trigger"]');
            const localIso = dateTrigger ? dateTrigger.getAttribute('data-value') : null;
            if (!localIso) {
                showMessage(window.__('err_select_date') || 'Por favor selecciona una fecha.', 'warning');
                return;
            }

            const utcString = localInputFormatToUtcString(localIso);
            const payload = {
                id: this.canvasId,
                is_active: true,
                next_reset_at: utcString,
                take_snapshot: this.resetTakeSnapshot
            };

            setButtonLoading(btn);
            try {
                const res = await this.genericApi.post(ApiRoutes.Canvases.UpdateResetSettings, payload);
                restoreButton(btn);

                if (res && res.success) {
                    showMessage(res.message || 'Reinicio programado con éxito.', 'success');
                    this.resetActive = true;
                    this.nextResetAt = utcString;
                    this.renderActiveResetBanner();
                    this.handleResetPrevStep();
                } else {
                    showMessage(res?.message || 'Error al programar reinicio.', 'error');
                }
            } catch (err) {
                restoreButton(btn);
                showMessage('Error de conexión al programar reinicio.', 'error');
            }
        }
    }

    async loadResetSettings() {
        if (!this.canvasId) return;
        try {
            const res = await this.genericApi.post(ApiRoutes.Canvases.GetResetSettings, { id: this.canvasId });
            if (res && res.success && res.data) {
                this.resetActive = !!res.data.is_active;
                this.nextResetAt = res.data.next_reset_at || '';
                this.resetTakeSnapshot = (res.data.take_snapshot !== false);
                this.renderActiveResetBanner();
            }
        } catch (e) {}
    }

    renderActiveResetBanner() {
        const container = this.modalBox.querySelector('[data-ref="modal-reset-active-schedule-container"]');
        const navBadge = this.modalBox.querySelector('[data-ref="modal-reset-active-badge"]');

        if (navBadge) {
            if (this.resetActive && this.nextResetAt) navBadge.classList.remove('disabled');
            else navBadge.classList.add('disabled');
        }

        if (!container) return;

        if (!this.resetActive || !this.nextResetAt) {
            container.innerHTML = '';
            container.classList.add('disabled');
            return;
        }

        const localDate = parseUtcToLocalDate(this.nextResetAt);
        const details = getScheduledTimeDetails(localDate);

        container.className = 'component-alert component-alert--warning active';
        container.innerHTML = `
            <div class="component-alert-icon">
                <span class="material-symbols-rounded">schedule</span>
            </div>
            <div class="component-alert-text">
                <div style="font-weight: 600;">Reinicio programado</div>
                <div class="component-text-muted" style="font-size: 0.72rem; margin-top: 2px;">
                    <span>${details.formattedDate} (${details.relativeTimeStr})</span>
                </div>
            </div>
            <div class="component-alert-actions">
                <button type="button" class="component-button component-button--sm component-button--danger" data-action="cancelScheduledReset">
                    <span>Cancelar</span>
                </button>
            </div>
        `;
        container.classList.remove('disabled');
    }

    async cancelScheduledReset(btn) {
        if (!this.canvasId) return;
        if (btn) setButtonLoading(btn);
        try {
            const res = await this.genericApi.post(ApiRoutes.Canvases.UpdateResetSettings, {
                id: this.canvasId,
                is_active: false,
                next_reset_at: null,
                take_snapshot: false
            });
            if (btn) restoreButton(btn);

            if (res && res.success) {
                showMessage('Reinicio programado cancelado.', 'success');
                this.resetActive = false;
                this.nextResetAt = '';
                this.renderActiveResetBanner();
            } else {
                showMessage(res?.message || 'Error al cancelar reinicio.', 'error');
            }
        } catch (err) {
            if (btn) restoreButton(btn);
            showMessage('Error al cancelar.', 'error');
        }
    }

    handleAdjustCalendarHours(btn, step) {
        const hoursEl = btn.closest('.calendar-control-column')?.querySelector('[data-ref="calendar-modal-hours-val"]');
        if (!hoursEl) return;
        let h = parseInt(hoursEl.getAttribute('data-value') || '0', 10);
        h = (h + step) % 24;
        if (h < 0) h += 24;
        const formatted = String(h).padStart(2, '0');
        hoursEl.setAttribute('data-value', formatted);
        hoursEl.textContent = formatted;
    }

    handleAdjustCalendarMinutes(btn, step) {
        const minEl = btn.closest('.calendar-control-column')?.querySelector('[data-ref="calendar-modal-minutes-val"]');
        if (!minEl) return;
        let m = parseInt(minEl.getAttribute('data-value') || '0', 10);
        m = (m + step) % 60;
        if (m < 0) m += 60;
        const formatted = String(m).padStart(2, '0');
        minEl.setAttribute('data-value', formatted);
        minEl.textContent = formatted;
    }

    updateCalendarTimeDisplay(prefix) {
        const stepTime = this.modalBox.querySelector(`[data-ref="${prefix}-step-time"]`);
        const hoursEl = stepTime ? stepTime.querySelector('[data-ref="calendar-modal-hours-val"]') : null;
        const minutesEl = stepTime ? stepTime.querySelector('[data-ref="calendar-modal-minutes-val"]') : null;
        const h = hoursEl ? String(parseInt(hoursEl.getAttribute('data-value') || '23', 10)).padStart(2, '0') : '23';
        const m = minutesEl ? String(parseInt(minutesEl.getAttribute('data-value') || '59', 10)).padStart(2, '0') : '59';

        const stepCal = this.modalBox.querySelector(`[data-ref="${prefix}-step-calendar"]`);
        const timeText = stepCal ? stepCal.querySelector(`[data-ref="${prefix}-time-text"]`) : null;
        if (timeText) timeText.textContent = `${h}:${m}`;
    }

    updateScheduleInfo(prefix, isoString) {
        if (!this.modalBox || !isoString) return;
        const details = getScheduledTimeDetails(isoString);
        const infoContainer = this.modalBox.querySelector(`[data-ref="${prefix}-schedule-info"]`);
        const dateEl = this.modalBox.querySelector(`[data-ref="${prefix}-info-date"]`);
        const relativeEl = this.modalBox.querySelector(`[data-ref="${prefix}-info-relative"]`);
        const tzEl = this.modalBox.querySelector(`[data-ref="${prefix}-info-tz"]`);
        const iconEl = this.modalBox.querySelector(`[data-ref="${prefix}-info-icon"]`);

        if (dateEl && details.formattedDate) dateEl.textContent = details.formattedDate;
        if (relativeEl) relativeEl.textContent = details.relativeTimeStr;
        if (tzEl) tzEl.textContent = `${details.timezoneString} (${window.__('lbl_timezone_local') || 'Hora local'})`;

        if (infoContainer) {
            if (!details.isAtLeast5Minutes) {
                infoContainer.className = 'component-alert component-alert--error active';
                if (iconEl) iconEl.textContent = 'warning';
            } else {
                infoContainer.className = 'component-alert component-alert--info active';
                if (iconEl) iconEl.textContent = 'schedule';
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // LIVE PRESENCE TAB
    // ─────────────────────────────────────────────────────────────
    renderLivePresence() {
        const container = this.modalBox.querySelector('[data-ref="modal-live-members-scroll"]');
        const navCountBadge = this.modalBox.querySelector('[data-ref="modal-live-nav-count-badge"]');
        const btnToggleText = this.modalBox.querySelector('[data-ref="modal-btn-toggle-cursors-text"]');
        const btnToggleIcon = this.modalBox.querySelector('[data-ref="modal-btn-toggle-cursors-icon"]');

        const t = (k, f) => {
            if (typeof window.__ === 'function') {
                const r = window.__(k);
                if (r && r !== k) return r;
            }
            return f || k;
        };

        if (!this.designNetwork || !this.designNetwork.onlineMembers) {
            if (container) {
                container.innerHTML = CardTemplates.emptyState({
                    icon: 'sensors_off',
                    title: 'Modo en vivo inactivo',
                    message: 'Abre este lienzo en vivo para ver a los colaboradores conectados y sus cursores en tiempo real.'
                });
            }
            if (navCountBadge) navCountBadge.textContent = '0';
            return;
        }

        const onlineMembers = this.designNetwork.onlineMembers;
        const trackedCursors = this.designNetwork.trackedCursorUserIds || new Set();
        const activeTrackedCount = trackedCursors.size;
        const totalOnline = onlineMembers.size;

        if (navCountBadge) navCountBadge.textContent = `${totalOnline}`;

        if (btnToggleText && btnToggleIcon) {
            const areHidden = this.designNetwork.areAllCursorsHidden || activeTrackedCount === 0;
            btnToggleIcon.textContent = areHidden ? 'visibility' : 'visibility_off';
            btnToggleText.textContent = areHidden ? 'Mostrar Todos' : 'Ocultar Todos';
        }

        if (!container) return;

        const myUid = String(window.activeUserId || document.querySelector('meta[name="user-id"]')?.content || 'usr_local');
        const query = (this.liveSearchQuery || '').toLowerCase().trim();
        const appUrl = window.AppBasePath || '';

        let rowsHtml = '';
        let matchCount = 0;

        for (const [uid, member] of onlineMembers.entries()) {
            const name = AvatarUtils.getDisplayName(member, `Usuario_${uid.slice(-4)}`);
            if (query && !name.toLowerCase().includes(query)) continue;

            matchCount++;
            const isSelf = member.isSelf || uid === myUid;
            const isWatching = trackedCursors.has(uid);
            const isDrawing = !!member.isDrawing;
            const userColor = member.color || '#3b82f6';
            const avatar = AvatarUtils.getAvatarUrl(member, name, uid);
            const fallbackAvatar = AvatarUtils.generateDefaultAvatarUrl(name, uid);
            const roleBorder = AvatarUtils.getRoleBorder(member.sub_bg || member.subBg || member.subscription_color ? member : userColor);
            const isOwner = member.role === 'owner' || (this.data.canvasOwnerId && String(this.data.canvasOwnerId) === String(uid));

            let statusBadge = '';
            if (isDrawing) {
                statusBadge = `
                    <div class="component-badge component-badge--primary component-badge--sm">
                        <span class="material-symbols-rounded">brush</span>
                        <span>Dibujando</span>
                    </div>
                `;
            } else if (member.status === 'idle') {
                statusBadge = `
                    <div class="component-badge component-badge--glass component-badge--sm">
                        <span class="material-symbols-rounded">snooze</span>
                        <span>Inactivo</span>
                    </div>
                `;
            } else {
                statusBadge = `
                    <div class="component-badge component-badge--success component-badge--sm">
                        <span class="material-symbols-rounded">radio_button_checked</span>
                        <span>En línea</span>
                    </div>
                `;
            }

            let actionsHtml = '';
            if (!isSelf) {
                actionsHtml = `
                    <div class="component-badge-group" style="justify-content: flex-end;">
                        <button type="button" class="component-button component-button--icon component-button--h28" data-action="modalTeleportToUser" data-user-id="${escapeHTML(uid)}" data-tooltip="Centrar lienzo en su posición" data-position="left">
                            <span class="material-symbols-rounded msr-my_location">my_location</span>
                        </button>
                        <button type="button" class="component-button component-button--icon component-button--h28 ${isWatching ? 'active component-button--primary' : ''}" data-action="modalToggleUserCursor" data-user-id="${escapeHTML(uid)}" data-tooltip="${isWatching ? 'Ocultar cursor' : 'Ver cursor en vivo'}" data-position="left">
                            <span class="material-symbols-rounded">${isWatching ? 'near_me' : 'near_me_disabled'}</span>
                        </button>
                    </div>
                `;
            } else {
                actionsHtml = `
                    <div class="component-badge-group" style="justify-content: flex-end;">
                        <span class="component-badge component-badge--sm component-badge--glass">
                            <span class="material-symbols-rounded">person</span>
                            <span>Tú</span>
                        </span>
                    </div>
                `;
            }

            rowsHtml += `
                <tr class="component-table-row ${isWatching ? 'selected' : ''}" data-user-id="${escapeHTML(uid)}">
                    <td>
                        <div class="td-user-info">
                            <button type="button" class="component-button component-button--profile ${roleBorder.className}" ${roleBorder.subBg ? `data-sub-bg="${escapeHTML(roleBorder.subBg)}"` : ''} style="${escapeHTML(roleBorder.style)}">
                                <img src="${escapeHTML(avatar)}" alt="${escapeHTML(name)}" decoding="async" class="image-lazy-fade image-loaded" onerror="this.onerror=null; this.src='${escapeHTML(fallbackAvatar)}';">
                            </button>
                            <div class="component-user-info-text">
                                <span class="search-target">${escapeHTML(name)} ${isSelf ? '<span class="component-text-muted">(Tú)</span>' : ''}</span>
                                ${isOwner ? '<span class="material-symbols-rounded component-text-warning" title="Creador del lienzo">star</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right;">${actionsHtml}</td>
                </tr>
            `;
        }

        if (matchCount === 0) {
            container.innerHTML = CardTemplates.emptyState({
                icon: 'search_off',
                title: t('lbl_no_results', 'Sin resultados'),
                message: 'No se encontraron colaboradores en vivo coincidentes.'
            });
        } else {
            container.innerHTML = `
                <div class="component-table-wrapper">
                    <table class="component-table">
                        <thead>
                            <tr>
                                <th>${t('table_header_member', 'Colaborador')}</th>
                                <th>${t('table_header_status', 'Estado')}</th>
                                <th style="text-align: right;">${t('table_header_action', 'Acciones')}</th>
                            </tr>
                        </thead>
                        <tbody data-ref="modal-live-members-table-body">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ALL MEMBERS TAB
    // ─────────────────────────────────────────────────────────────
    async loadMembers(page = 1) {
        const container = this.modalBox.querySelector('[data-ref="modal-members-table-container"]');
        const t = (k, f) => {
            if (typeof window.__ === 'function') {
                const r = window.__(k);
                if (r && r !== k) return r;
            }
            return f || k;
        };

        if (container && (!this.membersData || !this.membersData.members)) {
            container.innerHTML = `
                <div class="component-table-wrapper">
                    <table class="component-table">
                        <thead>
                            <tr>
                                <th>${t('table_header_member', 'Miembro')}</th>
                                <th>${t('table_header_role', 'Rol')}</th>
                                <th>${t('table_header_joined', 'Fecha')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.getSkeletonHTML()}
                        </tbody>
                    </table>
                </div>
            `;
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
                if (container) {
                    container.innerHTML = CardTemplates.emptyState({
                        icon: 'error',
                        title: t('lbl_error', 'Error'),
                        message: res?.message || 'Error al cargar miembros.'
                    });
                }
            }
        } catch (err) {
            if (container) {
                container.innerHTML = CardTemplates.emptyState({
                    icon: 'error',
                    title: t('lbl_error', 'Error'),
                    message: 'Error de conexión.'
                });
            }
        }
    }

    renderMembersTable() {
        const container = this.modalBox.querySelector('[data-ref="modal-members-table-container"]');
        if (!container || !this.membersData) return;

        const t = (k, f) => {
            if (typeof window.__ === 'function') {
                const r = window.__(k);
                if (r && r !== k) return r;
            }
            return f || k;
        };

        const members = this.membersData.members || [];
        const userDetails = this.membersData.userDetails || {};
        const memberRoles = this.membersData.memberRoles || {};
        const canvasOwnerId = this.membersData.canvasOwnerId;
        const appUrl = window.AppBasePath || '';

        if (members.length === 0) {
            container.innerHTML = CardTemplates.emptyState({
                icon: 'group_off',
                title: t('lbl_no_members', 'Sin miembros'),
                message: t('lbl_no_members_desc', 'No hay miembros registrados en este lienzo.')
            });
            this.updateSelectionUI();
            this.renderMembersPagination();
            return;
        }

        const query = (this.membersSearchQuery || '').toLowerCase().trim();
        let rowsHtml = '';
        let matchCount = 0;

        members.forEach(member => {
            const uInfo = userDetails[member.user_id] || {};
            const username = AvatarUtils.getDisplayName(uInfo, `Usuario #${member.user_id}`);
            const avatar = AvatarUtils.getAvatarUrl(uInfo, username, member.user_id);
            const fallbackAvatar = AvatarUtils.generateDefaultAvatarUrl(username, member.user_id);
            const roleBorder = AvatarUtils.getRoleBorder(uInfo);
            const userUuidStr = uInfo.uuid || '';
            const isCanvasOwner = member.user_id == canvasOwnerId;

            // Search filter
            if (query && !username.toLowerCase().includes(query)) return;

            matchCount++;
            const isSelected = this.selectedMemberIds.has(String(member.user_id));
            const mRoles = memberRoles[member.user_id] || [];

            let rolesHtml = '';
            if (mRoles.length === 0) {
                rolesHtml = `
                    <div class="component-badge component-badge--sm">
                        <span class="material-symbols-rounded">person_off</span>
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
                    <div class="component-badge-group">
                        <div class="component-badge component-badge--sm">
                            <span class="material-symbols-rounded">${icon}</span>
                            <span>${escapeHTML(roleName)}</span>
                        </div>
                        ${mRoles.length > 1 ? `<span class="component-badge component-badge--sm">+${mRoles.length - 1}</span>` : ''}
                    </div>
                `;
            }

            const joinedDate = member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '-';

            rowsHtml += `
                <tr class="component-table-row ${isSelected ? 'selected' : ''}" data-action="selectModalMember" data-member-id="${escapeHTML(member.user_id)}" data-member-uuid="${escapeHTML(userUuidStr)}">
                    <td>
                        <div class="td-user-info">
                            <button type="button" class="component-button component-button--profile ${roleBorder.className}" ${roleBorder.subBg ? `data-sub-bg="${escapeHTML(roleBorder.subBg)}"` : ''} style="${escapeHTML(roleBorder.style)}">
                                <img src="${escapeHTML(avatar)}" alt="${escapeHTML(username)}" decoding="async" class="image-lazy-fade image-loaded" onerror="this.onerror=null; this.src='${escapeHTML(fallbackAvatar)}';">
                            </button>
                            <div class="component-user-info-text">
                                <span class="search-target">${escapeHTML(username)}</span>
                                ${isCanvasOwner ? '<span class="material-symbols-rounded component-text-warning" title="Creador del lienzo">star</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td>${rolesHtml}</td>
                    <td><span class="component-text-muted">${joinedDate}</span></td>
                </tr>
            `;
        });

        if (matchCount === 0) {
            container.innerHTML = CardTemplates.emptyState({
                icon: 'search_off',
                title: t('lbl_no_results', 'Sin resultados'),
                message: t('lbl_no_results_desc', 'No se encontraron miembros coincidentes.')
            });
        } else {
            container.innerHTML = `
                <div class="component-table-wrapper">
                    <table class="component-table">
                        <thead>
                            <tr>
                                <th>${t('table_header_member', 'Miembro')}</th>
                                <th>${t('table_header_role', 'Rol')}</th>
                                <th>${t('table_header_joined', 'Fecha')}</th>
                            </tr>
                        </thead>
                        <tbody data-ref="modal-members-table-body">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }

        this.updateSelectionUI();
        this.renderMembersPagination();
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
            <span class="component-pagination-indicator">${this.currentPage} / ${this.totalPages}</span>
            <button type="button" class="component-button component-button--icon component-button--h28 ${this.currentPage >= this.totalPages ? 'disabled-interaction' : ''}" data-action="modalMembersNextPage" data-tooltip="Página siguiente">
                <span class="material-symbols-rounded">chevron_right</span>
            </button>
        `;
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
        const selectedBadge = this.modalBox.querySelector('[data-ref="modal-selected-count-badge"]');
        const btnChangeRole = this.modalBox.querySelector('[data-action="modalChangeMemberRole"]');
        const btnRemove = this.modalBox.querySelector('[data-action="modalRemoveMember"]');

        if (!selectionActions) return;

        if (this.selectedMemberIds.size > 0) {
            selectionActions.classList.remove('disabled');
            if (selectedBadge) selectedBadge.textContent = `${this.selectedMemberIds.size} seleccionados`;
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
    // REQUESTS TAB (SELECTION DRIVEN)
    // ─────────────────────────────────────────────────────────────
    async loadRequests() {
        const container = this.modalBox.querySelector('[data-ref="modal-requests-table-container"]');
        const t = (k, f) => {
            if (typeof window.__ === 'function') {
                const r = window.__(k);
                if (r && r !== k) return r;
            }
            return f || k;
        };

        if (container && (!this.requestsList || this.requestsList.length === 0)) {
            container.innerHTML = `
                <div class="component-table-wrapper">
                    <table class="component-table">
                        <thead>
                            <tr>
                                <th>${t('table_header_user', 'Usuario')}</th>
                                <th>${t('table_header_date', 'Fecha')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.getSkeletonHTML()}
                        </tbody>
                    </table>
                </div>
            `;
        }

        try {
            const res = await this.api.getPendingRequests(this.canvasId || this.canvasUuid);
            if (res && res.success && res.data) {
                this.requestsList = res.data;
                const countBadge = this.modalBox.querySelector('[data-ref="modal-requests-count-badge"]');
                if (countBadge) countBadge.textContent = `${this.requestsList.length}`;
                this.renderRequestsTable();
            } else {
                if (container) {
                    container.innerHTML = CardTemplates.emptyState({
                        icon: 'error',
                        title: t('lbl_error', 'Error'),
                        message: res?.message || 'Error al cargar solicitudes.'
                    });
                }
            }
        } catch (err) {
            if (container) {
                container.innerHTML = CardTemplates.emptyState({
                    icon: 'error',
                    title: t('lbl_error', 'Error'),
                    message: 'Error de conexión.'
                });
            }
        }
    }

    renderRequestsTable() {
        const container = this.modalBox.querySelector('[data-ref="modal-requests-table-container"]');
        if (!container) return;

        const t = (k, f) => {
            if (typeof window.__ === 'function') {
                const r = window.__(k);
                if (r && r !== k) return r;
            }
            return f || k;
        };

        if (!this.requestsList || this.requestsList.length === 0) {
            container.innerHTML = CardTemplates.emptyState({
                icon: 'front_hand',
                title: t('lbl_no_requests', 'Sin peticiones'),
                message: t('lbl_no_requests_desc', 'No hay solicitudes pendientes en este momento.')
            });
            this.updateRequestsSelectionUI();
            return;
        }

        const query = (this.requestsSearchQuery || '').toLowerCase().trim();
        let rowsHtml = '';
        let matchCount = 0;

        this.requestsList.forEach(req => {
            const username = req.username || `Usuario #${req.user_id}`;
            if (query && !username.toLowerCase().includes(query)) return;

            matchCount++;
            const isSelected = this.selectedRequestIds.has(String(req.id));
            const reqDate = req.created_at ? new Date(req.created_at).toLocaleDateString() : '-';

            rowsHtml += `
                <tr class="component-table-row ${isSelected ? 'selected' : ''}" data-action="selectModalRequest" data-request-id="${escapeHTML(req.id)}">
                    <td>
                        <div class="td-user-info">
                            <div class="component-badge component-badge--sm">
                                <span class="material-symbols-rounded">person</span>
                                <span>${escapeHTML(username)}</span>
                            </div>
                        </div>
                    </td>
                    <td><span class="component-text-muted">${reqDate}</span></td>
                </tr>
            `;
        });

        if (matchCount === 0) {
            container.innerHTML = CardTemplates.emptyState({
                icon: 'search_off',
                title: t('lbl_no_results', 'Sin resultados'),
                message: t('lbl_no_results_desc', 'No se encontraron solicitudes coincidentes.')
            });
        } else {
            container.innerHTML = `
                <div class="component-table-wrapper">
                    <table class="component-table">
                        <thead>
                            <tr>
                                <th>${t('table_header_user', 'Usuario')}</th>
                                <th>${t('table_header_date', 'Fecha')}</th>
                            </tr>
                        </thead>
                        <tbody data-ref="modal-requests-table-body">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }

        this.updateRequestsSelectionUI();
    }

    handleRequestSelection(row) {
        const reqId = row.getAttribute('data-request-id');
        if (!reqId) return;

        if (this.selectedRequestIds.has(reqId)) {
            this.selectedRequestIds.delete(reqId);
            row.classList.remove('selected');
        } else {
            this.selectedRequestIds.add(reqId);
            row.classList.add('selected');
        }

        this.updateRequestsSelectionUI();
    }

    updateRequestsSelectionUI() {
        const selectionActions = this.modalBox.querySelector('[data-ref="modal-requests-selection-actions"]');
        const badge = this.modalBox.querySelector('[data-ref="modal-requests-selected-badge"]');
        if (!selectionActions) return;

        if (this.selectedRequestIds.size > 0) {
            selectionActions.classList.remove('disabled');
            if (badge) badge.textContent = `${this.selectedRequestIds.size} seleccionadas`;
        } else {
            selectionActions.classList.add('disabled');
        }
    }

    async processSelectedRequests(type, btn) {
        if (this.selectedRequestIds.size === 0) return;

        if (btn) setButtonLoading(btn);

        let successCount = 0;
        let failCount = 0;

        for (const reqId of this.selectedRequestIds) {
            try {
                let res;
                if (type === 'approve') {
                    res = await this.api.approveCanvasRequest(reqId);
                } else {
                    res = await this.api.rejectCanvasRequest(reqId);
                }

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
            const actionMsg = type === 'approve'
                ? `Se aprobaron ${successCount} solicitud(es) con éxito.`
                : `Se rechazaron ${successCount} solicitud(es).`;
            showMessage(actionMsg, 'success');
            this.selectedRequestIds.clear();
            this.loadRequests();
            if (type === 'approve') {
                this.loadMembers(this.currentPage);
            }
        }
        if (failCount > 0) {
            showMessage(`Hubo un error al procesar ${failCount} solicitud(es).`, 'warning');
        }
    }

    // ─────────────────────────────────────────────────────────────
    // INVITES TAB (SELECTION DRIVEN)
    // ─────────────────────────────────────────────────────────────
    async loadInvites() {
        const container = this.modalBox.querySelector('[data-ref="modal-invites-table-container"]');
        const countBadge = this.modalBox.querySelector('[data-ref="modal-invites-count-badge"]');

        if (container && (!this.invitesList || this.invitesList.length === 0)) {
            container.innerHTML = `
                <div class="component-table-wrapper">
                    <table class="component-table">
                        <thead>
                            <tr>
                                <th>${window.__('lbl_invite_code') || 'Código'}</th>
                                <th>${window.__('table_header_role') || 'Rol'}</th>
                                <th>${window.__('lbl_uses') || 'Usos'}</th>
                                <th>${window.__('lbl_expires') || 'Expira'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.getSkeletonHTML()}
                        </tbody>
                    </table>
                </div>
            `;
        }

        try {
            const canvasTarget = this.canvasId || this.canvasUuid;
            const res = await this.api.listInvites(canvasTarget);
            if (res && res.success && res.data) {
                this.invitesList = Array.isArray(res.data) ? res.data : [];
                if (countBadge) countBadge.textContent = `${this.invitesList.length}`;
                this.renderInvitesTable();
            } else {
                if (container) {
                    container.innerHTML = CardTemplates.emptyState({
                        icon: 'link_off',
                        title: 'Sin invitaciones',
                        message: res?.message || 'Crea enlaces para invitar a nuevos colaboradores.'
                    });
                }
            }
        } catch (err) {
            if (container) {
                container.innerHTML = CardTemplates.emptyState({
                    icon: 'error',
                    title: 'Error',
                    message: 'Error al cargar las invitaciones.'
                });
            }
        }
    }

    renderInvitesTable() {
        const container = this.modalBox.querySelector('[data-ref="modal-invites-table-container"]');
        if (!container) return;

        if (!this.invitesList || this.invitesList.length === 0) {
            container.innerHTML = CardTemplates.emptyState({
                icon: 'link_off',
                title: 'Sin invitaciones activas',
                message: 'Genera un enlace para permitir que otros usuarios se unan a este lienzo.'
            });
            this.updateInvitesSelectionUI();
            return;
        }

        const query = (this.invitesSearchQuery || '').toLowerCase().trim();
        let rowsHtml = '';
        let matchCount = 0;

        this.invitesList.forEach(invite => {
            const code = invite.code || '';
            const roleName = invite.role_name || invite.role || 'Member';
            if (query && !code.toLowerCase().includes(query) && !roleName.toLowerCase().includes(query)) return;

            matchCount++;
            const isSelected = this.selectedInviteIds.has(String(invite.id));
            const maxUsesStr = invite.max_uses !== null ? `${invite.uses_count} / ${invite.max_uses}` : `${invite.uses_count} / ∞`;
            const expiresStr = invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : 'Nunca';

            rowsHtml += `
                <tr class="component-table-row ${isSelected ? 'selected' : ''}" data-action="selectModalInvite" data-invite-id="${escapeHTML(invite.id)}" data-code="${escapeHTML(code)}">
                    <td>
                        <div class="component-badge component-badge--primary">
                            <span class="material-symbols-rounded">link</span>
                            <span class="search-target">${escapeHTML(code)}</span>
                        </div>
                    </td>
                    <td>
                        <div class="component-badge component-badge--sm">
                            <span class="material-symbols-rounded">badge</span>
                            <span>${escapeHTML(roleName)}</span>
                        </div>
                    </td>
                    <td><span class="component-text-muted">${maxUsesStr}</span></td>
                    <td><span class="component-text-muted">${expiresStr}</span></td>
                </tr>
            `;
        });

        if (matchCount === 0) {
            container.innerHTML = CardTemplates.emptyState({
                icon: 'search_off',
                title: 'Sin resultados',
                message: 'No se encontraron invitaciones coincidentes.'
            });
        } else {
            container.innerHTML = `
                <div class="component-table-wrapper">
                    <table class="component-table">
                        <thead>
                            <tr>
                                <th>${window.__('lbl_invite_code') || 'Código'}</th>
                                <th>${window.__('table_header_role') || 'Rol'}</th>
                                <th>${window.__('lbl_uses') || 'Usos'}</th>
                                <th>${window.__('lbl_expires') || 'Expira'}</th>
                            </tr>
                        </thead>
                        <tbody data-ref="modal-invites-table-body">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }

        this.updateInvitesSelectionUI();
    }

    handleInviteSelection(row) {
        const inviteId = row.getAttribute('data-invite-id');
        if (!inviteId) return;

        if (this.selectedInviteIds.has(inviteId)) {
            this.selectedInviteIds.delete(inviteId);
            row.classList.remove('selected');
        } else {
            this.selectedInviteIds.add(inviteId);
            row.classList.add('selected');
        }

        this.updateInvitesSelectionUI();
    }

    updateInvitesSelectionUI() {
        const selectionActions = this.modalBox.querySelector('[data-ref="modal-invites-selection-actions"]');
        const badge = this.modalBox.querySelector('[data-ref="modal-invites-selected-badge"]');
        if (!selectionActions) return;

        if (this.selectedInviteIds.size > 0) {
            selectionActions.classList.remove('disabled');
            if (badge) badge.textContent = `${this.selectedInviteIds.size} seleccionados`;
        } else {
            selectionActions.classList.add('disabled');
        }
    }

    copyInviteCode(code) {
        if (!code) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => {
                showMessage(window.__('msg_copied_clipboard') || 'Código copiado al portapapeles.', 'success');
            }).catch(() => {
                showMessage(`Código: ${code}`, 'info');
            });
        } else {
            showMessage(`Código: ${code}`, 'info');
        }
    }

    async revokeInvite(inviteId, btn) {
        if (!inviteId) return;
        if (btn) setButtonLoading(btn);

        try {
            const canvasTarget = this.canvasId || this.canvasUuid;
            const res = await this.api.revokeInvite(canvasTarget, inviteId);
            if (btn) restoreButton(btn);

            if (res && res.success) {
                showMessage(res.message || 'Invitación revocada con éxito.', 'success');
                this.selectedInviteIds.delete(String(inviteId));
                this.loadInvites();
            } else {
                showMessage(res?.message || 'Error al revocar la invitación.', 'error');
            }
        } catch (err) {
            if (btn) restoreButton(btn);
            showMessage('Error al revocar la invitación.', 'error');
        }
    }

    async openGenerateInviteModal() {
        const roles = (this.rolesData && this.rolesData.roles) ? this.rolesData.roles : [];
        const result = await window.modalSystem.show('generateCanvasInviteModal', {
            canvasId: this.canvasId,
            canvasUuid: this.canvasUuid,
            roles: roles
        });

        if (result && result.confirmed && result.data) {
            const role = result.data.role || 'Member';
            const maxUses = result.data.max_uses;
            const expiresAt = result.data.expires_at;

            try {
                const canvasTarget = this.canvasId || this.canvasUuid;
                const res = await this.api.generateInvite(canvasTarget, role, maxUses, expiresAt);
                if (res && res.success) {
                    showMessage(res.message || 'Invitación generada con éxito.', 'success');
                    this.loadInvites();
                } else {
                    showMessage(res?.message || 'Error al generar invitación.', 'error');
                }
            } catch (e) {
                showMessage('Error de conexión al generar invitación.', 'error');
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ROLES & PERMISSIONS TAB (SELECTION DRIVEN)
    // ─────────────────────────────────────────────────────────────
    async loadRoles() {
        const container = this.modalBox.querySelector('[data-ref="modal-roles-table-container"]');
        const countBadge = this.modalBox.querySelector('[data-ref="modal-roles-count-badge"]');

        if (container && (!this.rolesData || !this.rolesData.roles)) {
            container.innerHTML = `
                <div class="component-table-wrapper">
                    <table class="component-table">
                        <thead>
                            <tr>
                                <th>${window.__('table_header_role') || 'Rol'}</th>
                                <th>${window.__('lbl_custom_role_weight') || 'Jerarquía'}</th>
                                <th>${window.__('lbl_type') || 'Tipo'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.getSkeletonHTML()}
                        </tbody>
                    </table>
                </div>
            `;
        }

        try {
            const canvasTarget = this.canvasUuid || this.canvasId;
            const res = await this.api.getRoles(canvasTarget);
            if (res && res.success && res.data) {
                this.rolesData = res.data;
                const roles = res.data.roles || [];
                if (countBadge) countBadge.textContent = `${roles.length}`;
                this.renderRolesTable();
            } else {
                if (container) {
                    container.innerHTML = CardTemplates.emptyState({
                        icon: 'shield',
                        title: 'Roles del lienzo',
                        message: res?.message || 'No se pudieron cargar los roles.'
                    });
                }
            }
        } catch (err) {
            if (container) {
                container.innerHTML = CardTemplates.emptyState({
                    icon: 'error',
                    title: 'Error',
                    message: 'Error al conectar con los roles.'
                });
            }
        }
    }

    getRoleById(roleId) {
        if (!this.rolesData || !this.rolesData.roles) return null;
        return this.rolesData.roles.find(r => String(r.id) === String(roleId) || String(r.uuid) === String(roleId));
    }

    showRolesListView() {
        this.rolesSubView = 'list';
        const tableContainer = this.modalBox.querySelector('[data-ref="modal-roles-table-container"]');
        const builderSubview = this.modalBox.querySelector('[data-ref="modal-role-builder-subview"]');
        const permsSubview = this.modalBox.querySelector('[data-ref="modal-role-permissions-subview"]');
        const createBtn = this.modalBox.querySelector('[data-ref="modal-btn-create-role"]');
        const searchContainer = this.modalBox.querySelector('[data-ref="modal-search-container"]');

        if (tableContainer) tableContainer.classList.remove('disabled');
        if (builderSubview) builderSubview.classList.add('disabled');
        if (permsSubview) permsSubview.classList.add('disabled');
        if (createBtn) createBtn.classList.remove('disabled');
        if (searchContainer && this.userTier >= 2) searchContainer.classList.remove('disabled');

        this.updateBottomBar();
        this.renderRolesTable();
    }

    renderRolesTable() {
        const container = this.modalBox.querySelector('[data-ref="modal-roles-table-container"]');
        if (!container || !this.rolesData) return;

        const roles = this.rolesData.roles || [];
        if (roles.length === 0) {
            container.innerHTML = CardTemplates.emptyState({
                icon: 'shield',
                title: 'Sin roles configurados',
                message: 'Crea roles personalizados para asignar permisos a tus colaboradores.'
            });
            this.updateRolesSelectionUI();
            return;
        }

        const query = (this.rolesSearchQuery || '').toLowerCase().trim();
        let rowsHtml = '';
        let matchCount = 0;

        roles.forEach(role => {
            const rawName = role.name || '';
            const isSystem = (role.is_system == 1 || role.canvas_id === null);
            let displayName = rawName;
            if (isSystem) {
                const roleKey = 'role.' + rawName.toLowerCase().trim().replace(/[\s\W_]+/g, '_');
                displayName = window.__(roleKey) || rawName;
            }

            if (query && !displayName.toLowerCase().includes(query) && !rawName.toLowerCase().includes(query)) return;

            matchCount++;
            const isSelected = this.selectedRoleIds.has(String(role.id));
            const weight = role.weight ?? 10;

            rowsHtml += `
                <tr class="component-table-row ${isSelected ? 'selected' : ''}" data-action="selectModalRole" data-role-id="${escapeHTML(role.id)}" data-is-system="${isSystem ? '1' : '0'}">
                    <td>
                        <div class="td-user-info">
                            <div class="component-badge component-badge--sm">
                                <span class="material-symbols-rounded">${isSystem ? 'shield_person' : 'star'}</span>
                                <span class="search-target">${escapeHTML(displayName)}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="component-badge component-badge--sm">
                            <span>Nivel ${weight}</span>
                        </div>
                    </td>
                    <td>
                        <span class="component-badge ${isSystem ? 'component-badge--primary' : 'component-badge--glass'} component-badge--sm">
                            ${isSystem ? 'Sistema' : 'Personalizado'}
                        </span>
                    </td>
                </tr>
            `;
        });

        if (matchCount === 0) {
            container.innerHTML = CardTemplates.emptyState({
                icon: 'search_off',
                title: 'Sin resultados',
                message: 'No se encontraron roles coincidentes.'
            });
        } else {
            container.innerHTML = `
                <div class="component-table-wrapper">
                    <table class="component-table">
                        <thead>
                            <tr>
                                <th>${window.__('table_header_role') || 'Rol'}</th>
                                <th>${window.__('lbl_custom_role_weight') || 'Jerarquía'}</th>
                                <th>${window.__('lbl_type') || 'Tipo'}</th>
                            </tr>
                        </thead>
                        <tbody data-ref="modal-roles-table-body">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }

        this.updateRolesSelectionUI();
    }

    handleRoleSelection(row) {
        const roleId = row.getAttribute('data-role-id');
        if (!roleId) return;

        if (this.selectedRoleIds.has(roleId)) {
            this.selectedRoleIds.delete(roleId);
            row.classList.remove('selected');
        } else {
            this.selectedRoleIds.add(roleId);
            row.classList.add('selected');
        }

        this.updateRolesSelectionUI();
    }

    updateRolesSelectionUI() {
        const selectionActions = this.modalBox.querySelector('[data-ref="modal-roles-selection-actions"]');
        const badge = this.modalBox.querySelector('[data-ref="modal-roles-selected-badge"]');
        const btnDelete = this.modalBox.querySelector('[data-action="modalDeleteSelectedRole"]');
        if (!selectionActions) return;

        if (this.selectedRoleIds.size > 0) {
            selectionActions.classList.remove('disabled');
            if (badge) badge.textContent = `${this.selectedRoleIds.size} seleccionados`;

            const targetRoleId = Array.from(this.selectedRoleIds)[0];
            const role = this.getRoleById(targetRoleId);
            const isSystem = role ? (role.is_system == 1 || role.canvas_id === null) : false;
            if (btnDelete) {
                if (isSystem) btnDelete.classList.add('disabled-interaction');
                else btnDelete.classList.remove('disabled-interaction');
            }
        } else {
            selectionActions.classList.add('disabled');
        }
    }

    openRoleBuilder(role = null) {
        this.editingRole = role;
        this.rolesSubView = 'builder';
        const tableContainer = this.modalBox.querySelector('[data-ref="modal-roles-table-container"]');
        const builderSubview = this.modalBox.querySelector('[data-ref="modal-role-builder-subview"]');
        const createBtn = this.modalBox.querySelector('[data-ref="modal-btn-create-role"]');
        const searchContainer = this.modalBox.querySelector('[data-ref="modal-search-container"]');

        if (tableContainer) tableContainer.classList.add('disabled');
        if (createBtn) createBtn.classList.add('disabled');
        if (searchContainer) searchContainer.classList.add('disabled');
        if (!builderSubview) return;

        builderSubview.classList.remove('disabled');

        const isEditing = !!role;
        const isSystem = role ? (role.is_system == 1 || role.canvas_id === null) : false;
        const currentName = role ? role.name : '';
        const currentWeight = role ? (role.weight ?? 10) : 10;

        builderSubview.innerHTML = `
            <div class="component-card--grouped">
                <div class="component-group-item">
                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="modalBackToRolesList">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </button>
                    <div class="component-card__text">
                        <h2 class="component-card__title">${isEditing ? `Editar rol: ${escapeHTML(currentName)}` : 'Crear nuevo rol'}</h2>
                        <p class="component-card__description">Configura el nombre y nivel jerárquico del rol.</p>
                    </div>
                </div>

                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h3 class="component-card__title">Nombre del rol</h3>
                            <p class="component-card__description">Identificador visible para los colaboradores.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <div class="component-input component-input--w-full">
                            <input type="text" data-ref="modal-role-name-input" value="${escapeHTML(currentName)}" placeholder="Ej. Diseñador Senior" ${isSystem ? 'disabled' : ''}>
                        </div>
                    </div>
                </div>

                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h3 class="component-card__title">Jerarquía de moderación (1 a 100)</h3>
                            <p class="component-card__description">Los roles con mayor nivel tienen prioridad sobre los inferiores.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <div class="component-inline-control">
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustModalRoleWeight" data-step="-5" ${isSystem ? 'disabled' : ''}>
                                    <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                </button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustModalRoleWeight" data-step="-1" ${isSystem ? 'disabled' : ''}>
                                    <span class="material-symbols-rounded">chevron_left</span>
                                </button>
                            </div>
                            <div class="component-inline-control__center" data-ref="modal-role-weight-val" data-value="${currentWeight}">${currentWeight}</div>
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustModalRoleWeight" data-step="1" ${isSystem ? 'disabled' : ''}>
                                    <span class="material-symbols-rounded">chevron_right</span>
                                </button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustModalRoleWeight" data-step="5" ${isSystem ? 'disabled' : ''}>
                                    <span class="material-symbols-rounded">keyboard_double_arrow_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.updateBottomBar();
    }

    adjustRoleWeight(step) {
        const valEl = this.modalBox.querySelector('[data-ref="modal-role-weight-val"]');
        if (!valEl) return;
        let w = parseInt(valEl.getAttribute('data-value') || '10', 10);
        w = Math.min(100, Math.max(1, w + step));
        valEl.setAttribute('data-value', w);
        valEl.textContent = `${w}`;
    }

    async saveRoleData(btn) {
        const nameInput = this.modalBox.querySelector('[data-ref="modal-role-name-input"]');
        const weightEl = this.modalBox.querySelector('[data-ref="modal-role-weight-val"]');
        const name = nameInput ? nameInput.value.trim() : '';
        const weight = weightEl ? parseInt(weightEl.getAttribute('data-value') || '10', 10) : 10;

        if (!name) {
            showMessage(window.__('err_validation_missing_fields') || 'Por favor ingresa un nombre para el rol.', 'warning');
            return;
        }

        setButtonLoading(btn);

        try {
            const canvasTarget = this.canvasId || this.canvasUuid;
            let res;
            if (this.editingRole && this.editingRole.id) {
                res = await this.api.updateRole(canvasTarget, this.editingRole.id, name, null, weight);
            } else {
                res = await this.api.createRole(canvasTarget, name, [], weight);
            }
            restoreButton(btn);

            if (res && res.success) {
                showMessage(res.message || 'Rol guardado con éxito.', 'success');
                this.showRolesListView();
                this.loadRoles();
            } else {
                showMessage(res?.message || 'Error al guardar el rol.', 'error');
            }
        } catch (err) {
            restoreButton(btn);
            showMessage('Error al guardar el rol.', 'error');
        }
    }

    async openRolePermissions(role) {
        this.editingRole = role;
        this.rolesSubView = 'permissions';
        const tableContainer = this.modalBox.querySelector('[data-ref="modal-roles-table-container"]');
        const permsSubview = this.modalBox.querySelector('[data-ref="modal-role-permissions-subview"]');
        const createBtn = this.modalBox.querySelector('[data-ref="modal-btn-create-role"]');
        const searchContainer = this.modalBox.querySelector('[data-ref="modal-search-container"]');

        if (tableContainer) tableContainer.classList.add('disabled');
        if (createBtn) createBtn.classList.add('disabled');
        if (searchContainer) searchContainer.classList.add('disabled');
        if (!permsSubview) return;

        permsSubview.classList.remove('disabled');
        permsSubview.innerHTML = `
            <div class="component-card--grouped">
                <div class="component-group-item">
                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="modalBackToRolesList">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </button>
                    <div class="component-card__text">
                        <h2 class="component-card__title">Permisos del rol: ${escapeHTML(role.name)}</h2>
                        <p class="component-card__description">Cargando matriz de permisos...</p>
                    </div>
                </div>
            </div>
        `;

        this.updateBottomBar();

        try {
            let allPerms = this.allPermissions;
            if (!allPerms || allPerms.length === 0) {
                const canvasTarget = this.canvasId || this.canvasUuid;
                const res = await this.api.getPermissions(canvasTarget);
                allPerms = (res && res.success && res.data) ? res.data : [];
                this.allPermissions = allPerms;
            }

            // Get role current permissions
            const rolePerms = role.permissions || [];
            let permItemsHtml = '';

            allPerms.forEach(perm => {
                const isChecked = rolePerms.includes(perm.id) || rolePerms.includes(perm.name);
                permItemsHtml += `
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h3 class="component-card__title">${escapeHTML(perm.name)}</h3>
                                <p class="component-card__description">${escapeHTML(perm.description || 'Permiso para realizar acciones en el lienzo.')}</p>
                            </div>
                        </div>
                        <div class="component-card__actions">
                            <label class="component-toggle">
                                <input type="checkbox" data-ref="modalPermCheckbox" value="${perm.id}" ${isChecked ? 'checked' : ''}>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                `;
            });

            permsSubview.innerHTML = `
                <div class="component-card--grouped">
                    <div class="component-group-item">
                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="modalBackToRolesList">
                            <span class="material-symbols-rounded">arrow_back</span>
                        </button>
                        <div class="component-card__text">
                            <h2 class="component-card__title">Permisos del rol: ${escapeHTML(role.name)}</h2>
                            <p class="component-card__description">Activa o desactiva las capacidades de este rol en el lienzo.</p>
                        </div>
                    </div>
                    ${permItemsHtml}
                </div>
            `;
            this.updateBottomBar();
        } catch (err) {
            permsSubview.innerHTML = `
                <div class="component-alert component-alert--error active">
                    <div class="component-alert-text">Error al cargar los permisos.</div>
                </div>
            `;
            this.updateBottomBar();
        }
    }

    async saveRolePermissions(btn) {
        if (!this.editingRole || !this.editingRole.id) return;

        const checkboxes = this.modalBox.querySelectorAll('input[data-ref="modalPermCheckbox"]:checked');
        const selectedPermIds = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

        setButtonLoading(btn);

        try {
            const canvasTarget = this.canvasId || this.canvasUuid;
            const res = await this.api.updateRolePermissions(canvasTarget, this.editingRole.id, selectedPermIds);
            restoreButton(btn);

            if (res && res.success) {
                showMessage(res.message || 'Permisos actualizados con éxito.', 'success');
                this.showRolesListView();
                this.loadRoles();
            } else {
                showMessage(res?.message || 'Error al guardar los permisos.', 'error');
            }
        } catch (err) {
            restoreButton(btn);
            showMessage('Error al guardar los permisos.', 'error');
        }
    }

    async deleteRole(roleId, btn) {
        if (!roleId) return;

        const role = this.getRoleById(roleId);
        if (role && (role.is_system == 1 || role.canvas_id === null)) {
            showMessage('No se pueden eliminar roles base del sistema.', 'warning');
            return;
        }

        if (btn) setButtonLoading(btn);

        try {
            const canvasTarget = this.canvasId || this.canvasUuid;
            const res = await this.api.deleteRole(canvasTarget, roleId);
            if (btn) restoreButton(btn);

            if (res && res.success) {
                showMessage(res.message || 'Rol eliminado con éxito.', 'success');
                this.selectedRoleIds.delete(String(roleId));
                this.loadRoles();
            } else {
                showMessage(res?.message || 'Error al eliminar el rol.', 'error');
            }
        } catch (err) {
            if (btn) restoreButton(btn);
            showMessage('Error al eliminar el rol.', 'error');
        }
    }

    // ─────────────────────────────────────────────────────────────
    // SANCTIONS TAB (SELECTION DRIVEN)
    // ─────────────────────────────────────────────────────────────
    async loadSanctions(page = 1) {
        const container = this.modalBox.querySelector('[data-ref="modal-sanctions-table-container"]');
        const countBadge = this.modalBox.querySelector('[data-ref="modal-sanctions-count-badge"]');

        if (container && (!this.sanctionsData || !this.sanctionsData.userList)) {
            container.innerHTML = `
                <div class="component-table-wrapper">
                    <table class="component-table">
                        <thead>
                            <tr>
                                <th>${window.__('table_header_user') || 'Usuario'}</th>
                                <th>${window.__('lbl_status') || 'Estado'}</th>
                                <th>${window.__('lbl_sanction_scope') || 'Alcance'}</th>
                                <th>${window.__('lbl_duration') || 'Duración'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.getSkeletonHTML()}
                        </tbody>
                    </table>
                </div>
            `;
        }

        try {
            const canvasTarget = this.canvasUuid || this.canvasId;
            const res = await this.api.getSanctions(canvasTarget, page);
            if (res && res.success && res.data) {
                this.sanctionsData = res.data;
                const totalSanctioned = res.data.totalItems || (res.data.userList ? res.data.userList.length : 0);
                if (countBadge) countBadge.textContent = `${totalSanctioned}`;
                this.renderSanctionsTable();
            } else {
                if (container) {
                    container.innerHTML = CardTemplates.emptyState({
                        icon: 'gavel',
                        title: 'Sanciones del lienzo',
                        message: res?.message || 'No se pudieron cargar las sanciones.'
                    });
                }
            }
        } catch (err) {
            if (container) {
                container.innerHTML = CardTemplates.emptyState({
                    icon: 'error',
                    title: 'Error',
                    message: 'Error al conectar con las sanciones.'
                });
            }
        }
    }

    renderSanctionsTable() {
        const container = this.modalBox.querySelector('[data-ref="modal-sanctions-table-container"]');
        if (!container || !this.sanctionsData) return;

        const userList = this.sanctionsData.userList || [];
        const userDetails = this.sanctionsData.userDetails || {};
        const appUrl = window.AppBasePath || '';

        if (userList.length === 0) {
            container.innerHTML = CardTemplates.emptyState({
                icon: 'gavel',
                title: 'Sin sanciones activas',
                message: 'No hay usuarios sancionados o suspendidos en este lienzo.'
            });
            this.updateSanctionsSelectionUI();
            return;
        }

        const query = (this.sanctionsSearchQuery || '').toLowerCase().trim();
        let rowsHtml = '';
        let matchCount = 0;

        userList.forEach(item => {
            const uInfo = userDetails[item.user_id] || {};
            const username = AvatarUtils.getDisplayName(uInfo, `Usuario #${item.user_id}`);
            const avatar = AvatarUtils.getAvatarUrl(uInfo, username, item.user_id);
            const fallbackAvatar = AvatarUtils.generateDefaultAvatarUrl(username, item.user_id);
            const roleBorder = AvatarUtils.getRoleBorder(uInfo);
            const restrictions = item.restrictions || [];
            const hasSanction = restrictions.length > 0;

            if (query && !username.toLowerCase().includes(query)) return;

            matchCount++;
            const isSelected = this.selectedSanctionUserIds.has(String(item.user_id));

            let scopeStr = 'Sin restricción';
            let typeStr = '-';
            let statusBadge = '<span class="component-badge component-badge--success component-badge--sm">Limpio</span>';

            if (hasSanction) {
                const primarySanction = restrictions[0];
                const scope = primarySanction.sanction_scope;
                const type = primarySanction.suspension_type;
                const endDate = primarySanction.end_date;

                scopeStr = (scope === 'canvas_ban') ? 'Expulsión del lienzo' : 'Mute de chat';
                typeStr = (type === 'permanent') ? 'Permanente' : (endDate ? new Date(endDate).toLocaleDateString() : 'Temporal');
                statusBadge = `<span class="component-badge component-badge--danger component-badge--sm">${scopeStr}</span>`;
            }

            rowsHtml += `
                <tr class="component-table-row ${isSelected ? 'selected' : ''}" data-action="selectModalSanction" data-user-id="${escapeHTML(item.user_id)}" data-has-sanction="${hasSanction ? '1' : '0'}" data-username="${escapeHTML(username)}">
                    <td>
                        <div class="td-user-info">
                            <button type="button" class="component-button component-button--profile ${roleBorder.className}" ${roleBorder.subBg ? `data-sub-bg="${escapeHTML(roleBorder.subBg)}"` : ''} style="${escapeHTML(roleBorder.style)}">
                                <img src="${escapeHTML(avatar)}" alt="${escapeHTML(username)}" decoding="async" class="image-lazy-fade image-loaded" onerror="this.onerror=null; this.src='${escapeHTML(fallbackAvatar)}';">
                            </button>
                            <div class="component-user-info-text">
                                <span class="search-target">${escapeHTML(username)}</span>
                            </div>
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td><span class="component-text-muted">${scopeStr}</span></td>
                    <td><span class="component-text-muted">${typeStr}</span></td>
                </tr>
            `;
        });

        if (matchCount === 0) {
            container.innerHTML = CardTemplates.emptyState({
                icon: 'search_off',
                title: 'Sin resultados',
                message: 'No se encontraron usuarios coincidentes.'
            });
        } else {
            container.innerHTML = `
                <div class="component-table-wrapper">
                    <table class="component-table">
                        <thead>
                            <tr>
                                <th>${window.__('table_header_user') || 'Usuario'}</th>
                                <th>${window.__('lbl_status') || 'Estado'}</th>
                                <th>${window.__('lbl_sanction_scope') || 'Alcance'}</th>
                                <th>${window.__('lbl_duration') || 'Duración'}</th>
                            </tr>
                        </thead>
                        <tbody data-ref="modal-sanctions-table-body">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }

        this.updateSanctionsSelectionUI();
    }

    handleSanctionSelection(row) {
        const userId = row.getAttribute('data-user-id');
        if (!userId) return;

        if (this.selectedSanctionUserIds.has(userId)) {
            this.selectedSanctionUserIds.delete(userId);
            row.classList.remove('selected');
        } else {
            this.selectedSanctionUserIds.add(userId);
            row.classList.add('selected');
        }

        this.updateSanctionsSelectionUI();
    }

    updateSanctionsSelectionUI() {
        const selectionActions = this.modalBox.querySelector('[data-ref="modal-sanctions-selection-actions"]');
        const badge = this.modalBox.querySelector('[data-ref="modal-sanctions-selected-badge"]');
        const btnLift = this.modalBox.querySelector('[data-action="modalLiftSelectedSanction"]');
        if (!selectionActions) return;

        if (this.selectedSanctionUserIds.size > 0) {
            selectionActions.classList.remove('disabled');
            if (badge) badge.textContent = `${this.selectedSanctionUserIds.size} seleccionados`;

            const targetUserId = Array.from(this.selectedSanctionUserIds)[0];
            const row = this.modalBox.querySelector(`[data-user-id="${targetUserId}"]`);
            const hasSanction = row ? (row.getAttribute('data-has-sanction') === '1') : false;

            if (btnLift) {
                if (hasSanction) btnLift.classList.remove('disabled-interaction');
                else btnLift.classList.add('disabled-interaction');
            }
        } else {
            selectionActions.classList.add('disabled');
        }
    }

    async openEditSanctionModal(userId) {
        const targetRow = this.modalBox.querySelector(`[data-user-id="${userId}"]`);
        const username = targetRow ? targetRow.getAttribute('data-username') : `Usuario #${userId}`;

        const resultDialog = await window.modalSystem.show('manageSanctionModal', {
            username: username,
            sanctionScope: 'chat_mute',
            suspensionType: 'temporary',
            suspensionReason: '',
            endDate: ''
        });

        if (!resultDialog || !resultDialog.confirmed) return;

        const passwordDialog = await window.modalSystem.show('verifyPasswordUpdateStatus', { asyncConfirm: true });
        if (!passwordDialog || !passwordDialog.confirmed) return;

        const formData = resultDialog.data || {};
        const payload = {
            canvas_id: this.canvasId || this.canvasUuid,
            target_user_id: userId,
            is_suspended: '1',
            sanction_scope: formData.sanctionScope || 'chat_mute',
            suspension_type: formData.suspensionType || 'temporary',
            suspension_reason: formData.suspensionReason || 'other',
            end_date: formData.endDate || null,
            password: passwordDialog.password || '',
            credential: passwordDialog.credential || ''
        };

        try {
            const res = await this.api.updateSanction(payload);
            if (res && res.status === 'success') {
                showMessage(res.message || 'Sanción aplicada con éxito.', 'success');
                this.loadSanctions(this.sanctionsPage);
            } else {
                showMessage(res?.message || 'Error al aplicar la sanción.', 'error');
            }
        } catch (e) {
            showMessage('Error al conectar para aplicar sanción.', 'error');
        }
    }

    async liftSanction(userId, btn) {
        const passwordDialog = await window.modalSystem.show('verifyPasswordUpdateStatus', { asyncConfirm: true });
        if (!passwordDialog || !passwordDialog.confirmed) return;

        if (btn) setButtonLoading(btn);

        const payload = {
            canvas_id: this.canvasId || this.canvasUuid,
            target_user_id: userId,
            is_suspended: '0',
            sanction_scope: 'chat_mute',
            password: passwordDialog.password || '',
            credential: passwordDialog.credential || ''
        };

        try {
            const res = await this.api.updateSanction(payload);
            if (btn) restoreButton(btn);

            if (res && res.status === 'success') {
                showMessage(res.message || 'Sanción levantada con éxito.', 'success');
                this.selectedSanctionUserIds.delete(String(userId));
                this.loadSanctions(this.sanctionsPage);
            } else {
                showMessage(res?.message || 'Error al levantar la sanción.', 'error');
            }
        } catch (e) {
            if (btn) restoreButton(btn);
            showMessage('Error al conectar para levantar la sanción.', 'error');
        }
    }

    // ─────────────────────────────────────────────────────────────
    // EDIT CANVAS TAB
    // ─────────────────────────────────────────────────────────────
    handlePaletteCreated(e) {
        if (e.detail?.palette_key) {
            this.setEditPalette(e.detail.palette_key);
        }
    }

    async loadEditData() {
        try {
            const targetId = this.canvasId || this.canvasUuid;
            if (!targetId) return;

            const res = await this.genericApi.post(ApiRoutes.Canvases.Get, { id: targetId });
            if (res && res.success && res.data) {
                const data = res.data;
                let tags = [];
                if (data.tags) {
                    tags = Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' ? (JSON.parse(data.tags) || []) : []);
                }

                this.editState = {
                    name: data.name || this.canvasTitle || '',
                    privacy: data.privacy || 'private',
                    requires_approval: !!data.requires_approval,
                    palette_id: data.palette_id || 'default',
                    max_members: parseInt(data.max_members ?? (data.max_participants ?? 10), 10),
                    cooldown_pixels_batch: parseInt(data.cooldown_pixels_batch ?? 5, 10),
                    cooldown_seconds: parseInt(data.cooldown_seconds ?? 10, 10),
                    allow_chat: (data.allow_chat === 1 || data.allow_chat === true || data.allow_chat === '1') ? 1 : 0,
                    tags: tags,
                    isLoaded: true
                };

                this.canvasTitle = this.editState.name;
                const titleEl = this.modalBox.querySelector('.component-modal-title');
                if (titleEl) titleEl.textContent = this.editState.name;

                this.renderEditData();
            }
        } catch (err) {
            // Keep current/default state
        }
    }

    renderEditData() {
        if (!this.modalBox) return;

        const t = (k, f) => {
            if (typeof window.__ === 'function') {
                const r = window.__(k);
                if (r && r !== k) return r;
            }
            return f || k;
        };

        // 1. Name
        const displayVal = this.modalBox.querySelector('[data-ref="display-canvasname"]');
        const inputVal = this.modalBox.querySelector('[data-ref="input-canvasname"]');
        if (displayVal) displayVal.textContent = this.editState.name;
        if (inputVal) {
            inputVal.value = this.editState.name;
            inputVal.setAttribute('data-original-value', this.editState.name);
        }

        // 2. Tags
        const tagsWrapper = this.modalBox.querySelector('[data-ref="modal-edit-tags-list"]');
        if (tagsWrapper) {
            const links = tagsWrapper.querySelectorAll('.component-menu-link');
            links.forEach(l => {
                const val = l.getAttribute('data-value');
                const isActive = this.editState.tags.includes(val);
                l.classList.toggle('active', isActive);
                const icon = l.querySelector('[data-ref="icon-check"]');
                if (icon) {
                    icon.textContent = isActive ? 'check_box' : 'check_box_outline_blank';
                }
            });
        }
        const tagsText = this.modalBox.querySelector('[data-ref="text-tags"]');
        if (tagsText) {
            const count = this.editState.tags.length;
            tagsText.textContent = count === 0 ? t('ph_select_tags', 'Seleccionar etiquetas') : `${count} seleccionadas`;
        }

        // 3. Privacy
        const textPrivacy = this.modalBox.querySelector('[data-ref="text-privacy"]');
        const iconPrivacy = this.modalBox.querySelector('[data-ref="icon-privacy"]');
        if (textPrivacy) {
            textPrivacy.textContent = this.editState.privacy === 'public' ? t('canvas_privacy_public', 'Público') : t('canvas_privacy_private', 'Privado');
        }
        if (iconPrivacy) {
            iconPrivacy.textContent = this.editState.privacy === 'public' ? 'public' : 'lock';
        }
        const privacyDropdown = this.modalBox.querySelector('[data-module="dropdownEditPrivacy"]');
        if (privacyDropdown) {
            privacyDropdown.querySelectorAll('.component-menu-link').forEach(l => {
                l.classList.toggle('active', l.getAttribute('data-value') === this.editState.privacy);
            });
        }

        // 4. Approval
        const textApproval = this.modalBox.querySelector('[data-ref="text-approval"]');
        const iconApproval = this.modalBox.querySelector('[data-ref="icon-approval"]');
        if (textApproval) {
            textApproval.textContent = this.editState.requires_approval ? t('canvas_approval_true', 'Requiere aprobación') : t('canvas_approval_false', 'Libre (sin aprobación)');
        }
        if (iconApproval) {
            iconApproval.textContent = this.editState.requires_approval ? 'front_hand' : 'no_accounts';
        }
        const approvalDropdown = this.modalBox.querySelector('[data-module="dropdownEditApproval"]');
        if (approvalDropdown) {
            approvalDropdown.querySelectorAll('.component-menu-link').forEach(l => {
                const val = l.getAttribute('data-value') === 'true';
                l.classList.toggle('active', val === this.editState.requires_approval);
            });
        }

        // 5. Cooldown batch
        const valBatch = this.modalBox.querySelector('[data-ref="val_cooldown_batch"]');
        if (valBatch) {
            valBatch.textContent = this.editState.cooldown_pixels_batch;
            valBatch.setAttribute('data-value', this.editState.cooldown_pixels_batch);
        }

        // 6. Cooldown seconds
        const valSecs = this.modalBox.querySelector('[data-ref="val_cooldown_seconds"]');
        if (valSecs) {
            valSecs.textContent = this.editState.cooldown_seconds;
            valSecs.setAttribute('data-value', this.editState.cooldown_seconds);
        }

        // 7. Limit members
        const valLimit = this.modalBox.querySelector('[data-ref="val_limit"]');
        if (valLimit) {
            valLimit.textContent = this.editState.max_members;
            valLimit.setAttribute('data-value', this.editState.max_members);
        }

        // 8. Palette
        this.updateEditPaletteTriggerDisplay();

        // 9. Chat
        const chatInput = this.modalBox.querySelector('[data-ref="val_allow_chat"]');
        if (chatInput) {
            chatInput.checked = this.editState.allow_chat === 1;
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
                this.editState.name = newName;
            } else {
                inputEl.value = inputEl.getAttribute('data-original-value') || '';
            }
        }

        const btnCancel = container.querySelector('[data-action="toggleEditState"]');
        if (btnCancel) {
            btnCancel.click();
        }
    }

    toggleEditTag(btn) {
        if (!this.editState.tags) this.editState.tags = [];
        const val = btn.getAttribute('data-value');
        const isSelected = this.editState.tags.includes(val);

        if (isSelected) {
            this.editState.tags = this.editState.tags.filter(t => t !== val);
        } else {
            if (this.editState.tags.length >= 8) {
                showMessage(window.__('max_tags_warning') || 'Máximo 8 etiquetas permitidas', 'warning');
                return;
            }
            this.editState.tags.push(val);
        }

        const iconRef = btn.querySelector('[data-ref="icon-check"]');
        if (iconRef) {
            iconRef.textContent = isSelected ? 'check_box_outline_blank' : 'check_box';
        }
        btn.classList.toggle('active', !isSelected);

        const textRef = this.modalBox.querySelector('[data-ref="text-tags"]');
        if (textRef) {
            const count = this.editState.tags.length;
            textRef.textContent = count === 0 ? (window.__('ph_select_tags') || 'Seleccionar etiquetas') : `${count} seleccionadas`;
        }
    }

    selectEditValue(btn) {
        const type = btn.getAttribute('data-type');
        const value = btn.getAttribute('data-value');
        const label = btn.getAttribute('data-label');
        const icon = btn.getAttribute('data-icon');

        const dropdownWrapper = btn.closest('.component-dropdown-wrapper');
        const menu = btn.closest('.component-menu-list');

        if (type === 'privacy') {
            this.editState.privacy = value;
            if (dropdownWrapper) {
                const textRef = dropdownWrapper.querySelector('[data-ref="text-privacy"]');
                const iconRef = dropdownWrapper.querySelector('[data-ref="icon-privacy"]');
                if (textRef) textRef.textContent = window.__(label) || label;
                if (iconRef) iconRef.textContent = icon;
            }
        } else if (type === 'requires_approval') {
            this.editState.requires_approval = value === 'true';
            if (dropdownWrapper) {
                const textRef = dropdownWrapper.querySelector('[data-ref="text-approval"]');
                const iconRef = dropdownWrapper.querySelector('[data-ref="icon-approval"]');
                if (textRef) textRef.textContent = window.__(label) || label;
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

    adjustEditLimit(btn, step) {
        const min = 10;
        const max = (window.APP_LIMITS && window.APP_LIMITS.max_members_per_canvas !== -1) ? (window.APP_LIMITS.max_members_per_canvas || 50000) : 50000;
        const valRef = this.modalBox.querySelector('[data-ref="val_limit"]');

        if (valRef) {
            let currentVal = parseInt(valRef.getAttribute('data-value') || this.editState.max_members, 10) || min;
            let newVal = currentVal + step;

            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;

            this.editState.max_members = newVal;
            valRef.textContent = newVal;
            valRef.setAttribute('data-value', newVal);
        }
    }

    adjustEditCooldownBatch(btn, step) {
        const min = 1;
        const max = (window.APP_LIMITS && window.APP_LIMITS.max_pixels_per_batch) ? window.APP_LIMITS.max_pixels_per_batch : 100;
        const valRef = this.modalBox.querySelector('[data-ref="val_cooldown_batch"]');

        if (valRef) {
            let currentVal = parseInt(valRef.getAttribute('data-value') || this.editState.cooldown_pixels_batch, 10) || min;
            let newVal = currentVal + step;

            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;

            this.editState.cooldown_pixels_batch = newVal;
            valRef.textContent = newVal;
            valRef.setAttribute('data-value', newVal);
        }
    }

    adjustEditCooldownSeconds(btn, step) {
        const min = 0;
        const max = 3600;
        const valRef = this.modalBox.querySelector('[data-ref="val_cooldown_seconds"]');

        if (valRef) {
            let currentVal = parseInt(valRef.getAttribute('data-value') || this.editState.cooldown_seconds, 10) || min;
            let newVal = currentVal + step;

            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;

            this.editState.cooldown_seconds = newVal;
            valRef.textContent = newVal;
            valRef.setAttribute('data-value', newVal);
        }
    }

    async openCanvasEditPaletteModal() {
        const palettes = getAllPalettes();
        const userTier = window.APP_USER?.subscription_tier ?? 0;
        const canUseCustomPalettes = window.APP_LIMITS && window.APP_LIMITS.custom_palettes === true;

        const res = await window.modalSystem.show('selectCanvasPaletteModal', {
            palettes,
            selectedPaletteId: this.editState.palette_id || 'default',
            userTier,
            canUseCustomPalettes
        });

        if (res && res.confirmed) {
            const selectedId = res.data?.selected_palette_id || 'default';
            this.setEditPalette(selectedId);
        }
    }

    setEditPalette(paletteId) {
        this.editState.palette_id = paletteId || 'default';
        this.updateEditPaletteTriggerDisplay();
    }

    updateEditPaletteTriggerDisplay() {
        const textRef = this.modalBox?.querySelector('[data-ref="text-palette"]');
        if (!textRef) return;

        const palettes = getAllPalettes();
        const pal = palettes.find(p => p.id === this.editState.palette_id);
        if (pal) {
            textRef.textContent = window.__(pal.name_key) || pal.name_key;
        } else {
            textRef.textContent = this.editState.palette_id;
        }
        textRef.setAttribute('data-current-palette', this.editState.palette_id);
    }

    async saveCanvasSettings(btn) {
        const nameInput = this.modalBox.querySelector('[data-ref="input-canvasname"]');
        if (nameInput) {
            this.editState.name = nameInput.value.trim();
        }

        const valBatch = this.modalBox.querySelector('[data-ref="val_cooldown_batch"]');
        if (valBatch) {
            this.editState.cooldown_pixels_batch = parseInt(valBatch.getAttribute('data-value'), 10) || 5;
        }

        const valSecs = this.modalBox.querySelector('[data-ref="val_cooldown_seconds"]');
        if (valSecs) {
            this.editState.cooldown_seconds = parseInt(valSecs.getAttribute('data-value'), 10) || 10;
        }

        const valLimit = this.modalBox.querySelector('[data-ref="val_limit"]');
        if (valLimit) {
            this.editState.max_members = parseInt(valLimit.getAttribute('data-value'), 10) || 10;
        }

        const allowChatInput = this.modalBox.querySelector('[data-ref="val_allow_chat"]');
        if (allowChatInput) {
            this.editState.allow_chat = allowChatInput.checked ? 1 : 0;
        }

        if (!this.editState.name) {
            showMessage(window.__('err_field_required') || 'El nombre es obligatorio.', 'warning');
            return;
        }

        const payload = {
            id: this.canvasId,
            name: this.editState.name,
            privacy: this.editState.privacy,
            requires_approval: this.editState.requires_approval,
            palette_id: this.editState.palette_id,
            max_members: this.editState.max_members,
            cooldown_pixels_batch: this.editState.cooldown_pixels_batch,
            cooldown_seconds: this.editState.cooldown_seconds,
            allow_chat: this.editState.allow_chat,
            tags: this.editState.tags || []
        };

        if (btn) setButtonLoading(btn);

        try {
            const response = await this.genericApi.post(ApiRoutes.Canvases.Update, payload);
            if (response && response.success) {
                showMessage(window.__('canvas_update_success') || 'Lienzo actualizado con éxito.', 'success');
                const titleEl = this.modalBox.querySelector('.component-modal-title');
                if (titleEl) {
                    titleEl.textContent = this.editState.name;
                }
                this.canvasTitle = this.editState.name;

                window.dispatchEvent(new CustomEvent('canvasUpdated', {
                    detail: {
                        canvasId: this.canvasId,
                        canvasUuid: this.canvasUuid,
                        name: this.editState.name,
                        privacy: this.editState.privacy,
                        palette_id: this.editState.palette_id,
                        max_members: this.editState.max_members,
                        tags: this.editState.tags
                    }
                }));
            } else {
                showMessage(response?.message || window.__('err_update_canvas') || 'Error al actualizar el lienzo.', 'error');
            }
        } catch (error) {
            showMessage(window.__('err_update_canvas') || 'Error al actualizar el lienzo.', 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // CRITICAL OPTIONS / DANGER ZONE TAB
    // ─────────────────────────────────────────────────────────────
    async handleDeleteCanvas(btn) {
        const uuid = this.canvasUuid;
        const id = this.canvasId;
        if (!uuid && !id) return;

        if (window.modalSystem) {
            const confirm = await window.modalSystem.show('verifyPasswordDeleteCanvas', { uuid: uuid, count: 1 });
            if (!confirm || !confirm.confirmed) return;

            const password = confirm.data && confirm.data['modal_verify_password'] ? confirm.data['modal_verify_password'].trim() : '';
            const credential = confirm.data ? (confirm.data['credential'] || confirm.data['google_token'] || '') : '';

            if (!password && !credential) {
                showMessage(window.__('err_identity_verification_required') || window.__('err_password_required') || 'Se requiere verificación de identidad', 'error');
                return;
            }

            if (btn) setButtonLoading(btn);

            const parsedId = parseInt(id, 10);
            const payload = {
                canvas_ids: !isNaN(parsedId) ? [parsedId] : [id],
                password: password,
                credential: credential,
                google_token: credential
            };

            try {
                const res = await this.genericApi.post(ApiRoutes.Canvases.Delete, payload);
                if (btn) restoreButton(btn);

                if (res && res.success) {
                    showMessage(window.__('msg_canvases_trashed') || window.__('msg_canvas_deleted') || res.message || 'Lienzo enviado a la papelera.', 'success');

                    window.modalSystem.closeCurrent();

                    const currentPath = window.location.pathname;
                    if (currentPath.includes('/design') || currentPath.includes('/canvases/workspace') || currentPath.includes('/canvases/edit')) {
                        if (window.spaRouter && typeof window.spaRouter.navigate === 'function') {
                            window.spaRouter.navigate('/canvases');
                        } else {
                            const basePath = window.AppBasePath || '';
                            window.location.href = `${basePath}/canvases`;
                        }
                    } else {
                        const card = document.querySelector(`.component-gallery-card[data-card-id="${id}"], .component-gallery-card[data-canvas-id="${id}"], .component-gallery-card[data-uuid="${uuid}"]`);
                        if (card) {
                            const grid = card.closest('.component-card-grid') || card.parentElement;
                            card.remove();
                            if (grid && grid.querySelectorAll('.component-gallery-card').length === 0) {
                                if (window.spaRouter?.currentController && typeof window.spaRouter.currentController.render === 'function') {
                                    window.spaRouter.currentController.render();
                                }
                            }
                        }
                    }
                } else {
                    showMessage(res?.message || window.__('err_default') || 'Error al eliminar el lienzo.', 'error');
                }
            } catch (err) {
                if (btn) restoreButton(btn);
                showMessage('Error al conectar para eliminar el lienzo.', 'error');
            }
        }
    }

    getSkeletonHTML() {
        return `
            <tr>
                <td><div class="component-skeleton component-skeleton--text-short"></div></td>
                <td><div class="component-skeleton component-skeleton--text-short"></div></td>
                <td><div class="component-skeleton component-skeleton--text-short"></div></td>
            </tr>
            <tr>
                <td><div class="component-skeleton component-skeleton--text-short"></div></td>
                <td><div class="component-skeleton component-skeleton--text-short"></div></td>
                <td><div class="component-skeleton component-skeleton--text-short"></div></td>
            </tr>
        `;
    }
}

export { CanvasSettingsModalController as ManageCanvasMembersModalController };
