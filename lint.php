<?php
$output = shell_exec('php -l ' . escapeshellarg(__DIR__ . '/includes/views/app/design.php') . ' 2>&1');
echo $output;
