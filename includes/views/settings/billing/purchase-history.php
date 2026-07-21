<?php
if (session_status() === PHP_SESSION_NONE) session_start();
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="purchase-history-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('phistory_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="downloadReceipt" data-tooltip="<?php echo __('btn_download_receipt'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">download</span>
                    </button>
                </div>

                <div class="component-actions active" data-ref="header-default-actions">
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
<?php
                    global $container;
                    try {
                        $stripeServices = $container->get(\App\Api\Services\Stripe\StripeServices::class);
                        $response = $stripeServices->getPaymentHistory(['limit' => 20, 'offset' => 0]);
                        $history = $response['success'] ? $response['data'] : [];
                    } catch (\Throwable $e) {
                        $history = [];
                    }
                    ?>
                    <tbody>
                        <?php if (empty($history)): ?>
                            <tr>
                                <td colspan="4" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">receipt_long</span>
                                        <p class="component-empty-state-text"><?php echo __('empty_purchase_history'); ?></p>
                                    </div>
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($history as $item): 
                                $date = date('d/m/Y', strtotime($item['created_at']));
                                $description = htmlspecialchars($item['description'] ?: __('subscription'));
                                $amount = '$' . number_format($item['amount_cents'] / 100, 2) . ' ' . strtoupper(htmlspecialchars($item['currency']));
                                
                                $statusClass = 'component-text-notice--success';
                                $statusText = __('paid');
                                
                                if ($item['status'] !== 'succeeded' && $item['status'] !== 'paid') {
                                    $statusClass = 'component-text-notice--error';
                                    $statusText = __('failed');
                                }
                            ?>
                            <tr class="component-table-row" data-action="selectPurchase" data-id="<?php echo htmlspecialchars($item['id'] ?? ''); ?>" data-receipt-url="<?php echo htmlspecialchars($item['receipt_url'] ?? ''); ?>" data-pdf-url="<?php echo htmlspecialchars($item['pdf_url'] ?? ''); ?>">
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">calendar_month</span>
                                        <span class="search-target"><?php echo $date; ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">description</span>
                                        <span class="search-target"><?php echo $description; ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">payments</span>
                                        <span class="search-target"><?php echo $amount; ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="search-target <?php echo $statusClass; ?>"><?php echo $statusText; ?></span>
                                    </div>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>