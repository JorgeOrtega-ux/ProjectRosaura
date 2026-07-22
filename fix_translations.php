<?php
$file = "translations/es-419/general.json";
$data = json_decode(file_get_contents($file), true);

$data["upgrade_disclaimer"] = "Se pueden aplicar restricciones en cuanto al límite de edad (más de 18 años), la disponibilidad de idiomas y los requisitos del sistema, entre otras.";
$data["plan_feat_chat_restriction_title"] = "Chat en tiempo real";
$data["plan_feat_chat_restriction_desc"] = "Comunícate con los miembros de tu grupo directamente desde el lienzo.";
$data["plan_feat_custom_palettes_title"] = "{value} Paletas Personalizadas";
$data["plan_feat_custom_palettes_desc"] = "Guarda tus propios colores y personaliza tu entorno de trabajo.";

unset($data["plan_feat_unlimited_exports_title"]);
unset($data["plan_feat_unlimited_exports_desc"]);
unset($data["plan_feat_priority_rendering_title"]);
unset($data["plan_feat_priority_rendering_desc"]);

file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "Done.\n";
?>
