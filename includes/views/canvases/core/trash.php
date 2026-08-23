<?php
use App\Api\Services\Canvas\CanvasViewService;
use App\Core\Helpers\Utils;

$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';
$typeFilter = isset($_GET['type']) && $_GET['type'] !== '' ? array_filter(explode(',', $_GET['type'])) : [];
$privacyFilter = isset($_GET['privacy']) && $_GET['privacy'] !== '' ? array_filter(explode(',', $_GET['privacy'])) : [];
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;

$canvasService = new CanvasViewService();
$trashData = $canvasService->getTrashData($searchQuery, $typeFilter, [], $privacyFilter, $page);

if (!empty($trashData['unauthorized'])) {
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($trashData);

$hasRestrictedType = isset($_GET['type']) && $_GET['type'] !== '' && count(array_filter(explode(',', $_GET['type']))) < 2;
$isFiltered = !empty($searchQuery) || !empty($privacyFilter) || $hasRestrictedType;

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
                                        <span class="material-symbols-rounded">filter_list</span>
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterType">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">category</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_type'); ?></span></div>
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
                    <?php if ($isFiltered): ?>
                        <div class="component-empty-state-graphic">
                            <svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="searchGlassTrash" x1="30" y1="26" x2="86" y2="82" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12"/>
                                        <stop offset="100%" stop-color="#71717a" stop-opacity="0.05"/>
                                    </linearGradient>
                                    <linearGradient id="searchRimTrash" x1="28" y1="24" x2="88" y2="84" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stop-color="#a1a1aa"/>
                                        <stop offset="50%" stop-color="#71717a"/>
                                        <stop offset="100%" stop-color="#3f3f46"/>
                                    </linearGradient>
                                    <linearGradient id="searchHandleGradTrash" x1="76" y1="76" x2="114" y2="114" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stop-color="#71717a"/>
                                        <stop offset="50%" stop-color="#52525b"/>
                                        <stop offset="100%" stop-color="#27272a"/>
                                    </linearGradient>
                                </defs>
                                <circle cx="58" cy="54" r="38" stroke="var(--border-color, #3f3f46)" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.4"/>
                                <path d="M80 76 L110 106" stroke="url(#searchHandleGradTrash)" stroke-width="12" stroke-linecap="round"/>
                                <path d="M80 76 L110 106" stroke="#a1a1aa" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
                                <circle cx="110" cy="106" r="6" fill="#27272a"/>
                                <circle cx="58" cy="54" r="30" fill="url(#searchGlassTrash)" stroke="url(#searchRimTrash)" stroke-width="6"/>
                                <path d="M38 42 C44 34 54 30 66 32" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-opacity="0.5" fill="none"/>
                                <circle cx="54" cy="50" r="3.5" fill="#e4e4e7"/>
                                <circle cx="68" cy="60" r="2.5" fill="#a1a1aa"/>
                                <circle cx="48" cy="62" r="2" fill="#71717a"/>
                                <g>
                                    <path d="M106 28 L107.5 32.5 L112 34 L107.5 35.5 L106 40 L104.5 35.5 L100 34 L104.5 32.5 Z" fill="#e4e4e7"/>
                                    <path d="M22 66 L23 69 L26 70 L23 71 L22 74 L21 71 L18 70 L21 69 Z" fill="#a1a1aa"/>
                                    <path d="M84 18 L85 20 L87 21 L85 22 L84 24 L83 22 L81 21 L83 20 Z" fill="#71717a"/>
                                </g>
                            </svg>
                        </div>
                        <h2 class="component-empty-state-title"><?php echo __('trash_empty_search_title'); ?></h2>
                        <p class="component-empty-state-desc"><?php echo __('trash_empty_search_desc'); ?></p>
                    <?php else: ?>
                        <div class="component-empty-state-graphic">
                            <svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="trashCanGradPhp" x1="40" y1="56" x2="100" y2="120" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stop-color="#52525b"/>
                                        <stop offset="45%" stop-color="#3f3f46"/>
                                        <stop offset="100%" stop-color="#18181b"/>
                                    </linearGradient>
                                    <linearGradient id="trashLidGradPhp" x1="30" y1="20" x2="80" y2="60" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stop-color="#71717a"/>
                                        <stop offset="50%" stop-color="#52525b"/>
                                        <stop offset="100%" stop-color="#27272a"/>
                                    </linearGradient>
                                    <linearGradient id="trashHighlightPhp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
                                        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
                                    </linearGradient>
                                    <linearGradient id="butterflyWingPhp" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stop-color="#f4f4f5"/>
                                        <stop offset="100%" stop-color="#a1a1aa"/>
                                    </linearGradient>
                                    <linearGradient id="butterflyLowerWingPhp" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stop-color="#d4d4d8"/>
                                        <stop offset="100%" stop-color="#71717a"/>
                                    </linearGradient>
                                </defs>
                                <path d="M46 62 L52 116 C52.5 122 87.5 122 88 116 L94 62 Z" fill="url(#trashCanGradPhp)"/>
                                <rect x="55" y="66" width="5" height="48" rx="2.5" fill="rgba(255,255,255,0.12)"/>
                                <rect x="67.5" y="66" width="5" height="50" rx="2.5" fill="rgba(255,255,255,0.2)"/>
                                <rect x="80" y="66" width="5" height="48" rx="2.5" fill="rgba(0,0,0,0.3)"/>
                                <ellipse cx="70" cy="62" rx="25" ry="7" fill="#27272a"/>
                                <ellipse cx="70" cy="62" rx="22" ry="5.5" fill="#18181b"/>
                                <ellipse cx="70" cy="62" rx="16" ry="3.5" fill="#3f3f46" opacity="0.6"/>
                                <g transform="rotate(-24 46 44)">
                                    <ellipse cx="64" cy="46" rx="28" ry="7" fill="url(#trashLidGradPhp)"/>
                                    <path d="M38 46 C38 36 90 36 90 46 Z" fill="url(#trashLidGradPhp)"/>
                                    <path d="M42 43 C46 38 82 38 86 43" stroke="url(#trashHighlightPhp)" stroke-width="2" stroke-linecap="round" fill="none"/>
                                    <path d="M58 35 C58 30 70 30 70 35" stroke="#e4e4e7" stroke-width="3" stroke-linecap="round" fill="none"/>
                                </g>
                                <g transform="translate(90, 36)">
                                    <path d="M-1 -1 C-6 -8 -13 -6 -10 1 C-8 4 -3 2 -1 0 Z" fill="url(#butterflyWingPhp)"/>
                                    <path d="M1 -1 C6 -8 13 -6 10 1 C8 4 3 2 1 0 Z" fill="url(#butterflyWingPhp)"/>
                                    <path d="M-1 1 C-6 5 -10 9 -6 11 C-3 11 -1 5 -1 1 Z" fill="url(#butterflyLowerWingPhp)"/>
                                    <path d="M1 1 C6 5 10 9 6 11 C3 11 1 5 1 1 Z" fill="url(#butterflyLowerWingPhp)"/>
                                    <ellipse cx="0" cy="1" rx="1.5" ry="5.5" fill="#27272a"/>
                                </g>
                                <g>
                                    <path d="M108 24 L109.5 28.5 L114 30 L109.5 31.5 L108 36 L106.5 31.5 L102 30 L106.5 28.5 Z" fill="#e4e4e7"/>
                                    <path d="M30 42 L31 45 L34 46 L31 47 L30 50 L29 47 L26 46 L29 45 Z" fill="#a1a1aa"/>
                                    <path d="M84 18 L85 20 L87 21 L85 22 L84 24 L83 22 L81 21 L83 20 Z" fill="#71717a"/>
                                </g>
                            </svg>
                        </div>
                        <h2 class="component-empty-state-title"><?php echo __('trash_empty_title'); ?></h2>
                        <p class="component-empty-state-desc"><?php echo __('trash_empty_desc'); ?></p>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </div>

    </div>
</div>
