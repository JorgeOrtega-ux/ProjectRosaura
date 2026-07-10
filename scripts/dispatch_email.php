<?php

require_once __DIR__ . '/../vendor/autoload.php';

define('ROOT_PATH', dirname(__DIR__));
\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

use App\Core\Mail\Mailer;
use App\Config\DatabaseManager;
use App\Core\System\Logger;

if ($argc < 2) {
    echo "Usage: php dispatch_email.php '<json_payload>'\n";
    exit(1);
}

$payloadJson = $argv[1];
$payload = json_decode($payloadJson, true);

if (!$payload || !isset($payload['type']) || !isset($payload['user_id'])) {
    echo "Invalid payload\n";
    exit(1);
}

try {
    $db = new DatabaseManager();
    $pdo = $db->getConnection('identity');
    $stmt = $pdo->prepare("SELECT email, username FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$payload['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo "User not found\n";
        exit(1);
    }

    $mailer = new Mailer();

    switch ($payload['type']) {
        case 'subscription_confirmation':
            $tierName = $payload['tierName'] ?? 'Premium';
            $billingPeriod = $payload['billingPeriod'] === 'yearly' ? 'Anual' : 'Mensual';
            $success = $mailer->sendSubscriptionConfirmation($user['email'], $user['username'], $tierName, $billingPeriod);
            if ($success) {
                echo "Email sent successfully\n";
                exit(0);
            } else {
                echo "Failed to send email\n";
                exit(1);
            }
        
        
        default:
            echo "Unknown email type: " . $payload['type'] . "\n";
            exit(1);
    }
} catch (\Exception $e) {
    Logger::error("Dispatch Email Error", ['exception' => $e->getMessage()]);
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
