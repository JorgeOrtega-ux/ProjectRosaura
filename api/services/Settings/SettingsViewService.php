<?php
namespace App\Api\Services\Settings;

use App\Config\Database\DatabaseManager;
use App\Core\System\Logger;
use App\Core\System\Translator;
use App\Core\Helpers\Utils;

class SettingsViewService {

    /**

     */
    public function getYourAccountData(): array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        global $serverConfig;
        $maxAvatarSize = 2;
        if (!empty($serverConfig['max_avatar_size_mb']) && is_numeric($serverConfig['max_avatar_size_mb'])) {
            $maxAvatarSize = $serverConfig['max_avatar_size_mb'];
        }

        $isLoggedIn = isset($_SESSION['user_id']);
        $userId = $_SESSION['user_id'] ?? 0;
        $userName = $_SESSION['user_name'] ?? __('user');
        $userEmail = $_SESSION['user_email'] ?? '';
        $userRoleName = $_SESSION['user_role_name'] ?? __('user');
        $subscriptionColorRaw = $_SESSION['subscription_color'] ?? '{"type":"solid","colors":[{"hex":"var(--text-muted)"}]}';
        $activeSubBg = 'var(--text-muted)';

        if ($isLoggedIn) {
            $colorData = json_decode($subscriptionColorRaw, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($colorData)) {
                $colorData = ['type' => 'solid', 'colors' => [['hex' => $subscriptionColorRaw, 'percentage' => 100]]];
            }

            $firstColorObj = $colorData['colors'][0] ?? null;
            $activeSubBg = is_string($firstColorObj) ? htmlspecialchars($firstColorObj) : htmlspecialchars($firstColorObj['hex'] ?? 'var(--text-muted)');

            if (($colorData['type'] ?? 'solid') === 'gradient' && count($colorData['colors']) > 1) {
                $angle = (int)($colorData['angle'] ?? 0);
                $stopsArray = [];
                $prevStop = 0;
                $colorsCount = count($colorData['colors']);

                foreach ($colorData['colors'] as $i => $colorObj) {
                    $hex = is_string($colorObj) ? $colorObj : ($colorObj['hex'] ?? '#000000');
                    $hex = htmlspecialchars($hex);
                    $percentage = is_array($colorObj) && isset($colorObj['percentage']) ? (int)$colorObj['percentage'] : floor(100 / $colorsCount);

                    $endStop = $prevStop + $percentage;
                    if ($i === $colorsCount - 1) $endStop = 100;
                    $stopsArray[] = "{$hex} {$prevStop}% {$endStop}%";
                    $prevStop = $endStop;
                }
                $activeSubBg = "conic-gradient(from {$angle}deg, " . implode(', ', $stopsArray) . ")";
            }
        }

        $rawUserPic = $_SESSION['user_pic'] ?? '';
        $userPic = Utils::getValidImage($rawUserPic, 'avatar');
        $formattedAvatar = htmlspecialchars($userPic);
        $isDefaultAvatar = Utils::isDefaultAvatar($userPic);

        $userPrefs = $_SESSION['user_prefs'] ?? [];
        $prefLang = $userPrefs['language'] ?? ($_COOKIE['pr_language'] ?? 'es-419');
        $prefOpenLinks = isset($userPrefs['open_links_new_tab']) ? (int)$userPrefs['open_links_new_tab'] : 1;
        $prefTelemetry = isset($userPrefs['allow_telemetry']) ? (int)$userPrefs['allow_telemetry'] : 1;

        $languages = Translator::getAvailableLanguages();
        $currentLangText = $languages[$prefLang] ?? __('default_language_text');

        $activeAccountId = $_SESSION['active_account'] ?? null;
        $linkedAccounts = $_SESSION['accounts'] ?? [];
        $subscriptionTier = 0;
        if ($activeAccountId !== null && isset($linkedAccounts[$activeAccountId])) {
            $subscriptionTier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
        } else {
            $subscriptionTier = (int)($_SESSION['subscription_tier'] ?? 0);
        }
        $subscriptionPlanLabel = \App\Core\System\SubscriptionPlanConstants::getTierLimits($subscriptionTier)['name'] ?? __('tier_free');

        $googleId = null;
        if ($isLoggedIn) {
            try {
                global $container;
                if ($container) {
                    $userRepo = $container->get(\App\Core\Interfaces\UserRepositoryInterface::class);
                    $currentUserDb = $userRepo->findById($userId);
                    if ($currentUserDb) {
                        $googleId = $currentUserDb['google_id'] ?? null;
                    }
                }
            } catch (\Throwable $e) {
                Logger::error("Failed to fetch Google ID in SettingsViewService: " . $e->getMessage(), ['user_id' => $userId, 'exception' => $e]);
            }
        }
        $isGoogleConnected = !empty($googleId);
        $googleClientId = $_ENV['GOOGLE_CLIENT_ID'] ?? '';

