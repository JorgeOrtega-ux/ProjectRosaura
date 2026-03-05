<?php
// includes/views/admin/logs-viewer.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content view-fade-in">
    <div class="component-wrapper component-wrapper--full">
        
        <div class="component-toolbar-primary">
            <div class="component-toolbar-mode active">
                <div class="component-toolbar-left">
                    <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/logs" data-tooltip="<?php echo __('tooltip_back_to_logs'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </button>
                    <span class="component-toolbar-title"><?php echo __('admin_logs_viewer_title'); ?></span>
                </div>
            </div>
        </div>

        <div data-ref="logs-viewer-loader" class="active">
            <div class="component-spinner"></div>
        </div>

        <div class="component-file-viewer disabled" data-ref="logs-viewer-container">
            <div class="component-tabs-header" data-ref="logs-viewer-tabs">
            </div>
            <div class="component-viewer-area">
                <textarea data-ref="logs-viewer-textarea" class="component-viewer-textarea" readonly spellcheck="false" placeholder="<?php echo __('admin_logs_viewer_placeholder'); ?>"></textarea>
            </div>
        </div>

    </div>
</div>