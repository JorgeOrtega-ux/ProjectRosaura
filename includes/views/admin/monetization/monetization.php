<?php
use App\Api\Services\Admin\AdminViewService;

$adminService = new AdminViewService();
$viewData = $adminService->getMonetizationData();
$config = $viewData['config'] ?? [];

$defaultProvider = $config['default_provider'] ?? 'mock';
$feedProvider = $config['feed_ad_provider'] ?? 'mock';
$modalProvider = $config['modal_ad_provider'] ?? 'mock';
$drawerProvider = $config['drawer_ad_provider'] ?? 'mock';
?>
<div class="view-content" data-ref="admin-monetization-view">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('admin_monetization_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--icon component-button--h40" data-nav="/admin/monetization-campaigns" data-tooltip="<?php echo __('admin_monetization_btn_campaigns'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">campaign</span>
            </button>
            <button class="component-button component-button--icon component-button--h40" data-action="testAdBreak" data-tooltip="<?php echo __('admin_monetization_btn_test_modal'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">play_circle</span>
            </button>
            <button class="component-button component-button--icon component-button--h40" data-action="resetMonetizationConfig" data-tooltip="<?php echo __('admin_monetization_btn_reset'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">restart_alt</span>
            </button>
            <button class="component-button component-button--icon component-button--h40 disabled-interaction" data-action="submitMonetizationConfig" data-ref="btn-save-monetization" data-tooltip="<?php echo __('btn_save_config'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="component-card--grouped" data-ref="admin-monetization-group">
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">campaign</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_monetization_master_switch'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_monetization_master_switch_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input class="component-toggle-input" data-action="toggleConfig" data-field="enabled" data-ref="toggle_enabled" type="checkbox" <?php echo !empty($config['enabled']) ? 'checked' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion" data-ref="admin-monetization-group">
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">settings_ethernet</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_monetization_global_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_monetization_global_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_test_mode'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_test_mode_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input class="component-toggle-input" data-action="toggleConfig" data-field="test_mode" data-ref="toggle_test_mode" type="checkbox" <?php echo !empty($config['test_mode']) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_adblock_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_adblock_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input class="component-toggle-input" data-action="toggleConfig" data-field="adblock_notice_enabled" data-ref="toggle_adblock_notice_enabled" type="checkbox" <?php echo !empty($config['adblock_notice_enabled']) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_default_provider'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_default_provider_desc'); ?></p>
                                        <div class="component-card__form-area">
                                            <div class="component-dropdown-wrapper">
                                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleDefaultProvider">
                                                    <span class="material-symbols-rounded">hub</span>
                                                    <span class="component-dropdown-text" data-ref="text_default_provider"><?php 
                                                        if ($defaultProvider === 'adsense') echo __('admin_monetization_provider_adsense');
                                                        elseif ($defaultProvider === 'custom') echo __('admin_monetization_provider_custom');
                                                        else echo __('admin_monetization_provider_mock');
                                                    ?></span>
                                                    <span class="material-symbols-rounded">expand_more</span>
                                                </div>
                                                <div class="component-module component-module--dropdown disabled" data-module="moduleDefaultProvider">
                                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                                        <div class="component-menu-list">
                                                            <div class="component-menu-link <?php echo $defaultProvider === 'mock' ? 'active' : ''; ?>" data-action="selectProvider" data-target-field="default_provider" data-target-text="text_default_provider" data-value="mock">
                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                                                                <div class="component-menu-link-text"><span><?php echo __('admin_monetization_provider_mock'); ?></span></div>
                                                            </div>
                                                            <div class="component-menu-link <?php echo $defaultProvider === 'adsense' ? 'active' : ''; ?>" data-action="selectProvider" data-target-field="default_provider" data-target-text="text_default_provider" data-value="adsense">
                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">ads_click</span></div>
                                                                <div class="component-menu-link-text"><span><?php echo __('admin_monetization_provider_adsense'); ?></span></div>
                                                            </div>
                                                            <div class="component-menu-link <?php echo $defaultProvider === 'custom' ? 'active' : ''; ?>" data-action="selectProvider" data-target-field="default_provider" data-target-text="text_default_provider" data-value="custom">
                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">code</span></div>
                                                                <div class="component-menu-link-text"><span><?php echo __('admin_monetization_provider_custom'); ?></span></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div data-ref="val_default_provider" data-value="<?php echo htmlspecialchars($defaultProvider); ?>"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_adsense_client'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_adsense_client_desc'); ?></p>
                                        <div class="component-card__form-area">
                                            <div class="component-search component-search--full component-search--h36">
                                                <div class="component-search-icon">
                                                    <span class="material-symbols-rounded">badge</span>
                                                </div>
                                                <div class="component-search-input">
                                                    <input class="component-search-field" data-action="updateTextConfig" data-field="adsense_client_id" data-ref="input_adsense_client_id" type="text" placeholder="ca-pub-0000000000000000" value="<?php echo htmlspecialchars($config['adsense_client_id'] ?? ''); ?>">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_adsense_auto'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_adsense_auto_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input class="component-toggle-input" data-action="toggleConfig" data-field="adsense_auto_ads" data-ref="toggle_adsense_auto_ads" type="checkbox" <?php echo !empty($config['adsense_auto_ads']) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_custom_scripts'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_custom_scripts_desc'); ?></p>
                                        <div class="component-card__form-area">
                                            <textarea class="component-input-field" data-action="updateTextConfig" data-field="custom_header_scripts" data-ref="input_custom_header_scripts" rows="3" placeholder="<script ...></script>"><?php echo htmlspecialchars($config['custom_header_scripts'] ?? ''); ?></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion" data-ref="admin-monetization-group">
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">view_agenda</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_monetization_feed_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_monetization_feed_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_feed_enabled'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_feed_enabled_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input class="component-toggle-input" data-action="toggleConfig" data-field="feed_ads_enabled" data-ref="toggle_feed_ads_enabled" type="checkbox" <?php echo !empty($config['feed_ads_enabled']) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_feed_interval'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_feed_interval_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <div class="component-inline-control">
                                        <div class="component-inline-control__group">
                                            <button class="component-inline-control__btn" data-action="adjustConfig" data-field="feed_ad_interval" data-step="-1" data-min="2" data-max="50" type="button">
                                                <span class="material-symbols-rounded">remove</span>
                                            </button>
                                            <div class="component-inline-control__center">
                                                <span class="component-inline-control__val" data-ref="val_feed_ad_interval" data-value="<?php echo (int)($config['feed_ad_interval'] ?? 8); ?>"><?php echo (int)($config['feed_ad_interval'] ?? 8); ?></span>
                                            </div>
                                            <button class="component-inline-control__btn" data-action="adjustConfig" data-field="feed_ad_interval" data-step="1" data-min="2" data-max="50" type="button">
                                                <span class="material-symbols-rounded">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_feed_provider'); ?></h2>
                                        <div class="component-card__form-area">
                                            <div class="component-dropdown-wrapper">
                                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleFeedProvider">
                                                    <span class="material-symbols-rounded">layers</span>
                                                    <span class="component-dropdown-text" data-ref="text_feed_ad_provider"><?php 
                                                        if ($feedProvider === 'adsense') echo __('admin_monetization_provider_adsense');
                                                        elseif ($feedProvider === 'custom') echo __('admin_monetization_provider_custom');
                                                        else echo __('admin_monetization_provider_mock');
                                                    ?></span>
                                                    <span class="material-symbols-rounded">expand_more</span>
                                                </div>
                                                <div class="component-module component-module--dropdown disabled" data-module="moduleFeedProvider">
                                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                                        <div class="component-menu-list">
                                                            <div class="component-menu-link <?php echo $feedProvider === 'mock' ? 'active' : ''; ?>" data-action="selectProvider" data-target-field="feed_ad_provider" data-target-text="text_feed_ad_provider" data-value="mock">
                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                                                                <div class="component-menu-link-text"><span><?php echo __('admin_monetization_provider_mock'); ?></span></div>
                                                            </div>
                                                            <div class="component-menu-link <?php echo $feedProvider === 'adsense' ? 'active' : ''; ?>" data-action="selectProvider" data-target-field="feed_ad_provider" data-target-text="text_feed_ad_provider" data-value="adsense">
                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">ads_click</span></div>
                                                                <div class="component-menu-link-text"><span><?php echo __('admin_monetization_provider_adsense'); ?></span></div>
                                                            </div>
                                                            <div class="component-menu-link <?php echo $feedProvider === 'custom' ? 'active' : ''; ?>" data-action="selectProvider" data-target-field="feed_ad_provider" data-target-text="text_feed_ad_provider" data-value="custom">
                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">code</span></div>
                                                                <div class="component-menu-link-text"><span><?php echo __('admin_monetization_provider_custom'); ?></span></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div data-ref="val_feed_ad_provider" data-value="<?php echo htmlspecialchars($feedProvider); ?>"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $feedProvider !== 'adsense' ? 'disabled' : ''; ?>" data-provider-section="feed_ad_provider" data-provider-type="adsense">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_feed_slot'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_monetization_adsense_info'); ?></p>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">tag</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="feed_adsense_slot" data-ref="input_feed_adsense_slot" type="text" placeholder="0000000000" value="<?php echo htmlspecialchars($config['feed_adsense_slot'] ?? ''); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="component-divider">

                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_feed_layout_key'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_monetization_feed_layout_key_desc'); ?></p>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">design_services</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="feed_adsense_layout_key" data-ref="input_feed_adsense_layout_key" type="text" placeholder="-fb+5w+4e-db+86" value="<?php echo htmlspecialchars($config['feed_adsense_layout_key'] ?? ''); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $feedProvider !== 'mock' ? 'disabled' : ''; ?>" data-provider-section="feed_ad_provider" data-provider-type="mock">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_feed_mock_title'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_monetization_mock_info'); ?></p>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">title</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="feed_mock_title" data-ref="input_feed_mock_title" type="text" value="<?php echo htmlspecialchars($config['feed_mock_title'] ?? ''); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="component-divider">

                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_feed_mock_desc_lbl'); ?></h2>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">description</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="feed_mock_desc" data-ref="input_feed_mock_desc" type="text" value="<?php echo htmlspecialchars($config['feed_mock_desc'] ?? ''); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="component-divider">

                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_feed_mock_image_url'); ?></h2>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">image</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="feed_mock_image_url" data-ref="input_feed_mock_image_url" type="text" placeholder="https://ejemplo.com/banner.png" value="<?php echo htmlspecialchars($config['feed_mock_image_url'] ?? ''); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="component-divider">

                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_feed_mock_badge'); ?></h2>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">label</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="feed_mock_badge" data-ref="input_feed_mock_badge" type="text" value="<?php echo htmlspecialchars($config['feed_mock_badge'] ?? 'Patrocinado'); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="component-divider">

                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_feed_mock_cta_text'); ?></h2>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">smart_button</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="feed_mock_cta_text" data-ref="input_feed_mock_cta_text" type="text" value="<?php echo htmlspecialchars($config['feed_mock_cta_text'] ?? 'Descubrir más'); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="component-divider">

                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_feed_mock_cta_url'); ?></h2>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">link</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="feed_mock_cta_url" data-ref="input_feed_mock_cta_url" type="text" value="<?php echo htmlspecialchars($config['feed_mock_cta_url'] ?? '/upgrade'); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $feedProvider !== 'custom' ? 'disabled' : ''; ?>" data-provider-section="feed_ad_provider" data-provider-type="custom">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_custom_html_label'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_monetization_custom_info'); ?></p>
                                            <div class="component-card__form-area">
                                                <textarea class="component-input-field" data-action="updateTextConfig" data-field="feed_custom_html" data-ref="input_feed_custom_html" rows="4" placeholder="<script ...></script> o <iframe>...</iframe>"><?php echo htmlspecialchars($config['feed_custom_html'] ?? ''); ?></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion" data-ref="admin-monetization-group">
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">smart_display</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_monetization_modal_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_monetization_modal_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_modal_enabled'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_modal_enabled_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input class="component-toggle-input" data-action="toggleConfig" data-field="modal_ads_enabled" data-ref="toggle_modal_ads_enabled" type="checkbox" <?php echo !empty($config['modal_ads_enabled']) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_modal_cooldown'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_modal_cooldown_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <div class="component-inline-control">
                                        <div class="component-inline-control__group">
                                            <button class="component-inline-control__btn" data-action="adjustConfig" data-field="modal_ad_cooldown_seconds" data-step="-30" data-min="10" data-max="1800" type="button">
                                                <span class="material-symbols-rounded">remove</span>
                                            </button>
                                            <div class="component-inline-control__center">
                                                <span class="component-inline-control__val" data-ref="val_modal_ad_cooldown_seconds" data-value="<?php echo (int)($config['modal_ad_cooldown_seconds'] ?? 180); ?>"><?php echo (int)($config['modal_ad_cooldown_seconds'] ?? 180); ?>s</span>
                                            </div>
                                            <button class="component-inline-control__btn" data-action="adjustConfig" data-field="modal_ad_cooldown_seconds" data-step="30" data-min="10" data-max="1800" type="button">
                                                <span class="material-symbols-rounded">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_modal_duration'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_modal_duration_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <div class="component-inline-control">
                                        <div class="component-inline-control__group">
                                            <button class="component-inline-control__btn" data-action="adjustConfig" data-field="modal_ad_duration_seconds" data-step="-1" data-min="2" data-max="30" type="button">
                                                <span class="material-symbols-rounded">remove</span>
                                            </button>
                                            <div class="component-inline-control__center">
                                                <span class="component-inline-control__val" data-ref="val_modal_ad_duration_seconds" data-value="<?php echo (int)($config['modal_ad_duration_seconds'] ?? 5); ?>"><?php echo (int)($config['modal_ad_duration_seconds'] ?? 5); ?>s</span>
                                            </div>
                                            <button class="component-inline-control__btn" data-action="adjustConfig" data-field="modal_ad_duration_seconds" data-step="1" data-min="2" data-max="30" type="button">
                                                <span class="material-symbols-rounded">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_modal_muted'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_modal_muted_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input class="component-toggle-input" data-action="toggleConfig" data-field="modal_ad_muted_default" data-ref="toggle_modal_ad_muted_default" type="checkbox" <?php echo !empty($config['modal_ad_muted_default']) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_modal_provider'); ?></h2>
                                        <div class="component-card__form-area">
                                            <div class="component-dropdown-wrapper">
                                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleModalProvider">
                                                    <span class="material-symbols-rounded">layers</span>
                                                    <span class="component-dropdown-text" data-ref="text_modal_ad_provider"><?php 
                                                        if ($modalProvider === 'adsense') echo __('admin_monetization_provider_adsense');
                                                        elseif ($modalProvider === 'custom') echo __('admin_monetization_provider_custom');
                                                        else echo __('admin_monetization_provider_mock');
                                                    ?></span>
                                                    <span class="material-symbols-rounded">expand_more</span>
                                                </div>
                                                <div class="component-module component-module--dropdown disabled" data-module="moduleModalProvider">
                                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                                        <div class="component-menu-list">
                                                            <div class="component-menu-link <?php echo $modalProvider === 'mock' ? 'active' : ''; ?>" data-action="selectProvider" data-target-field="modal_ad_provider" data-target-text="text_modal_ad_provider" data-value="mock">
                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                                                                <div class="component-menu-link-text"><span><?php echo __('admin_monetization_provider_mock'); ?></span></div>
                                                            </div>
                                                            <div class="component-menu-link <?php echo $modalProvider === 'adsense' ? 'active' : ''; ?>" data-action="selectProvider" data-target-field="modal_ad_provider" data-target-text="text_modal_ad_provider" data-value="adsense">
                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">ads_click</span></div>
                                                                <div class="component-menu-link-text"><span><?php echo __('admin_monetization_provider_adsense'); ?></span></div>
                                                            </div>
                                                            <div class="component-menu-link <?php echo $modalProvider === 'custom' ? 'active' : ''; ?>" data-action="selectProvider" data-target-field="modal_ad_provider" data-target-text="text_modal_ad_provider" data-value="custom">
                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">code</span></div>
                                                                <div class="component-menu-link-text"><span><?php echo __('admin_monetization_provider_custom'); ?></span></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div data-ref="val_modal_ad_provider" data-value="<?php echo htmlspecialchars($modalProvider); ?>"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $modalProvider !== 'adsense' ? 'disabled' : ''; ?>" data-provider-section="modal_ad_provider" data-provider-type="adsense">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_modal_slot'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_monetization_adsense_info'); ?></p>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">tag</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="modal_adsense_slot" data-ref="input_modal_adsense_slot" type="text" placeholder="0000000000" value="<?php echo htmlspecialchars($config['modal_adsense_slot'] ?? ''); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $modalProvider !== 'mock' ? 'disabled' : ''; ?>" data-provider-section="modal_ad_provider" data-provider-type="mock">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_modal_sponsor_title'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_monetization_mock_info'); ?></p>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">corporate_fare</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="modal_mock_sponsor_title" data-ref="input_modal_mock_sponsor_title" type="text" value="<?php echo htmlspecialchars($config['modal_mock_sponsor_title'] ?? ''); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="component-divider">

                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_modal_sponsor_tagline'); ?></h2>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">subtitles</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="modal_mock_sponsor_tagline" data-ref="input_modal_mock_sponsor_tagline" type="text" value="<?php echo htmlspecialchars($config['modal_mock_sponsor_tagline'] ?? ''); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="component-divider">

                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_modal_sponsor_avatar'); ?></h2>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">category</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="modal_mock_sponsor_avatar" data-ref="input_modal_mock_sponsor_avatar" type="text" placeholder="cloud_done" value="<?php echo htmlspecialchars($config['modal_mock_sponsor_avatar'] ?? 'cloud_done'); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="component-divider">

                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_modal_sponsor_url'); ?></h2>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">link</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="modal_mock_sponsor_url" data-ref="input_modal_mock_sponsor_url" type="text" value="<?php echo htmlspecialchars($config['modal_mock_sponsor_url'] ?? ''); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $modalProvider !== 'custom' ? 'disabled' : ''; ?>" data-provider-section="modal_ad_provider" data-provider-type="custom">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_custom_html_label'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_monetization_custom_info'); ?></p>
                                            <div class="component-card__form-area">
                                                <textarea class="component-input-field" data-action="updateTextConfig" data-field="modal_custom_html" data-ref="input_modal_custom_html" rows="4" placeholder="<script ...></script> o <iframe>...</iframe>"><?php echo htmlspecialchars($config['modal_custom_html'] ?? ''); ?></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion" data-ref="admin-monetization-group">
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">dock_to_left</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_monetization_drawer_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_monetization_drawer_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_drawer_enabled'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_drawer_enabled_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input class="component-toggle-input" data-action="toggleConfig" data-field="drawer_ads_enabled" data-ref="toggle_drawer_ads_enabled" type="checkbox" <?php echo !empty($config['drawer_ads_enabled']) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_drawer_palette'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_drawer_palette_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input class="component-toggle-input" data-action="toggleConfig" data-field="drawer_ad_palette_enabled" data-ref="toggle_drawer_ad_palette_enabled" type="checkbox" <?php echo !empty($config['drawer_ad_palette_enabled']) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_drawer_templates'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_monetization_drawer_templates_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input class="component-toggle-input" data-action="toggleConfig" data-field="drawer_ad_templates_enabled" data-ref="toggle_drawer_ad_templates_enabled" type="checkbox" <?php echo !empty($config['drawer_ad_templates_enabled']) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_monetization_drawer_provider'); ?></h2>
                                        <div class="component-card__form-area">
                                            <div class="component-dropdown-wrapper">
                                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleDrawerProvider">
                                                    <span class="material-symbols-rounded">layers</span>
                                                    <span class="component-dropdown-text" data-ref="text_drawer_ad_provider"><?php 
                                                        if ($drawerProvider === 'adsense') echo __('admin_monetization_provider_adsense');
                                                        elseif ($drawerProvider === 'custom') echo __('admin_monetization_provider_custom');
                                                        else echo __('admin_monetization_provider_mock');
                                                    ?></span>
                                                    <span class="material-symbols-rounded">expand_more</span>
                                                </div>
                                                <div class="component-module component-module--dropdown disabled" data-module="moduleDrawerProvider">
                                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                                        <div class="component-menu-list">
                                                            <div class="component-menu-link <?php echo $drawerProvider === 'mock' ? 'active' : ''; ?>" data-action="selectProvider" data-target-field="drawer_ad_provider" data-target-text="text_drawer_ad_provider" data-value="mock">
                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                                                                <div class="component-menu-link-text"><span><?php echo __('admin_monetization_provider_mock'); ?></span></div>
                                                            </div>
                                                            <div class="component-menu-link <?php echo $drawerProvider === 'adsense' ? 'active' : ''; ?>" data-action="selectProvider" data-target-field="drawer_ad_provider" data-target-text="text_drawer_ad_provider" data-value="adsense">
                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">ads_click</span></div>
                                                                <div class="component-menu-link-text"><span><?php echo __('admin_monetization_provider_adsense'); ?></span></div>
                                                            </div>
                                                            <div class="component-menu-link <?php echo $drawerProvider === 'custom' ? 'active' : ''; ?>" data-action="selectProvider" data-target-field="drawer_ad_provider" data-target-text="text_drawer_ad_provider" data-value="custom">
                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">code</span></div>
                                                                <div class="component-menu-link-text"><span><?php echo __('admin_monetization_provider_custom'); ?></span></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div data-ref="val_drawer_ad_provider" data-value="<?php echo htmlspecialchars($drawerProvider); ?>"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $drawerProvider !== 'adsense' ? 'disabled' : ''; ?>" data-provider-section="drawer_ad_provider" data-provider-type="adsense">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_drawer_slot'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_monetization_adsense_info'); ?></p>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">tag</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="drawer_adsense_slot" data-ref="input_drawer_adsense_slot" type="text" placeholder="0000000000" value="<?php echo htmlspecialchars($config['drawer_adsense_slot'] ?? ''); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $drawerProvider !== 'mock' ? 'disabled' : ''; ?>" data-provider-section="drawer_ad_provider" data-provider-type="mock">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_drawer_mock_title'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_monetization_mock_info'); ?></p>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">title</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="drawer_mock_title" data-ref="input_drawer_mock_title" type="text" value="<?php echo htmlspecialchars($config['drawer_mock_title'] ?? ''); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="component-divider">

                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_drawer_mock_tagline'); ?></h2>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">subtitles</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="drawer_mock_tagline" data-ref="input_drawer_mock_tagline" type="text" value="<?php echo htmlspecialchars($config['drawer_mock_tagline'] ?? ''); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="component-divider">

                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_drawer_mock_badge'); ?></h2>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">label</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="drawer_mock_badge" data-ref="input_drawer_mock_badge" type="text" value="<?php echo htmlspecialchars($config['drawer_mock_badge'] ?? 'PRO'); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="component-divider">

                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_drawer_mock_cta_text'); ?></h2>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">smart_button</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="drawer_mock_cta_text" data-ref="input_drawer_mock_cta_text" type="text" value="<?php echo htmlspecialchars($config['drawer_mock_cta_text'] ?? 'Ver planes'); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="component-divider">

                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_drawer_mock_cta_url'); ?></h2>
                                            <div class="component-card__form-area">
                                                <div class="component-search component-search--full component-search--h36">
                                                    <div class="component-search-icon">
                                                        <span class="material-symbols-rounded">link</span>
                                                    </div>
                                                    <div class="component-search-input">
                                                        <input class="component-search-field" data-action="updateTextConfig" data-field="drawer_mock_cta_url" data-ref="input_drawer_mock_cta_url" type="text" value="<?php echo htmlspecialchars($config['drawer_mock_cta_url'] ?? '/upgrade'); ?>">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $drawerProvider !== 'custom' ? 'disabled' : ''; ?>" data-provider-section="drawer_ad_provider" data-provider-type="custom">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_monetization_custom_html_label'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_monetization_custom_info'); ?></p>
                                            <div class="component-card__form-area">
                                                <textarea class="component-input-field" data-action="updateTextConfig" data-field="drawer_custom_html" data-ref="input_drawer_custom_html" rows="4" placeholder="<script ...></script> o <iframe>...</iframe>"><?php echo htmlspecialchars($config['drawer_custom_html'] ?? ''); ?></textarea>
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
