<?php
$isChatEnabled = (isset($canvasAllowChat) && $canvasAllowChat == '1');
$chatUser = $chatUsername ?? __('user');
$canModerate = $canModerateChat ?? '0';
$maxImgs = $maxImages ?? 4;
$maxMB = $maxUploadMB ?? 10;
?>
<div class="component-module component-module--sidebar component-module--sidebar-responsive component-module--sidebar-right disabled" data-module="moduleLiveChat" data-user-id="<?php echo htmlspecialchars((string)($userId ?? '')); ?>" data-username="<?php echo htmlspecialchars($chatUser); ?>" data-can-moderate="<?php echo $canModerate; ?>" data-max-images="<?php echo $maxImgs; ?>" data-max-size-mb="<?php echo $maxMB; ?>">
    
    <div class="component-menu component-menu--w335 component-menu--chat component-menu--h-full component-menu--no-padding disabled <?php echo $isChatEnabled ? 'chat-enabled-state' : 'chat-disabled-state'; ?>" data-ref="menu-chat">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <div class="chat-header-title-box">
                    <span class="material-symbols-rounded">chat</span>
                    <span class="component-menu-header-title"><?php echo __('chat_live'); ?></span>
                </div>
                
                <div class="chat-active-only">
                    <?php if (isset($isOwner) && $isOwner): ?>
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h32" data-action="toggleModule" data-target="chat-options-menu">
                            <span class="material-symbols-rounded">more_vert</span>
                        </button>
                        <div class="component-module component-module--dropdown component-module--dropdown-bottom component-module--dropdown-right chat-dropdown-module disabled" data-module="chat-options-menu">
                            <div class="component-menu component-menu--w200 component-menu--h-auto component-menu--no-padding active" data-menu="chat-options-list">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link text-danger" data-action="deactivateChatOption">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">chat_bubble_outline</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo __('btn_deactivate_chat'); ?></span>
                                        </div>
                                    </div>
                                    <div class="component-menu-link" data-action="showGeneralInfoOption">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">info</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo __('btn_general_info'); ?></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <?php else: ?>
                    <button class="component-button component-button--icon component-button--h32" data-action="showGeneralInfoOption" data-tooltip="<?php echo __('btn_general_info'); ?>" data-position="bottom">
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
                    <p class="component-empty-state-text"><?php echo __('chat_no_messages'); ?></p>
                </div>
                <div class="component-loader-center component-loader-center--compact component-loader-center--chat" data-ref="chat-loader"></div>
            </div>
            
            <div class="component-menu-bottom component-chat-input-area">
                <div class="component-search component-search--w-auto">
                    <div class="component-search-input <?php echo (isset($isChatRestricted) && $isChatRestricted) ? 'disabled-interaction' : ''; ?>">
                        
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                            <button class="component-chat-attach-btn" data-action="toggleModule" data-target="chat-attach-menu" <?php echo (isset($isChatRestricted) && $isChatRestricted) ? 'disabled' : ''; ?>>
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
                                                <span><?php echo __('chat_attach_photos'); ?></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <input type="file" id="chat-file-input" class="disabled" multiple accept="image/jpeg, image/png, image/webp, image/gif">

                        <?php 
                        $placeholder = __('chat_placeholder');
                        if (isset($isChatRestricted) && $isChatRestricted) {
                            if ($chatRestrictionType === 'permanent') {
                                $placeholder = __('chat_restricted_permanent');
                            } else {
                                $placeholder = __('chat_restricted_until') . " " . ($chatRestrictionEnd ? date('d/m/Y H:i', strtotime($chatRestrictionEnd)) : '');
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
        
        <div class="component-menu-section-parent chat-disabled-only">
            <div class="component-chat-disabled-panel">
                <span class="material-symbols-rounded component-chat-disabled-icon">chat_off</span>
                <h3 class="component-chat-disabled-title"><?php echo __('chat_deactivated_title'); ?></h3>
                <p class="component-chat-disabled-desc">
                    <?php echo __('chat_deactivated_desc'); ?>
                </p>
                <?php if (isset($isOwner) && $isOwner): ?>
                <button class="component-button component-button--h40" data-action="activateChatFromPanel">
                    <span class="material-symbols-rounded">chat</span>
                    <span><?php echo __('btn_activate_chat'); ?></span>
                </button>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <div class="component-menu component-menu--w335 component-menu-chat-info component-menu--h-full component-menu--no-padding disabled" data-ref="menu-chat-info">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <button class="component-button component-button--icon component-button--h32" data-action="backToChatMenu">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                <span class="component-menu-header-title"><?php echo __('lbl_general_info'); ?></span>
            </div>
        </div>
        
        <div class="component-menu-section-parent">
            <div class="chat-info-details">
                <div class="chat-info-item">
                    <span class="chat-info-label"><?php echo __('lbl_canvas_name'); ?></span>
                    <span class="chat-info-value"><?php echo htmlspecialchars($canvasName ?? ''); ?></span>
                </div>
                <div class="chat-info-item">
                    <span class="chat-info-label"><?php echo __('lbl_canvas_owner'); ?></span>
                    <span class="chat-info-value"><?php echo htmlspecialchars($ownerUsername ?? __('user')); ?></span>
                </div>
                <div class="chat-info-item">
                    <span class="chat-info-label"><?php echo __('lbl_members'); ?></span>
                    <span class="chat-info-value"><?php echo htmlspecialchars($membersCount ?? '1'); ?></span>
                </div>
                <div class="chat-info-item">
                    <span class="chat-info-label"><?php echo __('lbl_dimensions'); ?></span>
                    <span class="chat-info-value"><?php echo htmlspecialchars($canvasSize ?? ''); ?> x <?php echo htmlspecialchars($canvasSize ?? ''); ?></span>
                </div>
                <div class="chat-info-item">
                    <span class="chat-info-label"><?php echo __('lbl_created_at'); ?></span>
                    <span class="chat-info-value"><?php echo htmlspecialchars($canvasCreatedAt ?? ''); ?></span>
                </div>
            </div>
            
            <div class="chat-info-gallery-title"><?php echo __('lbl_sent_photos'); ?></div>
            <div class="chat-info-gallery-grid" data-ref="chat-info-gallery-grid">
                <div class="chat-info-gallery-empty">
                    <?php echo __('lbl_loading_photos'); ?>
                </div>
            </div>
        </div>
    </div>
</div>
