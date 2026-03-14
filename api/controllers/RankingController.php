<?php
// api/controllers/RankingController.php

namespace App\Api\Controllers;

use App\Api\Services\RankingServices;

class RankingController {
    private RankingServices $rankingServices;

    public function __construct(RankingServices $rankingServices) {
        $this->rankingServices = $rankingServices;
    }

    public function getAllRankings(array $input): array {
        try {
            $rankings = $this->rankingServices->getTopRankings();
            return ['success' => true, 'data' => $rankings];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['success' => false, 'message' => 'Error retrieving rankings.'];
        }
    }

    public function getChannelRanking(array $input): array {
        // En tu arquitectura, las variables GET y POST llegan unificadas en $input
        if (!isset($input['user_id'])) {
            http_response_code(400);
            return ['success' => false, 'message' => 'User ID is required.'];
        }

        $userId = (int) $input['user_id'];

        try {
            $history = $this->rankingServices->getChannelRankingHistory($userId);
            return ['success' => true, 'data' => $history];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['success' => false, 'message' => 'Error retrieving channel history.'];
        }
    }
}