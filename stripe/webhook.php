<?php
// stripe/webhook.php
// Solo verifica la firma de Stripe y procesa los eventos.

header('Content-Type: application/json');

require_once __DIR__ . '/../vendor/autoload.php';

define('ROOT_PATH', dirname(__DIR__));
\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

use App\Config\Database\DatabaseManager;
use App\Core\Repositories\SubscriptionRepository;
use App\Core\Repositories\StoreRepository;
use App\Core\System\Logger;
use App\Core\System\SubscriptionPlanConstants;
use App\Config\Database\RedisCache;

// --- Webhook IP Rate Limiting (60 requests per minute) ---
if (class_exists('\App\Core\Helpers\Utils')) {
    \App\Core\Helpers\Utils::enforceIpRateLimit('webhook:stripe', 60, 60, true);
}
// -----------------------------------------------------------

$payload = @file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
$webhookSecret = $_ENV['STRIPE_WEBHOOK_SECRET'] ?? '';

if (empty($payload) || empty($sigHeader) || empty($webhookSecret)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing payload, signature, or webhook secret']);
    exit;
}

try {
    \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
    $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, $webhookSecret);
} catch (\Stripe\Exception\SignatureVerificationException $e) {
    Logger::security("Stripe webhook signature verification failed", 'warning', [
        'error' => $e->getMessage()
    ]);
    http_response_code(400);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
} catch (\Exception $e) {
    Logger::error("Stripe webhook event construction failed", ['error' => $e->getMessage()]);
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
}

// 3. Procesar el evento
$db = new DatabaseManager();
$subRepo = new SubscriptionRepository($db);
$storeRepo = new StoreRepository($db);

