<?php

namespace App\Api\Controllers\Admin;

use App\Api\Controllers\BaseController;
use App\Api\Services\Admin\AdminSupportService;

class AdminSupportController extends BaseController {
    private AdminSupportService $supportService;

    public function __construct(AdminSupportService $supportService) {
        $this->supportService = $supportService;
    }

    public function getAgentStatus($input) {
        try {
            return $this->respond($this->supportService->getAgentStatus());
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function updateAgentStatus($input) {
        try {
            return $this->respond($this->supportService->updateAgentStatus($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function getLiveQueues($input) {
        try {
            return $this->respond($this->supportService->getLiveQueues($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function claimSession($input) {
        try {
            return $this->respond($this->supportService->claimSession($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function escalateSession($input) {
        try {
            return $this->respond($this->supportService->escalateSession($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function reassignSession($input) {
        try {
            return $this->respond($this->supportService->reassignSession($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function sendAgentMessage($input) {
        try {
            return $this->respond($this->supportService->sendAgentMessage($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function addInternalNote($input) {
        try {
            return $this->respond($this->supportService->addInternalNote($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function closeSession($input) {
        try {
            return $this->respond($this->supportService->closeSession($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function getCannedResponses($input) {
        try {
            return $this->respond($this->supportService->getCannedResponses($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function saveCannedResponse($input) {
        try {
            return $this->respond($this->supportService->saveCannedResponse($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function deleteCannedResponse($input) {
        try {
            return $this->respond($this->supportService->deleteCannedResponse($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function getTicketsList($input) {
        try {
            return $this->respond($this->supportService->getTicketsList($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function getTicketDetail($input) {
        try {
            return $this->respond($this->supportService->getTicketDetail($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function updateTicketStatus($input) {
        try {
            return $this->respond($this->supportService->updateTicketStatus($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function replyTicket($input) {
        try {
            return $this->respond($this->supportService->replyTicket($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function getSupportMetrics($input) {
        try {
            return $this->respond($this->supportService->getSupportMetrics());
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
