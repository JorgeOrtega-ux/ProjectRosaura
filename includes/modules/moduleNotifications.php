<?php
if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', dirname(__DIR__, 2));
}
?>
<div class="component-module component-module--dropdown disabled" data-module="moduleNotifications">
    <div class="component-menu component-menu--w400 component-notifications-menu active" data-menu="notifications-main">
        <div class="pill-container"><div class="drag-handle"></div></div>

        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('notifications.title'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-actions active">
                    <button type="button" class="component-button component-button--h40" data-action="markAllNotificationsRead">
                        <span><?php echo __('notifications.mark_all_read'); ?></span>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-bottom component-notifications-bottom" data-ref="notifications-list-container">
            <div class="component-notifications-list" data-ref="notifications-list"></div>
        </div>
    </div>
</div>