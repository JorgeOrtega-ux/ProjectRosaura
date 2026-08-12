<?php

$isChatEnabled = (isset($canvasAllowChat) && $canvasAllowChat == '1');

if (!function_exists('safeTranslate')) {
    function safeTranslate($key, $default) {
        $val = __($key);
        return ($val === $key) ? $default : $val;
    }
}

$chatUsername = __('user');
if (isset($userId) && isset($_SESSION['accounts'][$userId]['user_name'])) {
    $chatUsername = $_SESSION['accounts'][$userId]['user_name'];
}

$canModerateChat = '0';
if (isset($userId) && isset($canvasIntId)) {
    if (isset($isOwner) && $isOwner) {
        $canModerateChat = '1';
    } else {
        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdoCanvases = $db->getConnection(defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases');
            $sql = "SELECT 1 
                    FROM canvas_user_roles cur
                    INNER JOIN canvas_roles r ON cur.role_id = r.id
                    INNER JOIN canvas_role_permissions crp ON r.id = crp.role_id
                    INNER JOIN canvas_permissions p ON crp.permission_id = p.id
                    WHERE cur.canvas_id = ? 
                      AND cur.user_id = ? 
                      AND p.name IN ('manage_sanctions', 'moderate_chat')
                    LIMIT 1";
            $stmt = $pdoCanvases->prepare($sql);
            $stmt->execute([$canvasIntId, $userId]);
            if ((bool)$stmt->fetchColumn()) {
                $canModerateChat = '1';
            }
        } catch (\Exception $e) {}
    }
}

