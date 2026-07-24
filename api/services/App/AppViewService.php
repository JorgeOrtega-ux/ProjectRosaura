<?php
namespace App\Api\Services\App;

use App\Core\System\StorePackagesConfig;
use App\Core\System\SubscriptionPlanConstants;
use App\Core\System\SubscriptionFeatureConfig;
use App\Core\System\Logger;

class AppViewService {

    /**
     * Obtiene los paquetes de monedas para la vista store-coins.
     */
    public function getStoreCoinsData(): array {
        if (class_exists(StorePackagesConfig::class) && method_exists(StorePackagesConfig::class, 'getCoinPackages')) {
            try {
                $packages = StorePackagesConfig::getCoinPackages();
                return is_array($packages) ? $packages : [];
            } catch (\Throwable $e) {
                Logger::error("Error loading store coin packages: " . $e->getMessage(), ['exception' => $e]);
                return [];
            }
        }
        return [];
    }

    /**
     * Obtiene los paquetes de contenido/ventajas para la vista store-content.
     */
    public function getStoreContentData(): array {
        if (class_exists(StorePackagesConfig::class) && method_exists(StorePackagesConfig::class, 'getContentPackages')) {
            try {
                $packages = StorePackagesConfig::getContentPackages();
                return is_array($packages) ? $packages : [];
            } catch (\Throwable $e) {
                Logger::error("Error loading store content packages: " . $e->getMessage(), ['exception' => $e]);
                return [];
            }
        }
        return [];
    }

    /**
     * Formatea capacidad de almacenamiento en MB a formato legible.
     */
    public static function formatStorage(int $mb): string {
        if ($mb >= 1024) return number_format($mb / 1024, 0) . ' GB';
        return $mb . ' MB';
    }

    /**
     * Obtiene todos los datos requeridos para la vista de upgrade/suscripciones.
     */
    public function getUpgradePageData(): array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $activeAccountId = $_SESSION['active_account'] ?? null;
        $linkedAccounts  = $_SESSION['accounts'] ?? [];
        $currentUserTier = 0;
        if ($activeAccountId && isset($linkedAccounts[$activeAccountId])) {
            $currentUserTier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
        }

        // Obtener todos los tiers activos (tier_level > 0 y is_active = 1)
        $allTiers = array_filter(
            SubscriptionPlanConstants::getAllTiers(),
            fn($t) => $t['tier_level'] > 0 && (isset($t['is_active']) ? (int)$t['is_active'] === 1 : true)
        );

        $availableFeatures = SubscriptionFeatureConfig::getAvailableFeatures();
        $rowsToCompare = [
            [
                'label' => __('plan_limit_canvases', 'Lienzos'),
                'desc' => __('plan_limit_canvases_desc', 'Proyectos simultáneos'),
                'icon' => 'dashboard',
                'values_fn' => function($t) {
                    return $t['max_canvases'] == -1 ? __('plan_limit_unlimited', 'Ilimitado') : $t['max_canvases'] . ' ' . __('plan_limit_canvases', 'Lienzos');
                }
            ],
            [
                'label' => __('plan_limit_snapshots', 'Snapshots'),
                'desc' => __('plan_limit_snapshots_desc', 'Por lienzo'),
                'icon' => 'history',
                'values_fn' => function($t) {
                    return $t['max_snapshots_per_canvas'] == -1 ? __('plan_limit_unlimited', 'Ilimitado') : $t['max_snapshots_per_canvas'] . ' ' . __('plan_limit_snapshots', 'Snapshots');
                }
            ],
            [
                'label' => __('plan_limit_members', 'Miembros'),
                'desc' => __('plan_limit_members_desc', 'Por lienzo'),
                'icon' => 'group',
                'values_fn' => function($t) {
                    return $t['max_members_per_canvas'] == -1 ? __('plan_limit_unlimited', 'Ilimitados') : number_format($t['max_members_per_canvas']) . ' ' . __('plan_limit_members', 'Miembros');
                }
            ],
            [
                'label' => __('lbl_storage', 'Almacenamiento'),
                'desc' => __('plan_storage_desc', 'Capacidad de almacenamiento'),
                'icon' => 'cloud',
                'values_fn' => function($t) {
                    return self::formatStorage((int)($t['max_storage_mb'] ?? 0));
                }
            ],
        ];

        foreach ($availableFeatures as $fKey => $fData) {
            $rowsToCompare[] = [
                'label' => __($fData['title_key']),
                'desc' => __($fData['desc_key']),
                'icon' => $fData['icon'],
                'values_fn' => function($t) use ($fKey, $fData) {
                    $hasFeat = !empty($t[$fKey]);
                    if ($fKey === 'feat_custom_palettes') {
                        return $hasFeat ? ($t['max_custom_palettes'] ?? 0) : false;
                    }
                    return $hasFeat;
                }
            ];
        }

        return [
            'currentUserTier' => $currentUserTier,
            'allTiers' => $allTiers,
            'rowsToCompare' => $rowsToCompare
        ];
    }

    /**
     * Obtiene la lista de etiquetas con sus íconos para la vista principal.
     */
    public function getHomeTags(): array {
        return [
            'art' => 'palette', 
            'gaming' => 'sports_esports', 
            'anime' => 'animation', 
            'flags' => 'flag', 
            'memes' => 'mood', 
            'pixelart' => 'grid_on', 
            'community' => 'groups', 
            'nature' => 'nature', 
            'scifi' => 'rocket_launch', 
            'fantasy' => 'auto_fix_high',
            'music' => 'music_note',
            'sports' => 'sports_soccer',
            'popculture' => 'movie',
            'abstract' => 'blur_on',
            'experimental' => 'science'
        ];
    }
}
