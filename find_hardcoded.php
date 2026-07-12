<?php
$dir = 'f:/htdocs/ProjectRosaura/includes/views/canvases';
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));
foreach ($iterator as $file) {
    if ($file->isFile() && $file->getExtension() === 'php') {
        $lines = file($file->getPathname());
        foreach ($lines as $i => $l) {
            if (preg_match_all('/>([^<]+)</', $l, $m)) {
                foreach ($m[1] as $text) {
                    $t = trim($text);
                    if (strlen($t) > 2 && preg_match('/[a-zA-ZÁÉÍÓÚÑáéíóúñ]/', $t) && strpos($t, '<?') === false && strpos($t, '__(') === false && $t !== 'span') {
                        echo str_replace($dir.'\\', '', $file->getPathname()) . ':' . ($i+1) . ':' . $t . "\n";
                    }
                }
            }
            if (preg_match('/echo\s+"<div class=\'view-content\'><p>(.*?)<\/p><\/div>";/', $l, $m)) {
                if (strpos($m[1], '__(') === false) {
                    echo str_replace($dir.'\\', '', $file->getPathname()) . ':' . ($i+1) . ':' . $m[1] . "\n";
                }
            }
        }
    }
}
?>
