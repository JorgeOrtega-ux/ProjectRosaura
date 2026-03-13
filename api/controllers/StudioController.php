<?php
// api/controllers/StudioController.php

namespace App\Api\Controllers;

use App\Api\Services\StudioServices;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\RateLimiterInterface;
use App\Core\Helpers\Utils;

class StudioController {
    private $studioServices;
    private $sessionManager;
    private $rateLimiter;

    public function __construct(StudioServices $studioServices, SessionManagerInterface $sessionManager, RateLimiterInterface $rateLimiter) {
        $this->studioServices = $studioServices;
        $this->sessionManager = $sessionManager;
        $this->rateLimiter = $rateLimiter;
    }

    private function requireAuth() {
        if (!$this->sessionManager->has('user_id')) {
            return false;
        }
        return $this->sessionManager->get('user_id');
    }

    private function checkRateLimit(string $action, int $maxAttempts, int $lockoutMinutes, string $customMsg = null) {
        $check = $this->rateLimiter->check($action, $maxAttempts, $lockoutMinutes, $customMsg);
        if (!$check['allowed']) {
            http_response_code(429);
            return $check;
        }
        $this->rateLimiter->record($action, $maxAttempts, $lockoutMinutes);
        return ['allowed' => true];
    }

    public function get_models($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }
        try {
            $models = $this->studioServices->getTagsByType('modelo');
            return ['success' => true, 'status' => 'success', 'data' => $models];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function get_categories($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }
        try {
            $categories = $this->studioServices->getTagsByType('category');
            return ['success' => true, 'status' => 'success', 'data' => $categories];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function upload_video($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $role = strtolower($this->sessionManager->get('user_role') ?? 'user');

        $isPreCheck = isset($input['pre_check']) ? (bool)$input['pre_check'] : (isset($_POST['pre_check']) ? (bool)$_POST['pre_check'] : false);
        $chunkIndex = isset($input['chunk_index']) ? (int)$input['chunk_index'] : (isset($_POST['chunk_index']) ? (int)$_POST['chunk_index'] : null);
        
        if ($isPreCheck || $chunkIndex === 0 || $chunkIndex === null) {
            $rate = $this->checkRateLimit('studio_upload_init', 10, 5, 'Demasiados intentos de subida de video. Espera {minutes} minutos.');
        } else {
            $rate = $this->checkRateLimit('studio_upload_chunks', 1000, 5);
        }
        if (!$rate['allowed']) {
            return ['success' => false, 'status' => 'error', 'message' => $rate['message']];
        }

        if ($isPreCheck) {
            $totalSize = isset($input['total_size']) ? (int)$input['total_size'] : (isset($_POST['total_size']) ? (int)$_POST['total_size'] : 0);
            try {
                $this->studioServices->validatePreUpload($userId, $role, $totalSize);
                return ['success' => true, 'status' => 'success', 'message' => 'Validación pre-subida exitosa'];
            } catch (\Exception $e) {
                http_response_code(400);
                return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
            }
        }

        $files = $input['_files'] ?? $_FILES;
        $uploadId = $input['upload_id'] ?? $_POST['upload_id'] ?? null;
        $totalChunks = isset($input['total_chunks']) ? (int)$input['total_chunks'] : (isset($_POST['total_chunks']) ? (int)$_POST['total_chunks'] : null);
        $originalFilename = $input['original_filename'] ?? $_POST['original_filename'] ?? null;
        $totalSize = isset($input['total_size']) ? (int)$input['total_size'] : (isset($_POST['total_size']) ? (int)$_POST['total_size'] : null);
        $originalLanguage = $input['original_language'] ?? $_POST['original_language'] ?? 'es-419';

        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($files['video'])) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'Método no permitido o archivo no enviado.'];
        }

