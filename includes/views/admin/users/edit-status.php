<?php
use App\Api\Services\Admin\AdminViewService;
use App\Core\System\DatabaseConstants as DB;

$adminService = new AdminViewService();
$statusData = $adminService->getEditStatusData($_GET['uuid'] ?? '');

if (!empty($statusData['redirect'])) {
    header("Location: " . $statusData['redirect']);
    exit;
}

extract($statusData);
$user = $targetUser;

$sanctionReasons = \App\Core\Helpers\Utils::getSanctionReasons();
$predefinedSuspension = array_column($sanctionReasons['suspensions'], 'key');


if ($user['suspension_reason']) {
    if (in_array($user['suspension_reason'], $predefinedSuspension)) {
        $initialState['suspensionReason'] = $user['suspension_reason'];
    } else {
        $initialState['suspensionReason'] = '';
        $initialState['customSuspensionReason'] = '';
    }
}

if ($user['is_suspended'] == 1 && $user['suspension_type'] === DB::SUSPENSION_TEMP && $user['suspension_end_date']) {
    $initialState['suspensionDuration'] = 'custom';
    $d = new DateTime($user['suspension_end_date'], new DateTimeZone('UTC'));
    $initialState['endDate'] = $d->format('Y-m-d\TH:i');
}

$displayTexts = [
    'isSuspended' => ($initialState['isSuspended'] === '1') ? __('suspension_active') : __('suspension_none'),
    'suspensionReason' => !empty($initialState['suspensionReason']) ? (in_array($initialState['suspensionReason'], $predefinedSuspension) ? __($initialState['suspensionReason']) : $initialState['suspensionReason']) : __('lbl_select_suspension_reason'),
    'suspendedType' => ($initialState['suspendedType'] === DB::SUSPENSION_PERM) ? __('suspension_perm') : __('suspension_temp'),
    'suspensionDuration' => '...',
    'endDate' => __('lbl_select_date_time')
];

$durationMap = [
    '1' => __('duration_1d'), '3' => __('duration_3d'), '7' => __('duration_7d'), 
    '14' => __('duration_14d'), '30' => __('duration_30d'), 'custom' => __('suspension_custom_time')
];
if (isset($durationMap[$initialState['suspensionDuration']])) {
    $displayTexts['suspensionDuration'] = $durationMap[$initialState['suspensionDuration']];
}

if (!empty($initialState['endDate'])) {
    $d = new DateTime($initialState['endDate']);
    $monthsStr = [__('month_jan'), __('month_feb'), __('month_mar'), __('month_apr'), __('month_may'), __('month_jun'), __('month_jul'), __('month_aug'), __('month_sep'), __('month_oct'), __('month_nov'), __('month_dec')];
    $monthIndex = (int)$d->format('n') - 1;
    $day = $d->format('j');
    $year = $d->format('Y');
    $time = $d->format('H:i');
    $displayTexts['endDate'] = "{$day} " . __('lbl_of') . " {$monthsStr[$monthIndex]} {$year}, {$time}";
}

$vis = [
    'suspension_reason' => 'disabled', 'suspension_type' => 'disabled',
    'suspension_duration' => 'disabled', 'suspension_date' => 'disabled'
];

