<?php
use App\Api\Services\Admin\AdminViewService;

$adminService = new AdminViewService();
$reportsData = $adminService->getReportsData($_GET['q'] ?? null, (int)($_GET['page'] ?? 1));

extract($reportsData);

$reasonLabels = [
    'spam' => __('report_reason_spam'),
    'offensive' => __('report_reason_offensive'),
    'harassment' => __('report_reason_harassment'),
    'other' => __('report_reason_other')
];

$statusLabels = [
    'pending' => __('report_status_pending'),
    'reviewed' => __('report_status_reviewed'),
    'dismissed' => __('report_status_dismissed')
];

$visibilityLabels = [
    'visible' => __('msg_visibility_visible'),
    'under_review' => __('msg_visibility_under_review'),
    'deleted' => __('msg_visibility_deleted')
];
$visibilityIcons = [
    'visible' => 'check_circle',
    'under_review' => 'pending',
    'deleted' => 'delete'
];
?>

$backUrl = $appUrl . '/admin/messages';
?>

<div class="view-content" data-ref="admin-message-reports-view" data-message-uuid="<?php echo htmlspecialchars($messageUuid); ?>" data-visibility="<?php echo htmlspecialchars($visibility); ?>" data-deleted-by="<?php echo htmlspecialchars($deletedBy); ?>" data-delete-reason="<?php echo htmlspecialchars($deleteReason); ?>">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="reports-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_reports_title'); ?> #<?php echo htmlspecialchars($messageData['id']); ?></h1>
            </div>
            
            <div class="component-top-right">
                <!-- ACCIONES DE SELECCIÓN DE REPORTE -->
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleReportStatusAction">
                            <span class="material-symbols-rounded" data-ref="admin-report-status-icon">rule</span>
                            <span class="component-dropdown-text" data-ref="admin-report-status-text"><?php echo __('report_status_action'); ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleReportStatusAction">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <div class="component-menu-link" data-action="markReportReviewed">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">check</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('report_status_reviewed'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="markReportDismissed">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">close</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('report_status_dismissed'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="markReportPending">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">restart_alt</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('report_status_pending'); ?></span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ACCIONES DEFAULT DE NAVEGACIÓN Y VISIBILIDAD -->
                <div class="component-actions active" data-ref="header-default-actions">
                    <!-- Dropdown de Visibilidad -->
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleVisibilityStatus">
                            <span class="material-symbols-rounded" data-ref="admin-visibility-icon"><?php echo $currentVisIcon; ?></span>
                            <span class="component-dropdown-text" data-ref="admin-visibility-text"><?php echo htmlspecialchars($currentVisText); ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleVisibilityStatus">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <div class="component-menu-link <?php echo $visibility === 'visible' ? 'active' : ''; ?>" data-action="adminSetDropdown" data-key="visibility" data-value="visible">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">check_circle</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('msg_visibility_visible'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link <?php echo $visibility === 'under_review' ? 'active' : ''; ?>" data-action="adminSetDropdown" data-key="visibility" data-value="under_review">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">pending</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('msg_visibility_under_review'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link <?php echo $visibility === 'deleted' ? 'active' : ''; ?>" data-action="adminSetDropdown" data-key="visibility" data-value="deleted">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">delete</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('msg_visibility_deleted'); ?></span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button class="component-button component-button--icon component-button--h40 disabled-interaction" data-action="submitVisibilityUpdate" data-ref="btn-save-visibility" data-tooltip="<?php echo __('tooltip_save_visibility'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">save</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper">
                <table class="component-table component-table--hoverable">
                    <thead>
                        <tr>
                            <th><?php echo __('table_id'); ?></th>
                            <th><?php echo __('reporter'); ?></th>
                            <th><?php echo __('reason'); ?></th>
                            <th><?php echo __('details'); ?></th>
                            <th><?php echo __('table_status'); ?></th>
                            <th><?php echo __('table_date'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="reports-tbody">
                        <?php if (empty($reports)): ?>
                        <tr>
                            <td colspan="6" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">check_circle</span>
                                    <p class="component-empty-state-text"><?php echo __('admin_no_reports'); ?></p>
                                </div>
                            </td>
                        </tr>
                        <?php else: ?>
                            <?php foreach ($reports as $rep): 
                                $statusClass = $rep['status'] === 'reviewed' ? 'success' : ($rep['status'] === 'dismissed' ? 'muted' : 'warning');
                                $reasonText = $reasonLabels[$rep['reason_key']] ?? $rep['reason_key'];
                            ?>
                            <tr class="component-table-row" data-action="selectReport" data-report-id="<?php echo (int)$rep['id']; ?>">
                                <td><span class="component-badge component-badge--sm">#<?php echo (int)$rep['id']; ?></span></td>
                                <td><span class="component-badge component-badge--sm"><?php echo htmlspecialchars($rep['reporter_username']); ?></span></td>
                                <td><span class="component-badge component-badge--sm component-badge--warning"><?php echo htmlspecialchars($reasonText); ?></span></td>
                                <td>
                                    <span class="component-badge component-badge--sm">
                                        <?php echo !empty($rep['details']) ? htmlspecialchars($rep['details']) : '-'; ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="component-badge component-badge--sm component-badge--<?php echo $statusClass; ?>" data-ref="report-status-badge">
                                        <?php echo htmlspecialchars($statusLabels[$rep['status']] ?? $rep['status']); ?>
                                    </span>
                                </td>
                                <td><span class="component-badge component-badge--sm"><?php echo htmlspecialchars(date('Y-m-d H:i', strtotime($rep['created_at']))); ?></span></td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>
