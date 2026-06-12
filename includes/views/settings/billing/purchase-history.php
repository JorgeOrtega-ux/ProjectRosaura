<?php
// includes/views/settings/purchase-history.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="purchase-history-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('phistory_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions active">
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="view-table">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('th_date'); ?></th>
                            <th><?php echo __('th_description'); ?></th>
                            <th><?php echo __('th_amount'); ?></th>
                            <th><?php echo __('th_status'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr data-ref="empty-history-table">
                            <td colspan="4" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">receipt_long</span>
                                    <p class="component-empty-state-text"><?php echo __('empty_purchase_history'); ?></p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>