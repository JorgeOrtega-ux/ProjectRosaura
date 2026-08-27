<?php

declare(strict_types=1);

namespace App\Core\System;

/**
 * Gestor Centralizado de Constantes, Límites y Configuración de Planes de Suscripción.
 * 
 * Los planes se cargan desde config/subscriptions.php y se mantienen en memoria (OPcache).
 * Los Stripe Price IDs se resuelven en tiempo de ejecución desde las variables de entorno ($_ENV).
 */
class SubscriptionPlanConstants {

    public const ALL_FEATURES = [
        'feat_advanced_roles' => [
            'key' => 'feat_advanced_roles',
            'name' => 'Roles Avanzados',
            'desc' => 'Permite configurar roles personalizados en lienzos'
        ],
        'feat_chat_restriction' => [
            'key' => 'feat_chat_restriction',
            'name' => 'Acceso y Moderación de Chat',
            'desc' => 'Permite uso de chat en vivo y herramientas de moderación'
        ],
        'feat_custom_palettes' => [
            'key' => 'feat_custom_palettes',
            'name' => 'Paletas Personalizadas',
            'desc' => 'Permite crear y utilizar paletas de colores personalizadas'
        ],
        'feat_unlimited_exports' => [
            'key' => 'feat_unlimited_exports',
            'name' => 'Exportaciones Ilimitadas',
            'desc' => 'Exportación ilimitada de capturas e imágenes'
        ],
        'feat_inject_templates' => [
            'key' => 'feat_inject_templates',
            'name' => 'Inyección de Plantillas',
            'desc' => 'Inyección directa de plantillas avanzadas en lienzos'
        ],
        'feat_live_share' => [
            'key' => 'feat_live_share',
            'name' => 'Transmisión de Plantillas',
            'desc' => 'Permite transmitir y sincronizar lienzos en vivo'
        ],
        'feat_no_ads' => [
            'key' => 'feat_no_ads',
            'name' => 'Experiencia Sin Anuncios',
            'desc' => 'Navegación fluida y sin publicidad en toda la plataforma'
        ],
        'feat_export_timelapse' => [
            'key' => 'feat_export_timelapse',
            'name' => 'Videos Timelapse',
            'desc' => 'Permite exportar y descargar videos timelapse del lienzo'
        ],
    ];

    private static ?array $rawConfig = null;
    private static ?array $allTiersCache = null;
    private static array $tierLimitsCache = [];
    private static ?array $tierPricesCache = null;
    private static ?int $maxTierCache = null;

    /**
     * Resetea la caché interna en memoria.
     */
    public static function resetCache(): void {
        self::$rawConfig = null;
        self::$allTiersCache = null;
        self::$tierLimitsCache = [];
        self::$tierPricesCache = null;
        self::$maxTierCache = null;
    }

    /**
     * Carga la configuración base desde el archivo modular config/subscriptions.php.
     */
    private static function loadRawConfig(): array {
        if (self::$rawConfig !== null) {
            return self::$rawConfig;
        }

        $configFile = dirname(__DIR__, 3) . '/config/subscriptions.php';
        if (file_exists($configFile)) {
            $config = require $configFile;
            if (is_array($config) && isset($config['tiers']) && is_array($config['tiers'])) {
                self::$rawConfig = $config['tiers'];
                return self::$rawConfig;
            }
        }

        // Fallback predeterminado de seguridad
        self::$rawConfig = [
            0 => [
                'id' => 1,
                'tier_level' => 0,
                'uuid' => '23bfb9b0-4f5d-4f1a-b6ef-9f9e2b17f5a1',
                'name' => 'Basic',
                'is_active' => 1,
                'is_popular' => 0,
                'price_monthly' => 0.00,
                'price_yearly' => 0.00,
                'stripe_env_monthly' => null,
                'stripe_env_yearly' => null,
                'color' => ['type' => 'solid', 'colors' => [['hex' => '#808080', 'percentage' => 100]]],
                'max_canvases' => 1,
                'max_storage_mb' => 20,
                'max_snapshots_per_canvas' => 10,
                'max_members_per_canvas' => 10,
                'max_custom_palettes' => 0,
                'max_template_tokens' => 0,
                'max_upload_mb' => 10,
                'max_pixels_per_batch' => 5,
                'feat_advanced_roles' => 0,
                'feat_chat_restriction' => 0,
                'feat_custom_palettes' => 0,
                'feat_unlimited_exports' => 0,
                'feat_inject_templates' => 0,
                'feat_live_share' => 0,
                'feat_no_ads' => 0,
                'feat_export_timelapse' => 0,
            ]
        ];

        return self::$rawConfig;
    }

