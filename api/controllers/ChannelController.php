<?php
// api/controllers/ChannelController.php

namespace App\Api\Controllers;

use App\Core\Interfaces\SubscriptionRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\RateLimiterInterface;
use App\Core\Security\RedisRateLimiter;
use App\Core\Helpers\Utils;

class ChannelController {
    private SubscriptionRepositoryInterface $subscriptionRepo;
    private UserRepositoryInterface $userRepo;
    private RateLimiterInterface $rateLimiter;

    public function __construct(SubscriptionRepositoryInterface $subscriptionRepo, UserRepositoryInterface $userRepo, RateLimiterInterface $rateLimiter) {
        $this->subscriptionRepo = $subscriptionRepo;
        $this->userRepo = $userRepo;
        $this->rateLimiter = $rateLimiter;
    }

    public function get_channel_by_identifier($identifier) {
        if (empty($identifier)) {
            return ['success' => false, 'message' => 'Identificador no especificado.'];
        }
        
        $cleanIdentifier = ltrim($identifier, '@');
        $channelUser = $this->userRepo->findByIdentifier($cleanIdentifier);

        if (!$channelUser) {
            return ['success' => false, 'message' => 'El canal no existe.'];
        }

        unset($channelUser['password'], $channelUser['two_factor_secret'], $channelUser['two_factor_recovery_codes'], $channelUser['email']);
        
        $channelUser['subscriber_count'] = $this->subscriptionRepo->getSubscriberCount($channelUser['id']);
        
        $isSubscribed = false;
        if (isset($_SESSION['user_id'])) {
            $isSubscribed = $this->subscriptionRepo->isSubscribed($_SESSION['user_id'], $channelUser['id']);
        }
        $channelUser['is_subscribed'] = $isSubscribed;

        // --- SISTEMA DE MEDIDAS AL CONSULTAR PERFIL ---
        $viewerSystem = $_SESSION['user_prefs']['measurement_system'] ?? 'metric';
        $channelUser['viewer_measurement_system'] = $viewerSystem;
        
        if (isset($channelUser['height']) && $channelUser['height'] !== null) {
            if ($viewerSystem === 'imperial') {
                $totalInches = round($channelUser['height'] / 2.54);
                $feet = floor($totalInches / 12);
                $inches = $totalInches % 12;
                $channelUser['display_height'] = $feet . "'" . $inches . '"';
                $channelUser['height_raw_imperial'] = $totalInches; 
            } else {
                $channelUser['display_height'] = number_format($channelUser['height'] / 100, 2) . ' m';
            }
        }

        if (isset($channelUser['weight']) && $channelUser['weight'] !== null) {
            if ($viewerSystem === 'imperial') {
                $channelUser['display_weight'] = round($channelUser['weight'] * 2.20462, 1) . ' lbs';
                $channelUser['weight_raw_imperial'] = round($channelUser['weight'] * 2.20462, 1);
            } else {
                $channelUser['display_weight'] = round($channelUser['weight'], 1) . ' kg';
            }
        }

        return ['success' => true, 'channel' => $channelUser];
    }

    public function toggle_subscription($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Debes iniciar sesión para suscribirte.'];
        }

        $action = "subscribe_" . $_SESSION['user_id'];
        $check = $this->rateLimiter->check($action, RedisRateLimiter::LIMIT_SUBSCRIPTIONS_ATTEMPTS, RedisRateLimiter::LIMIT_SUBSCRIPTIONS_MINUTES, 'Has realizado demasiadas acciones recientemente.');
        
        if (!$check['allowed']) {
            return ['success' => false, 'message' => $check['message']];
        }
        $this->rateLimiter->record($action, RedisRateLimiter::LIMIT_SUBSCRIPTIONS_ATTEMPTS, RedisRateLimiter::LIMIT_SUBSCRIPTIONS_MINUTES);

        $subscriberId = $_SESSION['user_id'];
        $channelIdentifier = $data['identifier'] ?? '';

        if (empty($channelIdentifier)) {
            return ['success' => false, 'message' => 'Canal no especificado.'];
        }
        
