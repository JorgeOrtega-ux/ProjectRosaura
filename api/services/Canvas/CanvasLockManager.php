<?php

namespace App\Api\Services\Canvas;

use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\System\SubscriptionPlanConstants;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;

class CanvasLockManager {
    private $canvasRepository;
    private $userRepository;

    public function __construct(CanvasRepositoryInterface $canvasRepository, UserRepositoryInterface $userRepository) {
        $this->canvasRepository = $canvasRepository;
        $this->userRepository = $userRepository;
    }

    /**
     * Evaluates all canvases for a given user and updates their is_locked status
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

            // Fetch all canvases owned by this user (we need a repository method to get ALL by owner without pagination, or just loop pages if too many. Let's assume there is a method or we can just fetch all since it's an internal job)
            // Wait, we can just use getUserAndJoinedCanvases with a large limit, but we only want OWNED canvases.
            // Let's rely on a direct DB update or fetching them.
            // Actually, CanvasRepository should have a method `getOwnedCanvasesList(int $userId)`
            // I will use DatabaseManager directly here if Repository method is missing, or I'll implement it in Repository.
            
            // For now, let's inject DatabaseManager to update directly, which is faster and avoids N+1
            $dbManager = new \App\Config\Database\DatabaseManager();
            $canvasesDb = $dbManager->getConnection('db_canvases');
            
            $stmt = $canvasesDb->prepare("SELECT id, size, palette_id, max_participants, created_at FROM canvases WHERE owner_id = :owner_id ORDER BY created_at ASC");
            $stmt->execute(['owner_id' => $userId]);
            $canvases = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $totalOwned = count($canvases);
            $maxCanvases = $planLimits['max_canvases'];
            
            $toLockCount = ($maxCanvases !== -1) ? max(0, $totalOwned - $maxCanvases) : 0;
            
            $updateStmt = $canvasesDb->prepare("UPDATE canvases SET is_locked = :is_locked, locked_reasons = :locked_reasons WHERE id = :id");
            $canvasesDb->beginTransaction();

            foreach ($canvases as $canvas) {
                $isLocked = false;
                $lockedReasons = [];

                if ($toLockCount > 0) {
                    $isLocked = true;
                    $lockedReasons[] = 'max_canvases';
                    $toLockCount--;
                }

                $sizeStr = $canvas['size'];
                $requiredTier = $allSizes[$sizeStr]['tier'] ?? 0;
                if ($tier < $requiredTier) {
                    $isLocked = true;
                    if (!in_array(\App\Core\System\CanvasConstants::LOCK_REASON_SIZE, $lockedReasons)) $lockedReasons[] = \App\Core\System\CanvasConstants::LOCK_REASON_SIZE;
                }

                if (isset($canvas['palette_id']) && $canvas['palette_id'] !== 'default' && empty($planLimits['custom_palettes'])) {
                    $isLocked = true;
                    if (!in_array(\App\Core\System\CanvasConstants::LOCK_REASON_PALETTE, $lockedReasons)) $lockedReasons[] = \App\Core\System\CanvasConstants::LOCK_REASON_PALETTE;
                }

                if ($planLimits['max_members_per_canvas'] !== -1 && $canvas['max_participants'] > $planLimits['max_members_per_canvas']) {
                    $isLocked = true;
                    if (!in_array(\App\Core\System\CanvasConstants::LOCK_REASON_MEMBERS, $lockedReasons)) $lockedReasons[] = \App\Core\System\CanvasConstants::LOCK_REASON_MEMBERS;
                }

                $updateStmt->execute([
                    'is_locked' => $isLocked ? 1 : 0,
                    'locked_reasons' => $isLocked ? json_encode($lockedReasons) : null,
                    'id' => $canvas['id']
                ]);
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
