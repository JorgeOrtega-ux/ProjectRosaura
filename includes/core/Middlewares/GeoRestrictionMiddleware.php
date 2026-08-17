<?php

namespace App\Core\Middlewares;

use App\Core\Interfaces\MiddlewareInterface;
use App\Core\Helpers\GeoIpHelper;
use App\Core\Helpers\Utils;

class GeoRestrictionMiddleware implements MiddlewareInterface {
    
    public function handle(array $input, array $params = []): bool {
        // Por defecto en modo standby / inactivo para no bloquear nada actualmente
        $isEnabled = !empty($params['enabled']);
        if (!$isEnabled) {
            return true;
        }

        $mode = $params['mode'] ?? 'block'; // 'allow' o 'block'
        $countries = isset($params['countries']) && is_array($params['countries']) ? $params['countries'] : [];
        $ip = $input['ip_address'] ?? Utils::getIpAddress();

        $isAllowed = true;
        if ($mode === 'allow' && !empty($countries)) {
            $isAllowed = GeoIpHelper::isCountryAllowed($countries, null, $ip);
        } elseif ($mode === 'block' && !empty($countries)) {
            $isAllowed = GeoIpHelper::isCountryAllowed(null, $countries, $ip);
        }

        if (!$isAllowed) {
            $statusCode = isset($params['status_code']) ? (int)$params['status_code'] : 403;
            if (!headers_sent()) {
                http_response_code($statusCode);
                header('Content-Type: application/json; charset=UTF-8');
            }

            $countryName = GeoIpHelper::getCountryName($ip) ?: (function_exists('__') ? __('lbl_your_country') : 'tu país');
            $defaultMsg = function_exists('__') ? __('err_service_unavailable_in_country', ['country' => $countryName]) : "Este servicio no está disponible en {$countryName}.";
            $customMessage = $params['custom_message'] ?? $defaultMsg;

            echo json_encode([
                'success' => false,
                'error_code' => 'REGION_RESTRICTED',
                'message' => $customMessage,
                'country_code' => GeoIpHelper::getCountryCode($ip),
                'country_name' => $countryName
            ]);
            return false;
        }

        return true;
    }
}
