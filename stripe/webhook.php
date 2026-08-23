<?php
// stripe/webhook.php

header('Content-Type: application/json');

require_once __DIR__ . '/../includes/core/bootstrap.php';

// --- Webhook IP Rate Limiting (60 requests per minute) ---
if (class_exists('\App\Core\Helpers\Utils')) {
    \App\Core\Helpers\Utils::enforceIpRateLimit('webhook:stripe', 60, 60, true);
}
// -----------------------------------------------------------

$payload = @file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
$webhookSecret = $_ENV['STRIPE_WEBHOOK_SECRET'] ?? '';

$controller = $container->get(\App\Api\Controllers\Stripe\StripeWebhookController::class);
$result = $controller->handleWebhook($payload, $sigHeader, $webhookSecret);

echo json_encode($result);