        $cleanIdentifier = ltrim($channelIdentifier, '@');
        $channelUser = $this->userRepo->findByIdentifier($cleanIdentifier);
        
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
    
    public function update_profile($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Debes iniciar sesión para realizar esta acción.'];
        }

        $description = isset($data['description']) ? trim($data['description']) : null;
        $identifier = isset($data['identifier']) ? trim($data['identifier']) : null;
        $contactEmail = isset($data['contact_email']) ? trim($data['contact_email']) : null;

        if (!empty($contactEmail) && !filter_var($contactEmail, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'El correo de contacto no es un formato válido.'];
        }

        if ($identifier) {
             $identifier = ltrim($identifier, '@');
             if (!preg_match('/^[a-z0-9_]{3,20}$/', $identifier)) {
                 return ['success' => false, 'message' => 'El identificador debe tener entre 3 y 20 caracteres y contener solo letras minúsculas, números o guiones bajos.'];
             }

             $existingUser = $this->userRepo->findByIdentifier($identifier);
             if ($existingUser && $existingUser['id'] != $_SESSION['user_id']) {
                 return ['success' => false, 'message' => 'El identificador ingresado ya está en uso.'];
             }
        }

        $updated = $this->userRepo->updateChannelProfile($_SESSION['user_id'], $description, $identifier, $contactEmail);

        // --- SISTEMA DE MEDIDAS AL GUARDAR PERFIL ---
        $system = $_SESSION['user_prefs']['measurement_system'] ?? 'metric';
        if (isset($data['measurement_system'])) {
            $system = $data['measurement_system'];
        }

        $height = isset($data['height']) && is_numeric($data['height']) ? (float)$data['height'] : null;
        $weight = isset($data['weight']) && is_numeric($data['weight']) ? (float)$data['weight'] : null;

        if ($system === 'imperial') {
            if ($height !== null) $height = round($height * 2.54, 2); 
            if ($weight !== null) $weight = round($weight * 0.453592, 2); 
        }

        $profileData = [
            'relationship_status' => isset($data['relationship_status']) && $data['relationship_status'] !== '' ? $data['relationship_status'] : null,
            'interested_in' => isset($data['interested_in']) && $data['interested_in'] !== '' ? $data['interested_in'] : null,
            'gender' => isset($data['gender']) && $data['gender'] !== '' ? $data['gender'] : null,
            'height' => $height,
            'weight' => $weight,
            'hair_color' => isset($data['hair_color']) && $data['hair_color'] !== '' ? $data['hair_color'] : null,
            'boobs' => isset($data['boobs']) && $data['boobs'] !== '' ? $data['boobs'] : null,
            'ethnicity' => isset($data['ethnicity']) && $data['ethnicity'] !== '' ? $data['ethnicity'] : null,
            'eye_color' => isset($data['eye_color']) && $data['eye_color'] !== '' ? $data['eye_color'] : null,
            'country' => isset($data['country']) && $data['country'] !== '' ? $data['country'] : null,
            'tattoos' => isset($data['tattoos']) ? (int)$data['tattoos'] : 0,
            'piercings' => isset($data['piercings']) ? (int)$data['piercings'] : 0,
            'interests' => isset($data['interests']) ? trim($data['interests']) : null,
            'social_facebook' => isset($data['social_facebook']) ? trim($data['social_facebook']) : null,
            'social_youtube' => isset($data['social_youtube']) ? trim($data['social_youtube']) : null,
            'social_instagram' => isset($data['social_instagram']) ? trim($data['social_instagram']) : null,
            'social_x' => isset($data['social_x']) ? trim($data['social_x']) : null,
            'social_onlyfans' => isset($data['social_onlyfans']) ? trim($data['social_onlyfans']) : null,
            'social_snapchat' => isset($data['social_snapchat']) ? trim($data['social_snapchat']) : null,
        ];
        
        $extendedUpdated = $this->userRepo->updateExtendedProfile($_SESSION['user_id'], $profileData);

