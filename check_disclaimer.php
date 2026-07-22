<?php
$data = json_decode(file_get_contents("translations/es-419/general.json"), true);
echo isset($data["upgrade_billing_disclaimer"]) ? "YES: upgrade_billing_disclaimer" : "NO upgrade_billing_disclaimer";
echo "\n";
echo isset($data["upgrade_monthly_disclaimer"]) ? "YES: upgrade_monthly_disclaimer" : "NO upgrade_monthly_disclaimer";
?>
