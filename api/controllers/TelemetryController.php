<?php
namespace App\Api\Controllers;

use App\Api\Controllers\BaseController;
use App\Api\Services\TelemetryServices;
use App\Core\System\SessionManager;
use App\Core\Helpers\Utils; // <-- Importación necesaria para la IP
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

    /**
     * Recolecta los eventos de telemetría enviados por el Frontend.
     * Retorna un array que api/index.php procesará para enviar al cliente.
     */
    public function collect(array $input = []): array {
        $userId = $this->session->get('user_id'); 
        $userUuid = $this->session->get('user_uuid'); 
        
        // LEEMOS DESDE SESIÓN, NO DESDE MYSQL. (Si no está seteado, asumimos true por defecto)
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
            // USO DEL HELPER SEGURO DE IP
            $ipAddress = Utils::getIpAddress();
            
            if (isset($input['events']) && is_array($input['events'])) {
                
                // LÍMITE DURO PARA EVITAR ATAQUES POR SATURACIÓN (DoS)
                if (count($input['events']) > 50) {
                    Logger::warning("Payload de telemetría abusivo bloqueado desde IP: " . $ipAddress);
                    return [
                        'success' => false, 
                        'status' => 'payload_too_large'
                    ];
                }

                foreach ($input['events'] as $event) {
                    $this->telemetryServices->processFrontendPayload($event, $userUuid, $ipAddress);
                }
            } else {
                Logger::error("Payload válido pero sin array 'events'. IP: " . $ipAddress);
            }
        }
        
        return [
            'success' => true, 
            'status' => 'accepted'
        ];
    }
}
?>