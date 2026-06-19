<?php

namespace App\Api\Controllers;

use App\Api\Services\CanvasServices;
use App\Core\Helpers\Utils;

class CanvasController extends BaseController {
    private $canvasServices;

    public function __construct(CanvasServices $canvasServices) {
        parent::__construct();
        $this->canvasServices = $canvasServices;
    }

    public function create() {
        if (!$this->session->isLoggedIn()) {
            return Utils::jsonResponse(false, __('err_unauthorized'), null, 401);
        }

        $userId = $this->session->getUserId();
        
        $requestData = json_decode(file_get_contents('php://input'), true);
        $name = $requestData['name'] ?? '';
        $description = $requestData['description'] ?? null;
        $privacy = $requestData['privacy'] ?? 'private';

        if (empty(trim($name))) {
            return Utils::jsonResponse(false, __('err_canvas_name_required'));
        }

        $result = $this->canvasServices->createCanvas($userId, $name, $description, $privacy);

        return Utils::jsonResponse($result['success'], $result['message'], $result['data'] ?? null);
    }
}
?>