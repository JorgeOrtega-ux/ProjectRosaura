<?php
// includes/core/Middlewares/PremiumMiddleware.php

namespace App\Core\Middlewares;

use App\Core\Interfaces\MiddlewareInterface;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\System\SubscriptionPlanConstants;

class PremiumMiddleware implements MiddlewareInterface {
    
    private $sessionManager;

    /**
     * @param SessionManagerInterface $sessionManager
     */
    public function __construct(SessionManagerInterface $sessionManager) {
        $this->sessionManager = $sessionManager;
    }

    /**
     * Procesa la solicitud entrante.
     *
     * @param array $input  Los datos de la petición (POST, JSON, etc.)
     * @param array $params Parámetros de configuración definidos en el route-map
     * @return bool         True si la petición puede continuar, False si debe detenerse.
     */
    public function handle(array $input, array $params = []): bool {
        // Se permite pasar el nivel mínimo por parámetro en route-map.php (por defecto será PRO)
        $requiredTier = $params['tier'] ?? SubscriptionPlanConstants::TIER_PRO;
        $userTier = $this->sessionManager->getSubscriptionTier();

        if ($userTier < $requiredTier) {
            http_response_code(403);
            
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false, 
                'message' => 'Esta acción requiere una suscripción premium activa. Actualiza tu plan para acceder.',
                'error_code' => 'UPGRADE_REQUIRED'
            ]);
            return false; // Retorna false para detener la tubería (Pipeline) y bloquear el controlador
        }

        return true; // Retorna true para continuar con éxito
    }
}
?>