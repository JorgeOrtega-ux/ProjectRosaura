<?php
$file = __DIR__ . "/translations/es-419/general.json";
$json = file_get_contents($file);
$data = json_decode($json, true);

// Modify texts requested by user
$data["upgrade_disclaimer"] = "Se pueden aplicar restricciones en cuanto al límite de edad (más de 18 años), la disponibilidad de idiomas y los requisitos del sistema, entre otras.";
$data["upgrade_page_title"] = "Mejora tu experiencia con";
$data["plan_feat_advanced_roles_title"] = "Roles Avanzados";
$data["plan_feat_advanced_roles_desc"] = "Gestiona roles y permisos a nivel granular.";
$data["plan_feat_chat_restriction_title"] = "Chat en tiempo real";
$data["plan_feat_chat_restriction_desc"] = "Comunícate con los miembros de tu grupo directamente desde el lienzo.";
$data["plan_feat_custom_palettes_title"] = "{value} Paletas Personalizadas";
$data["plan_feat_custom_palettes_desc"] = "Guarda tus propios colores y personaliza tu entorno de trabajo.";
$data["plan_feat_beta_access_title"] = "Acceso Beta";
$data["plan_feat_beta_access_desc"] = "Prueba las nuevas características antes que nadie.";

// JSON_INVALID_UTF8_SUBSTITUTE will replace invalid utf-8 with 
$newJson = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
if ($newJson) {
    file_put_contents($file, $newJson);
    echo "JSON updated successfully.\n";
} else {
    echo "ERROR encoding JSON: " . json_last_error_msg() . "\n";
}
?>
