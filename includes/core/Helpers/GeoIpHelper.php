<?php
// includes/core/Helpers/GeoIpHelper.php

namespace App\Core\Helpers;

use GeoIp2\Database\Reader;
use Exception;

class GeoIpHelper {
    
    /**
     * Obtiene la ubicación (Ciudad, País) a partir de una dirección IP utilizando
     * la base de datos local GeoLite2. Devuelve null de forma silenciosa ante IPs locales
     * o si el archivo .mmdb no está presente, lo que permite renderizar condicionalmente en el frontend.
     *
     * @param string $ip La dirección IP real del cliente.
     * @return string|null La ubicación formateada o null.
     */
    public static function getLocation(string $ip): ?string {
        
        // 1. Omitir silenciosamente IPs privadas, de loopback o reservadas (ej. 127.0.0.1, 192.168.x.x, 172.18.x.x)
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return null; 
        }

        $databaseFile = dirname(__DIR__, 3) . '/storage/geoip/GeoLite2-City.mmdb';

        // 2. Si la base de datos no se ha colocado en la carpeta, no rompemos el login.
        if (!file_exists($databaseFile)) {
            return null;
        }

        try {
            $reader = new Reader($databaseFile);
            $record = $reader->city($ip);
            
            $city = $record->city->name;
            $country = $record->country->name;
            
            if ($city && $country) {
                return $city . ', ' . $country;
            } elseif ($country) {
                return $country;
            }
            
            return null;
            
        } catch (Exception $e) {
            // AddressNotFoundException u otras fallas se atrapan para no interrumpir el flujo de autenticación
            return null;
        }
    }
}
?>