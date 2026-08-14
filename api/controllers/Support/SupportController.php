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

    public function getQueueStatus($input) {
        try {
            return $this->respond($this->supportService->getQueueStatus($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function startLiveSession($input) {
        try {
            return $this->respond($this->supportService->startLiveSession($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function getSessionMessages($input) {
        try {
            return $this->respond($this->supportService->getSessionMessages($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function sendMessage($input) {
        try {
            return $this->respond($this->supportService->sendMessage($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function endLiveSession($input) {
        try {
            return $this->respond($this->supportService->endLiveSession($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function submitFeedback($input) {
        try {
            return $this->respond($this->supportService->submitFeedback($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
