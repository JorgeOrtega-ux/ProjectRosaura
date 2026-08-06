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
<div class="view-content" data-ref="cookies-policy-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('policy_cookies_title', $policyVars); ?></h1>
        </div>
        <div class="component-top-right">
            <div>
                <a href="/site-policy/manage-cookies" class="component-button component-button--h40 component-button--outline" data-nav="/site-policy/manage-cookies">
                    <span class="material-symbols-rounded">tune</span>
                    Configurar mis preferencias
                </a>
            </div>
        </div>
    </div>
    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('cookies_policy_section_0_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('cookies_policy_section_0_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_0_p2', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_0_p3', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('cookies_policy_section_0_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('cookies_policy_section_1_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('cookies_policy_section_1_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_1_p2', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_1_p3', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('cookies_policy_section_1_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('cookies_policy_section_2_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('cookies_policy_section_2_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_2_p2', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_2_p3', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_2_p4', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_2_p5', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_2_p6', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('cookies_policy_section_2_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('cookies_policy_section_3_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('cookies_policy_section_3_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_3_p2', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('cookies_policy_section_3_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('cookies_policy_section_4_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('cookies_policy_section_4_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_4_p2', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_4_p3', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('cookies_policy_section_4_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('cookies_policy_section_5_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('cookies_policy_section_5_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_5_p2', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('cookies_policy_section_5_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('cookies_policy_section_6_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('cookies_policy_section_6_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_6_p2', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('cookies_policy_section_6_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('cookies_policy_section_7_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('cookies_policy_section_7_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_7_p2', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('cookies_policy_section_7_summary', $policyVars); ?></p>
                    </div>
                </div>

                <div class="policy-section">
                    <h2 class="policy-section-title"><?php echo __('cookies_policy_section_8_title', $policyVars); ?></h2>
                    <p class="policy-text"><?php echo __('cookies_policy_section_8_p1', $policyVars); ?></p>
                    <p class="policy-text"><?php echo __('cookies_policy_section_8_p2', $policyVars); ?></p>
                    <div class="policy-summary-box">
                        <span class="material-symbols-rounded policy-summary-box__icon">info</span>
                        <p class="policy-summary-box__text"><?php echo __('cookies_policy_section_8_summary', $policyVars); ?></p>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>