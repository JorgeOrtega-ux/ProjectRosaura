<?php
$appName = htmlspecialchars($_ENV['APP_NAME'] ?? '');
$privacyEmail = htmlspecialchars($_ENV['CONTACT_EMAIL_PRIVACY'] ?? '');
$legalEmail = htmlspecialchars($_ENV['CONTACT_EMAIL_LEGAL'] ?? '');
$billingEmail = htmlspecialchars($_ENV['CONTACT_EMAIL_BILLING'] ?? '');

$policyVars = [
    'appName' => $appName,
    'privacyEmail' => $privacyEmail,
    'legalEmail' => $legalEmail,
    'billingEmail' => $billingEmail
];
?>
<div class="view-content" data-ref="terms-conditions-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('policy_terms_title', $policyVars); ?></h1>
        </div>
    </div>
    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_0_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_0_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_0_p2', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_0_p3', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_0_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_1_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_1_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_1_p2', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_1_p3', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_1_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_2_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_2_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_2_p2', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_2_p3', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_2_p4', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_2_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_3_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_3_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_3_p2', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_3_p3', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_3_p4', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_3_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_4_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_4_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_4_p2', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_4_p3', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_4_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_5_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_5_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_5_p2', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_5_p3', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_5_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_6_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_6_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_6_p2', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_6_p3', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_6_p4', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_6_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_7_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_7_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_7_p2', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_7_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_8_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_8_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_8_p2', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_8_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_9_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_9_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_9_p2', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_9_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_10_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_10_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_10_p2', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_10_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_11_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_11_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_11_p2', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_11_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_12_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_12_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_12_p2', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_12_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_13_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_13_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_13_p2', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_13_p3', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_13_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_14_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_14_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_14_p2', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_14_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('terms_conditions_section_15_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('terms_conditions_section_15_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('terms_conditions_section_15_p2', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('terms_conditions_section_15_summary', $policyVars); ?></p>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>