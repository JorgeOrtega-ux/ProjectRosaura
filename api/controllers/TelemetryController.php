<?php
namespace App\Api\Controllers;

use App\Api\Controllers\BaseController;
use App\Api\Services\TelemetryServices;
use App\Core\System\SessionManager;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;

class TelemetryController extends BaseController {
    private TelemetryServices $telemetryServices;
    private SessionManager $session;

    public function __construct(
        TelemetryServices $telemetryServices, 
        SessionManager $session
    ) {
        $this->telemetryServices = $telemetryServices;
        $this->session = $session;
    }

    public function collect(array $input = []): array {
        try {
            $userId = $this->session->get('user_id'); 
            $userUuid = $this->session->get('user_uuid'); 
            
            $allowTelemetry = $this->session->get('allow_telemetry');
            if ($allowTelemetry === null) {
                $allowTelemetry = true;
            }
            
            if ($userId && !$allowTelemetry) {
                return [
                    'success' => true, 
                    'status' => 'opt_out'
                ];
            }

            if (!empty($input)) {
                $ipAddress = Utils::getIpAddress();
                
                if (isset($input['events']) && is_array($input['events'])) {
                    if (count($input['events']) > 50) {
                        Logger::warning("Abusive telemetry payload blocked", [
                            'ip_address' => $ipAddress,
                            'event_count' => count($input['events'])
                        ]);
                        return [
                            'success' => false, 
                            'status' => 'payload_too_large'
                        ];
                    }

                    foreach ($input['events'] as $event) {
                        $this->telemetryServices->processFrontendPayload($event, $userUuid, $ipAddress);
                    }
                } else {
                    Logger::error("Valid payload structure missing events array", [
                        'ip_address' => $ipAddress
                    ]);
                }
            }
            
            return [
                'success' => true, 
                'status' => 'accepted'
            ];
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
?>