<?php
$content = file_get_contents('api/services/Canvas/CanvasCoreService.php');

$search1 = <<<EOT
                \$thumbnailPath = "public/storage/thumbnails/canvas_" . \$canvas['id'] . ".png";
                \$physicalPath = dirname(__DIR__, 3) . '/storage/public/thumbnails/canvas_' . \$canvas['id'] . '.png';
                \$thumbnailUrl = null;
                
                if (file_exists(\$physicalPath)) {
                    \$timestamp = filemtime(\$physicalPath);
                    \$thumbnailUrl = "/" . \$thumbnailPath . "?v=" . \$timestamp;
                }
EOT;

$replace1 = <<<EOT
                \$thumbnailUrl = \App\Core\Helpers\Utils::getS3PublicUrl("thumbnails/canvas_" . \$canvas['id'] . ".png");
EOT;

$content = str_replace($search1, $replace1, $content);


$search2 = <<<EOT
                \$thumbnailPath = "public/storage/thumbnails/canvas_" . \$canvas['id'] . ".png";
                \$physicalPath = dirname(__DIR__, 3) . '/storage/public/thumbnails/canvas_' . \$canvas['id'] . '.png';
                \$thumbnailUrl = null;

                if (file_exists(\$physicalPath)) {
                    \$timestamp = filemtime(\$physicalPath);
                    \$thumbnailUrl = "/" . \$thumbnailPath . "?v=" . \$timestamp;
                }
EOT;

$content = str_replace($search2, $replace1, $content);

$search3 = <<<EOT
                    \$thumbnailPath = "public/storage/thumbnails/canvas_" . \$canvasId . ".png";
                    \$physicalPath = dirname(__DIR__, 3) . '/storage/public/thumbnails/canvas_' . \$canvasId . '.png';
                    
                    if (file_exists(\$physicalPath)) {
                        unlink(\$physicalPath);
                    }
EOT;
$replace3 = <<<EOT
                    // S3 handles thumbnail deletion or it's left as orphaned (cheap)
EOT;
$content = str_replace($search3, $replace3, $content);


$search4 = <<<EOT
                    \$thumbnailPath = "public/storage/thumbnails/canvas_" . \$canvas['id'] . ".png";
                    \$physicalPath = dirname(__DIR__, 3) . '/storage/public/thumbnails/canvas_' . \$canvas['id'] . '.png';
                    
                    if (file_exists(\$physicalPath)) {
                        unlink(\$physicalPath);
                    }
EOT;
$content = str_replace($search4, $replace3, $content);

$search5 = <<<EOT
                        \$thumbnailPath = "public/storage/thumbnails/canvas_" . \$id . ".png";
                        \$physicalPath = dirname(__DIR__, 3) . '/storage/public/thumbnails/canvas_' . \$id . '.png';
                        
                        if (file_exists(\$physicalPath)) {
                            unlink(\$physicalPath);
                        }
EOT;
$content = str_replace($search5, $replace3, $content);


file_put_contents('api/services/Canvas/CanvasCoreService.php', $content);
echo "CanvasCoreService.php successfully patched.\n";
