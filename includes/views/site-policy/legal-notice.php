<?php
$appName = htmlspecialchars($_ENV['APP_NAME']);
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="legal-notice-wrapper">
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('policy_legal_title'); ?></h1>
                <p class="policy-subtitle"><?php echo __('legal_notice_subtitle'); ?></p>
            </div>
        </div>
        <div class="component-bottom policy-container">

            <div class="policy-section">
                <h2 class="policy-section-title"><?php echo __('legal_notice_section_0_title'); ?></h2>
                <p class="policy-text"><?php echo __('legal_notice_section_0_p1', ['appName' => $appName]); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_0_p2'); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_0_p3', ['appName' => $appName]); ?></p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title"><?php echo __('legal_notice_section_1_title'); ?></h2>
                <p class="policy-text"><?php echo __('legal_notice_section_1_p1', ['appName' => $appName]); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_1_p2'); ?></p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title"><?php echo __('legal_notice_section_2_title'); ?></h2>
                <p class="policy-text"><?php echo __('legal_notice_section_2_p1', ['appName' => $appName]); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_2_p2'); ?></p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title"><?php echo __('legal_notice_section_3_title'); ?></h2>
                <p class="policy-text"><?php echo __('legal_notice_section_3_p1'); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_3_p2', ['appName' => $appName]); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_3_p3'); ?></p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title"><?php echo __('legal_notice_section_4_title'); ?></h2>
                <p class="policy-text"><?php echo __('legal_notice_section_4_p1', ['appName' => $appName]); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_4_p2'); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_4_p3'); ?></p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title"><?php echo __('legal_notice_section_5_title'); ?></h2>
                <p class="policy-text"><?php echo __('legal_notice_section_5_p1', ['appName' => $appName]); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_5_p2'); ?></p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title"><?php echo __('legal_notice_section_6_title'); ?></h2>
                <p class="policy-text"><?php echo __('legal_notice_section_6_p1'); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_6_p2', ['appName' => $appName]); ?></p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title"><?php echo __('legal_notice_section_7_title'); ?></h2>
                <p class="policy-text"><?php echo __('legal_notice_section_7_p1'); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_7_p2'); ?></p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title"><?php echo __('legal_notice_section_8_title'); ?></h2>
                <p class="policy-text"><?php echo __('legal_notice_section_8_p1'); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_8_p2'); ?></p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title"><?php echo __('legal_notice_section_9_title'); ?></h2>
                <p class="policy-text"><?php echo __('legal_notice_section_9_p1', ['appName' => $appName]); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_9_p2'); ?></p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title"><?php echo __('legal_notice_section_10_title'); ?></h2>
                <p class="policy-text"><?php echo __('legal_notice_section_10_p1'); ?></p>
                <p class="policy-text"><?php echo __('legal_notice_section_10_p2'); ?></p>
            </div>

        </div>
    </div>
</div>