    /**
     * Devuelve el listado completo de tiers con sus IDs de Stripe resueltos desde el .env.
     */
    public static function getAllTiers(): array {
        if (self::$allTiersCache !== null) {
            return self::$allTiersCache;
        }

        $rawTiers = self::loadRawConfig();
        $resolved = [];

        foreach ($rawTiers as $t) {
            $monthlyEnv = $t['stripe_env_monthly'] ?? null;
            $yearlyEnv  = $t['stripe_env_yearly'] ?? null;

            $stripeMonthly = (!empty($monthlyEnv) && !empty($_ENV[$monthlyEnv])) ? $_ENV[$monthlyEnv] : null;
            $stripeYearly  = (!empty($yearlyEnv) && !empty($_ENV[$yearlyEnv])) ? $_ENV[$yearlyEnv] : null;

            $tierData = [
                'id' => (int)($t['id'] ?? ($t['tier_level'] + 1)),
                'uuid' => (string)($t['uuid'] ?? ''),
                'tier_level' => (int)$t['tier_level'],
                'is_active' => (int)($t['is_active'] ?? 1),
                'is_popular' => (int)($t['is_popular'] ?? 0),
                'name' => (string)($t['name'] ?? 'Tier ' . $t['tier_level']),
                'color' => is_array($t['color'] ?? null) ? $t['color'] : (json_decode($t['color'] ?? '[]', true) ?: []),
                'stripe_env_monthly' => $monthlyEnv,
                'stripe_env_yearly' => $yearlyEnv,
                'stripe_price_id_monthly' => $stripeMonthly,
                'stripe_price_id_yearly' => $stripeYearly,
                'price_monthly' => (float)($t['price_monthly'] ?? 0),
                'price_yearly' => (float)($t['price_yearly'] ?? 0),
                'max_canvases' => (int)($t['max_canvases'] ?? 1),
                'max_online_canvases' => (int)($t['max_canvases'] ?? 1),
                'max_storage_mb' => (int)($t['max_storage_mb'] ?? 20),
                'max_snapshots_per_canvas' => (int)($t['max_snapshots_per_canvas'] ?? 10),
                'max_members_per_canvas' => (int)($t['max_members_per_canvas'] ?? 10),
                'max_custom_palettes' => (int)($t['max_custom_palettes'] ?? 0),
                'max_template_tokens' => (int)($t['max_template_tokens'] ?? 0),
                'max_upload_mb' => (int)($t['max_upload_mb'] ?? 10),
                'max_pixels_per_batch' => (int)($t['max_pixels_per_batch'] ?? 5),
                'feat_advanced_roles' => (int)($t['feat_advanced_roles'] ?? 0),
                'feat_chat_restriction' => (int)($t['feat_chat_restriction'] ?? 0),
                'feat_custom_palettes' => (int)($t['feat_custom_palettes'] ?? 0),
                'feat_unlimited_exports' => (int)($t['feat_unlimited_exports'] ?? 0),
                'feat_inject_templates' => (int)($t['feat_inject_templates'] ?? 0),
                'feat_live_share' => (int)($t['feat_live_share'] ?? 0),
                'feat_no_ads' => (int)($t['feat_no_ads'] ?? 0),
                'feat_export_timelapse' => (int)($t['feat_export_timelapse'] ?? 0),
            ];

            $resolved[] = $tierData;
        }

        // Ordenar por tier_level ascendente
        usort($resolved, fn($a, $b) => $a['tier_level'] <=> $b['tier_level']);

        self::$allTiersCache = $resolved;
        return $resolved;
    }

    /**
     * Obtiene los datos completos de un nivel por su nivel numérico.
     */
    public static function getTierByLevel(int $tierLevel): ?array {
        $tiers = self::getAllTiers();
        foreach ($tiers as $t) {
            if ((int)$t['tier_level'] === $tierLevel) {
                return $t;
            }
        }
        return null;
    }

    /**
     * Alias de compatibilidad para getTierByLevel.
     */
    public static function getTier(int $tierLevel): ?array {
        return self::getTierByLevel($tierLevel);
    }

    /**
     * Obtiene los datos completos de un nivel por su UUID.
     */
    public static function getTierByUuid(string $uuid): ?array {
        $tiers = self::getAllTiers();
        foreach ($tiers as $t) {
            if ($t['uuid'] === $uuid) {
                return $t;
            }
        }
        return null;
    }

