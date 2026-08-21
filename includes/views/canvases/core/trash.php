<?php
use App\Api\Services\Canvas\CanvasViewService;
use App\Core\Helpers\Utils;

$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';
$typeFilter = isset($_GET['type']) && $_GET['type'] !== '' ? array_filter(explode(',', $_GET['type'])) : [];
$sizeFilter = isset($_GET['size']) && $_GET['size'] !== '' ? array_filter(explode(',', $_GET['size'])) : [];
$privacyFilter = isset($_GET['privacy']) && $_GET['privacy'] !== '' ? array_filter(explode(',', $_GET['privacy'])) : [];
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;

$canvasService = new CanvasViewService();
$trashData = $canvasService->getTrashData($searchQuery, $typeFilter, $sizeFilter, $privacyFilter, $page);

if (!empty($trashData['unauthorized'])) {
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($trashData);

$queryParams = $_GET;
unset($queryParams['url'], $queryParams['page']);
$queryString = !empty($queryParams) ? '&' . http_build_query($queryParams) : '';

$appUrl = defined('APP_URL') ? APP_URL : '';
$prevPageUrl = $page > 1 ? $appUrl . '/trash?page=' . ($page - 1) . $queryString : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/trash?page=' . ($page + 1) . $queryString : '#';
$fallbackImg = $appUrl . '/public/assets/img/fallbacks/canvas-default.png';
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="trash-canvases-wrapper">

        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('canvases_trash_title'); ?></h1>
            </div>

            <div class="component-top-right">

                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="restoreSelectedTrash" data-ref="btn-action-restore" data-tooltip="<?php echo __('tooltip_restore_canvas'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">restore_from_trash</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="permanentDeleteSelectedTrash" data-ref="btn-action-perm-delete" data-tooltip="<?php echo __('tooltip_permanent_delete_canvas'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete_forever</span>
                    </button>
                </div>

                <div class="component-actions active" data-ref="header-default-actions">

                    <button class="component-button component-button--icon component-button--h40 <?php echo !empty($searchQuery) ? 'has-active-filter' : ''; ?>" data-action="searchTrash" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_trash_placeholder'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit" data-ref="canvas-filters-wrapper">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleTrashFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">tune</span>
                        </button>

                        <div class="component-module component-module--dropdown disabled" data-module="moduleTrashFilters">

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterType">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">category</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_type'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterSize">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">aspect_ratio</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_size'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterPrivacy">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">visibility</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_privacy'); ?></span></div>
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
                                        <span class="component-menu-header-title"><?php echo __('filter_by_type'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <?php 
                                    $checkedTypes = empty($typeFilter) ? ['canvas', 'template'] : $typeFilter;
                                    ?>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="type" value="canvas" <?php echo in_array('canvas', $checkedTypes) ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('trash_tab_canvases'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="type" value="template" <?php echo in_array('template', $checkedTypes) ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('trash_tab_templates'); ?></span></div>
                                    </label>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterSize">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_by_size'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <?php 
                                    $allSizesList = array_keys($allSizes);
                                    $checkedSizes = empty($sizeFilter) ? $allSizesList : $sizeFilter;
                                    foreach ($allSizes as $sizeKey => $sizeData): 
                                        $isChecked = in_array($sizeKey, $checkedSizes) ? 'checked' : '';
                                    ?>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="size" value="<?php echo htmlspecialchars($sizeKey); ?>" <?php echo $isChecked; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo htmlspecialchars($sizeKey); ?></span></div>
                                    </label>
                                    <?php endforeach; ?>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterPrivacy">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_by_privacy'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <?php 
                                    $checkedPrivacy = empty($privacyFilter) ? ['public', 'private'] : $privacyFilter;
                                    ?>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="privacy" value="public" <?php echo in_array('public', $checkedPrivacy) ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('canvas_privacy_public'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="privacy" value="private" <?php echo in_array('private', $checkedPrivacy) ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('canvas_privacy_private'); ?></span></div>
                                    </label>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div class="component-inline-control" data-ref="pagination-container" data-tooltip="<?php echo __('pagination_tooltip', ['page' => $page, 'total' => $totalPages]); ?>" data-position="bottom">
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn <?php echo $page <= 1 ? 'disabled-interaction' : ''; ?>" <?php echo $page > 1 ? 'data-nav="'.$prevPageUrl.'"' : ''; ?>>
                                <span class="material-symbols-rounded">chevron_left</span>
                            </button>
                        </div>
                        <div class="component-inline-control__center"><?php echo $page; ?></div>
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn <?php echo $page >= $totalPages ? 'disabled-interaction' : ''; ?>" <?php echo $page < $totalPages ? 'data-nav="'.$nextPageUrl.'"' : ''; ?>>
                                <span class="material-symbols-rounded">chevron_right</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            <div class="component-search-toolbar disabled" data-ref="search-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="trash-search-input" placeholder="<?php echo __('search_trash_placeholder'); ?>" value="<?php echo htmlspecialchars($searchQuery); ?>">
                    </div>
                </div>
            </div>

        </div>

        <div style="padding: 8px 8px 0 8px;">
            <div class="component-alert component-alert--info active">
                <div class="component-alert-icon">
                    <span class="material-symbols-rounded">info</span>
                </div>
                <div class="component-alert-text"><?php echo __('trash_info_banner'); ?></div>
            </div>
        </div>

        <div class="component-bottom" data-ref="view-grid">
            <?php if (!empty($items)): ?>
                <div class="component-grid" data-ref="trash-grid">
                    <?php foreach ($items as $item): ?>
                        <?php
                        $isCanvas = ($item['item_type'] === 'canvas');
                        $daysLeft = $item['days_left'] ?? 30;
                        $daysLeftText = __('trash_days_remaining', ['days' => $daysLeft]);
                        $isExpiringSoon = $daysLeft <= 5;
                        $thumbnailUrl = !empty($item['thumbnail_url']) ? $item['thumbnail_url'] : $fallbackImg;
                        ?>
                        <?php if ($isCanvas): ?>
                            <?php
                            $sizeVal = $item['size'] ?? '64x64';
                            $formattedSize = strpos($sizeVal, 'x') !== false ? $sizeVal : "{$sizeVal}x{$sizeVal}";
                            $privacyIcon = ($item['privacy'] ?? '') === 'public' ? 'public' : 'lock';
                            $privacyText = ($item['privacy'] ?? '') === 'public' ? __('canvas_privacy_public') : __('canvas_privacy_private');
                            ?>
                            <div class="component-gallery-card" data-action="selectTrashCard" data-card-type="canvas" data-canvas-id="<?php echo htmlspecialchars($item['id']); ?>" data-uuid="<?php echo htmlspecialchars($item['uuid']); ?>" data-name="<?php echo htmlspecialchars($item['name']); ?>" data-privacy="<?php echo htmlspecialchars($item['privacy'] ?? 'private'); ?>">
                                <img src="<?php echo htmlspecialchars($thumbnailUrl); ?>" 
                                     alt="<?php echo htmlspecialchars($item['name']); ?>" 
                                     class="component-gallery-card__image image-lazy-fade" 
                                     loading="lazy" 
                                     decoding="async" 
                                     onload="this.classList.add('image-loaded')" 
                                     onerror="this.onerror=null; this.src='<?php echo $fallbackImg; ?>'; this.classList.add('image-loaded');">
                                
                                <div class="component-badge component-badge--glass component-badge--absolute-tr <?php echo $isExpiringSoon ? 'component-badge--danger' : 'component-badge--warning'; ?>">
                                    <span class="material-symbols-rounded">timer</span>
                                    <span><?php echo htmlspecialchars($daysLeftText); ?></span>
                                </div>

                                <div class="component-badge component-badge--glass component-badge--absolute-tl">
                                    <span class="material-symbols-rounded">aspect_ratio</span>
                                    <span><?php echo htmlspecialchars($formattedSize); ?></span>
                                    <span class="component-badge-divider">|</span>
                                    <span class="material-symbols-rounded"><?php echo $privacyIcon; ?></span>
                                    <span><?php echo htmlspecialchars($privacyText); ?></span>
                                </div>

                                <div class="component-gallery-link">
                                    <h3 class="component-gallery-title"><?php echo htmlspecialchars($item['name']); ?></h3>
                                </div>

                                <div class="component-gallery-actions-wrapper">
                                    <div class="component-gallery-actions">
                                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="restoreSingleCanvas" data-uuid="<?php echo htmlspecialchars($item['uuid']); ?>" data-tooltip="<?php echo __('tooltip_restore_canvas'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">restore_from_trash</span>
                                        </button>
                                        <button type="button" class="component-button component-button--icon component-button--h32 component-button--danger" data-action="permDeleteSingleCanvas" data-id="<?php echo htmlspecialchars($item['id']); ?>" data-uuid="<?php echo htmlspecialchars($item['uuid']); ?>" data-name="<?php echo htmlspecialchars($item['name']); ?>" data-tooltip="<?php echo __('tooltip_permanent_delete_canvas'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">delete_forever</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        <?php else: ?>
                            <div class="component-gallery-card" data-action="selectTrashCard" data-card-type="template" data-template-id="<?php echo htmlspecialchars($item['id']); ?>" data-name="<?php echo htmlspecialchars($item['name']); ?>" data-file-size="<?php echo htmlspecialchars($item['storage_bytes']); ?>">
                                <img src="<?php echo htmlspecialchars($thumbnailUrl); ?>" 
                                     alt="<?php echo htmlspecialchars($item['name']); ?>" 
                                     class="component-gallery-card__image image-lazy-fade" 
                                     loading="lazy" 
                                     decoding="async" 
                                     onload="this.classList.add('image-loaded')" 
                                     onerror="this.onerror=null; this.src='<?php echo $fallbackImg; ?>'; this.classList.add('image-loaded');">
                                
                                <div class="component-badge component-badge--glass component-badge--absolute-tr <?php echo $isExpiringSoon ? 'component-badge--danger' : 'component-badge--warning'; ?>">
                                    <span class="material-symbols-rounded">timer</span>
                                    <span><?php echo htmlspecialchars($daysLeftText); ?></span>
                                </div>

                                <div class="component-badge component-badge--glass component-badge--absolute-tl">
                                    <span class="material-symbols-rounded">image</span>
                                    <span><?php echo htmlspecialchars($item['formatted_size']); ?></span>
                                </div>

                                <div class="component-gallery-link">
                                    <h3 class="component-gallery-title"><?php echo htmlspecialchars($item['name']); ?></h3>
                                </div>

                                <div class="component-gallery-actions-wrapper">
                                    <div class="component-gallery-actions">
                                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="restoreSingleTemplate" data-id="<?php echo htmlspecialchars($item['id']); ?>" data-tooltip="<?php echo __('tooltip_restore_template'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">restore_from_trash</span>
                                        </button>
                                        <button type="button" class="component-button component-button--icon component-button--h32 component-button--danger" data-action="permDeleteSingleTemplate" data-id="<?php echo htmlspecialchars($item['id']); ?>" data-name="<?php echo htmlspecialchars($item['name']); ?>" data-tooltip="<?php echo __('tooltip_permanent_delete_template'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">delete_forever</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        <?php endif; ?>
                    <?php endforeach; ?>
                </div>
            <?php else: ?>
                <div class="component-empty-state" data-ref="trash-empty-state">
                    <?php if (!empty($searchQuery) || !empty($typeFilter) || !empty($sizeFilter) || !empty($privacyFilter)): ?>
                        <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                        <p class="component-empty-state-text"><?php echo __('empty_search_trash'); ?></p>
                    <?php else: ?>
                        <span class="material-symbols-rounded component-empty-state-icon">delete_outline</span>
                        <p class="component-empty-state-text"><?php echo __('trash_empty_state'); ?></p>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </div>

    </div>
</div>
