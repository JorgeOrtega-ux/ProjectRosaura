<?php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content view-fade-in">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_logs_viewer_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <button class="component-button component-button--icon component-button--h36" data-action="toggle-syntax" data-tooltip="<?php echo __('admin_logs_viewer_toggle_syntax'); ?>">
                    <span class="material-symbols-rounded">code_blocks</span>
                </button>
            </div>
        </div>

        <div class="component-bottom component-bottom--full">
            <div data-ref="logs-viewer-loader" class="component-loader-center active">
                <div class="component-spinner"></div>
            </div>

            <div class="component-file-viewer disabled" data-ref="logs-viewer-container">
                <div class="component-tabs-header" data-ref="logs-viewer-tabs">
                </div>
                <div class="component-viewer-area">
                    <textarea data-ref="logs-viewer-textarea" class="component-viewer-textarea active" readonly spellcheck="false" placeholder="<?php echo __('admin_logs_viewer_placeholder'); ?>"></textarea>
                    <div data-ref="logs-viewer-code" class="component-viewer-code disabled"></div>
                </div>
            </div>
        </div>

    </div>
</div>