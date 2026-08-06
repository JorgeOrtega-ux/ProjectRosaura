<?php

namespace App\Core\Helpers;

use GeoIp2\Database\Reader;
use Exception;

class GeoIpHelper {
    private static ?Reader $cityReader = null;
    private static ?Reader $asnReader = null;

    public static function getLocation(string $ip): ?string {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return null; 
        }

        $databaseFile = dirname(__DIR__, 3) . '/storage/private/geolocation/GeoLite2-City.mmdb';
        if (!file_exists($databaseFile)) {
            return null;
        }

        try {
            if (self::$cityReader === null) {
                self::$cityReader = new Reader($databaseFile);
            }
            $record = self::$cityReader->city($ip);
            
            $city = $record->city->name;
            $country = $record->country->name;
            
            if ($city && $country) {
                return $city . ', ' . $country;
            } elseif ($country) {
                return $country;
            }
            
            return null;
            
        } catch (Exception $e) {
            return null;
        }
    }
    public static function getASN(string $ip): ?string {
        
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return null; 
        }

        $databaseFile = dirname(__DIR__, 3) . '/storage/private/geolocation/GeoLite2-ASN.mmdb';

        if (!file_exists($databaseFile)) {
            return null;
        }

        try {
            if (self::$asnReader === null) {
                self::$asnReader = new Reader($databaseFile);
            }
            $record = self::$asnReader->asn($ip);
            return $record->autonomousSystemOrganization;
            
        } catch (Exception $e) {
            return null;
        }
    }
}
?>