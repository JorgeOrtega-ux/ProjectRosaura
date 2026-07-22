<?php
$json = file_get_contents("translations/es-419/general.json");
$data = json_decode($json, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "JSON Error: " . json_last_error_msg() . "\n";
} else {
    echo "Keys: " . count($data) . "\n";
    echo isset($data["plan_feat_advanced_roles_title"]) ? "YES: " . $data["plan_feat_advanced_roles_title"] : "NO";
}
?>
