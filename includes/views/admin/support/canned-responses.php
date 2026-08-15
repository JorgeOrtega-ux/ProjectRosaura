<?php
use App\Api\Services\Admin\AdminViewService;

$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';

$adminService = new AdminViewService();
$cannedData = $adminService->getCannedResponsesData($searchQuery);

extract($cannedData);

$langMap = [
    'es-419' => 'Español (Latinoamérica)',
    'es-MX' => 'Español (México)',
    'es-ES' => 'Español (España)',
    'en-US' => 'English (United States)',
    'en-GB' => 'English (United Kingdom)',
    'en' => 'English (United States)',
    'fr-FR' => 'Français (France)',
    'de-DE' => 'Deutsch (Deutschland)',
    'it-IT' => 'Italiano (Italia)',
    'pt-BR' => 'Português (Brasil)',
    'pt-PT' => 'Português (Portugal)'
];
?>

<div class="view-content" data-ref="admin-support-canned-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="manage-canned-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('lbl_canned_responses'); ?></h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="editSelectedCanned" data-ref="btn-edit-canned" data-tooltip="<?php echo __('btn_edit'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteSelectedCanned" data-ref="btn-delete-canned" data-tooltip="<?php echo __('btn_delete'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>

                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--icon component-button--h40 <?php echo !empty($searchQuery) ? 'has-active-filter' : ''; ?>" data-action="toggleSearch" data-ref="btn-toggle-search" data-tooltip="<?php echo __('btn_search'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">search</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="openCreateCannedModal" data-tooltip="<?php echo __('btn_new_canned_response'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">add</span>
                    </button>
                </div>
            </div>

            <div class="component-search-toolbar <?php echo empty($searchQuery) ? 'disabled' : ''; ?>" data-ref="search-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="canned-search-input" placeholder="<?php echo __('placeholder_canned_shortcut'); ?>" value="<?php echo htmlspecialchars($searchQuery); ?>" autocomplete="off">
                    </div>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="admin-canned-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th data-width="150"><?php echo __('lbl_canned_shortcut'); ?></th>
                            <th data-width="220"><?php echo __('lbl_canned_title'); ?></th>
                            <th><?php echo __('lbl_canned_content'); ?></th>
                            <th data-width="120"><?php echo __('lbl_min_level_allowed'); ?></th>
                            <th data-width="120"><?php echo __('lbl_language'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="admin-canned-table-body">
                        <?php if (!empty($responses)): ?>
                            <?php foreach ($responses as $item): 
                                $langName = $langMap[$item['language']] ?? ($item['language'] ?: 'Español');
                                $contentStr = $item['content'] ?? '';
                                $snippet = mb_strlen($contentStr) > 90 ? mb_substr($contentStr, 0, 90) . '...' : $contentStr;
                            ?>
                            <tr class="component-table-row clickable" data-action="selectCannedRow" 
                                data-uuid="<?php echo htmlspecialchars($item['uuid']); ?>"
                                data-shortcut="<?php echo htmlspecialchars($item['shortcut']); ?>"
                                data-title="<?php echo htmlspecialchars($item['title']); ?>"
                                data-content="<?php echo htmlspecialchars($item['content'] ?? ''); ?>"
                                data-min-level="<?php echo htmlspecialchars($item['min_level'] ?? 'l1'); ?>"
                                data-language="<?php echo htmlspecialchars($item['language'] ?? 'es-419'); ?>">
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">tag</span>
                                        <span class="search-target">/<?php echo htmlspecialchars($item['shortcut']); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">title</span>
                                        <span class="search-target"><?php echo htmlspecialchars($item['title']); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">description</span>
                                        <span class="search-target"><?php echo htmlspecialchars($snippet); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">verified_user</span>
                                        <span><?php echo htmlspecialchars(strtoupper($item['min_level'] ?? 'L1')); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">translate</span>
                                        <span><?php echo htmlspecialchars($langName); ?></span>
                                    </div>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="5" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">quickreply</span>
                                        <p class="component-empty-state-text"><?php echo __('lbl_no_canned_found'); ?></p>
                                    </div>
                                </td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>
