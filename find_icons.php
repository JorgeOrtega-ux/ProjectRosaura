<?php
$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator('.'));
$icons = [];
foreach ($files as $file) {
    if (in_array(pathinfo($file, PATHINFO_EXTENSION), ['php', 'html', 'js', 'css'])) {
        $content = file_get_contents($file);
        // Find tags like <span class="material-symbols-rounded">icon_name</span>
        preg_match_all('/<span[^>]*class="[^"]*material-symbols-rounded[^"]*"[^>]*>([^<]+)<\/span>/', $content, $matches);
        foreach($matches[1] as $icon) {
            $icon = trim($icon);
            if (!empty($icon)) {
                $icons[$icon] = true;
            }
        }
    }
}
$icons_list = array_keys($icons);
sort($icons_list);
echo count($icons_list) . " unique icons found.\n";
file_put_contents('icons_found.json', json_encode($icons_list, JSON_PRETTY_PRINT));