        try {
            if ($uploadId !== null && $chunkIndex !== null && $totalChunks !== null && $originalFilename) {
                $videoData = $this->studioServices->handleChunkUpload($userId, $role, $files['video'], $uploadId, $chunkIndex, $totalChunks, $originalFilename, $totalSize, $originalLanguage);
                return ['success' => true, 'status' => 'success', 'data' => $videoData];
            } else {
                $videoData = $this->studioServices->queueVideoUpload($userId, $role, $files['video'], $originalLanguage);
                return ['success' => true, 'status' => 'success', 'data' => $videoData];
            }
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function upload_thumbnail($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $rate = $this->checkRateLimit('studio_upload_thumbnail', 20, 5, 'Demasiadas miniaturas subidas. Espera {minutes} minutos.');
        if (!$rate['allowed']) return ['success' => false, 'status' => 'error', 'message' => $rate['message']];

        $files = $input['_files'] ?? $_FILES;
        $videoId = $input['video_id'] ?? $_POST['video_id'] ?? null;
        $thumbnailBase64 = $input['thumbnail_base64'] ?? $_POST['thumbnail_base64'] ?? null;
        $generatedPath = $input['generated_path'] ?? $_POST['generated_path'] ?? null;
        
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || (!$thumbnailBase64 && !$generatedPath && !isset($files['thumbnail'])) || !$videoId) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'Faltan datos obligatorios para procesar la miniatura.'];
        }

        try {
            $data = $this->studioServices->uploadThumbnail($userId, (int)$videoId, $files['thumbnail'] ?? null, $thumbnailBase64, $generatedPath);
            return ['success' => true, 'status' => 'success', 'data' => $data];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function update_title($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $rate = $this->checkRateLimit('studio_update_title', 30, 5, 'Demasiadas actualizaciones de metadatos. Espera {minutes} minutos.');
        if (!$rate['allowed']) return ['success' => false, 'status' => 'error', 'message' => $rate['message']];

        $videoId = $input['video_id'] ?? $_POST['video_id'] ?? null;
        $title = $input['title'] ?? $_POST['title'] ?? null;
        $description = $input['description'] ?? $_POST['description'] ?? null;
        $visibility = $input['visibility'] ?? $_POST['visibility'] ?? 'public';
        $originalLanguage = $input['original_language'] ?? $_POST['original_language'] ?? 'es-419';
        
        $allowComments = isset($input['allow_comments']) ? filter_var($input['allow_comments'], FILTER_VALIDATE_BOOLEAN) : (isset($_POST['allow_comments']) ? filter_var($_POST['allow_comments'], FILTER_VALIDATE_BOOLEAN) : true);

        $localizedTitlesRaw = $input['localized_titles'] ?? $_POST['localized_titles'] ?? '{}';
        $localizedTitles = is_string($localizedTitlesRaw) ? json_decode($localizedTitlesRaw, true) : $localizedTitlesRaw;
        if (!is_array($localizedTitles)) $localizedTitles = [];

        $modelsRaw = $input['models'] ?? $_POST['models'] ?? [];
        $categoriesRaw = $input['categories'] ?? $_POST['categories'] ?? [];
        $tagsRaw = $input['tags'] ?? $_POST['tags'] ?? [];

        $models = is_string($modelsRaw) ? json_decode($modelsRaw, true) : $modelsRaw;
        $categories = is_string($categoriesRaw) ? json_decode($categoriesRaw, true) : $categoriesRaw;
        $tags = is_string($tagsRaw) ? json_decode($tagsRaw, true) : $tagsRaw;

        if (!is_array($models)) $models = [];
        if (!is_array($categories)) $categories = [];
        if (!is_array($tags)) $tags = [];

        if (!$videoId || $title === null) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'Faltan datos obligatorios para el título.'];
        }

        try {
            $this->studioServices->updateVideoDetails($userId, (int)$videoId, $title, $description, $models, $categories, $tags, $visibility, $localizedTitles, $originalLanguage, $allowComments);
            return ['success' => true, 'status' => 'success'];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function get_active_uploads($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }
        
        try {
            $videos = $this->studioServices->getActiveUploads($userId);
            return ['success' => true, 'status' => 'success', 'data' => $videos];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function get_all_videos($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }
        
        try {
            $videos = $this->studioServices->getAllVideos($userId);
            return ['success' => true, 'status' => 'success', 'data' => $videos];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }
    
    public function get_video($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }
        
        $uuid = $input['uuid'] ?? $_POST['uuid'] ?? null;
        if (!$uuid) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'UUID no proporcionado'];
        }

        try {
            $video = $this->studioServices->getVideoByUuid($userId, $uuid);
            return ['success' => true, 'status' => 'success', 'data' => $video];
        } catch (\Exception $e) {
            http_response_code(404);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }
    
    public function publish_video($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $rate = $this->checkRateLimit('studio_publish_video', 15, 5, 'Has publicado demasiados videos rápidamente. Espera {minutes} minutos.');
        if (!$rate['allowed']) return ['success' => false, 'status' => 'error', 'message' => $rate['message']];

        $videoId = $input['video_id'] ?? $_POST['video_id'] ?? null;
        $title = $input['title'] ?? $_POST['title'] ?? null;
        $description = $input['description'] ?? $_POST['description'] ?? '';
        $visibility = $input['visibility'] ?? $_POST['visibility'] ?? 'public';
        $originalLanguage = $input['original_language'] ?? $_POST['original_language'] ?? 'es-419';
        
        $allowComments = isset($input['allow_comments']) ? filter_var($input['allow_comments'], FILTER_VALIDATE_BOOLEAN) : (isset($_POST['allow_comments']) ? filter_var($_POST['allow_comments'], FILTER_VALIDATE_BOOLEAN) : true);

        $localizedTitlesRaw = $input['localized_titles'] ?? $_POST['localized_titles'] ?? '{}';
        $localizedTitles = is_string($localizedTitlesRaw) ? json_decode($localizedTitlesRaw, true) : $localizedTitlesRaw;
        if (!is_array($localizedTitles)) $localizedTitles = [];

        $modelsRaw = $input['models'] ?? $_POST['models'] ?? [];
        $categoriesRaw = $input['categories'] ?? $_POST['categories'] ?? [];
        $tagsRaw = $input['tags'] ?? $_POST['tags'] ?? [];

        $models = is_string($modelsRaw) ? json_decode($modelsRaw, true) : $modelsRaw;
        $categories = is_string($categoriesRaw) ? json_decode($categoriesRaw, true) : $categoriesRaw;
        $tags = is_string($tagsRaw) ? json_decode($tagsRaw, true) : $tagsRaw;

        if (!is_array($models)) $models = [];
        if (!is_array($categories)) $categories = [];
        if (!is_array($tags)) $tags = [];

        $files = $input['_files'] ?? $_FILES;
        $thumbnailFile = $files['thumbnail'] ?? null;
        $generatedPath = $input['generated_path'] ?? $_POST['generated_path'] ?? null;

        if (!$videoId) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'ID de video faltante en la petición de publicación.'];
        }

        if (empty(trim($title))) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'El título es obligatorio para publicar.'];
        }

        try {
            $result = $this->studioServices->publishVideo($userId, (int)$videoId, $title, $description, $models, $categories, $tags, $thumbnailFile, $generatedPath, $visibility, $localizedTitles, $originalLanguage, $allowComments);
            return ['success' => true, 'status' => 'success', 'data' => $result];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function cancel_upload($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $videoId = $input['video_id'] ?? $_POST['video_id'] ?? null;

        if (!$videoId) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'ID de video faltante en la petición de cancelación.'];
        }

        try {
            $this->studioServices->cancelUpload($userId, (int)$videoId);
            return ['success' => true, 'status' => 'success'];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function delete_video($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $videoId = $input['video_id'] ?? $_POST['video_id'] ?? null;

        if (!$videoId) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'ID de video faltante en la petición de eliminación.'];
        }

        try {
            $this->studioServices->deleteVideo($userId, (int)$videoId);
            return ['success' => true, 'status' => 'success', 'message' => 'Video eliminado correctamente.'];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function create_playlist($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $rate = $this->checkRateLimit('studio_create_playlist', 10, 10, 'Has creado demasiadas playlists. Espera {minutes} minutos.');
        if (!$rate['allowed']) return ['success' => false, 'status' => 'error', 'message' => $rate['message']];

        $title = $input['title'] ?? $_POST['title'] ?? '';
        $description = $input['description'] ?? $_POST['description'] ?? null;
        $visibility = $input['visibility'] ?? $_POST['visibility'] ?? 'public';
        $videoOrder = $input['video_order'] ?? $_POST['video_order'] ?? 'published_newest';

        try {
            $data = $this->studioServices->createPlaylist($userId, $title, $description, $visibility, $videoOrder);
            return ['success' => true, 'status' => 'success', 'data' => $data, 'message' => 'Playlist creada exitosamente'];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function get_playlists($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        try {
            // Este método en StudioServices ahora devuelve SOLO las 'custom' gracias a las modificaciones del repositorio.
            $data = $this->studioServices->getPlaylists($userId);
            return ['success' => true, 'status' => 'success', 'data' => $data];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function update_playlist($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $rate = $this->checkRateLimit('studio_update_playlist', 30, 5, 'Has actualizado la playlist demasiadas veces. Espera {minutes} minutos.');
        if (!$rate['allowed']) return ['success' => false, 'status' => 'error', 'message' => $rate['message']];

        $playlistId = $input['playlist_id'] ?? $_POST['playlist_id'] ?? null;
        $title = $input['title'] ?? $_POST['title'] ?? '';
        $description = $input['description'] ?? $_POST['description'] ?? null;
        $visibility = $input['visibility'] ?? $_POST['visibility'] ?? 'public';
        $videoOrder = $input['video_order'] ?? $_POST['video_order'] ?? 'published_newest';

        if (!$playlistId) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'ID de playlist requerido.'];
        }

        try {
            $this->studioServices->updatePlaylist($userId, (int)$playlistId, $title, $description, $visibility, $videoOrder);
            return ['success' => true, 'status' => 'success', 'message' => 'Playlist actualizada exitosamente'];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function delete_playlist($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $playlistId = $input['playlist_id'] ?? $_POST['playlist_id'] ?? null;

        if (!$playlistId) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'ID de playlist requerido.'];
        }

        try {
            $this->studioServices->deletePlaylist($userId, (int)$playlistId);
            return ['success' => true, 'status' => 'success', 'message' => 'Playlist eliminada exitosamente'];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function get_playlist_videos($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $playlistId = $input['playlist_id'] ?? $_POST['playlist_id'] ?? null;
        if (!$playlistId) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'ID de playlist requerido.'];
        }

        try {
            $videos = $this->studioServices->getPlaylistVideos($userId, (int)$playlistId);
            return ['success' => true, 'status' => 'success', 'data' => $videos];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function sync_playlist_videos($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $rate = $this->checkRateLimit('studio_sync_playlist', 20, 5, 'Demasiados intentos de sincronizar la playlist. Espera {minutes} minutos.');
        if (!$rate['allowed']) return ['success' => false, 'status' => 'error', 'message' => $rate['message']];

        $playlistId = $input['playlist_id'] ?? $_POST['playlist_id'] ?? null;
        $videoIdsRaw = $input['video_ids'] ?? $_POST['video_ids'] ?? [];
        
        $videoIds = is_string($videoIdsRaw) ? json_decode($videoIdsRaw, true) : $videoIdsRaw;
        if (!is_array($videoIds)) $videoIds = [];

        if (!$playlistId) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'ID de playlist requerido.'];
        }

        try {
            $this->studioServices->syncPlaylistVideos($userId, (int)$playlistId, $videoIds);
            return ['success' => true, 'status' => 'success', 'message' => 'Videos de la playlist actualizados exitosamente.'];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }
}
?>