        if ($updated || $extendedUpdated) {
            if ($identifier) {
                $_SESSION['user_identifier'] = $identifier;
            }
            return ['success' => true, 'message' => 'Los cambios de tu canal se han publicado correctamente.'];
        } else {
            return ['success' => false, 'message' => 'No se pudieron guardar los cambios. Intenta nuevamente.'];
        }
    }

    public function upload_banner($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Debes iniciar sesión para realizar esta acción.'];
        }

        if (!isset($_FILES['banner']) || $_FILES['banner']['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'No se recibió ningún archivo válido.'];
        }

        $file = $_FILES['banner'];
        $maxSize = 6 * 1024 * 1024;

        if ($file['size'] > $maxSize) {
            return ['success' => false, 'message' => 'La imagen no puede pesar más de 6 MB.'];
        }

        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedTypes)) {
            return ['success' => false, 'message' => 'Formato de imagen no soportado. Usa JPG, PNG o WEBP.'];
        }

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

        $cropX_pct = isset($_POST['crop_x']) ? (float)$_POST['crop_x'] : 0;
        $cropY_pct = isset($_POST['crop_y']) ? (float)$_POST['crop_y'] : 0;
        $cropW_pct = isset($_POST['crop_w']) ? (float)$_POST['crop_w'] : 1;
        $cropH_pct = isset($_POST['crop_h']) ? (float)$_POST['crop_h'] : 1;

        switch ($mimeType) {
            case 'image/jpeg': $sourceImage = imagecreatefromjpeg($file['tmp_name']); break;
            case 'image/png':  $sourceImage = imagecreatefrompng($file['tmp_name']); break;
            case 'image/webp': $sourceImage = imagecreatefromwebp($file['tmp_name']); break;
            default: return ['success' => false, 'message' => 'Error al procesar el formato de la imagen.'];
        }

        if (!$sourceImage) {
            return ['success' => false, 'message' => 'La imagen subida está corrupta o no es válida.'];
        }

        $origW = imagesx($sourceImage);
        $origH = imagesy($sourceImage);

        $srcX = round($origW * $cropX_pct);
        $srcY = round($origH * $cropY_pct);
        $srcW = round($origW * $cropW_pct);
        $srcH = round($origH * $cropH_pct);

        $srcW = min($srcW, $origW - $srcX);
        $srcH = min($srcH, $origH - $srcY);

        $croppedImage = imagecreatetruecolor($srcW, $srcH);

        if ($mimeType === 'image/png' || $mimeType === 'image/webp') {
            imagealphablending($croppedImage, false);
            imagesavealpha($croppedImage, true);
            $transparent = imagecolorallocatealpha($croppedImage, 255, 255, 255, 127);
            imagefilledrectangle($croppedImage, 0, 0, $srcW, $srcH, $transparent);
        }

        imagecopyresampled($croppedImage, $sourceImage, 0, 0, $srcX, $srcY, $srcW, $srcH, $srcW, $srcH);

        $saveSuccess = false;
        switch ($mimeType) {
            case 'image/jpeg': $saveSuccess = imagejpeg($croppedImage, $destination, 90); break; 
            case 'image/png':  $saveSuccess = imagepng($croppedImage, $destination, 8); break;  
            case 'image/webp': $saveSuccess = imagewebp($croppedImage, $destination, 90); break; 
        }

        imagedestroy($sourceImage);
        imagedestroy($croppedImage);

        if ($saveSuccess) {
            $dbPath = 'public/storage/banners/uploaded/' . $fileName;
            
            if ($this->userRepo->updateBanner($_SESSION['user_id'], $dbPath)) {
                return [
                    'success' => true,
                    'message' => 'Banner actualizado correctamente.',
                    'banner_url' => (defined('APP_URL') ? APP_URL : '') . '/' . ltrim($dbPath, '/')
                ];
            } else {
                @unlink($destination);
                return ['success' => false, 'message' => 'Error al guardar en la base de datos.'];
            }
        }

        return ['success' => false, 'message' => 'Error interno al procesar y guardar la imagen recortada.'];
    }
}
?>