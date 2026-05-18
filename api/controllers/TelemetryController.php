<?php
namespace App\Api\Controllers;

use App\Api\Controllers\BaseController;
use App\Api\Services\TelemetryServices;
use App\Core\System\SessionManager;
use App\Core\Interfaces\UserPrefsManagerInterface;

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

    public function collect(): void {
        $userId = $this->session->get('user_id'); // ID interno de DB para Preferences
        $userUuid = $this->session->get('user_uuid'); // UUID expuesto
        
        // Verificar si el usuario ha desactivado la telemetría usando el userId correcto
        if ($userId && !$this->userPrefs->getPreference($userId, 'allow_telemetry', true)) {
            $this->sendAcceptedResponse();
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        
        if ($input) {
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
            
            // Procesar un array de eventos (batching desde el frontend)
            if (isset($input['events']) && is_array($input['events'])) {
                foreach ($input['events'] as $event) {
                    $this->telemetryServices->processFrontendPayload($event, $userUuid, $ipAddress);
                }
            } else {
                $this->telemetryServices->processFrontendPayload($input, $userUuid, $ipAddress);
            }
        }
        
        $this->sendAcceptedResponse();
    }

    private function sendAcceptedResponse(): void {
        // Devuelve 202 Accepted inmediatamente.
        http_response_code(202);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'accepted']);
        
        // Si el servidor soporta fastcgi, cerramos la conexión y dejamos que el proceso termine
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }
    }
}
?>