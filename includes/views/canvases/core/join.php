<div class="view-content" data-ref="canvas-join-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('lbl_join_canvas'); ?></h1>
        </div>
        <div class="component-top-right">
            <button type="submit" form="form-join-canvas" id="btn-join-canvas" class="component-button component-button--h40" data-action="joinCanvas">
                <span class="material-symbols-rounded">login</span>
                <span><?php echo __('btn_accept'); ?></span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                <div class="component-card--grouped">
                    <form id="form-join-canvas">
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_invite_code'); ?></h2>
                                    <p class="component-card__description"><?php echo __('desc_invite_code'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-input-group component-input-group--h34">
                                    <input type="text" name="code" id="join-code-input" class="component-input-field component-input-field--simple" placeholder="<?php echo __('ph_invite_code'); ?>" required autocomplete="off">
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="component-card--grouped">
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_terms_conditions'); ?></h2>
                                <p class="component-card__description"><?php echo __('join_accept_rules_desc'); ?></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>