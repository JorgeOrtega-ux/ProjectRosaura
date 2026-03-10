<?php
// api/controllers/MediaController.php

namespace App\Api\Controllers;

use App\Core\Interfaces\MediaSignerInterface;
use App\Core\Interfaces\VideoRepositoryInterface;
use App\Core\Interfaces\RateLimiterInterface;
use App\Core\Helpers\Utils;

class MediaController {
    private $signer;
    private $videoRepo;
    private $rateLimiter;

    public function __construct(
        MediaSignerInterface $signer,
        VideoRepositoryInterface $videoRepo,
        RateLimiterInterface $rateLimiter
    ) {
        $this->signer = $signer;
        $this->videoRepo = $videoRepo;
        $this->rateLimiter = $rateLimiter;
    }

    // Endpoint para que el Frontend solicite la URL del video
    public function getStreamUrl($input) {
        $videoUuid = $input['video_uuid'] ?? null;

        if (!$videoUuid) {
            return ['success' => false, 'code' => 400, 'message' => 'Falta el ID del video.'];
        }

        // Prevenir abuso de bots (ej. max 60 tokens por minuto por IP)
        $limit = $this->rateLimiter->check("media_token_request", 60, 1);
        if (!$limit['allowed']) {
            http_response_code(429);
            return ['success' => false, 'code' => 429, 'message' => $limit['message']];
        }
        $this->rateLimiter->record("media_token_request", 60, 1);

        // Verificar que el video exista y esté disponible públicamente
        $videoData = $this->videoRepo->getPublicVideoDetails($videoUuid);
        if (!$videoData) {
            http_response_code(404);
            return ['success' => false, 'code' => 404, 'message' => 'Video no encontrado.'];
        }

        $ipAddress = Utils::getIpAddress();
        // El token expira en 3 horas (10800 segundos)
        $expires = time() + 10800; 
        
        $token = $this->signer->generateToken($videoUuid, $expires, $ipAddress);

        // Construir la URL segura
        $streamUrl = "/api/media/stream?v={$videoUuid}&e={$expires}&t={$token}";

        return [
            'success' => true,
            'data' => [
                'stream_url' => $streamUrl,
                'expires_at' => $expires
            ]
        ];
    }

    // Endpoint que el reproductor de video atacará (retorna el archivo multimedia)
    public function stream() {
        $videoUuid = $_GET['v'] ?? null;
        $expires = (int)($_GET['e'] ?? 0);
        $token = $_GET['t'] ?? null;
        $ipAddress = Utils::getIpAddress();

        if (!$videoUuid || !$expires || !$token) {
            http_response_code(403);
            die("Acceso denegado: Firma incompleta.");
        }

        // Validar firma criptográfica
        if (!$this->signer->validateToken($videoUuid, $expires, $ipAddress, $token)) {
            http_response_code(403);
            die("Acceso denegado: Firma inválida o expirada.");
        }

        // Obtener ruta física del video (esta ruta nunca se expone al usuario)
        $videoData = $this->videoRepo->getPublicVideoDetails($videoUuid);
        if (!$videoData || empty($videoData['file_path'])) {
            http_response_code(404);
            die("Video no encontrado en el almacenamiento.");
        }

        // Ajustar esta ruta según tu estructura real (ej. /var/www/html/public/storage/...)
        $filePath = realpath(__DIR__ . '/../../public/' . $videoData['file_path']);

        if (!$filePath || !file_exists($filePath)) {
            http_response_code(404);
            die("Archivo no encontrado en el servidor.");
        }

        // Despacho optimizado usando X-Sendfile (Apache) o X-Accel-Redirect (Nginx)
        // Esto permite que el servidor web maneje el streaming pesado, liberando a PHP.
        header("Content-Type: video/mp4");
        header("Accept-Ranges: bytes");
        
        // Si usas Apache con mod_xsendfile habilitado:
        header("X-Sendfile: {$filePath}");
        
        // Si usas Nginx, la cabecera sería:
        // header("X-Accel-Redirect: /protected_media/" . basename($filePath));
        
        exit;
    }
}
?>