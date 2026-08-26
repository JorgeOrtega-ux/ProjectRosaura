<?php
$isLoggedIn = !empty($_SESSION['user_id']);
$pubUuid = $pubData['uuid'] ?? '';
$commentsCount = $pubData['comments_count'] ?? 0;
?>
<div class="component-module component-module--sidebar component-module--sidebar-responsive component-module--sidebar-right disabled" data-module="modulePublicationComments" data-publication-uuid="<?php echo htmlspecialchars($pubUuid); ?>">
    
    <div class="component-menu component-menu--w335 component-menu--chat component-menu--h-full component-menu--no-padding disabled chat-enabled-state" data-ref="menu-comments">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <div class="chat-header-title-box">
                    <span class="material-symbols-rounded">chat</span>
                    <span class="component-menu-header-title"><?php echo __('publications.comments'); ?> (<span data-ref="drawer-comments-count"><?php echo number_format($commentsCount); ?></span>)</span>
                </div>
                <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleMenuInModule" data-module-target="modulePublicationComments" data-menu-target="menu-comments" data-tooltip="<?php echo __('btn_close'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
        </div>
        
        <div class="component-menu-section-parent component-menu-section-parent--chat chat-active-only">
            <div class="component-menu-center component-chat-messages" data-ref="comments-list">
                <?php echo \App\Core\Helpers\Utils::renderEmptyState([
                    'type' => 'messages',
                    'title' => __('publications.no_comments_title'),
                    'message' => __('publications.no_comments'),
                    'class' => 'disabled',
                    'ref' => 'comments-empty-state'
                ]); ?>
                <div class="component-loader-center component-loader-center--compact component-loader-center--chat disabled" data-ref="comments-loader"></div>
            </div>
            
            <div class="component-menu-bottom component-chat-input-area">
                <div class="component-chat-box <?php echo !$isLoggedIn ? 'disabled-interaction' : ''; ?>" data-ref="comments-box-container">
                    <div class="component-chat-box__input-wrapper">
                        <textarea data-ref="input-comment" name="input-comment" class="component-chat-textarea" placeholder="<?php echo $isLoggedIn ? __('publications.write_comment') : 'Inicia sesión para comentar...'; ?>" maxlength="1000" rows="1" <?php echo !$isLoggedIn ? 'disabled' : ''; ?>></textarea>
                    </div>
                    <div class="component-chat-box__actions-right">
                        <?php if ($isLoggedIn): ?>
                        <button class="component-chat-send-btn active" data-action="submitComment" data-tooltip="<?php echo __('publications.btn_comment'); ?>">
                            <span class="material-symbols-rounded">send</span>
                        </button>
                        <?php else: ?>
                        <a href="<?php echo APP_URL; ?>/login" data-nav="<?php echo APP_URL; ?>/login" class="component-button component-button--primary component-button--h28" style="border-radius: 9999px; text-decoration: none; padding: 0 10px; font-size: 0.75rem;">
                            <span>Login</span>
                        </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
