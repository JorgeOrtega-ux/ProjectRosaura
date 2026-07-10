<?php

namespace App\Core\Middlewares;

use App\Core\Interfaces\MiddlewareInterface;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\System\SubscriptionPlanConstants;

class PremiumMiddleware implements MiddlewareInterface {
    
    private $sessionManager;
    public function __construct(SessionManagerInterface $sessionManager) {
        $this->sessionManager = $sessionManager;
    }
    public function handle(array $input, array $params = []): bool {
        $requiredTier = $params['tier'] ?? SubscriptionPlanConstants::TIER_PRO;
        $userTier = $this->sessionManager->getSubscriptionTier();

        if ($userTier < $requiredTier) {
            http_response_code(403);
            
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false, 
                'message' => __('err_premium_required'),
                'error_code' => 'UPGRADE_REQUIRED'
            ]);
            return false;
        }

        return true;
    }
}
?>