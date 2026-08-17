<?php

namespace App\Core\Helpers;

use GeoIp2\Database\Reader;
use App\Core\System\SecurityConstants;
use App\Core\System\CountryConstants;
use Exception;

class GeoIpHelper {
    private static ?Reader $cityReader = null;
    private static ?Reader $asnReader = null;

    private static function resolveIp(?string $ip = null): ?string {
        if ($ip === null || $ip === '') {
            $ip = Utils::getIpAddress();
        }
        $trimmed = trim($ip);
        if (filter_var($trimmed, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return null;
        }
        return $trimmed;
    }

    public static function getLocation(?string $ip = null): ?string {
        $validIp = self::resolveIp($ip);
        if (!$validIp) {
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
            $record = self::$cityReader->city($validIp);
            
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

    public static function getCountryCode(?string $ip = null): ?string {
        $validIp = self::resolveIp($ip);
        if (!$validIp) {
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
            $record = self::$cityReader->city($validIp);
            return $record->country->isoCode ? strtoupper($record->country->isoCode) : null;
        } catch (Exception $e) {
            return null;
        }
    }

    public static function getCountryName(?string $ip = null): ?string {
        $validIp = self::resolveIp($ip);
        if (!$validIp) {
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
            $record = self::$cityReader->city($validIp);
            if (!empty($record->country->name)) {
                return $record->country->name;
            }
            $iso = $record->country->isoCode ? strtoupper($record->country->isoCode) : null;
            return $iso ? CountryConstants::getCountryName($iso) : null;
        } catch (Exception $e) {
            return null;
        }
    }

    public static function getCityName(?string $ip = null): ?string {
        $validIp = self::resolveIp($ip);
        if (!$validIp) {
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
            $record = self::$cityReader->city($validIp);
            return $record->city->name ?: null;
        } catch (Exception $e) {
            return null;
        }
    }

    public static function getASN(?string $ip = null): ?string {
        $validIp = self::resolveIp($ip);
        if (!$validIp) {
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
            $record = self::$asnReader->asn($validIp);
            return $record->autonomousSystemOrganization ?: null;
        } catch (Exception $e) {
            return null;
        }
    }

    public static function isDatacenterOrBotAsn(?string $asn = null, ?string $ip = null): bool {
        if ($asn === null || $asn === '') {
            $asn = self::getASN($ip);
        }
        if (!$asn) {
            return false;
        }

        $riskyAsns = SecurityConstants::RISKY_ASNS;
        foreach ($riskyAsns as $risky) {
            if (stripos($asn, $risky) !== false) {
                return true;
            }
        }
        return false;
    }

    public static function isCountryAllowed(?array $allowedCountries = null, ?array $blockedCountries = null, ?string $ip = null): bool {
        $countryCode = self::getCountryCode($ip);

        // Si no se puede determinar el país (ej. IP local / privada), permitimos por defecto
        if (!$countryCode) {
            return true;
        }

        if (!empty($blockedCountries) && is_array($blockedCountries)) {
            $blockedNormalized = array_map('strtoupper', array_map('trim', $blockedCountries));
            if (in_array($countryCode, $blockedNormalized, true)) {
                return false;
            }
        }

        if (!empty($allowedCountries) && is_array($allowedCountries)) {
            $allowedNormalized = array_map('strtoupper', array_map('trim', $allowedCountries));
            if (!in_array($countryCode, $allowedNormalized, true)) {
                return false;
            }
        }

        return true;
    }

    public static function isAsnBlocked(?array $blockedAsns = null, bool $blockDatacenters = false, ?string $ip = null): bool {
        $asn = self::getASN($ip);
        if (!$asn) {
            return false;
        }

        if ($blockDatacenters && self::isDatacenterOrBotAsn($asn, $ip)) {
            return true;
        }

        if (!empty($blockedAsns) && is_array($blockedAsns)) {
            foreach ($blockedAsns as $blocked) {
                if ($blocked !== '' && stripos($asn, trim($blocked)) !== false) {
                    return true;
                }
            }
        }

        return false;
    }

    public static function isTargetingMatch(?array $settings = null, ?string $ip = null): bool {
        if (empty($settings)) {
            return true;
        }

        // 1. ASN / Datacenter targeting check
        $blockDatacenters = !empty($settings['block_datacenters']);
        $blockedAsns = isset($settings['blocked_asns']) && is_array($settings['blocked_asns']) ? $settings['blocked_asns'] : [];

        if (($blockDatacenters || !empty($blockedAsns)) && self::isAsnBlocked($blockedAsns, $blockDatacenters, $ip)) {
            return false;
        }

        // 2. Geo targeting check
        $geoMode = $settings['geo_mode'] ?? 'all';
        $geoCountries = isset($settings['geo_countries']) && is_array($settings['geo_countries']) ? $settings['geo_countries'] : [];

        if ($geoMode === 'allow' && !empty($geoCountries)) {
            return self::isCountryAllowed($geoCountries, null, $ip);
        }

        if ($geoMode === 'block' && !empty($geoCountries)) {
            return self::isCountryAllowed(null, $geoCountries, $ip);
        }

        return true;
    }

    public static function getVisitorGeoInfo(?string $ip = null): array {
        $resolvedIp = $ip ?: Utils::getIpAddress();
        $code = self::getCountryCode($resolvedIp);
        $asn = self::getASN($resolvedIp);

        return [
            'ip' => $resolvedIp,
            'country_code' => $code,
            'country_name' => $code ? (CountryConstants::getCountryName($code) ?: self::getCountryName($resolvedIp)) : null,
            'city' => self::getCityName($resolvedIp),
            'location' => self::getLocation($resolvedIp),
            'asn' => $asn,
            'is_datacenter' => self::isDatacenterOrBotAsn($asn, $resolvedIp)
        ];
    }
}