try {
    switch ($event->type) {

        // ===================================================================
        // ===================================================================
        case 'checkout.session.completed':
            $session = $event->data->object;
            $metadata = $session->metadata;

            if (isset($metadata->type) && $metadata->type === 'coins') {
                $userId = isset($metadata->user_id) ? (int) $metadata->user_id : 0;
                $amountCoins = isset($metadata->amount) ? (int) $metadata->amount : 0;

                if ($userId > 0 && $amountCoins > 0) {
                    $processed = $storeRepo->processCoinPurchaseSession([
                        'user_id' => $userId,
                        'stripe_payment_intent_id' => $session->payment_intent ?? null,
                        'stripe_checkout_session_id' => $session->id,
                        'item_type' => 'coins',
                        'item_amount' => $amountCoins,
                        'amount_cents' => $session->amount_total ?? 0,
                        'currency' => strtolower($session->currency ?? 'usd'),
                        'status' => 'succeeded'
                    ]);

                    if ($processed) {
                        $subRepo->createPaymentRecord([
                            'user_id' => $userId,
                            'stripe_payment_intent_id' => $session->payment_intent ?? null,
                            'stripe_invoice_id' => null,
                            'amount_cents' => $session->amount_total ?? 0,
                            'currency' => strtolower($session->currency ?? 'usd'),
                            'description' => "Purchase of {$amountCoins} coins",
                            'status' => 'succeeded'
                        ]);
                        Logger::info("Stripe webhook: coins purchased successfully", ['user_id' => $userId, 'coins' => $amountCoins, 'session_id' => $session->id]);
                    } else {
                        Logger::info("Stripe webhook: ignoring duplicate or failed coin session", ['session_id' => $session->id]);
                    }
                }
                break;
            }
            
            $userId = isset($metadata->user_id) ? (int) $metadata->user_id : 0;
            $tier = isset($metadata->tier) ? (int) $metadata->tier : 0;
            $billingPeriod = $metadata->billing_period ?? 'monthly';

            if ($userId <= 0 || $tier <= 0) {
                Logger::error("Stripe webhook: checkout.session.completed with invalid metadata", [
                    'session_id' => $session->id,
                    'metadata' => (array) $metadata
                ]);
                break;
            }

            $subRepo->updateByCheckoutSessionId($session->id, [
                'status' => 'active',
                'stripe_subscription_id' => $session->subscription ?? null,
                'stripe_customer_id' => $session->customer ?? null
            ]);

            $subRepo->updateUserTier($userId, $tier);

            try {
                $container = new \App\Core\Container();
                $lockManager = $container->get(\App\Api\Services\Canvas\CanvasLockManager::class);
                $lockManager->evaluateUserCanvases($userId);
            } catch (\Exception $e) {
                Logger::error("Failed to evaluate canvases on webhook upgrade", ['user_id' => $userId, 'error' => $e->getMessage()]);
            }

            if (!empty($session->customer)) {
                $subRepo->updateUserStripeCustomerId($userId, $session->customer);
            }

            $amountTotal = $session->amount_total ?? 0;
            $tierName = SubscriptionPlanConstants::getTierLimits($tier)['name'];
            $periodLabel = $billingPeriod === 'yearly' ? 'Anual' : 'Mensual';

            $subRepo->createPaymentRecord([
                'user_id' => $userId,
                'stripe_payment_intent_id' => $session->payment_intent ?? null,
                'stripe_invoice_id' => $session->invoice ?? null,
                'amount_cents' => $amountTotal,
                'currency' => strtolower($session->currency ?? 'usd'),
                'description' => "Subscription {$tierName} ({$periodLabel})",
                'status' => 'succeeded'
            ]);

            // Enqueue confirmation email
            try {
                $redisCache = new RedisCache();
                $redisClient = $redisCache->getClient();
                if ($redisClient) {
                    $redisClient->rpush('queue:emails', json_encode([
                        'type' => 'subscription_confirmation',
                        'user_id' => $userId,
                        'tierName' => $tierName,
                        'billingPeriod' => $billingPeriod
                    ]));
                    Logger::info("Enqueued subscription_confirmation email for user", ['user_id' => $userId]);
                }
            } catch (\Exception $e) {
                Logger::error("Failed to enqueue email for user", ['user_id' => $userId, 'error' => $e->getMessage()]);
            }

            Logger::info("Stripe webhook: checkout.session.completed processed", [
                'user_id' => $userId,
                'tier' => $tier,
                'session_id' => $session->id
            ]);
            break;

        // ===================================================================
        // ===================================================================
        case 'customer.subscription.deleted':
            $subscription = $event->data->object;
            $stripeSubId = $subscription->id;

            $localSub = $subRepo->findByStripeSubscriptionId($stripeSubId);
            if ($localSub) {
                $subRepo->updateByStripeSubscriptionId($stripeSubId, [
                    'status' => 'canceled',
                    'canceled_at' => date('Y-m-d H:i:s')
                ]);

                $subRepo->updateUserTier((int) $localSub['user_id'], 0);

                try {
                    $container = new \App\Core\Container();
                    $lockManager = $container->get(\App\Api\Services\Canvas\CanvasLockManager::class);
                    $lockManager->evaluateUserCanvases((int) $localSub['user_id']);
                } catch (\Exception $e) {
                    Logger::error("Failed to evaluate canvases on webhook", ['user_id' => $localSub['user_id'], 'error' => $e->getMessage()]);
                }

                Logger::info("Stripe webhook: subscription deleted, user reverted to Basic", [
                    'user_id' => $localSub['user_id'],
                    'stripe_subscription_id' => $stripeSubId
                ]);
            }
            break;

        // ===================================================================
        // ===================================================================
        case 'customer.subscription.updated':
            $subscription = $event->data->object;
            $stripeSubId = $subscription->id;
            $newStatus = $subscription->status;

            $updateData = [
                'status' => $newStatus === 'active' ? 'active' : ($newStatus === 'past_due' ? 'past_due' : $newStatus)
            ];

            if ($subscription->current_period_start) {
                $updateData['current_period_start'] = date('Y-m-d H:i:s', $subscription->current_period_start);
            }
            if ($subscription->current_period_end) {
                $updateData['current_period_end'] = date('Y-m-d H:i:s', $subscription->current_period_end);
            }
            if ($subscription->canceled_at) {
                $updateData['canceled_at'] = date('Y-m-d H:i:s', $subscription->canceled_at);
            }

            $subRepo->updateByStripeSubscriptionId($stripeSubId, $updateData);

            if (in_array($newStatus, ['unpaid', 'canceled'])) {
                $localSub = $subRepo->findByStripeSubscriptionId($stripeSubId);
                if ($localSub) {
                    $userId = (int) $localSub['user_id'];
                    $subRepo->updateUserTier($userId, 0);
                    try {
                        $container = new \App\Core\Container();
                        $lockManager = $container->get(\App\Api\Services\Canvas\CanvasLockManager::class);
                        $lockManager->evaluateUserCanvases($userId);
                    } catch (\Exception $e) {
                        Logger::error("Failed to evaluate canvases on webhook downgrade", ['user_id' => $userId, 'error' => $e->getMessage()]);
                    }
                }
            }

            Logger::info("Stripe webhook: subscription updated", [
                'stripe_subscription_id' => $stripeSubId,
                'status' => $newStatus
            ]);
            break;

        // ===================================================================
        // ===================================================================
        case 'invoice.payment_succeeded':
            $invoice = $event->data->object;
            
            if (empty($invoice->subscription) || ($invoice->billing_reason === 'subscription_create')) {
                break;
            }

            $localSub = $subRepo->findByStripeSubscriptionId($invoice->subscription);
            if ($localSub) {
                $subRepo->createPaymentRecord([
                    'user_id' => (int) $localSub['user_id'],
                    'stripe_payment_intent_id' => $invoice->payment_intent ?? null,
                    'stripe_invoice_id' => $invoice->id,
                    'amount_cents' => $invoice->amount_paid ?? 0,
                    'currency' => strtolower($invoice->currency ?? 'usd'),
                    'description' => 'Subscription Renewal',
                    'status' => 'succeeded'
                ]);

                Logger::info("Stripe webhook: recurring payment recorded", [
                    'user_id' => $localSub['user_id'],
                    'invoice_id' => $invoice->id
                ]);
            }
            break;

        // ===================================================================
        // ===================================================================
        case 'invoice.payment_failed':
            $invoice = $event->data->object;
            
            if (!empty($invoice->subscription)) {
                $localSub = $subRepo->findByStripeSubscriptionId($invoice->subscription);
                if ($localSub) {
                    $subRepo->updateByStripeSubscriptionId($invoice->subscription, [
                        'status' => 'past_due'
                    ]);

                    Logger::warning("Stripe webhook: payment failed for subscription", [
                        'user_id' => $localSub['user_id'],
                        'invoice_id' => $invoice->id
                    ]);
                }
            }
            break;

        default:
            break;
    }

    http_response_code(200);
    echo json_encode(['received' => true]);

} catch (\Exception $e) {
    Logger::error("Stripe webhook processing failed", [
        'event_type' => $event->type ?? 'unknown',
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    http_response_code(500);
    echo json_encode(['error' => 'Webhook processing failed']);
}
?>
