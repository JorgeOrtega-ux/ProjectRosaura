<div class="view-content" data-ref="manage-cookies-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('cookies_manage_title'); ?></h1>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <div class="component-header-card">
                    <h1 class="component-page-title"><?php echo __('cookies_page_title'); ?></h1>
                    <p class="component-page-description"><?php echo __('cookies_page_desc'); ?></p>
                </div>

                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">security</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('cookies_essential_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('cookies_essential_short_desc'); ?></p>
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
                                        <h2 class="component-card__title"><?php echo __('cookies_cloudflare_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('cookies_cloudflare_desc'); ?></p>
                                    </div>
                                </div>
                            </div>
                            <hr class="component-divider">
                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('cookies_stripe_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('cookies_stripe_desc'); ?></p>
                                    </div>
                                </div>
                            </div>
                            <hr class="component-divider">
                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('cookies_google_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('cookies_google_desc'); ?></p>
                                    </div>
                                </div>
                            </div>
                            <hr class="component-divider">
                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('cookies_own_auth_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('cookies_own_auth_desc'); ?></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">palette</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('cookies_functional_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('cookies_functional_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <div data-action="preventAccordion">
                                <label class="component-toggle-switch">
                                    <input type="checkbox" name="cookie_func" checked>
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('cookies_pref_lang_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('cookies_pref_lang_desc'); ?></p>
                                    </div>
                                </div>
                            </div>
                            <hr class="component-divider">
                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('cookies_pref_theme_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('cookies_pref_theme_desc'); ?></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">monitoring</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('cookies_performance_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('cookies_performance_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <div data-action="preventAccordion">
                                <label class="component-toggle-switch">
                                    <input type="checkbox" name="cookie_perf" checked>
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('cookies_telemetry_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('cookies_telemetry_desc'); ?></p>
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
