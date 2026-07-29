<?php

namespace App\Api\Services\Canvas;

use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\System\SubscriptionPlanConstants;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use App\Config\Database\RedisCache;
use App\Core\System\CacheConstants;

class CanvasLockManager {
    private $canvasRepository;
    private $userRepository;
    private $dbManager;
    private $redisCache;

    public function __construct(
        CanvasRepositoryInterface $canvasRepository, 
        UserRepositoryInterface $userRepository,
        \App\Config\Database\DatabaseManager $dbManager,
        \App\Config\Database\RedisCache $redisCache
    ) {
        $this->canvasRepository = $canvasRepository;
        $this->userRepository = $userRepository;
        $this->dbManager = $dbManager;
        $this->redisCache = $redisCache;
    }

    /**
     * Evaluates all canvases for a given user and updates their is_subscription_locked status
     * based on the user's current subscription tier limits.
     * 
     * @param int $userId The ID of the canvas owner
     * @return bool True if successful, false otherwise
     */
    public function evaluateUserCanvases(int $userId): bool {
        try {
            $user = $this->userRepository->findById($userId);
            if (!$user) {
                return false;
            }

            $tier = $user['subscription_tier'] ?? 0;
            $planLimits = SubscriptionPlanConstants::getTierLimits($tier);
            $allSizes = Utils::getCanvasSizes();

            // For now, let's inject DatabaseManager to update directly, which is faster and avoids N+1
            $canvasesDb = $this->dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);
            
            $stmt = $canvasesDb->prepare("SELECT id, size, palette_id, max_participants, created_at FROM canvases WHERE owner_id = :owner_id ORDER BY created_at ASC");
            $stmt->execute(['owner_id' => $userId]);
            $canvases = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $totalOwned = count($canvases);
            $maxCanvases = $planLimits['max_canvases'];
            
            $toLockCount = ($maxCanvases !== -1) ? max(0, $totalOwned - $maxCanvases) : 0;
            
            $updateStmt = $canvasesDb->prepare("UPDATE canvases SET is_subscription_locked = :is_subscription_locked, locked_reasons = :locked_reasons WHERE id = :id");
            $canvasesDb->beginTransaction();
            
            $redisClient = $this->redisCache->getClient();

            foreach ($canvases as $canvas) {
                $isSubscriptionLocked = false;
                $lockedReasons = [];

                if ($toLockCount > 0) {
                    $isSubscriptionLocked = true;
                    $lockedReasons[] = 'max_canvases';
                    $toLockCount--;
                }

                $sizeStr = $canvas['size'];
                $requiredTier = $allSizes[$sizeStr]['tier'] ?? 0;
                if ($tier < $requiredTier) {
                    $isSubscriptionLocked = true;
                    if (!in_array(\App\Core\System\CanvasConstants::LOCK_REASON_SIZE, $lockedReasons)) $lockedReasons[] = \App\Core\System\CanvasConstants::LOCK_REASON_SIZE;
                }

                if (isset($canvas['palette_id']) && $canvas['palette_id'] !== 'default' && !SubscriptionPlanConstants::hasFeature($tier, 'custom_palettes')) {
                    $isSubscriptionLocked = true;
                    if (!in_array(\App\Core\System\CanvasConstants::LOCK_REASON_PALETTE, $lockedReasons)) $lockedReasons[] = \App\Core\System\CanvasConstants::LOCK_REASON_PALETTE;
                }

                if ($planLimits['max_members_per_canvas'] !== -1 && $canvas['max_participants'] > $planLimits['max_members_per_canvas']) {
                    $isSubscriptionLocked = true;
                    if (!in_array(\App\Core\System\CanvasConstants::LOCK_REASON_MEMBERS, $lockedReasons)) $lockedReasons[] = \App\Core\System\CanvasConstants::LOCK_REASON_MEMBERS;
                }

                $updateStmt->execute([
                    'is_subscription_locked' => $isSubscriptionLocked ? 1 : 0,
                    'locked_reasons' => $isSubscriptionLocked ? json_encode($lockedReasons) : null,
                    'id' => $canvas['id']
                ]);
                
                if ($redisClient) {
                    $redisClient->del(CacheConstants::PREFIX_CANVAS_DETAIL . $canvas['id']);
                }
            }

            $canvasesDb->commit();
            return true;
        } catch (\Exception $e) {
            if (isset($canvasesDb) && $canvasesDb->inTransaction()) {
                $canvasesDb->rollBack();
            }
            Logger::error('Error evaluating user canvases.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return false;
        }
    }
}
