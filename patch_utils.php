<?php
$content = file_get_contents('includes/core/Helpers/Utils.php');

// Fix 1: uploadAndSanitizeImage S3 key logic
$search1 = <<<EOT
            \$bucket = EnvLoader::get('MINIO_BUCKET', 'rosaura-storage');
            \$s3Client = self::getS3Client();
            \$s3Key = preg_replace('#^/?public/storage/#', '', ltrim(\$uploadDir, '/')) . '/' . \$fileName;
            \$s3Key = preg_replace('#/+#', '/', ltrim(\$s3Key, '/'));
EOT;
$replace1 = <<<EOT
            \$bucket = EnvLoader::get('MINIO_BUCKET', 'rosaura-storage');
            \$s3Client = self::getS3Client();
            \$s3Key = trim(\$uploadDir, '/') . '/' . \$fileName;
            \$s3Key = preg_replace('#/+#', '/', ltrim(\$s3Key, '/'));
EOT;

// Fix 2: getValidImage logic for S3
$search2 = <<<EOT
    public static function getValidImage(\$path, \$type = 'avatar') {
        \$fallback = self::\$fallbacks[\$type] ?? self::\$fallbacks['avatar'];
        
        if (empty(\$path)) {
            return \$fallback;
        }

        \$cleanPath = ltrim(\$path, '/');
        \$realPathRelative = str_replace('public/storage/', 'storage/public/', \$cleanPath);
        \$absolutePath = ROOT_PATH . '/' . \$realPathRelative;

        if (file_exists(\$absolutePath) && is_file(\$absolutePath)) {
            return \$cleanPath;
        }

        return \$fallback;
    }
EOT;
$replace2 = <<<EOT
    public static function getValidImage(\$path, \$type = 'avatar') {
        \$fallback = self::\$fallbacks[\$type] ?? self::\$fallbacks['avatar'];
        
        if (empty(\$path)) {
            return \$fallback;
        }

        if (strpos(\$path, 'http') === 0) {
            return \$path;
        }

        if (strpos(\$path, 'uploaded/') !== false || strpos(\$path, 'thumbnails/') !== false || strpos(\$path, 'profilePictures/') !== false) {
            return self::getS3PublicUrl(\$path);
        }

        return \$path;
    }
EOT;

$content = str_replace(str_replace("\r\n", "\n", $search1), $replace1, $content);
$content = str_replace(str_replace("\n", "\r\n", $search1), $replace1, $content);

$content = str_replace(str_replace("\r\n", "\n", $search2), $replace2, $content);
$content = str_replace(str_replace("\n", "\r\n", $search2), $replace2, $content);

file_put_contents('includes/core/Helpers/Utils.php', $content);
echo "Patched Utils.php successfully.";
