<?php

namespace App\Api\Controllers\Support;

use App\Api\Controllers\BaseController;
use App\Api\Services\Support\SupportService;

class SupportController extends BaseController {
    private SupportService $supportService;

    public function __construct(SupportService $supportService) {
        $this->supportService = $supportService;
    }

    public function submit($input) {
        try {
            return $this->respond($this->supportService->submitTicket($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
