<?php
$viewsDir = 'f:/htdocs/ProjectRosaura/includes/views/site-policy';
$translationsDir = 'f:/htdocs/ProjectRosaura/translations/es-419/site-policy';
$appNamePhp = '<?php echo $appName; ?>';

$files = ['legal-notice.php', 'privacy-policy.php', 'cookies-policy.php', 'terms-conditions.php', 'refund-policy.php'];

foreach ($files as $filename) {
    $filepath = $viewsDir . '/' . $filename;
    $content = file_get_contents($filepath);
    
    $basename = str_replace('.php', '', $filename);
    $prefix = str_replace('-', '_', $basename);
    
    $translations = [];
    $counter = 1;
    
    $callback = function($matches) use (&$counter, &$translations, $prefix, $appNamePhp) {
        $tag = $matches[1];
        $classes = $matches[2];
        $innerHtml = $matches[3];
        
        if (strpos($innerHtml, '<?php echo __(') !== false) {
            return $matches[0];
        }
        
        $key = $prefix . "_text_" . $counter;
        $counter++;
        
        $jsonVal = trim($innerHtml);
        $hasAppName = strpos($jsonVal, $appNamePhp) !== false;
        
        if ($hasAppName) {
            $jsonVal = str_replace($appNamePhp, '{appName}', $jsonVal);
        }
        
        // Remove extra whitespace
        $jsonVal = preg_replace('/\s+/', ' ', $jsonVal);
        
        $translations[$key] = $jsonVal;
        
        if ($hasAppName) {
            $phpCode = "<?php echo __('$key', ['appName' => \$appName]); ?>";
        } else {
            $phpCode = "<?php echo __('$key'); ?>";
        }
        
        return "<$tag $classes>\n                    $phpCode\n                </$tag>";
    };
    
    // Replace p subtitle
    $content = preg_replace_callback('/<(p)\s+(class="policy-subtitle")>(.*?)<\/\1>/s', $callback, $content);
    // Replace h2
    $content = preg_replace_callback('/<(h2)\s+(class="policy-section-title")>(.*?)<\/\1>/s', $callback, $content);
    // Replace p text
    $content = preg_replace_callback('/<(p)\s+(class="policy-text")>(.*?)<\/\1>/s', $callback, $content);
    // Replace li inside ul
    $content = preg_replace_callback('/<(li)\s*([^>]*)>(.*?)<\/\1>/s', $callback, $content);

    $jsonPath = $translationsDir . '/' . $basename . '.json';
    file_put_contents($jsonPath, json_encode($translations, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    
    file_put_contents($filepath, $content);
    echo "Processed $filename: " . count($translations) . " keys extracted.\n";
}
