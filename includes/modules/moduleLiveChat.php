<?php
// includes/modules/moduleLiveChat.php

if (!isset($canvasAllowChat) || $canvasAllowChat != '1') {
    return;
}

$chatUsername = 'Usuario';
if (isset($userId) && isset($_SESSION['accounts'][$userId]['user_name'])) {
    $chatUsername = $_SESSION['accounts'][$userId]['user_name'];
}

$canModerateChat = (isset($canvas) && isset($userId) && (isset($canvas['owner_id']) ? $canvas['owner_id'] : ($canvas['user_id'] ?? null)) == $userId) ? '1' : '0';
?>
<div class="component-module component-module--sidebar component-module--sidebar-right disabled" data-module="moduleLiveChat" data-user-id="<?php echo htmlspecialchars((string)($userId ?? '')); ?>" data-username="<?php echo htmlspecialchars($chatUsername); ?>" data-can-moderate="<?php echo $canModerateChat; ?>">
    
    <div class="component-menu component-menu--w335 component-menu--chat component-menu--h-full component-menu--no-padding disabled" data-ref="menu-chat">
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="material-symbols-rounded">chat</span>
                <span class="component-menu-header-title">Chat en Vivo</span>
            </div>
        </div>
        
        <div class="component-menu-section-parent component-menu-section-parent--chat">
            <!-- Área de mensajes -->
            <div class="component-menu-center component-chat-messages" data-ref="chat-messages-container">
                <div class="component-empty-state" data-ref="empty-state-rendered" style="display: none;">
                    <span class="material-symbols-rounded component-empty-state-icon">error</span>
                    <p class="component-empty-state-text">No hay mensajes.</p>
                </div>
                <div class="component-loader-center component-loader-center--compact" data-ref="chat-loader">
                    <div class="component-empty-state-content">
                        <span class="material-symbols-rounded icon-spin-slow">sync</span><br>
                        Cargando mensajes...
                    </div>
                </div>
            </div>
            
            <!-- Área de input -->
            <div class="component-menu-bottom component-chat-input-area" style="flex-direction: column;">
                <div class="chat-attachments-preview-container" data-ref="chat-attachments-preview" style="display: none;"></div>
                <div class="component-search component-search--w-auto">
                    <div class="component-search-input <?php echo (isset($isChatRestricted) && $isChatRestricted) ? 'disabled-interaction' : ''; ?>" style="padding-left: 4px;">
                        
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--fit" style="display: flex; align-items: center; margin-right: 4px;">
                            <button class="component-chat-send-btn" data-action="toggleChatDropdown" data-target="chat-attach-menu" <?php echo (isset($isChatRestricted) && $isChatRestricted) ? 'disabled' : ''; ?> style="background: transparent; color: var(--text-secondary); width: 28px; height: 28px; margin: 0; padding: 0;">
                                <span class="material-symbols-rounded" style="font-size: 20px;">add</span>
                            </button>
                            <div class="component-module component-module--dropdown component-module--dropdown-top component-module--dropdown-fixed chat-dropdown-module disabled" data-module="chat-attach-menu" style="bottom: 100%; top: auto; left: 0; margin-bottom: 8px; z-index: 110;">
                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-menu="chat-attach-options">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <div class="component-menu-link" data-action="triggerChatAttach">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">attach_file</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Adjuntar fotos</span>
                                            </div>
                                        </div>
                                        <div class="component-menu-link">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">share</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Compartir plantilla</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <input type="file" id="chat-file-input" multiple accept="image/jpeg, image/png, image/webp, image/gif" style="display: none;">

                        <?php 
                        $placeholder = "Escribe un mensaje...";
                        if (isset($isChatRestricted) && $isChatRestricted) {
                            if ($chatRestrictionType === 'permanent') {
                                $placeholder = "Restringido permanentemente";
                            } else {
                                $placeholder = "Restringido hasta: " . ($chatRestrictionEnd ? date('d/m/Y H:i', strtotime($chatRestrictionEnd)) : '');
                            }
                        }
                        ?>
                        <input type="text" data-ref="chat-input-message" placeholder="<?php echo htmlspecialchars($placeholder); ?>" maxlength="255" style="padding-left: 8px;" <?php echo (isset($isChatRestricted) && $isChatRestricted) ? 'disabled' : ''; ?>>
                        <button class="component-chat-send-btn" data-action="sendChatMessage" data-ref="chat-btn-send" <?php echo (isset($isChatRestricted) && $isChatRestricted) ? 'disabled' : ''; ?>>
                            <span class="material-symbols-rounded" style="font-size: 16px;">arrow_upward</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
