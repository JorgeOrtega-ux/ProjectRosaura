<?php
$file = __DIR__ . "/translations/es-419/general.json";
$json = file_get_contents($file);
$data = json_decode($json, true);

// Modify texts requested by user
$data["plan_limit_members"] = "Miembros (por cada lienzo)";
$data["plan_limit_members_desc"] = "Cantidad máxima de invitados simultáneos permitidos dentro de un mismo lienzo.";

$newJson = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
if ($newJson) {
    file_put_contents($file, $newJson);
    echo "JSON updated successfully.\n";
} else {
    echo "ERROR encoding JSON: " . json_last_error_msg() . "\n";
}
?>