$maxImages = \App\Core\System\ChatConstants::CHAT_MAX_IMAGES;
$userTier = 0;
if (isset($userId)) {
    if (isset($_SESSION['accounts'][$userId]['subscription_tier'])) {
        $userTier = (int)$_SESSION['accounts'][$userId]['subscription_tier'];
    } else {
        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->prepare("SELECT subscription_tier FROM users WHERE id = ? LIMIT 1");
            $stmt->execute([$userId]);
            $userTier = (int)($stmt->fetchColumn() ?: 0);
        } catch (\Exception $e) {}
    }
}
$planLimits = \App\Core\System\SubscriptionPlanConstants::getTierLimits($userTier);
$maxUploadMB = $planLimits['max_upload_mb'] ?? 10;
?>
<div class="component-module component-module--sidebar component-module--sidebar-responsive component-module--sidebar-right disabled" data-module="moduleLiveChat" data-user-id="<?php echo htmlspecialchars((string)($userId ?? '')); ?>" data-username="<?php echo htmlspecialchars($chatUsername); ?>" data-can-moderate="<?php echo $canModerateChat; ?>" data-max-images="<?php echo $maxImages; ?>" data-max-size-mb="<?php echo $maxUploadMB; ?>">
    
    <div class="component-menu component-menu--w335 component-menu--chat component-menu--h-full component-menu--no-padding disabled <?php echo $isChatEnabled ? 'chat-enabled-state' : 'chat-disabled-state'; ?>" data-ref="menu-chat">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div class="chat-header-title-box">
                    <span class="material-symbols-rounded">chat</span>
                    <span class="component-menu-header-title"><?php echo safeTranslate('chat_live', 'Chat en Vivo'); ?></span>
                </div>
                
                <div class="chat-active-only" style="display: flex; align-items: center;">
                    <?php if (isset($isOwner) && $isOwner): ?>
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h32" data-action="toggleChatDropdown" data-target="chat-options-menu">
                            <span class="material-symbols-rounded">more_vert</span>
                        </button>
                        <div class="component-module component-module--dropdown component-module--dropdown-bottom component-module--dropdown-right chat-dropdown-module disabled" data-module="chat-options-menu">
                            <div class="component-menu component-menu--w200 component-menu--h-auto component-menu--no-padding active" data-menu="chat-options-list">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link text-danger" data-action="deactivateChatOption">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded" style="color: var(--danger-color);">chat_bubble_outline</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo safeTranslate('btn_deactivate_chat', 'Desactivar chat'); ?></span>
                                        </div>
                                    </div>
                                    <div class="component-menu-link" data-action="showGeneralInfoOption">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">info</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo safeTranslate('btn_general_info', 'Información general'); ?></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <?php else: ?>
                    <button class="component-button component-button--icon component-button--h32" data-action="showGeneralInfoOption" data-tooltip="<?php echo safeTranslate('btn_general_info', 'Información general'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">info</span>
                    </button>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        
        <div class="component-menu-section-parent component-menu-section-parent--chat chat-active-only">
            <div class="component-menu-center component-chat-messages" data-ref="chat-messages-container">
                <div class="component-empty-state disabled" data-ref="empty-state-rendered">
                    <span class="material-symbols-rounded component-empty-state-icon">error</span>
                    <p class="component-empty-state-text"><?php echo safeTranslate('chat_no_messages', 'No hay mensajes aún.'); ?></p>
                </div>
                <div class="component-loader-center component-loader-center--compact component-loader-center--chat" data-ref="chat-loader"></div>
            </div>
            
            <div class="component-menu-bottom component-chat-input-area">
                <div class="component-search component-search--w-auto">
                    <div class="component-search-input <?php echo (isset($isChatRestricted) && $isChatRestricted) ? 'disabled-interaction' : ''; ?>">
                        
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                            <button class="component-chat-attach-btn" data-action="toggleChatDropdown" data-target="chat-attach-menu" <?php echo (isset($isChatRestricted) && $isChatRestricted) ? 'disabled' : ''; ?>>
                                <span class="material-symbols-rounded">add</span>
                            </button>
                            <div class="component-module component-module--dropdown component-module--dropdown-top component-module--dropdown-right component-module--dropdown-fixed chat-dropdown-module disabled" data-module="chat-attach-menu">
                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-menu="chat-attach-options">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <div class="component-menu-link" data-action="triggerChatAttach">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">attach_file</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span><?php echo safeTranslate('chat_attach_photos', 'Adjuntar fotos'); ?></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <input type="file" id="chat-file-input" class="disabled" multiple accept="image/jpeg, image/png, image/webp, image/gif">

                        <?php 
                        $placeholder = safeTranslate('chat_placeholder', 'Escribe un mensaje...');
                        if (isset($isChatRestricted) && $isChatRestricted) {
                            if ($chatRestrictionType === 'permanent') {
                                $placeholder = safeTranslate('chat_restricted_permanent', 'Chat restringido permanentemente');
                            } else {
                                $placeholder = safeTranslate('chat_restricted_until', 'Chat restringido hasta') . " " . ($chatRestrictionEnd ? date('d/m/Y H:i', strtotime($chatRestrictionEnd)) : '');
                            }
                        }
                        ?>
                        <input type="text" data-ref="chat-input-message" placeholder="<?php echo htmlspecialchars($placeholder); ?>" maxlength="255" <?php echo (isset($isChatRestricted) && $isChatRestricted) ? 'disabled' : ''; ?>>
                        <button class="component-chat-send-btn" data-action="sendChatMessage" data-ref="chat-btn-send" <?php echo (isset($isChatRestricted) && $isChatRestricted) ? 'disabled' : ''; ?>>
                            <span class="material-symbols-rounded">send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="component-menu-section-parent chat-disabled-only" style="height: calc(100% - 50px);">
            <div class="component-chat-disabled-panel">
                <span class="material-symbols-rounded component-chat-disabled-icon">chat_off</span>
                <h3 class="component-chat-disabled-title"><?php echo safeTranslate('chat_deactivated_title', 'Chat Desactivado'); ?></h3>
                <p class="component-chat-disabled-desc">
                    <?php echo safeTranslate('chat_deactivated_desc', 'El chat en vivo de este lienzo está desactivado. Actívalo para chatear con otros miembros.'); ?>
                </p>
                <?php if (isset($isOwner) && $isOwner): ?>
                <button class="component-button component-button--dark component-button--h40" data-action="activateChatFromPanel" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span class="material-symbols-rounded">chat</span>
                    <span><?php echo safeTranslate('btn_activate_chat', 'Activar Chat'); ?></span>
                </button>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- NEW MENU FOR GENERAL INFO -->
    <div class="component-menu component-menu--w335 component-menu-chat-info component-menu--h-full component-menu--no-padding disabled" data-ref="menu-chat-info">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box" style="display: flex; align-items: center; gap: 8px; width: 100%;">
                <button class="component-button component-button--icon component-button--h32" data-action="backToChatMenu">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                <span class="component-menu-header-title"><?php echo safeTranslate('lbl_general_info', 'Información General'); ?></span>
            </div>
        </div>
        
        <div class="component-menu-section-parent" style="height: calc(100% - 50px); overflow-y: auto;">
            <div class="chat-info-details">
                <div class="chat-info-item">
                    <span class="chat-info-label"><?php echo safeTranslate('lbl_canvas_name', 'Nombre del lienzo'); ?></span>
                    <span class="chat-info-value"><?php echo htmlspecialchars($canvasName ?? ''); ?></span>
                </div>
                <div class="chat-info-item">
                    <span class="chat-info-label"><?php echo safeTranslate('lbl_canvas_owner', 'Creador'); ?></span>
                    <span class="chat-info-value"><?php echo htmlspecialchars($ownerUsername ?? __('user')); ?></span>
                </div>
                <div class="chat-info-item">
                    <span class="chat-info-label"><?php echo safeTranslate('lbl_members', 'Miembros'); ?></span>
                    <span class="chat-info-value"><?php echo htmlspecialchars($membersCount ?? '1'); ?></span>
                </div>
                <div class="chat-info-item">
                    <span class="chat-info-label"><?php echo safeTranslate('lbl_dimensions', 'Dimensiones'); ?></span>
                    <span class="chat-info-value"><?php echo htmlspecialchars($canvasSize ?? ''); ?> x <?php echo htmlspecialchars($canvasSize ?? ''); ?></span>
                </div>
                <div class="chat-info-item">
                    <span class="chat-info-label"><?php echo safeTranslate('lbl_created_at', 'Creado el'); ?></span>
                    <span class="chat-info-value"><?php echo htmlspecialchars($canvasCreatedAt ?? ''); ?></span>
                </div>
            </div>
            
            <div class="chat-info-gallery-title"><?php echo safeTranslate('lbl_sent_photos', 'Fotos enviadas'); ?></div>
            <div class="chat-info-gallery-grid" data-ref="chat-info-gallery-grid">
                <div style="grid-column: span 3; text-align: center; color: var(--text-secondary); font-size: 0.75rem; padding: 16px;">
                    <?php echo safeTranslate('lbl_loading_photos', 'Cargando fotos...'); ?>
                </div>
            </div>
        </div>
    </div>
</div>
