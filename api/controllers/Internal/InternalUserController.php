<?php
namespace App\Api\Controllers\Internal;

use App\Api\Controllers\BaseController;
use App\Core\Interfaces\StoreRepositoryInterface;

class InternalUserController extends BaseController {

    private $storeRepo;

    public function __construct(StoreRepositoryInterface $storeRepo) {
        $this->storeRepo = $storeRepo;
    }

    public function consume_perk($input) {
        try {
            $userId = $input['user_id'] ?? null;
            $perkId = $input['perk_id'] ?? null;

            if (empty($userId) || empty($perkId)) {
                return $this->respond([
                    'success' => false,
                    'message' => 'Missing user_id or perk_id'
                ]);
            }

            $userIdInt = (int)$userId;
            if ($userIdInt <= 0) {
                return $this->respond([
                    'success' => false,
                    'message' => 'Invalid user_id'
                ]);
            }

            $success = $this->storeRepo->markPerkAsUsed($userIdInt, $perkId);

            return $this->respond([
                'success' => $success
            ]);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
