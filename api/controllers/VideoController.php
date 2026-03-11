<?php
// api/controllers/VideoController.php

namespace App\Api\Controllers;

use App\Core\Interfaces\VideoRepositoryInterface;
use App\Core\Interfaces\RateLimiterInterface;
use App\Core\Security\RedisRateLimiter;
use Predis\Client;

class VideoController {
    private $videoRepo;
    private $redis;
    private $rateLimiter;

    // Inyectamos Redis y el RateLimiter para las interacciones
    public function __construct(VideoRepositoryInterface $videoRepo, Client $redis, RateLimiterInterface $rateLimiter) {
        $this->videoRepo = $videoRepo;
        $this->redis = $redis;
        $this->rateLimiter = $rateLimiter;
    }

    public function getVideoDetails($input) {
        $videoUuid = $input['video_uuid'] ?? null;

        if (empty($videoUuid)) {
            return ['success' => false, 'code' => 400, 'message' => 'No se proporcionó un ID de video.'];
        }

        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $videoUuid)) {
            http_response_code(404);
            return [
                'success' => false, 
                'code' => 404, 
                'message' => 'El formato del enlace no es válido o está corrupto.'
            ];
        }

        $videoData = $this->videoRepo->getPublicVideoDetails($videoUuid);

        if (!$videoData) {
            http_response_code(404);
            return [
                'success' => false, 
                'code' => 404, 
                'message' => 'El video no existe, está en revisión o es privado.'
            ];
        }

        // --- MAGIA EN TIEMPO REAL: Sumar las visitas en caché que el worker de Python aún no pasa a BD ---
        $pendingViews = (int) $this->redis->get("video:views:{$videoData['id']}");
        $videoData['views'] = (int) $videoData['views'] + $pendingViews;
        
        // Determinar si el usuario actual ha dado like/dislike
        $videoData['user_interaction'] = null;
        if (isset($_SESSION['user_id'])) {
            $videoData['user_interaction'] = $this->videoRepo->getUserInteraction($_SESSION['user_id'], $videoData['id']);
        }

        unset($videoData['file_path']);
        $videoData['requires_signed_token'] = true;

        if (isset($videoData['sprite_sheet_path'])) {
            $videoData['sprite_sheet_url'] = $videoData['sprite_sheet_path'];
        }
        if (isset($videoData['vtt_path'])) {
            $videoData['vtt_url'] = $videoData['vtt_path'];
        }

        return ['success' => true, 'data' => $videoData];
    }

    public function registerView($data) {
        $videoUuid = $data['video_uuid'] ?? null;
        if (!$videoUuid) {
            return ['success' => false, 'message' => 'ID de video faltante'];
        }

        $videoData = $this->videoRepo->findByUuid($videoUuid);
        if (!$videoData) {
            return ['success' => false, 'message' => 'Video no encontrado'];
        }
        $videoId = $videoData['id'];

        // Rate Limit: 1 visita cada 5 minutos por IP para el mismo video
        $action = "view_{$videoId}";
        $check = $this->rateLimiter->check($action, RedisRateLimiter::LIMIT_VIEWS_ATTEMPTS, RedisRateLimiter::LIMIT_VIEWS_MINUTES);
        
        if (!$check['allowed']) {
            // Retornamos true silencioso para no generar errores en frontend, pero no sumamos la visita.
            return ['success' => true, 'message' => 'Visita ignorada (Rate Limit)'];
        }

        $this->rateLimiter->record($action, RedisRateLimiter::LIMIT_VIEWS_ATTEMPTS, RedisRateLimiter::LIMIT_VIEWS_MINUTES);

        // Guardar la visita en Redis. El script en Python las pasará a la BD
        $this->redis->incr("video:views:{$videoId}");

        return ['success' => true, 'message' => 'Visita registrada'];
    }

    public function toggleLike($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Debes iniciar sesión para interactuar con el video.'];
        }

        $videoUuid = $data['video_uuid'] ?? null;
        $type = $data['type'] ?? null; // 'like' o 'dislike'

        if (!$videoUuid || !in_array($type, ['like', 'dislike'])) {
            return ['success' => false, 'message' => 'Datos inválidos.'];
        }

        // Rate Limit global de likes para este usuario/IP
        $action = "interaction_" . $_SESSION['user_id'];
        $check = $this->rateLimiter->check($action, RedisRateLimiter::LIMIT_LIKES_ATTEMPTS, RedisRateLimiter::LIMIT_LIKES_MINUTES, 'Estás interactuando demasiado rápido.');
        
        if (!$check['allowed']) {
            return ['success' => false, 'message' => $check['message']];
        }

        $this->rateLimiter->record($action, RedisRateLimiter::LIMIT_LIKES_ATTEMPTS, RedisRateLimiter::LIMIT_LIKES_MINUTES);

        $videoData = $this->videoRepo->findByUuid($videoUuid);
        if (!$videoData) {
            return ['success' => false, 'message' => 'Video no encontrado.'];
        }

        // Actualización directa en BD
        $result = $this->videoRepo->toggleInteraction($_SESSION['user_id'], $videoData['id'], $type);

        return [
            'success' => true,
            'interaction' => $result['current_state'], // 'like', 'dislike' o null
            'likes' => $result['likes_count'],
            'dislikes' => $result['dislikes_count']
        ];
    }
}
?>