<?php
// includes/modules/moduleLiveChat.php

if (!isset($canvasAllowChat) || $canvasAllowChat != '1') {
    return;
}
?>
<div class="component-module component-module--sidebar component-module--sidebar-right component-module--sidebar-responsive disabled" data-module="moduleLiveChat">
    
    <div class="component-menu component-menu--w335 component-menu--chat component-menu--h-full component-menu--no-padding disabled" data-ref="menu-chat">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
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
                <div class="component-input-group component-input-group--h40 component-chat-input-wrapper">
                    <input type="text" data-ref="chat-input-message" class="component-input-field component-input-field--simple" placeholder="Escribe un mensaje..." maxlength="255">
                    <button class="component-button component-button--icon component-button--h40 component-button--dark" data-action="sendChatMessage" data-ref="chat-btn-send">
                        <span class="material-symbols-rounded">send</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
