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
                                $statusIcon = 'check_circle';
                                $statusText = __('paid');
                                
                                if ($item['status'] !== 'succeeded' && $item['status'] !== 'paid') {
                                    $statusClass = 'component-text-notice--error';
                                    $statusIcon = 'error';
                                    $statusText = __('failed');
                                }
                            ?>
                            <tr>
                                <td><?php echo $date; ?></td>
                                <td><?php echo $description; ?></td>
                                <td><?php echo $amount; ?></td>
                                <td>
                                    <span class="<?php echo $statusClass; ?>">
                                        <span class="material-symbols-rounded"><?php echo $statusIcon; ?></span>
                                        <?php echo $statusText; ?>
                                    </span>
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