<?php
// api/controllers/ChannelController.php
namespace App\Api\Controllers;

use App\Core\Interfaces\SubscriptionRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Helpers\Utils;

class ChannelController {
    private SubscriptionRepositoryInterface $subscriptionRepo;
    private UserRepositoryInterface $userRepo;

    public function __construct(SubscriptionRepositoryInterface $subscriptionRepo, UserRepositoryInterface $userRepo) {
        $this->subscriptionRepo = $subscriptionRepo;
        $this->userRepo = $userRepo;
    }

    public function toggle_subscription($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Debes iniciar sesión para suscribirte.'];
        }

        $subscriberId = $_SESSION['user_id'];
        $channelUsername = $data['username'] ?? '';

        if (empty($channelUsername)) {
            return ['success' => false, 'message' => 'Canal no especificado.'];
        }

        $channelUser = $this->userRepo->findByUsername($channelUsername);
        if (!$channelUser) {
            return ['success' => false, 'message' => 'El canal no existe.'];
        }

        $channelId = $channelUser['id'];

        if ($subscriberId === $channelId) {
            return ['success' => false, 'message' => 'No puedes suscribirte a tu propio canal.'];
        }

        $isSubscribed = $this->subscriptionRepo->toggleSubscription($subscriberId, $channelId);
        $newCount = $this->subscriptionRepo->getSubscriberCount($channelId);

        return [
            'success' => true,
            'is_subscribed' => $isSubscribed,
            'subscriber_count' => $newCount
        ];
    }

    public function upload_banner($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Debes iniciar sesión para realizar esta acción.'];
        }

        if (!isset($_FILES['banner']) || $_FILES['banner']['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'No se recibió ningún archivo válido.'];
        }

        $file = $_FILES['banner'];
        $maxSize = 6 * 1024 * 1024; // 6 MB

        // 1. Validar Peso
        if ($file['size'] > $maxSize) {
            return ['success' => false, 'message' => 'La imagen no puede pesar más de 6 MB.'];
        }

        // 2. Validar MIME Type por seguridad
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedTypes)) {
            return ['success' => false, 'message' => 'Formato de imagen no soportado. Usa JPG, PNG o WEBP.'];
        }

        // 3. Validar Dimensiones Mínimas
        if (!Utils::validateImageDimensions($file['tmp_name'], 1024, 576)) {
            return ['success' => false, 'message' => 'La imagen debe ser de 1024 × 576 píxeles como mínimo.'];
        }

        $extension = 'jpg';
        if ($mimeType === 'image/png') $extension = 'png';
        if ($mimeType === 'image/webp') $extension = 'webp';

        $uuid = Utils::generateUUID();
        $fileName = $uuid . '.' . $extension;
        
        $uploadDir = ROOT_PATH . '/public/storage/banners/uploaded/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $destination = $uploadDir . $fileName;

        // 4. Leer coordenadas de recorte enviadas por JS (en porcentajes de 0 a 1)
        $cropX_pct = isset($_POST['crop_x']) ? (float)$_POST['crop_x'] : 0;
        $cropY_pct = isset($_POST['crop_y']) ? (float)$_POST['crop_y'] : 0;
        $cropW_pct = isset($_POST['crop_w']) ? (float)$_POST['crop_w'] : 1;
        $cropH_pct = isset($_POST['crop_h']) ? (float)$_POST['crop_h'] : 1;

        // 5. Crear recurso de imagen según el tipo
        switch ($mimeType) {
            case 'image/jpeg': $sourceImage = imagecreatefromjpeg($file['tmp_name']); break;
            case 'image/png':  $sourceImage = imagecreatefrompng($file['tmp_name']); break;
            case 'image/webp': $sourceImage = imagecreatefromwebp($file['tmp_name']); break;
            default: return ['success' => false, 'message' => 'Error al procesar el formato de la imagen.'];
        }

        if (!$sourceImage) {
            return ['success' => false, 'message' => 'La imagen subida está corrupta o no es válida.'];
        }

        // Obtener dimensiones reales de la imagen subida
        $origW = imagesx($sourceImage);
        $origH = imagesy($sourceImage);

        // Calcular los píxeles absolutos basados en los porcentajes
        $srcX = round($origW * $cropX_pct);
        $srcY = round($origH * $cropY_pct);
        $srcW = round($origW * $cropW_pct);
        $srcH = round($origH * $cropH_pct);

        // Evitar recortes fuera de los límites (seguridad matemática)
        $srcW = min($srcW, $origW - $srcX);
        $srcH = min($srcH, $origH - $srcY);

        // 6. Crear una nueva imagen en blanco para el recorte
        $croppedImage = imagecreatetruecolor($srcW, $srcH);

        // Mantener transparencia si es PNG o WEBP
        if ($mimeType === 'image/png' || $mimeType === 'image/webp') {
            imagealphablending($croppedImage, false);
            imagesavealpha($croppedImage, true);
            $transparent = imagecolorallocatealpha($croppedImage, 255, 255, 255, 127);
            imagefilledrectangle($croppedImage, 0, 0, $srcW, $srcH, $transparent);
        }

        // 7. Aplicar el recorte copiando la porción deseada
        imagecopyresampled($croppedImage, $sourceImage, 0, 0, $srcX, $srcY, $srcW, $srcH, $srcW, $srcH);

        // 8. Guardar la imagen procesada en el servidor
        $saveSuccess = false;
        switch ($mimeType) {
            case 'image/jpeg': $saveSuccess = imagejpeg($croppedImage, $destination, 90); break; // Calidad 90
            case 'image/png':  $saveSuccess = imagepng($croppedImage, $destination, 8); break;  // Compresión 8
            case 'image/webp': $saveSuccess = imagewebp($croppedImage, $destination, 90); break; // Calidad 90
        }

        // Liberar memoria del servidor
        imagedestroy($sourceImage);
        imagedestroy($croppedImage);

        // 9. Actualizar Base de Datos si la creación fue exitosa
        if ($saveSuccess) {
            $dbPath = 'public/storage/banners/uploaded/' . $fileName;
            
            if ($this->userRepo->updateBanner($_SESSION['user_id'], $dbPath)) {
                return [
                    'success' => true,
                    'message' => 'Banner actualizado correctamente.',
                    'banner_url' => (defined('APP_URL') ? APP_URL : '') . '/' . ltrim($dbPath, '/')
                ];
            } else {
                // Si falla la BD, opcionalmente borraríamos el archivo para no dejar basura
                @unlink($destination);
                return ['success' => false, 'message' => 'Error al guardar en la base de datos.'];
            }
        }

        return ['success' => false, 'message' => 'Error interno al procesar y guardar la imagen recortada.'];
    }
}
?>