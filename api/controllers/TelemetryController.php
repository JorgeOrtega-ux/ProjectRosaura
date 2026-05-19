<?php
namespace App\Api\Controllers;

use App\Api\Controllers\BaseController;
use App\Api\Services\TelemetryServices;
use App\Core\System\SessionManager;
use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\System\Logger;

class TelemetryController extends BaseController {
    private TelemetryServices $telemetryServices;
    private SessionManager $session;
    private UserPrefsManagerInterface $userPrefs;

    public function __construct(
        TelemetryServices $telemetryServices, 
        SessionManager $session,
        UserPrefsManagerInterface $userPrefs
    ) {
        $this->telemetryServices = $telemetryServices;
        $this->session = $session;
        $this->userPrefs = $userPrefs;
    }

    /**
     * Recolecta los eventos de telemetría enviados por el Frontend.
     * Retorna un array que api/index.php procesará para enviar al cliente.
     */
    public function collect(array $input = []): array {
        Logger::info("Petición recibida en api/index.php -> telemetry.collect");
        
        $userId = $this->session->get('user_id'); 
        $userUuid = $this->session->get('user_uuid'); 
        
        if ($userId && !$this->userPrefs->getPreference($userId, 'allow_telemetry', true)) {
            return [
                'success' => true, 
                'status' => 'opt_out'
            ];
        }

        if (!empty($input)) {
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
            
            if (isset($input['events']) && is_array($input['events'])) {
                Logger::info("Guardando " . count($input['events']) . " eventos en Redis.");
                foreach ($input['events'] as $event) {
                    $this->telemetryServices->processFrontendPayload($event, $userUuid, $ipAddress);
                }
            } else {
                Logger::error("Payload válido pero sin array 'events'.");
            }
        }
        
        return [
            'success' => true, 
            'status' => 'accepted'
        ];
    }
}
?>