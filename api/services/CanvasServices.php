<?php

namespace App\Api\Services;

use Exception;
use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;

class CanvasServices {
    private $canvasRepository;

    public function __construct(CanvasRepositoryInterface $canvasRepository) {
        $this->canvasRepository = $canvasRepository;
    }

    public function createCanvas(int $userId, string $name, ?string $description, string $privacy): array {
        try {
            $uuid = Utils::generateUUID();
            
            $canvasData = [
                'uuid'        => $uuid,
                'user_id'     => $userId,
                'name'        => trim($name),
                'description' => $description ? trim($description) : null,
                'privacy'     => in_array($privacy, [DB::PRIVACY_PUBLIC, DB::PRIVACY_PRIVATE, DB::PRIVACY_UNLISTED]) ? $privacy : DB::PRIVACY_PRIVATE
            ];

            $canvasId = $this->canvasRepository->create($canvasData);
            
            // Asignar al creador como admin en canvas_members
            $this->canvasRepository->addMember($canvasId, $userId, 'admin');

            return ['success' => true, 'message' => __('msg_canvas_created'), 'data' => ['uuid' => $uuid]];
        } catch (Exception $e) {
            Logger::error('Error during canvas creation.', [
                'user_id' => $userId,
                'exception' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }
}
?>