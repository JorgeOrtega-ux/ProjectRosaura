<?php
$files = [
    __DIR__ . '/translations/es-419/general.json',
    __DIR__ . '/translations/en/general.json'
];

$esTags = [
    "tag_fun" => "Divertido",
    "tag_tension" => "Tensión",
    "tag_action" => "Acción",
    "tag_strategy" => "Estrategia",
    "tag_roleplay" => "Rol",
    "tag_casual" => "Casual",
    "tag_romance" => "Romance",
    "tag_horror" => "Terror",
    "tag_scifi" => "Ciencia Ficción",
    "tag_fantasy" => "Fantasía",
    "canvas_tags_title" => "Etiquetas del Lienzo",
    "canvas_tags_desc" => "Selecciona hasta 8 etiquetas que describan mejor tu lienzo.",
    "ph_select_tags" => "Seleccionar etiquetas..."
];

$enTags = [
    "tag_fun" => "Fun",
    "tag_tension" => "Tension",
    "tag_action" => "Action",
    "tag_strategy" => "Strategy",
    "tag_roleplay" => "Roleplay",
    "tag_casual" => "Casual",
    "tag_romance" => "Romance",
    "tag_horror" => "Horror",
    "tag_scifi" => "Sci-Fi",
    "tag_fantasy" => "Fantasy",
    "canvas_tags_title" => "Canvas Tags",
    "canvas_tags_desc" => "Select up to 8 tags that best describe your canvas.",
    "ph_select_tags" => "Select tags..."
];

foreach ($files as $file) {
    if (file_exists($file)) {
        $json = json_decode(file_get_contents($file), true);
        if (strpos($file, 'es-419') !== false) {
            $json = array_merge($json, $esTags);
        } else {
            $json = array_merge($json, $enTags);
        }
        file_put_contents($file, json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo "Updated $file\n";
    }
}
