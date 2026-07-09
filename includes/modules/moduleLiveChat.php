<?php
// includes/modules/moduleLiveChat.php

if (!isset($canvasAllowChat) || $canvasAllowChat != '1') {
    return;
}
?>
<div class="component-module component-module--sidebar component-module--sidebar-responsive disabled" data-module="moduleLiveChat">
    
    <div class="component-menu component-menu--w300 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-chat">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="material-symbols-rounded">chat</span>
                <span class="component-menu-header-title">Chat en Vivo</span>
            </div>
            <button class="component-button component-button--icon component-button--h34" data-action="closeModule" data-target="moduleLiveChat">
                <span class="material-symbols-rounded">close</span>
            </button>
        </div>
        
        <div class="component-menu-section-parent" style="display: flex; flex-direction: column; height: 100%;">
            <!-- Área de mensajes -->
            <div class="component-menu-top component-chat-messages" data-ref="chat-messages-container" style="flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                <div class="component-loader-center component-loader-center--compact" data-ref="chat-loader">
                    <div class="component-empty-state-content">
                        <span class="material-symbols-rounded icon-spin-slow">sync</span><br>
                        Cargando mensajes...
                    </div>
                </div>
            </div>
            
            <!-- Área de input -->
            <div class="component-menu-bottom" style="padding: 12px; border-top: 1px solid var(--border-color); background: var(--surface-color);">
                <div class="component-input-group component-input-group--h40" style="display: flex; gap: 8px;">
                    <input type="text" data-ref="chat-input-message" class="component-input-field component-input-field--simple" placeholder="Escribe un mensaje..." style="flex: 1;" maxlength="255">
                    <button class="component-button component-button--icon component-button--h40 component-button--dark" data-action="sendChatMessage" data-ref="chat-btn-send">
                        <span class="material-symbols-rounded">send</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
