<?php

require_once __DIR__ . '/../vendor/autoload.php';
define('ROOT_PATH', dirname(__DIR__));
\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

use App\Core\Helpers\Utils;

$colors = ['2563eb', '16a34a', '7c3aed', 'dc2626', 'ea580c', '374151'];
$letters = range('A', 'Z');
$numbers = range('0', '9');
$symbols = ['_symbol' => 'U']; // Use 'U' for UI-Avatars, but save in _symbol folder

$forceRegenerate = isset($argv[1]) && $argv[1] === '--force';

$baseDir = ROOT_PATH . '/storage/public/profilePictures/default';

function checkAndGenerate($category, $chars, $colors, $baseDir, $forceRegenerate) {
    $s3Client = Utils::getS3Client();
    $bucket = \App\Core\Helpers\EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
    
    foreach ($chars as $folderName => $charToDraw) {
        // If it's a regular array (letters/numbers), folder is the char itself
        if (is_int($folderName)) {
            $folderName = $charToDraw;
        }

        $folderPath = $baseDir . '/' . $category . '/' . $folderName;
        
        if (!is_dir($folderPath)) {
            mkdir($folderPath, 0755, true);
        }

        $filesCount = 0;
        foreach ($colors as $color) {
            $filePath = $folderPath . '/' . $color . '.png';
            if (file_exists($filePath)) {
                $filesCount++;
            }
        }

        if ($filesCount !== count($colors) || $forceRegenerate) {
            echo "[*] Generating avatars for $category/$folderName...\n";
            foreach ($colors as $color) {
                $filePath = $folderPath . '/' . $color . '.png';
                $relPath = 'profilePictures/default/' . $category . '/' . $folderName . '/' . $color . '.png';

                // Fetch from ui-avatars
                $apiUrl = "https://ui-avatars.com/api/?name=" . urlencode($charToDraw) . "&background=" . $color . "&color=ffffff&size=256&font-size=0.5&format=png";
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $apiUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                $imageContent = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                // Retraso de 0.5 segundos para no saturar la API
                usleep(500000);

                if (!$imageContent || $httpCode !== 200) {
                    // Fallback to GD if ui-avatars is down
                    $image = imagecreatetruecolor(256, 256);
                    $bg = imagecolorallocate($image, hexdec(substr($color, 0, 2)), hexdec(substr($color, 2, 2)), hexdec(substr($color, 4, 2)));
                    imagefill($image, 0, 0, $bg);
                    $textColor = imagecolorallocate($image, 255, 255, 255);
                    $fontPath = ROOT_PATH . '/public/assets/fonts/Inter-Bold.ttf';
                    
                    if (file_exists($fontPath)) {
                        imagettftext($image, 100, 0, 70, 170, $textColor, $fontPath, urldecode($charToDraw));
                    } else {
                        $tempImg = imagecreatetruecolor(20, 20);
                        imagefill($tempImg, 0, 0, $bg);
                        imagestring($tempImg, 5, 6, 2, urldecode($charToDraw), $textColor);
                        imagecopyresized($image, $tempImg, 0, 0, 0, 0, 256, 256, 20, 20);
                        imagedestroy($tempImg);
                    }
                    
                    ob_start();
                    imagepng($image);
                    $imageContent = ob_get_clean();
                    imagedestroy($image);
                }

                // Save locally
                file_put_contents($filePath, $imageContent);

                // Upload to S3
                try {
                    $s3Client->putObject([
                        'Bucket' => $bucket,
                        'Key'    => $relPath,
                        'Body'   => $imageContent,
                        'ContentType' => 'image/png'
                    ]);
                } catch (\Exception $e) {
                    echo "[!] Failed to upload $relPath to S3: " . $e->getMessage() . "\n";
                }
            }
        }
    }
}

echo "[*] Checking and generating letters...\n";
checkAndGenerate('letters', $letters, $colors, $baseDir, $forceRegenerate);

echo "[*] Checking and generating numbers...\n";
checkAndGenerate('numbers', $numbers, $colors, $baseDir, $forceRegenerate);

echo "[*] Checking and generating symbols...\n";
checkAndGenerate('letters', $symbols, $colors, $baseDir, $forceRegenerate);

echo "[+] Done verifying avatars.\n";