    /**
     * Devuelve los límites numéricos y flags de características de un tier.
     */
    public static function getTierLimits(int $tier): array {
        if (isset(self::$tierLimitsCache[$tier])) {
            return self::$tierLimitsCache[$tier];
        }

        if ($tier >= 99) {
            $tier = self::getMaxTierLevel();
        }

        $allTiers = self::getAllTiers();
        foreach ($allTiers as $row) {
            if ((int)$row['tier_level'] === $tier) {
                $limits = [
                    'name' => $row['name'],
                    'max_canvases' => (int)$row['max_canvases'],
                    'max_online_canvases' => (int)$row['max_canvases'],
                    'max_storage_mb' => (int)$row['max_storage_mb'],
                    'max_snapshots_per_canvas' => (int)$row['max_snapshots_per_canvas'],
                    'max_members_per_canvas' => (int)$row['max_members_per_canvas'],
                    'max_custom_palettes' => (int)$row['max_custom_palettes'],
                    'feat_advanced_roles' => (bool)$row['feat_advanced_roles'],
                    'feat_chat_restriction' => (bool)$row['feat_chat_restriction'],
                    'feat_custom_palettes' => (bool)$row['feat_custom_palettes'],
                    'feat_unlimited_exports' => (bool)$row['feat_unlimited_exports'],
                    'feat_inject_templates' => (bool)($row['feat_inject_templates'] ?? false),
                    'feat_live_share' => (bool)($row['feat_live_share'] ?? false),
                    'feat_no_ads' => (bool)($row['feat_no_ads'] ?? false),
                    'feat_export_timelapse' => (bool)($row['feat_export_timelapse'] ?? false),
                    'max_template_tokens' => (int)($row['max_template_tokens'] ?? 0),
                    'max_upload_mb' => (int)($row['max_upload_mb'] ?? 10),
                    'max_pixels_per_batch' => (int)($row['max_pixels_per_batch'] ?? 5),
                    'allow_live_chat' => (bool)$row['feat_chat_restriction'],
                    'custom_palettes' => (bool)$row['feat_custom_palettes'],
                    'no_ads' => (bool)($row['feat_no_ads'] ?? false),
                    'export_timelapse' => (bool)($row['feat_export_timelapse'] ?? false)
                ];
                
                self::$tierLimitsCache[$tier] = $limits;
                return $limits;
            }
        }

        $default = [
            'name' => 'Free',
            'max_canvases' => 1,
            'max_online_canvases' => 1,
            'max_snapshots_per_canvas' => 10,
            'max_storage_mb' => 20,
            'max_upload_mb' => 10,
            'max_members_per_canvas' => 10,
            'max_custom_palettes' => 0,
            'feat_advanced_roles' => false,
            'feat_chat_restriction' => false,
            'feat_custom_palettes' => false,
            'feat_unlimited_exports' => false,
            'feat_inject_templates' => false,
            'feat_live_share' => false,
            'feat_no_ads' => false,
            'feat_export_timelapse' => false,
            'max_template_tokens' => 0,
            'max_pixels_per_batch' => 5,
            'allow_live_chat' => false,
            'custom_palettes' => false,
            'no_ads' => false,
            'export_timelapse' => false
        ];
        self::$tierLimitsCache[$tier] = $default;
        return $default;
    }

    /**
     * Verifica si un tier tiene habilitada una feature específica.
     */
    public static function hasFeature(int $tier, string $featureKey): bool {
        if ($featureKey === 'allow_live_chat') {
            $featureKey = 'chat_restriction';
        }
        if ($featureKey === 'live_templates') {
            $featureKey = 'live_share';
        }
        $limits = self::getTierLimits($tier);
        if (isset($limits[$featureKey])) {
            return $limits[$featureKey] === true;
        }
        $prefixedKey = 'feat_' . $featureKey;
        if (isset($limits[$prefixedKey])) {
            return $limits[$prefixedKey] === true;
        }
        return false;
    }

    /**
     * Devuelve un mapa de precios mensuales y anuales por tier.
     */
    public static function getTierPrices(): array {
        if (self::$tierPricesCache !== null) {
            return self::$tierPricesCache;
        }
        $tiers = self::getAllTiers();
        $prices = [];
        foreach ($tiers as $row) {
            $prices[(int)$row['tier_level']] = [
                'monthly' => (float)$row['price_monthly'],
                'yearly'  => (float)$row['price_yearly']
            ];
        }
        self::$tierPricesCache = $prices;
        return $prices;
    }

