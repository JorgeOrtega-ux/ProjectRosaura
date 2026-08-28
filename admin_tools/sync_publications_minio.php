<?php
require_once __DIR__ . '/../includes/core/bootstrap.php';

use App\Core\Helpers\Utils;
use App\Core\Helpers\EnvLoader;

$bucket = EnvLoader::get('AWS_BUCKET', 'spriteboard-storage');
$s3Client = Utils::getS3Client();

$pubDir = ROOT_PATH . '/storage/public/publications';
if (!is_dir($pubDir)) {
    echo "Directory {$pubDir} does not exist.\n";
    exit(0);
}

$files = scandir($pubDir);
$synced = 0;
$failed = 0;

foreach ($files as $file) {
    if ($file === '.' || $file === '..' || !str_ends_with($file, '.png')) {
        continue;
    }
    $filePath = $pubDir . '/' . $file;
    $s3Key = 'publications/' . $file;
    
    try {
        echo "Uploading {$file} to S3 bucket [{$bucket}] key [{$s3Key}]... ";
        $s3Client->putObject([
            'Bucket' => $bucket,
            'Key' => $s3Key,
            'SourceFile' => $filePath,
            'ContentType' => 'image/png'
        ]);
        echo "OK\n";
        $synced++;
    } catch (\Throwable $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
        $failed++;
    }
}

echo "Sync completed. Synced: {$synced}, Failed: {$failed}\n";
