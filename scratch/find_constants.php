<?php

$dir = __DIR__ . '/../';
$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));

// Constants we want to find
require_once $dir . 'includes/core/System/DatabaseConstants.php';
require_once $dir . 'includes/core/System/CacheConstants.php';

$dbRef = new ReflectionClass(\App\Core\System\DatabaseConstants::class);
$cacheRef = new ReflectionClass(\App\Core\System\CacheConstants::class);

$constants = [];
foreach ($dbRef->getConstants() as $name => $val) {
    if (is_string($val)) {
        $constants["'$val'"] = "\App\Core\System\DatabaseConstants::$name";
        $constants["\"$val\""] = "\App\Core\System\DatabaseConstants::$name";
    }
}
foreach ($cacheRef->getConstants() as $name => $val) {
    if (is_string($val)) {
        $constants["'$val'"] = "\App\Core\System\CacheConstants::$name";
        $constants["\"$val\""] = "\App\Core\System\CacheConstants::$name";
    }
}

$results = [];

foreach ($files as $file) {
    if ($file->getExtension() !== 'php') continue;
    if (strpos($file->getPathname(), 'vendor') !== false) continue;
    if (strpos($file->getPathname(), 'scratch') !== false) continue;
    if (strpos($file->getPathname(), 'System') !== false && strpos($file->getFilename(), 'Constants.php') !== false) continue;

    $content = file_get_contents($file->getPathname());
    $tokens = token_get_all($content);
    $lineNum = 1;
    foreach ($tokens as $token) {
        if (is_array($token)) {
            if ($token[0] === T_CONSTANT_ENCAPSED_STRING) {
                $val = $token[1];
                if (isset($constants[$val])) {
                    $results[] = [
                        'file' => $file->getPathname(),
                        'line' => $token[2],
                        'found' => $val,
                        'replace_with' => $constants[$val]
                    ];
                }
            }
        }
    }
}

echo "Found " . count($results) . " hardcoded occurrences.\n";
if (count($results) > 0) {
    $counts = [];
    foreach ($results as $r) {
        $key = $r['replace_with'];
        if (!isset($counts[$key])) $counts[$key] = 0;
        $counts[$key]++;
    }
    arsort($counts);
    echo "\nTop constants to replace:\n";
    foreach (array_slice($counts, 0, 10) as $key => $count) {
        echo "$key : $count\n";
    }
}
