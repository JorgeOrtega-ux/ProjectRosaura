<?php
use App\Api\Services\Admin\AdminViewService;

$adminService = new AdminViewService();
$metricsData = $adminService->getSupportMetricsData();

extract($metricsData);

$m = $metrics ?? [];

$formatSec = function($sec) {
    if (!$sec || !is_numeric($sec)) return '--';
    $s = round((float)$sec);
    if ($s <= 0) return '--';
    if ($s < 60) return "{$s}s";
    $mins = floor($s / 60);
    $remSec = $s % 60;
    return $remSec > 0 ? "{$mins}m {$remSec}s" : "{$mins}m";
};

$totalChats = isset($m['total_chats']) ? number_format((int)$m['total_chats']) : '--';
$avgCsat = !empty($m['avg_csat']) ? number_format((float)$m['avg_csat'], 1) . ' ★' : '--';
$avgFrt = $formatSec($m['avg_frt_seconds'] ?? null);
$avgDuration = $formatSec($m['avg_duration_seconds'] ?? null);
$transfersL1L2 = isset($m['transfers_l1_l2']) ? number_format((int)$m['transfers_l1_l2']) : '--';
$transfersL2L3 = isset($m['transfers_l2_l3']) ? number_format((int)$m['transfers_l2_l3']) : '--';
$totalTickets = isset($m['total_tickets']) ? number_format((int)$m['total_tickets']) : '--';
$openTickets = isset($m['open_tickets']) ? number_format((int)$m['open_tickets']) : '--';
?>

<div class="view-content" data-ref="admin-support-metrics-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="manage-metrics-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('title_metrics'); ?></h1>
            </div>
            <div class="component-top-right">
            </div>
        </div>

        <div class="component-bottom component-bottom--padded">
            <div class="component-stat-grid">
                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">forum</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('lbl_metric_total_chats'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-total-chats"><?php echo $totalChats; ?></span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">star</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('lbl_metric_avg_csat'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-avg-csat"><?php echo $avgCsat; ?></span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">timer</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('lbl_metric_frt'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-avg-frt"><?php echo $avgFrt; ?></span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">hourglass_empty</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('lbl_metric_avg_duration'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-avg-duration"><?php echo $avgDuration; ?></span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">forward</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('lbl_metric_transfers_l1_l2'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-transfers-l1-l2"><?php echo $transfersL1L2; ?></span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">priority_high</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('lbl_metric_transfers_l2_l3'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-transfers-l2-l3"><?php echo $transfersL2L3; ?></span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">mail</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('lbl_metric_total_tickets'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-total-tickets"><?php echo $totalTickets; ?></span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">mark_email_unread</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('lbl_metric_open_tickets'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-open-tickets"><?php echo $openTickets; ?></span>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>
