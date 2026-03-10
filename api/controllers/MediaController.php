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

        // Construir la URL segura con estructura de directorio virtual para que funcione HLS
        $streamUrl = "/api/media/stream/{$videoUuid}/master.m3u8?e={$expires}&t={$token}";

        return [
            'success' => true,
            'data' => [
                'stream_url' => $streamUrl,
                'expires_at' => $expires
            ]
        ];
    }

    // Endpoint que el reproductor de video atacará (retorna el archivo multimedia o segmento)
    public function stream() {
        // Obtenemos las variables de la ruta interceptada por el .htaccess
        $videoUuid = $_GET['v'] ?? null;
        $fileRequested = $_GET['f'] ?? 'master.m3u8';
        
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

        // Obtener los detalles del video de la base de datos
        $videoData = $this->videoRepo->getPublicVideoDetails($videoUuid);
        
        // Extraemos la ruta real (priorizamos HLS, si no existe usamos el MP4 temporal)
        $videoPath = $videoData['hls_path'] ?? $videoData['temp_file_path'] ?? null;

        if (!$videoData || empty($videoPath)) {
            http_response_code(404);
            die("Error BD: El video no existe o las rutas HLS/MP4 están vacías.");
        }

        // 1. Armamos la ruta de la carpeta base (le quitamos el archivo final a la ruta de la BD)
        // Ejemplo: Si es 'storage/videos/UUID/master.m3u8', nos quedamos con 'storage/videos/UUID'
        $dbPath = dirname($videoPath); 
        
        // 2. Construimos la ruta absoluta de tu servidor apuntando a la carpeta public
        $absoluteBaseDir = __DIR__ . '/../../public/' . $dbPath;
        
        // 3. Obtener la ruta base real y absoluta (DEFENSA PRINCIPAL CONTRA PATH TRAVERSAL)
        $realBaseDir = realpath($absoluteBaseDir);
        
        if ($realBaseDir === false) {
            http_response_code(500);
            die("Error interno de almacenamiento: El directorio base de videos no existe.");
        }

        // 4. Limpieza básica preventiva
        $fileRequested = str_replace(['../', '..\\'], '', $fileRequested);
        
        // 5. Construir la ruta solicitada y obtener su ruta real resuelta
        $rawPath = $absoluteBaseDir . '/' . $fileRequested;
        $filePath = realpath($rawPath);

        // 6. Validación estricta: El archivo debe existir Y estar dentro del directorio base
        if ($filePath === false || !file_exists($filePath) || strpos($filePath, $realBaseDir) !== 0) {
            http_response_code(404);
            die("Archivo o fragmento no encontrado o acceso denegado.");
        }

        // Determinar el Content-Type correcto para despachar el HLS sin errores en el navegador
        $ext = pathinfo($filePath, PATHINFO_EXTENSION);
        $contentType = match($ext) {
            'm3u8' => 'application/vnd.apple.mpegurl',
            'ts'   => 'video/MP2T',
            'mp4'  => 'video/mp4',
            default => 'application/octet-stream'
        };

        // Preparamos las cabeceras de despacho
        header("Content-Type: " . $contentType);
        header("Accept-Ranges: bytes");
        
        // Limpiamos cualquier buffer previo para evitar corromper los binarios del video
        if (ob_get_length()) {
            ob_clean(); 
        }
        
        // --- MÉTODO DE DESPACHO DE BINARIOS ---
        
        // OPCIÓN 1: Comentada temporalmente para desarrollo local (XAMPP/Red Local)
        // header("X-Sendfile: {$filePath}");
        
        // OPCIÓN 2: Entorno Local / Desarrollo sin configurar.
        // Método nativo de PHP para enviar los bytes reales al reproductor.
        header("Content-Length: " . filesize($filePath));
        readfile($filePath);
        
        exit;
    }
}
?>