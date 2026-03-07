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

        // 4. Mover al almacenamiento y actualizar base de datos
        if (move_uploaded_file($file['tmp_name'], $destination)) {
            $dbPath = 'public/storage/banners/uploaded/' . $fileName;
            
            // Suponemos que implementaremos updateBanner() en UserRepository
            if ($this->userRepo->updateBanner($_SESSION['user_id'], $dbPath)) {
                return [
                    'success' => true,
                    'message' => 'Banner actualizado correctamente.',
                    'banner_url' => (defined('APP_URL') ? APP_URL : '') . '/' . $dbPath
                ];
            } else {
                return ['success' => false, 'message' => 'Error al guardar en la base de datos.'];
            }
        }

        return ['success' => false, 'message' => 'Error al guardar el archivo en el servidor.'];
    }
}
?>