if ($initialState['isSuspended'] === '1') {
    $vis['suspension_reason'] = '';
    if ($initialState['suspensionReason'] !== '') {
        $vis['suspension_type'] = '';
        if ($initialState['suspendedType'] === DB::SUSPENSION_TEMP) {
            $vis['suspension_duration'] = '';
            if ($initialState['suspensionDuration'] === 'custom') $vis['suspension_date'] = '';
        }
    }
}
?>
<div class="view-content" data-user-id="<?php echo $targetUserId; ?>" data-is-suspended="<?php echo htmlspecialchars($initialState['isSuspended']); ?>" data-suspension-reason="<?php echo htmlspecialchars($initialState['suspensionReason']); ?>" data-custom-suspension-reason="<?php echo htmlspecialchars($initialState['customSuspensionReason']); ?>" data-suspended-type="<?php echo htmlspecialchars($initialState['suspendedType']); ?>" data-suspension-duration="<?php echo htmlspecialchars($initialState['suspensionDuration']); ?>" data-end-date="<?php echo htmlspecialchars($initialState['endDate']); ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title" data-ref="page-main-title"><?php echo __('admin_manage_status_title'); ?></h1>
        </div>
        <div class="component-top-right" data-ref="toolbar-actions-config">
            <button class="component-button component-button--icon component-button--h40 disabled-interaction" data-action="submitSuspensionUpdate" data-ref="admin-btn-save-suspension" data-tooltip="<?php echo __('tooltip_save_status'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div data-ref="admin-status-form">
                    
                    <div class="component-setup-container active">
                        
                        <div class="component-card--grouped component-accordion active">
                            
                            <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                                <div class="component-card__content">
                                    <div class="component-card__icon-container component-card__icon-container--bordered">
                                        <span class="material-symbols-rounded">shield</span>
                                    </div>
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_access_restriction_title'); ?></h2>
                                        <p class="component-card__description">
                                            <?php echo ($user['role_name'] === 'founder') ? '<span >'.__('err_founder_suspend_immutable').'</span>' : __('desc_account_suspension'); ?>
                                        </p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                                </div>
                            </div>

                            <div class="component-accordion-body">
                                <div class="component-accordion-content">

                                    <div class="component-group-item component-group-item--stacked">
                                        <div class="component-card__content">
                                            <div class="component-card__text">
                                                <h2 class="component-card__title"><?php echo __('admin_access_restriction_title'); ?></h2>
                                                <p class="component-card__description">
                                                    <?php echo ($user['role_name'] === 'founder') ? '<span >'.__('err_founder_suspend_immutable').'</span>' : __('desc_account_suspension'); ?>
                                                </p>
                                            </div>
                                        </div>
                                        <div class="component-card__actions component-card__actions--start">
                                            <div class="component-dropdown-wrapper">
                                                <div class="component-dropdown-trigger <?php echo ($user['role_name'] === 'founder') ? 'disabled-interaction' : ''; ?>" data-action="toggleModule" data-target="adminModuleSuspended">
                                                    <span class="material-symbols-rounded">shield</span>
                                                    <span class="component-dropdown-text" data-ref="admin-isSuspended-text"><?php echo $displayTexts['isSuspended']; ?></span>
                                                    <span class="material-symbols-rounded">expand_more</span>
                                                </div>
                                                <div class="component-module component-module--dropdown disabled" data-module="adminModuleSuspended">
                                                     <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                         <div class="pill-container"><div class="drag-handle"></div></div>
                                                         <div class="component-menu-list">
                                                             <div class="component-menu-link <?php echo ($initialState['isSuspended'] === '0') ? 'active' : ''; ?>" data-action="adminSetDropdown" data-key="isSuspended" data-value="0">
                                                                 <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock_open</span></div>
                                                                 <div class="component-menu-link-text"><span><?php echo __('suspension_none'); ?></span></div>
                                                             </div>
                                                             <div class="component-menu-link <?php echo ($initialState['isSuspended'] === '1') ? 'active' : ''; ?>" data-action="adminSetDropdown" data-key="isSuspended" data-value="1">
                                                                 <div class="component-menu-link-icon"><span class="material-symbols-rounded">block</span></div>
                                                                 <div class="component-menu-link-text"><span><?php echo __('suspension_active'); ?></span></div>
                                                             </div>
                                                         </div>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>

                                     <div class="<?php echo $vis['suspension_reason']; ?>" data-ref="section-suspended-reason">
                                         <hr class="component-divider">
                                         <div class="component-group-item component-group-item--stacked">
                                             <div class="component-card__content">
                                                 <div class="component-card__text">
                                                     <h2 class="component-card__title"><?php echo __('admin_suspension_reason_title'); ?></h2>
                                                     <p class="component-card__description"><?php echo __('admin_suspension_reason_desc'); ?></p>
                                                 </div>
                                             </div>
                                             <div class="component-card__actions component-card__actions--start">
                                                 <div class="component-dropdown-wrapper">
                                                     <div class="component-dropdown-trigger" data-action="toggleModule" data-target="adminModuleSuspensionReason">
                                                         <span class="material-symbols-rounded">format_list_bulleted</span>
                                                         <span class="component-dropdown-text" data-ref="admin-suspensionReason-text"><?php echo $displayTexts['suspensionReason']; ?></span>
                                                         <span class="material-symbols-rounded">expand_more</span>
                                                     </div>
                                                     <div class="component-module component-module--dropdown disabled" data-module="adminModuleSuspensionReason">
                                                         <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                                             <div class="pill-container"><div class="drag-handle"></div></div>
                                                             
                                                             <div class="component-menu-header">
                                                                 <div class="component-search component-search--full component-search--h36">
                                                                     <div class="component-search-icon">
                                                                         <span class="material-symbols-rounded">search</span>
                                                                     </div>
                                                                     <div class="component-search-input">
                                                                         <input type="text" data-ref="suspension-reason-search" placeholder="<?php echo __('placeholder_search'); ?>">
                                                                     </div>
                                                                 </div>
                                                             </div>

                                                             <div class="component-menu-list component-menu-list--scrollable" data-ref="suspension-reason-list">
                                                                 <?php foreach ($sanctionReasons['suspensions'] as $r): ?>
                                                                     <div class="component-menu-link <?php echo ($initialState['suspensionReason'] === $r['key']) ? 'active' : ''; ?>" data-action="adminSetDropdown" data-key="suspensionReason" data-value="<?php echo htmlspecialchars($r['key']); ?>">
                                                                         <div class="component-menu-link-icon"><span class="material-symbols-rounded"><?php echo htmlspecialchars($r['icon']); ?></span></div>
                                                                         <div class="component-menu-link-text"><span><?php echo __($r['key']); ?></span></div>
                                                                     </div>
                                                                 <?php endforeach; ?>
                                                                 
                                                                 <div class="component-menu-empty" data-ref="suspension-reason-empty" hidden>
                                                                      <div class="component-menu-link disabled-interaction">
                                                                          <div class="component-menu-link-icon"><span class="material-symbols-rounded">search_off</span></div>
                                                                          <div class="component-menu-link-text"><span ><?php echo __('no_results_found'); ?></span></div>
                                                                      </div>
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>



                                     <div class="<?php echo $vis['suspension_type']; ?>" data-ref="section-suspended-type">
                                         <hr class="component-divider">
                                         <div class="component-group-item component-group-item--stacked">
                                             <div class="component-card__content">
                                                 <div class="component-card__text">
                                                     <h2 class="component-card__title"><?php echo __('admin_suspension_type_title'); ?></h2>
                                                     <p class="component-card__description"><?php echo __('admin_suspension_type_desc'); ?></p>
                                                 </div>
                                             </div>
                                             <div class="component-card__actions component-card__actions--start">
                                                 <div class="component-dropdown-wrapper">
                                                     <div class="component-dropdown-trigger" data-action="toggleModule" data-target="adminModuleSuspendedType">
                                                         <span class="material-symbols-rounded">hourglass_empty</span>
                                                         <span class="component-dropdown-text" data-ref="admin-suspendedType-text"><?php echo $displayTexts['suspendedType']; ?></span>
                                                         <span class="material-symbols-rounded">expand_more</span>
                                                     </div>
                                                     <div class="component-module component-module--dropdown disabled" data-module="adminModuleSuspendedType">
                                                         <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                             <div class="pill-container"><div class="drag-handle"></div></div>
                                                             <div class="component-menu-list">
                                                                 <div class="component-menu-link <?php echo ($initialState['suspendedType'] === DB::SUSPENSION_TEMP) ? 'active' : ''; ?>" data-action="adminSetDropdown" data-key="suspendedType" data-value="<?php echo DB::SUSPENSION_TEMP; ?>">
                                                                     <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                                                     <div class="component-menu-link-text"><span><?php echo __('suspension_temp'); ?></span></div>
                                                                 </div>
                                                                 <div class="component-menu-link <?php echo ($initialState['suspendedType'] === DB::SUSPENSION_PERM) ? 'active' : ''; ?>" data-action="adminSetDropdown" data-key="suspendedType" data-value="<?php echo DB::SUSPENSION_PERM; ?>">
                                                                     <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock_clock</span></div>
                                                                     <div class="component-menu-link-text"><span><?php echo __('suspension_perm'); ?></span></div>
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>

                                     <div class="<?php echo $vis['suspension_duration']; ?>" data-ref="section-suspended-duration">
                                         <hr class="component-divider">
                                         <div class="component-group-item component-group-item--stacked">
                                             <div class="component-card__content">
                                                 <div class="component-card__text">
                                                     <h2 class="component-card__title"><?php echo __('admin_suspension_duration_title'); ?></h2>
                                                     <p class="component-card__description"><?php echo __('admin_suspension_duration_desc'); ?></p>
                                                 </div>
                                             </div>
                                             <div class="component-card__actions component-card__actions--start">
                                                 <div class="component-dropdown-wrapper">
                                                     <div class="component-dropdown-trigger" data-action="toggleModule" data-target="adminModuleSuspensionDuration">
                                                         <span class="material-symbols-rounded">schedule</span>
                                                         <span class="component-dropdown-text" data-ref="admin-suspensionDuration-text"><?php echo $displayTexts['suspensionDuration']; ?></span>
                                                         <span class="material-symbols-rounded">expand_more</span>
                                                     </div>
                                                     <div class="component-module component-module--dropdown disabled" data-module="adminModuleSuspensionDuration">
                                                         <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                             <div class="pill-container"><div class="drag-handle"></div></div>
                                                             <div class="component-menu-list">
                                                                 <div class="component-menu-link <?php echo ($initialState['suspensionDuration'] === '1') ? 'active' : ''; ?>" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="1">
                                                                     <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                                                     <div class="component-menu-link-text"><span><?php echo __('duration_1d'); ?></span></div>
                                                                 </div>
                                                                 <div class="component-menu-link <?php echo ($initialState['suspensionDuration'] === '3') ? 'active' : ''; ?>" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="3">
                                                                     <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                                                     <div class="component-menu-link-text"><span><?php echo __('duration_3d'); ?></span></div>
                                                                 </div>
                                                                 <div class="component-menu-link <?php echo ($initialState['suspensionDuration'] === '7') ? 'active' : ''; ?>" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="7">
                                                                     <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                                                     <div class="component-menu-link-text"><span><?php echo __('duration_7d'); ?></span></div>
                                                                 </div>
                                                                 <div class="component-menu-link <?php echo ($initialState['suspensionDuration'] === 'custom') ? 'active' : ''; ?>" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="custom">
                                                                     <div class="component-menu-link-icon"><span class="material-symbols-rounded">edit_calendar</span></div>
                                                                     <div class="component-menu-link-text"><span><?php echo __('suspension_custom_time'); ?></span></div>
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>

                                    <div class="<?php echo $vis['suspension_date']; ?>" data-ref="section-suspended-date">
                                        <hr class="component-divider">
                                        <div class="component-group-item component-group-item--stacked">
                                            <div class="component-card__content">
                                                <div class="component-card__text">
                                                    <h2 class="component-card__title"><?php echo __('admin_suspension_end_title'); ?></h2>
                                                    <p class="component-card__description"><?php echo __('admin_suspension_end_desc'); ?></p>
                                                </div>
                                            </div>
                                            <div class="component-card__actions component-card__actions--start">
                                                <div class="component-dropdown-wrapper">
                                                    <div class="component-dropdown-trigger" data-action="openCalendarModal" data-target="adminModuleCalendar">
                                                        <span class="material-symbols-rounded">calendar_month</span>
                                                        <span class="component-dropdown-text" data-ref="admin-endDate-text"><?php echo $displayTexts['endDate']; ?></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>
                        


                    </div>

                </div>
            </div>

        </div>
    </div>
</div>