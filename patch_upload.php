<?php
// 1. AdminServices.php
$content = file_get_contents('api/services/Admin/AdminServices.php');
$search = <<<EOT
        \$uploadDir = ROOT_PATH . '/storage/public/profilePictures/uploaded/';

        \$uploadResult = Utils::uploadAndSanitizeImage(\$file, \$uploadDir, \$maxSizeMb);
EOT;
$replace = <<<EOT
        \$uploadDir = 'profilePictures/uploaded/';

        \$uploadResult = Utils::uploadAndSanitizeImage(\$file, \$uploadDir, \$maxSizeMb);
EOT;
$content = str_replace($search, $replace, $content);
file_put_contents('api/services/Admin/AdminServices.php', $content);

// 2. SettingsServices.php
$content = file_get_contents('api/services/Settings/SettingsServices.php');
$search = <<<EOT
        \$uploadDir = ROOT_PATH . '/storage/public/profilePictures/uploaded/';

        \$uploadResult = Utils::uploadAndSanitizeImage(\$file, \$uploadDir, \$maxSizeMb);
EOT;
$replace = <<<EOT
        \$uploadDir = 'profilePictures/uploaded/';

        \$uploadResult = Utils::uploadAndSanitizeImage(\$file, \$uploadDir, \$maxSizeMb);
EOT;
$content = str_replace($search, $replace, $content);
file_put_contents('api/services/Settings/SettingsServices.php', $content);

// 3. ChatServices.php
$content = file_get_contents('api/services/Chat/ChatServices.php');
$search = <<<EOT
            \$uploadDir = ROOT_PATH . '/storage/canvases/' . \$canvasUuid . '/chat/';
            if (!is_dir(\$uploadDir)) {
                mkdir(\$uploadDir, 0755, true);
            }

            for (\$i = 0; \$i < count(\$files['name']); \$i++) {
EOT;
$replace = <<<EOT
            \$uploadDir = 'canvases/' . \$canvasUuid . '/chat/';

            for (\$i = 0; \$i < count(\$files['name']); \$i++) {
EOT;
$content = str_replace($search, $replace, $content);
file_put_contents('api/services/Chat/ChatServices.php', $content);

// 4. Utils.php
$content = file_get_contents('includes/core/Helpers/Utils.php');
$search = <<<EOT
            \$bucket = EnvLoader::get('MINIO_BUCKET', 'rosaura-storage');
            \$s3Client = self::getS3Client();
            \$s3Key = preg_replace('#^/?public/storage/#', '', ltrim(\$uploadDir, '/')) . '/' . \$fileName;
            \$s3Key = preg_replace('#/+#', '/', ltrim(\$s3Key, '/'));
EOT;
$replace = <<<EOT
            \$bucket = EnvLoader::get('MINIO_BUCKET', 'rosaura-storage');
            \$s3Client = self::getS3Client();
            \$s3Key = trim(\$uploadDir, '/') . '/' . \$fileName;
            \$s3Key = preg_replace('#/+#', '/', ltrim(\$s3Key, '/'));
EOT;
$content = str_replace($search, $replace, $content);
file_put_contents('includes/core/Helpers/Utils.php', $content);

echo "Patched successfully.";
