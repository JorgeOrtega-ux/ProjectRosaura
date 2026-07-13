<?php
// stripe/webhook.php
// Endpoint standalone para recibir webhooks de Stripe.
// NO usa sesión, NO usa CSRF, NO usa el API router principal.
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

// 1. Leer el payload crudo y la firma
$payload = @file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
$webhookSecret = $_ENV['STRIPE_WEBHOOK_SECRET'] ?? '';

if (empty($payload) || empty($sigHeader) || empty($webhookSecret)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing payload, signature, or webhook secret']);
    exit;
}

// 2. Verificar la firma del webhook
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
        // CHECKOUT COMPLETADO: El usuario pagó exitosamente
        // ===================================================================
        case 'checkout.session.completed':
            $session = $event->data->object;
            $metadata = $session->metadata;

            // Revisar si es compra de tienda (monedas)
            if (isset($metadata->type) && $metadata->type === 'coins') {
                $userId = isset($metadata->user_id) ? (int) $metadata->user_id : 0;
                $amountCoins = isset($metadata->amount) ? (int) $metadata->amount : 0;

                if ($userId > 0 && $amountCoins > 0) {
                    $storeRepo->addCoins($userId, $amountCoins);
                    $storeRepo->createStorePurchaseRecord([
                        'user_id' => $userId,
                        'stripe_payment_intent_id' => $session->payment_intent ?? null,
                        'stripe_checkout_session_id' => $session->id,
                        'item_type' => 'coins',
                        'item_amount' => $amountCoins,
                        'amount_cents' => $session->amount_total ?? 0,
                        'currency' => strtolower($session->currency ?? 'usd'),
                        'status' => 'succeeded'
                    ]);

                    $subRepo->createPaymentRecord([
                        'user_id' => $userId,
                        'stripe_payment_intent_id' => $session->payment_intent ?? null,
                        'stripe_invoice_id' => null,
                        'amount_cents' => $session->amount_total ?? 0,
                        'currency' => strtolower($session->currency ?? 'usd'),
                        'description' => "Compra de {$amountCoins} monedas",
                        'status' => 'succeeded'
                    ]);

                    Logger::info("Stripe webhook: coins purchased", ['user_id' => $userId, 'coins' => $amountCoins]);
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

            // Actualizar la suscripción en BD
            $subRepo->updateByCheckoutSessionId($session->id, [
                'status' => 'active',
                'stripe_subscription_id' => $session->subscription ?? null,
                'stripe_customer_id' => $session->customer ?? null
            ]);

            // Actualizar el tier del usuario
            $subRepo->updateUserTier($userId, $tier);

            // Actualizar stripe_customer_id del usuario
            if (!empty($session->customer)) {
                $subRepo->updateUserStripeCustomerId($userId, $session->customer);
            }

            // Registrar pago en el historial
            $amountTotal = $session->amount_total ?? 0;
            $tierName = SubscriptionPlanConstants::getTierLimits($tier)['name'];
            $periodLabel = $billingPeriod === 'yearly' ? 'Anual' : 'Mensual';

            $subRepo->createPaymentRecord([
                'user_id' => $userId,
                'stripe_payment_intent_id' => $session->payment_intent ?? null,
                'stripe_invoice_id' => $session->invoice ?? null,
                'amount_cents' => $amountTotal,
                'currency' => strtolower($session->currency ?? 'usd'),
                'description' => "Suscripción {$tierName} ({$periodLabel})",
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
        // SUSCRIPCIÓN CANCELADA / EXPIRADA
        // ===================================================================
        case 'customer.subscription.deleted':
            $subscription = $event->data->object;
            $stripeSubId = $subscription->id;

            $localSub = $subRepo->findByStripeSubscriptionId($stripeSubId);
            if ($localSub) {
                // Marcar como cancelada
                $subRepo->updateByStripeSubscriptionId($stripeSubId, [
                    'status' => 'canceled',
                    'canceled_at' => date('Y-m-d H:i:s')
                ]);

                // Regresar al usuario al tier básico (0)
                $subRepo->updateUserTier((int) $localSub['user_id'], SubscriptionPlanConstants::TIER_BASIC);

                // Disparador instantáneo para re-evaluar bloqueos de lienzos
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
        // SUSCRIPCIÓN ACTUALIZADA (cambio de plan, periodo, etc.)
        // ===================================================================
        case 'customer.subscription.updated':
            $subscription = $event->data->object;
            $stripeSubId = $subscription->id;

            $updateData = [
                'status' => $subscription->status === 'active' ? 'active' : ($subscription->status === 'past_due' ? 'past_due' : $subscription->status)
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

            Logger::info("Stripe webhook: subscription updated", [
                'stripe_subscription_id' => $stripeSubId,
                'status' => $subscription->status
            ]);
            break;

        // ===================================================================
        // PAGO DE FACTURA EXITOSO (renovación recurrente)
        // ===================================================================
        case 'invoice.payment_succeeded':
            $invoice = $event->data->object;
            
            // Solo procesar facturas de suscripciones (no el pago inicial que ya fue registrado)
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
                    'description' => 'Renovación de suscripción',
                    'status' => 'succeeded'
                ]);

                Logger::info("Stripe webhook: recurring payment recorded", [
                    'user_id' => $localSub['user_id'],
                    'invoice_id' => $invoice->id
                ]);
            }
            break;

        // ===================================================================
        // PAGO DE FACTURA FALLIDO
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
            // Evento no manejado - ignorar silenciosamente
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