        return [
            'maxAvatarSize' => $maxAvatarSize,
            'isLoggedIn' => $isLoggedIn,
            'userId' => $userId,
            'userName' => $userName,
            'userEmail' => $userEmail,
            'userRoleName' => $userRoleName,
            'activeSubBg' => $activeSubBg,
            'userPic' => $userPic,
            'formattedAvatar' => $formattedAvatar,
            'isDefaultAvatar' => $isDefaultAvatar,
            'userPrefs' => $userPrefs,
            'prefLang' => $prefLang,
            'prefOpenLinks' => $prefOpenLinks,
            'prefTelemetry' => $prefTelemetry,
            'languages' => $languages,
            'currentLangText' => $currentLangText,
            'subscriptionTier' => $subscriptionTier,
            'maxSubscriptionTier' => \App\Core\System\SubscriptionPlanConstants::getMaxTierLevel(),
            'subscriptionPlanLabel' => $subscriptionPlanLabel,
            'googleId' => $googleId,
            'isGoogleConnected' => $isGoogleConnected,
            'googleClientId' => $googleClientId
        ];
    }

    /**

     */
    public function getSecurityOverviewData(): array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $lastUpdateText = __('sec_never_updated');
        $is2FAActive = !empty($_SESSION['user_2fa']);
        $text2FA = $is2FAActive ? __('2fa_status_active') : __('2fa_status_inactive');

        if (isset($_SESSION['user_id'])) {
            try {
                $cassandra = new \App\Config\Database\CassandraManager();
                $session = $cassandra->getSession();
                if ($session) {
                    $stmt = $session->prepare("SELECT created_at, change_type FROM db_identity_nosql.profile_changes_log WHERE user_id = ?");
                    $rows = $session->execute($stmt, [(int)$_SESSION['user_id']])->asRowsResult();
                    
                    $latestPasswordChange = null;
                    foreach ($rows as $row) {
                        if (($row['change_type'] ?? '') === 'password') {
                            $latestPasswordChange = $row['created_at'];
                            break;
                        }
                    }
                    
                    if ($latestPasswordChange) {
                        if ($latestPasswordChange instanceof \DateTime) {
                            $lastUpdateText = $latestPasswordChange->format('d/m/Y H:i');
                        } else {
                            $date = new \DateTime($latestPasswordChange);
                            $lastUpdateText = $date->format('d/m/Y H:i');
                        }
                    }
                }
            } catch (\Throwable $e) {
                Logger::error("Failed to fetch security info in SettingsViewService", [
                    'user_id' => $_SESSION['user_id'] ?? null,
                    'exception' => $e
                ]);
            }
        }

        return [
            'lastUpdateText' => $lastUpdateText,
            'is2FAActive' => $is2FAActive,
            'text2FA' => $text2FA
        ];
    }

    /**
     * Obtiene los datos de la vista de accesibilidad y temas (accessibility.php).
     */
    public function getAccessibilityData(): array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $userPrefs = $_SESSION['user_prefs'] ?? [];
        $prefTheme = $userPrefs['theme'] ?? 'system';
        $prefExtendedAlerts = isset($userPrefs['extended_alerts']) ? (int)$userPrefs['extended_alerts'] : 0;

        $themeTexts = [
            'system' => __('theme_system'),
            'light'  => __('theme_light'),
            'dark'   => __('theme_dark')
        ];
        $currentThemeText = $themeTexts[$prefTheme] ?? __('theme_system');

        return [
            'prefTheme' => $prefTheme,
            'prefExtendedAlerts' => $prefExtendedAlerts,
            'currentThemeText' => $currentThemeText
        ];
    }

    /**

     */
    public function getGuestPreferencesData(): array {
        $prefLang = $_COOKIE['pr_language'] ?? 'es-419';
        $languages = Translator::getAvailableLanguages();
        $currentLangText = $languages[$prefLang] ?? __('default_language_text');

        return [
            'prefLang' => $prefLang,
            'languages' => $languages,
            'currentLangText' => $currentLangText
        ];
    }

    /**

     */
    public function get2FAStatusData(): array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $is2FAActive = !empty($_SESSION['user_2fa']);
        $text2FA = $is2FAActive ? __('2fa_status_active') : __('2fa_status_inactive');

        return [
            'is2FAActive' => $is2FAActive,
            'text2FA' => $text2FA
        ];
    }
}
