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
                <div class="component-actions active" data-ref="header-default-actions">
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="modulePurchaseFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="modulePurchaseFilters">
                            
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--compact">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterType">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">category</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_purchase_type'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterStatus" data-ref="filter-status-row">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">rule</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_purchase_status'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterType">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_purchase_type'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="radio" name="purchase_type_filter" class="filter-radio" data-filter-type="type" value="payments_all" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('type_all_payments') ?: 'Todos los Pagos (Real)'; ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="radio" name="purchase_type_filter" class="filter-radio" data-filter-type="type" value="payments_subscription"></div>
                                        <div class="component-menu-link-text"><span><?php echo __('type_subscription') ?: 'Suscripciones (Real)'; ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="radio" name="purchase_type_filter" class="filter-radio" data-filter-type="type" value="payments_coins"></div>
                                        <div class="component-menu-link-text"><span><?php echo __('type_coins') ?: 'Compras de Monedas (Real)'; ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="radio" name="purchase_type_filter" class="filter-radio" data-filter-type="type" value="coins_virtual"></div>
                                        <div class="component-menu-link-text"><span><?php echo __('tab_coins_virtual') ?: 'Monedas (Virtual)'; ?></span></div>
                                    </label>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterStatus">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_purchase_status'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="status" value="all" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('status_all'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="status" value="succeeded" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('lbl_paid'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="status" value="failed" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('lbl_failed'); ?></span></div>
                                    </label>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div class="component-inline-control" data-ref="pagination-container" data-position="bottom">
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn disabled-interaction" data-action="prevPage">
                                <span class="material-symbols-rounded">chevron_left</span>
                            </button>
                        </div>
                        <div class="component-inline-control__center" data-ref="pagination-page">1</div>
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn disabled-interaction" data-action="nextPage">
                                <span class="material-symbols-rounded">chevron_right</span>
                            </button>
                        </div>
                    </div>
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
                        $response = $stripeServices->getPaymentHistory(['limit' => 100, 'offset' => 0]);
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
                                    $statusClass = 'component-badge--danger';
                                    $statusText = __('failed');
                                }
                                
                                $isCoins = (strpos(strtolower($description), 'coin') !== false || strpos(strtolower($description), 'moneda') !== false);
                                $itemType = $isCoins ? 'coins' : 'subscription';
                                $itemStatus = ($item['status'] === 'succeeded' || $item['status'] === 'paid') ? 'succeeded' : 'failed';
                            ?>
                            <tr class="component-table-row" data-id="<?php echo htmlspecialchars($item['id'] ?? ''); ?>" data-receipt-url="<?php echo htmlspecialchars($item['receipt_url'] ?? ''); ?>" data-pdf-url="<?php echo htmlspecialchars($item['pdf_url'] ?? ''); ?>" data-type="<?php echo $itemType; ?>" data-status="<?php echo $itemStatus; ?>">
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">calendar_month</span>
                                        <span class="search-target"><?php echo $date; ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded"><?php echo $isCoins ? 'monetization_on' : 'description'; ?></span>
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