<?php

if (!isset($canvasAllowChat) || $canvasAllowChat != '1') {
    return;
}

$chatUsername = __('user');
if (isset($userId) && isset($_SESSION['accounts'][$userId]['user_name'])) {
    $chatUsername = $_SESSION['accounts'][$userId]['user_name'];
}

$canModerateChat = (isset($canvas) && isset($userId) && (isset($canvas['owner_id']) ? $canvas['owner_id'] : ($canvas['user_id'] ?? null)) == $userId) ? '1' : '0';

$maxImages = \App\Core\System\ChatConstants::CHAT_MAX_IMAGES;
$maxUploadMB = \App\Core\System\ChatConstants::CHAT_MAX_UPLOAD_MB;
?>
<div class="component-module component-module--sidebar component-module--sidebar-responsive component-module--sidebar-right disabled" data-module="moduleLiveChat" data-user-id="<?php echo htmlspecialchars((string)($userId ?? '')); ?>" data-username="<?php echo htmlspecialchars($chatUsername); ?>" data-can-moderate="<?php echo $canModerateChat; ?>" data-max-images="<?php echo $maxImages; ?>" data-max-size-mb="<?php echo $maxUploadMB; ?>">
    
    <div class="component-menu component-menu--w335 component-menu--chat component-menu--h-full component-menu--no-padding disabled" data-ref="menu-chat">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <div class="chat-header-title-box">
                    <span class="material-symbols-rounded">chat</span>
                    <span class="component-menu-header-title"><?php echo __('chat_live'); ?></span>
                </div>
            </div>
        </div>
        
        <div class="component-menu-section-parent component-menu-section-parent--chat">
            <div class="component-menu-center component-chat-messages" data-ref="chat-messages-container">
                <div class="component-empty-state disabled" data-ref="empty-state-rendered">
                    <span class="material-symbols-rounded component-empty-state-icon">error</span>
                    <p class="component-empty-state-text"><?php echo __('chat_no_messages'); ?></p>
                </div>
                <div class="component-loader-center component-loader-center--compact component-loader-center--chat" data-ref="chat-loader">
                    <div class="chat-skeleton-container">
                        <div class="chat-skeleton-group">
                            <div class="component-skeleton component-skeleton--avatar"></div>
                            <div class="chat-skeleton-content">
                                <div class="component-skeleton component-skeleton--text-short"></div>
                                <div class="component-skeleton component-skeleton--h45"></div>
                            </div>
                        </div>
                        
                        <div class="chat-skeleton-group chat-skeleton-group--reverse">
                            <div class="component-skeleton component-skeleton--avatar"></div>
                            <div class="chat-skeleton-content chat-skeleton-content--end">
                                <div class="component-skeleton component-skeleton--text-short"></div>
                                <div class="component-skeleton component-skeleton--h100"></div>
                            </div>
                        </div>

                        <div class="chat-skeleton-group">
                            <div class="component-skeleton component-skeleton--avatar"></div>
                            <div class="chat-skeleton-content">
                                <div class="component-skeleton component-skeleton--text-short"></div>
                                <div class="component-skeleton component-skeleton--h40"></div>
                            </div>
                        </div>

                        <div class="chat-skeleton-group chat-skeleton-group--reverse">
                            <div class="component-skeleton component-skeleton--avatar"></div>
                            <div class="chat-skeleton-content chat-skeleton-content--end">
                                <div class="component-skeleton component-skeleton--text-short"></div>
                                <div class="component-skeleton component-skeleton--h45"></div>
                            </div>
                        </div>

                        <div class="chat-skeleton-group">
                            <div class="component-skeleton component-skeleton--avatar"></div>
                            <div class="chat-skeleton-content">
                                <div class="component-skeleton component-skeleton--text-short"></div>
                                <div class="component-skeleton component-skeleton--h60"></div>
                            </div>
                        </div>

                        <div class="chat-skeleton-group chat-skeleton-group--reverse">
                            <div class="component-skeleton component-skeleton--avatar"></div>
                            <div class="chat-skeleton-content chat-skeleton-content--end">
                                <div class="component-skeleton component-skeleton--text-short"></div>
                                <div class="component-skeleton component-skeleton--h40"></div>
                            </div>
                        </div>

                        <div class="chat-skeleton-group">
                            <div class="component-skeleton component-skeleton--avatar"></div>
                            <div class="chat-skeleton-content">
                                <div class="component-skeleton component-skeleton--text-short"></div>
                                <div class="component-skeleton component-skeleton--h100"></div>
                            </div>
                        </div>

                        <div class="chat-skeleton-group chat-skeleton-group--reverse">
                            <div class="component-skeleton component-skeleton--avatar"></div>
                            <div class="chat-skeleton-content chat-skeleton-content--end">
                                <div class="component-skeleton component-skeleton--text-short"></div>
                                <div class="component-skeleton component-skeleton--h45"></div>
                            </div>
                        </div>

                        <div class="chat-skeleton-group">
                            <div class="component-skeleton component-skeleton--avatar"></div>
                            <div class="chat-skeleton-content">
                                <div class="component-skeleton component-skeleton--text-short"></div>
                                <div class="component-skeleton component-skeleton--h60"></div>
                            </div>
                        </div>

                        <div class="chat-skeleton-group chat-skeleton-group--reverse">
                            <div class="component-skeleton component-skeleton--avatar"></div>
                            <div class="chat-skeleton-content chat-skeleton-content--end">
                                <div class="component-skeleton component-skeleton--text-short"></div>
                                <div class="component-skeleton component-skeleton--h40"></div>
                            </div>
                        </div>
                    </div>
                </div>
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
                                                <span><?php echo __('chat_attach_photos'); ?></span>
                                            </div>
                                        </div>
                                        <div class="component-menu-link">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">share</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span><?php echo __('chat_share_template'); ?></span>
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
    </div>
</div>
