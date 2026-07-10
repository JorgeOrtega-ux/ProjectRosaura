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
                <div class="component-loader-center component-loader-center--compact" data-ref="chat-loader">
                    <div class="component-empty-state-content">
                        <span class="material-symbols-rounded icon-spin-slow">sync</span><br>
                        Cargando mensajes...
                    </div>
                </div>
            </div>
            
            <!-- Área de input -->
            <div class="component-menu-bottom component-chat-input-area">
                <div class="component-search component-search--w-auto">
                    <div class="component-search-input <?php echo (isset($isChatRestricted) && $isChatRestricted) ? 'disabled-interaction' : ''; ?>">
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
                        <input type="text" data-ref="chat-input-message" placeholder="<?php echo htmlspecialchars($placeholder); ?>" maxlength="255" style="padding-left: 12px;" <?php echo (isset($isChatRestricted) && $isChatRestricted) ? 'disabled' : ''; ?>>
                        <button class="component-chat-send-btn" data-action="sendChatMessage" data-ref="chat-btn-send" <?php echo (isset($isChatRestricted) && $isChatRestricted) ? 'disabled' : ''; ?>>
                            <span class="material-symbols-rounded" style="font-size: 16px;">arrow_upward</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
