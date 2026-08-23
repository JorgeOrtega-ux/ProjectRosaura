<?php

namespace App\Core\Security;

use App\Core\Helpers\GeoIpHelper;
use App\Core\System\Logger;
use Predis\Client;
use Exception;

class AnomalyDetector {
    public const MAX_PLAUSIBLE_SPEED_KMH = 800.0;
    public const MIN_ANOMALY_DISTANCE_KM = 100.0;
    private const REDIS_LAST_LOGIN_PREFIX = 'auth:last_login:';
    private const CACHE_TTL_SECONDS = 2592000; // 30 days

    /**
     * Evaluate login metadata against previous user sessions to detect Impossible Travel and ASN anomalies.
     *
     * @param int $userId
     * @param string $ipAddress
     * @param Client|null $redis
     * @return array
     */
    public static function evaluateLoginAnomaly(int $userId, string $ipAddress, ?Client $redis = null): array {
        $result = [
            'has_anomaly' => false,
            'is_impossible_travel' => false,
            'is_risky_asn' => false,
            'speed_kmh' => null,
            'distance_km' => null,
            'elapsed_minutes' => null,
            'previous_country' => null,
            'current_country' => null,
            'details' => []
        ];

        $currentGeo = GeoIpHelper::getVisitorGeoInfo($ipAddress);
        $result['current_country'] = $currentGeo['country_code'];

        if ($currentGeo['is_datacenter']) {
            $result['is_risky_asn'] = true;
            $result['has_anomaly'] = true;
            $result['details'][] = "Login originates from known datacenter/cloud ASN: " . ($currentGeo['asn'] ?? 'Unknown');
        }

        if (!$redis) {
            return $result;
        }

        try {
            $cacheKey = self::REDIS_LAST_LOGIN_PREFIX . $userId;
            $rawPrevious = $redis->get($cacheKey);

            if ($rawPrevious) {
                $prev = json_decode($rawPrevious, true);
                if (is_array($prev) && isset($prev['time'])) {
                    $result['previous_country'] = $prev['country'] ?? null;
                    $elapsedSeconds = max(time() - (int)$prev['time'], 1);
                    $elapsedHours = $elapsedSeconds / 3600.0;
                    $elapsedMinutes = round($elapsedSeconds / 60, 1);
                    $result['elapsed_minutes'] = $elapsedMinutes;

                    // Geodesic distance calculation if coordinates exist
                    if (!empty($prev['lat']) && !empty($prev['lon']) && !empty($currentGeo['latitude']) && !empty($currentGeo['longitude'])) {
                        $distanceKm = GeoIpHelper::calculateDistanceKm(
                            (float)$prev['lat'],
                            (float)$prev['lon'],
                            (float)$currentGeo['latitude'],
                            (float)$currentGeo['longitude']
                        );

                        $result['distance_km'] = round($distanceKm, 2);
                        $impliedSpeed = $distanceKm / $elapsedHours;
                        $result['speed_kmh'] = round($impliedSpeed, 1);

                        if ($distanceKm >= self::MIN_ANOMALY_DISTANCE_KM && $impliedSpeed > self::MAX_PLAUSIBLE_SPEED_KMH) {
                            $result['is_impossible_travel'] = true;
                            $result['has_anomaly'] = true;
                            $result['details'][] = "Impossible Travel detected: {$result['distance_km']}km traversed in {$elapsedMinutes} minutes ({$result['speed_kmh']} km/h).";
                            
                            Logger::security("Impossible Travel detected during login", 'critical', [
                                'user_id' => $userId,
                                'distance_km' => $result['distance_km'],
                                'speed_kmh' => $result['speed_kmh'],
                                'prev_country' => $prev['country'] ?? 'Unknown',
                                'current_country' => $currentGeo['country_code'] ?? 'Unknown',
                                'prev_ip' => $prev['ip'] ?? 'Unknown',
                                'current_ip' => $ipAddress
                            ]);
                        }
                    } elseif ($prev['country'] && $currentGeo['country_code'] && $prev['country'] !== $currentGeo['country_code'] && $elapsedMinutes < 30) {
                        // Country jump without exact coords in less than 30 mins
                        $result['is_impossible_travel'] = true;
                        $result['has_anomaly'] = true;
                        $result['details'][] = "Sudden country jump from {$prev['country']} to {$currentGeo['country_code']} in {$elapsedMinutes} mins.";
                        
                        Logger::security("Sudden cross-country login detected", 'alert', [
                            'user_id' => $userId,
                            'prev_country' => $prev['country'],
                            'current_country' => $currentGeo['country_code'],
                            'elapsed_minutes' => $elapsedMinutes
                        ]);
                    }
                }
            }

            // Update user's latest login snapshot
            $newSnapshot = [
                'ip' => $ipAddress,
                'lat' => $currentGeo['latitude'],
                'lon' => $currentGeo['longitude'],
                'country' => $currentGeo['country_code'],
                'city' => $currentGeo['city'],
                'asn' => $currentGeo['asn'],
                'time' => time()
            ];
            $redis->setex($cacheKey, self::CACHE_TTL_SECONDS, json_encode($newSnapshot));

        } catch (Exception $e) {
            Logger::error("AnomalyDetector evaluateLoginAnomaly error: " . $e->getMessage());
        }

        return $result;
    }
}
