<?php
$appName = htmlspecialchars($_ENV['APP_NAME']);
?>
<div class="view-content" data-ref="refund-policy-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('policy_refunds_title'); ?></h1>
        </div>
    </div>
    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('refund_policy_section_0_title'); ?></h2>
                    <p class="policy-text"><?php echo __('refund_policy_section_0_p1', ['appName' => $appName]); ?></p>
                    <p class="policy-text"><?php echo __('refund_policy_section_0_p2', ['appName' => $appName]); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('refund_policy_section_0_summary'); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('refund_policy_section_1_title'); ?></h2>
                    <p class="policy-text"><?php echo __('refund_policy_section_1_p1', ['appName' => $appName]); ?></p>
                    <p class="policy-text"><?php echo __('refund_policy_section_1_p2'); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('refund_policy_section_1_summary'); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('refund_policy_section_2_title'); ?></h2>
                    <p class="policy-text"><?php echo __('refund_policy_section_2_p1', ['appName' => $appName]); ?></p>
                    <p class="policy-text"><?php echo __('refund_policy_section_2_p2'); ?></p>
                    <p class="policy-text"><?php echo __('refund_policy_section_2_p3'); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('refund_policy_section_2_summary'); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('refund_policy_section_3_title'); ?></h2>
                    <p class="policy-text"><?php echo __('refund_policy_section_3_p1', ['appName' => $appName]); ?></p>
                    <p class="policy-text"><?php echo __('refund_policy_section_3_p2'); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('refund_policy_section_3_summary'); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('refund_policy_section_4_title'); ?></h2>
                    <p class="policy-text"><?php echo __('refund_policy_section_4_p1'); ?></p>
                    <p class="policy-text"><?php echo __('refund_policy_section_4_p2'); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('refund_policy_section_4_summary'); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('refund_policy_section_5_title'); ?></h2>
                    <p class="policy-text"><?php echo __('refund_policy_section_5_p1'); ?></p>
                    <p class="policy-text"><?php echo __('refund_policy_section_5_p2'); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('refund_policy_section_5_summary'); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('refund_policy_section_6_title'); ?></h2>
                    <p class="policy-text"><?php echo __('refund_policy_section_6_p1', ['appName' => $appName]); ?></p>
                    <p class="policy-text"><?php echo __('refund_policy_section_6_p2'); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('refund_policy_section_6_summary'); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('refund_policy_section_7_title'); ?></h2>
                    <p class="policy-text"><?php echo __('refund_policy_section_7_p1'); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('refund_policy_section_7_summary'); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('refund_policy_section_8_title'); ?></h2>
                    <p class="policy-text"><?php echo __('refund_policy_section_8_p1'); ?></p>
                    <ul class="policy-list">
                        <li><?php echo __('refund_policy_section_8_li1'); ?></li>
                        <li><?php echo __('refund_policy_section_8_li2'); ?></li>
                        <li><?php echo __('refund_policy_section_8_li3'); ?></li>
                    </ul>
                    <p class="policy-text"><?php echo __('refund_policy_section_8_p2', ['appName' => $appName]); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('refund_policy_section_8_summary'); ?></p>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>