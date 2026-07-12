<?php
$content = file_get_contents('includes/core/Helpers/Utils.php');

$content = preg_replace('/class Utils \{/', 'class Utils {' . "\n" . '    private static $s3Client = null;', $content, 1);

// generateProfilePicture
$genPicStart = strpos($content, 'public static function generateProfilePicture');
$genPicEnd = strpos($content, '    public static function generateCSRFToken', $genPicStart);
$genPicCode = <<<'CODE'
public static function generateProfilePicture($text) {
        $uuid = self::generateUUID();
        $backgroundColor = self::getRandomColor();
        
        $image = imagecreatetruecolor(100, 100);
        $bg = imagecolorallocate($image, hexdec(substr($backgroundColor, 1, 2)), hexdec(substr($backgroundColor, 3, 2)), hexdec(substr($backgroundColor, 5, 2)));
        imagefill($image, 0, 0, $bg);
        $textColor = imagecolorallocate($image, 255, 255, 255);
        $fontPath = ROOT_PATH . '/public/assets/fonts/Inter-Bold.ttf';
        
        if (file_exists($fontPath)) {
            imagettftext($image, 40, 0, 20, 65, $textColor, $fontPath, strtoupper(substr($text, 0, 1)));
        } else {
            imagestring($image, 5, 40, 40, strtoupper(substr($text, 0, 1)), $textColor);
        }
        
        ob_start();
        imagepng($image);
        $imageContent = ob_get_clean();
        imagedestroy($image);
        
        if ($imageContent === false) {
            return 'public/assets/img/fallbacks/avatar-default.png';
        }
        $fileName = $uuid . '.png';
        $bucket = EnvLoader::get('MINIO_BUCKET', 'rosaura-storage');
        $s3Client = self::getS3Client();
        try {
            $s3Client->putObject([
                'Bucket' => $bucket,
                'Key'    => 'profilePictures/default/' . $fileName,
                'Body'   => $imageContent,
                'ContentType' => 'image/png'
            ]);
        } catch (\Throwable $e) {
            \App\Core\System\Logger::error('Failed to upload avatar to S3', ['exception' => $e->getMessage()]);
        }
        return 'profilePictures/default/' . $fileName;
    }

CODE;

$content = substr_replace($content, $genPicCode, $genPicStart, $genPicEnd - $genPicStart);

// uploadAndSanitizeImage
$uploadStart = strpos($content, 'public static function uploadAndSanitizeImage');
$uploadEnd = strpos($content, '    public static function deleteOldAvatar', $uploadStart);
$uploadCode = <<<'CODE'
public static function uploadAndSanitizeImage($file, $uploadDir, $maxSizeMb) {
        if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message_key' => 'upload.error'];
        }

        if ($file['size'] > $maxSizeMb * 1024 * 1024) {
            return ['success' => false, 'message_key' => 'upload.size_exceeded'];
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if ($mime !== 'image/png' && $mime !== 'image/jpeg') {
            return ['success' => false, 'message_key' => 'upload.invalid_format'];
        }

        $fileName = self::generateUUID() . (($mime === 'image/png') ? '.png' : '.jpg');
        $imageRecreated = false;
        $imageContent = null;

        if ($mime === 'image/png') {
            try {
                $sourceImage = imagecreatefrompng($file['tmp_name']);
                if ($sourceImage !== false) {
                    imagealphablending($sourceImage, false);
                    imagesavealpha($sourceImage, true);
                    ob_start();
                    imagepng($sourceImage);
                    $imageContent = ob_get_clean();
                    imagedestroy($sourceImage);
                    $imageRecreated = true;
                }
            } catch (\Throwable $e) {
                \App\Core\System\Logger::error('Image processing failed', ['format' => 'png', 'exception' => $e->getMessage()]);
            }
        } elseif ($mime === 'image/jpeg') {
            try {
                $sourceImage = imagecreatefromjpeg($file['tmp_name']);
                if ($sourceImage !== false) {
                    ob_start();
                    imagejpeg($sourceImage, null, 90);
                    $imageContent = ob_get_clean();
                    imagedestroy($sourceImage);
                    $imageRecreated = true;
                }
            } catch (\Throwable $e) {
                \App\Core\System\Logger::error('Image processing failed', ['format' => 'jpeg', 'exception' => $e->getMessage()]);
            }
        }

        if ($imageRecreated && $imageContent !== null) {
            $bucket = EnvLoader::get('MINIO_BUCKET', 'rosaura-storage');
            $s3Client = self::getS3Client();
            $s3Key = preg_replace('#^/?public/storage/#', '', ltrim($uploadDir, '/')) . '/' . $fileName;
            $s3Key = preg_replace('#/+#', '/', ltrim($s3Key, '/'));
            try {
                $s3Client->putObject([
                    'Bucket' => $bucket,
                    'Key'    => ltrim($s3Key, '/'),
                    'Body'   => $imageContent,
                    'ContentType' => $mime
                ]);
                return ['success' => true, 'file_name' => $fileName];
            } catch (\Throwable $e) {
                \App\Core\System\Logger::error('Failed to upload image to S3', ['exception' => $e->getMessage()]);
            }
        }

        return ['success' => false, 'message_key' => 'error.internal_server_error'];
    }

CODE;

$content = substr_replace($content, $uploadCode, $uploadStart, $uploadEnd - $uploadStart);

// deleteOldAvatar
$deleteStart = strpos($content, 'public static function deleteOldAvatar');
$deleteEnd = strpos($content, '    public static function invalidateUserSessions', $deleteStart);
$deleteCode = <<<'CODE'
public static function deleteOldAvatar($oldPicPath) {
        if (!empty($oldPicPath)) {
            if (strpos($oldPicPath, 'fallbacks/avatar-default.png') !== false) {
                return false;
            }
            if (strpos($oldPicPath, 'uploaded/') !== false || strpos($oldPicPath, 'default/') !== false) {
                $s3Key = preg_replace('#^/?public/storage/#', '', ltrim($oldPicPath, '/'));
                
                $bucket = EnvLoader::get('MINIO_BUCKET', 'rosaura-storage');
                $s3Client = self::getS3Client();
                try {
                    $s3Client->deleteObject([
                        'Bucket' => $bucket,
                        'Key'    => ltrim($s3Key, '/')
                    ]);
                    return true;
                } catch (\Throwable $e) {
                    \App\Core\System\Logger::error('Failed to delete avatar from S3', ['exception' => $e->getMessage()]);
                }
            }
        }
        return false;
    }

CODE;

$content = substr_replace($content, $deleteCode, $deleteStart, $deleteEnd - $deleteStart);

file_put_contents('includes/core/Helpers/Utils.php', $content);
echo "Utils.php successfully patched using PHP script.\n";