    /**
     * Devuelve el nivel más alto de suscripción activo.
     */
    public static function getMaxTierLevel(): int {
        if (self::$maxTierCache !== null) {
            return self::$maxTierCache;
        }
        $tiers = self::getAllTiers();
        $max = 0;
        foreach ($tiers as $t) {
            if (isset($t['is_active']) && (int)$t['is_active'] === 1) {
                $level = (int)$t['tier_level'];
                if ($level > $max) {
                    $max = $level;
                }
            }
        }
        self::$maxTierCache = $max ?: 3;
        return self::$maxTierCache;
    }

    /**
     * Devuelve el nombre del tier correspondiente.
     */
    public static function getTierName(int $tierLevel): string {
        $limits = self::getTierLimits($tierLevel);
        if (!empty($limits['name'])) {
            return $limits['name'];
        }
        $tier = self::getTierByLevel($tierLevel);
        return $tier['name'] ?? 'Basic';
    }

    /**
     * Devuelve el color del tier en formato JSON string para badges y avatares.
     */
    public static function getTierColor(int $tierLevel): string {
        $tier = self::getTierByLevel($tierLevel);
        if ($tier && !empty($tier['color'])) {
            return is_array($tier['color']) ? json_encode($tier['color']) : (string)$tier['color'];
        }
        return '{"type":"solid","colors":[{"hex":"#808080","percentage":100}]}';
    }

    /**
     * Devuelve el tier mínimo requerido para acceder a una característica.
     */
    public static function getLowestTierForFeature(string $featureKey): ?array {
        if ($featureKey === 'allow_live_chat') {
            $featureKey = 'feat_chat_restriction';
        }
        if (strpos($featureKey, 'feat_') !== 0 && !in_array($featureKey, ['custom_palettes', 'allow_live_chat'])) {
            $featureKey = 'feat_' . $featureKey;
        }

        $allTiers = self::getAllTiers();
        foreach ($allTiers as $t) {
            if (isset($t['is_active']) && (int)$t['is_active'] === 0) {
                continue;
            }
            $hasFeat = false;
            if (isset($t[$featureKey]) && ((bool)$t[$featureKey] === true || (int)$t[$featureKey] === 1)) {
                $hasFeat = true;
            }
            if (!$hasFeat && strpos($featureKey, 'feat_') === 0) {
                $rawKey = substr($featureKey, 5);
                if (isset($t[$rawKey]) && ((bool)$t[$rawKey] === true || (int)$t[$rawKey] === 1)) {
                    $hasFeat = true;
                }
            }
            if ($hasFeat) {
                return $t;
            }
        }
        return null;
    }

    /**
     * Devuelve el nombre del tier mínimo requerido para una característica.
     */
    public static function getLowestTierNameForFeature(string $featureKey): string {
        $lowest = self::getLowestTierForFeature($featureKey);
        if ($lowest && !empty($lowest['name'])) {
            return $lowest['name'];
        }
        return '';
    }

    /**
     * Resuelve el Stripe Price ID para un tier y período de facturación desde el .env.
     */
    public static function resolvePriceId(int $tier, string $billingPeriod): ?string {
        $tierData = self::getTierByLevel($tier);
        if (!$tierData) {
            return null;
        }

        $envKey = ($billingPeriod === 'yearly') 
            ? ($tierData['stripe_env_yearly'] ?? null) 
            : ($tierData['stripe_env_monthly'] ?? null);

        if ($envKey && !empty($_ENV[$envKey])) {
            return trim((string)$_ENV[$envKey]);
        }

        return null;
    }

    /**
     * Mapea un Stripe Price ID recibido al tier y ciclo de facturación correspondiente.
     * @return array|null ['tier' => int, 'period' => 'monthly'|'yearly'] o null si no coincide
     */
    public static function getTierByPriceId(string $priceId): ?array {
        if (empty($priceId)) {
            return null;
        }

        $priceId = trim($priceId);
        $map = self::getPriceToTierMap();
        return $map[$priceId] ?? null;
    }

    /**
     * Devuelve el mapa completo de [stripe_price_id => ['tier' => int, 'period' => string]].
     */
    public static function getPriceToTierMap(): array {
        $map = [];
        $tiers = self::getAllTiers();

        foreach ($tiers as $t) {
            $tLevel = (int)$t['tier_level'];

            if (!empty($t['stripe_price_id_monthly'])) {
                $map[$t['stripe_price_id_monthly']] = [
                    'tier' => $tLevel,
                    'period' => 'monthly'
                ];
            }
            if (!empty($t['stripe_price_id_yearly'])) {
                $map[$t['stripe_price_id_yearly']] = [
                    'tier' => $tLevel,
                    'period' => 'yearly'
                ];
            }
        }

        return $map;
    }
}