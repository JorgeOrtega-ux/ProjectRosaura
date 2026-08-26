<?php

namespace App\Api\Controllers\Publications;

use App\Api\Controllers\BaseController;
use App\Api\Services\Publications\PublicationsService;

class PublicationsController extends BaseController {
    private PublicationsService $publicationsService;

    public function __construct(PublicationsService $publicationsService) {
        $this->publicationsService = $publicationsService;
    }

    public function publish($input) {
        try {
            return $this->respond($this->publicationsService->publish($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_feed($input) {
        try {
            return $this->respond($this->publicationsService->getFeed($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_user_publications($input) {
        try {
            $identifier = $input['identifier'] ?? ($input['username'] ?? '');
            return $this->respond($this->publicationsService->getUserPublications($identifier, $input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_detail($input) {
        try {
            $id = $input['uuid'] ?? ($input['id'] ?? '');
            return $this->respond($this->publicationsService->getDetail($id));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function toggle_like($input) {
        try {
            $id = $input['uuid'] ?? ($input['publication_uuid'] ?? ($input['id'] ?? ''));
            return $this->respond($this->publicationsService->toggleLike($id));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_comments($input) {
        try {
            $id = $input['uuid'] ?? ($input['publication_uuid'] ?? ($input['id'] ?? ''));
            return $this->respond($this->publicationsService->getComments($id, $input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function add_comment($input) {
        try {
            return $this->respond($this->publicationsService->addComment($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function delete_comment($input) {
        try {
            return $this->respond($this->publicationsService->deleteComment($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function delete($input) {
        try {
            return $this->respond($this->publicationsService->deletePublication($input));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
