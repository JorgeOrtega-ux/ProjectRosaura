<?php
if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', dirname(__DIR__, 2));
}
?>
<div class="component-module component-module--dropdown disabled" data-module="moduleNotifications">
    <div class="component-menu component-menu--w400 component-notifications-menu active" data-menu="notifications-main">
        <div class="pill-container"><div class="drag-handle"></div></div>

        <div class="component-notifications-top">
            <div class="component-notifications-top__left">
                <h3 class="component-notifications-title"><?php echo __('notifications.title'); ?></h3>
                <span class="component-badge component-badge--accent component-badge--xs disabled" data-ref="notif-badge-unread-count">0</span>
            </div>
            <div class="component-notifications-top__right">
                <button type="button" class="component-button component-button--glass component-button--h28" data-action="markAllNotificationsRead">
                    <span class="material-symbols-rounded component-icon--16">done_all</span>
                    <span><?php echo __('notifications.mark_all_read'); ?></span>
                </button>
            </div>
        </div>

        <div class="component-notifications-bottom" data-ref="notifications-list-container">
            <div class="component-notifications-list" data-ref="notifications-list"></div>
        </div>
    </div>
</div>