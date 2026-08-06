<?php

namespace App\Api\Controllers\Stripe;

use App\Config\Database\RedisCache;
use App\Core\Interfaces\SubscriptionRepositoryInterface;
use App\Core\Interfaces\StoreRepositoryInterface;
use App\Core\System\Logger;
use App\Core\System\SubscriptionPlanConstants;
use App\Api\Services\Canvas\CanvasLockManager;

class StripeWebhookController {
    private SubscriptionRepositoryInterface $subRepo;
    private StoreRepositoryInterface $storeRepo;
    private RedisCache $redisCache;
    private CanvasLockManager $lockManager;

    public function __construct(
        SubscriptionRepositoryInterface $subRepo,
        StoreRepositoryInterface $storeRepo,
        RedisCache $redisCache,
        CanvasLockManager $lockManager
    ) {
        $this->subRepo = $subRepo;
        $this->storeRepo = $storeRepo;
        $this->redisCache = $redisCache;
        $this->lockManager = $lockManager;
    }

    public function handleWebhook(string $payload, string $sigHeader, string $webhookSecret): array {
        if (empty($payload) || empty($sigHeader) || empty($webhookSecret)) {
            http_response_code(400);
            return ['error' => 'Missing payload, signature, or webhook secret'];
        }

        try {
            \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY'] ?? '');
            $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, $webhookSecret);
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            Logger::security("Stripe webhook signature verification failed", 'warning', [
                'error' => $e->getMessage()
            ]);
            http_response_code(400);
            return ['error' => 'Invalid signature'];
        } catch (\Throwable $e) {
            Logger::error("Stripe webhook event construction failed", ['error' => $e->getMessage()]);
            http_response_code(400);
            return ['error' => 'Invalid payload'];
        }

        try {
            switch ($event->type) {
                case 'checkout.session.completed':
                    $this->handleCheckoutSessionCompleted($event->data->object);
                    break;
                case 'customer.subscription.deleted':
                    $this->handleSubscriptionDeleted($event->data->object);
                    break;
                case 'customer.subscription.updated':
                    $this->handleSubscriptionUpdated($event->data->object);
                    break;
                case 'invoice.payment_succeeded':
                    $this->handleInvoicePaymentSucceeded($event->data->object);
                    break;
                case 'invoice.payment_failed':
                    $this->handleInvoicePaymentFailed($event->data->object);
                    break;
                default:
                    break;
            }

            http_response_code(200);
            return ['received' => true];
        } catch (\Throwable $e) {
            Logger::error("Stripe webhook processing failed", [
                'event_type' => $event->type ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            http_response_code(500);
            return ['error' => 'Webhook processing failed'];
        }
    }

    private function setUserTierAndEvaluateCanvases(int $userId, int $tier): void {
        $this->subRepo->updateUserTier($userId, $tier);

        try {
            $redisClient = $this->redisCache->getClient();
            if ($redisClient) {
                $redisClient->del(\App\Core\System\CacheConstants::PREFIX_USER_PROFILE . $userId);
            }
        } catch (\Throwable $e) {}

        try {
            $this->lockManager->evaluateUserCanvases($userId);
        } catch (\Throwable $e) {
            Logger::error("Failed to evaluate canvases on webhook tier change", ['user_id' => $userId, 'error' => $e->getMessage()]);
        }
    }

    private function handleCheckoutSessionCompleted($session): void {
        $metadata = $session->metadata;

        // Prevent duplicate processing of the same checkout session
        $localSub = $this->subRepo->findByCheckoutSessionId($session->id);
        if ($localSub && $localSub['status'] === 'active') {
            Logger::info("Stripe webhook: checkout.session.completed already processed for session", ['session_id' => $session->id]);
            return;
        }

        if (isset($metadata->type) && $metadata->type === 'coins') {
            $userId = isset($metadata->user_id) ? (int) $metadata->user_id : 0;
            $amountCoins = isset($metadata->amount) ? (int) $metadata->amount : 0;

            if ($userId > 0 && $amountCoins > 0) {
                $processed = $this->storeRepo->processCoinPurchaseSession([
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
                    $this->subRepo->createPaymentRecord([
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
            return;
        }

        $userId = isset($metadata->user_id) ? (int) $metadata->user_id : 0;
        $tier = isset($metadata->tier) ? (int) $metadata->tier : 0;
        $billingPeriod = $metadata->billing_period ?? 'monthly';

        if ($userId <= 0 || $tier <= 0) {
            Logger::error("Stripe webhook: checkout.session.completed with invalid metadata", [
                'session_id' => $session->id,
                'metadata' => (array) $metadata
            ]);
            return;
        }

        $this->subRepo->updateByCheckoutSessionId($session->id, [
            'status' => 'active',
            'stripe_subscription_id' => $session->subscription ?? null,
            'stripe_customer_id' => $session->customer ?? null
        ]);

        $this->setUserTierAndEvaluateCanvases($userId, $tier);

        if (!empty($session->customer)) {
            $this->subRepo->updateUserStripeCustomerId($userId, $session->customer);
        }

        $amountTotal = $session->amount_total ?? 0;
        $tierLimits = SubscriptionPlanConstants::getTierLimits($tier);
        $tierName = $tierLimits['name'] ?? 'Tier ' . $tier;
        $periodLabel = $billingPeriod === 'yearly' ? 'Anual' : 'Mensual';

        $this->subRepo->createPaymentRecord([
            'user_id' => $userId,
            'stripe_payment_intent_id' => $session->payment_intent ?? null,
            'stripe_invoice_id' => $session->invoice ?? null,
            'amount_cents' => $amountTotal,
            'currency' => strtolower($session->currency ?? 'usd'),
            'description' => "Subscription {$tierName} ({$periodLabel})",
            'status' => 'succeeded'
        ]);

        try {
            $redisClient = $this->redisCache->getClient();
            if ($redisClient) {
                $redisClient->rpush('queue:emails', json_encode([
                    'type' => 'subscription_confirmation',
                    'user_id' => $userId,
                    'tierName' => $tierName,
                    'billingPeriod' => $billingPeriod
                ]));
                Logger::info("Enqueued subscription_confirmation email for user", ['user_id' => $userId]);
            }
        } catch (\Throwable $e) {
            Logger::error("Failed to enqueue email for user", ['user_id' => $userId, 'error' => $e->getMessage()]);
        }

        Logger::info("Stripe webhook: checkout.session.completed processed", [
            'user_id' => $userId,
            'tier' => $tier,
            'session_id' => $session->id
        ]);
    }

    private function handleSubscriptionDeleted($subscription): void {
        $stripeSubId = $subscription->id;
        $localSub = $this->subRepo->findByStripeSubscriptionId($stripeSubId);
        if ($localSub) {
            $this->subRepo->updateByStripeSubscriptionId($stripeSubId, [
                'status' => 'canceled',
                'canceled_at' => date('Y-m-d H:i:s')
            ]);
            $this->setUserTierAndEvaluateCanvases((int) $localSub['user_id'], 0);
            Logger::info("Stripe webhook: subscription deleted, user reverted to Basic", [
                'user_id' => $localSub['user_id'],
                'stripe_subscription_id' => $stripeSubId
            ]);
        }
    }

    private function handleSubscriptionUpdated($subscription): void {
        $stripeSubId = $subscription->id;
        $newStatus = $subscription->status;

        $updateData = [
            'status' => $newStatus === 'active' ? 'active' : ($newStatus === 'past_due' ? 'past_due' : $newStatus)
        ];

        if (!empty($subscription->current_period_start)) {
            $updateData['current_period_start'] = date('Y-m-d H:i:s', $subscription->current_period_start);
        }
        if (!empty($subscription->current_period_end)) {
            $updateData['current_period_end'] = date('Y-m-d H:i:s', $subscription->current_period_end);
        }
        if (!empty($subscription->canceled_at)) {
            $updateData['canceled_at'] = date('Y-m-d H:i:s', $subscription->canceled_at);
        }

        $this->subRepo->updateByStripeSubscriptionId($stripeSubId, $updateData);

        if (in_array($newStatus, ['past_due', 'unpaid', 'canceled', 'incomplete_expired'])) {
            $localSub = $this->subRepo->findByStripeSubscriptionId($stripeSubId);
            if ($localSub) {
                $this->setUserTierAndEvaluateCanvases((int) $localSub['user_id'], 0);
            }
        }

        Logger::info("Stripe webhook: subscription updated", [
            'stripe_subscription_id' => $stripeSubId,
            'status' => $newStatus
        ]);
    }

    private function handleInvoicePaymentSucceeded($invoice): void {
        if (empty($invoice->subscription) || ($invoice->billing_reason === 'subscription_create')) {
            return;
        }

        $localSub = $this->subRepo->findByStripeSubscriptionId($invoice->subscription);
        if ($localSub) {
            $this->subRepo->createPaymentRecord([
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
    }

    private function handleInvoicePaymentFailed($invoice): void {
        if (!empty($invoice->subscription)) {
            $localSub = $this->subRepo->findByStripeSubscriptionId($invoice->subscription);
            if ($localSub) {
                $userId = (int) $localSub['user_id'];
                $this->subRepo->updateByStripeSubscriptionId($invoice->subscription, [
                    'status' => 'past_due'
                ]);

                Logger::warning("Stripe webhook: payment failed for subscription, marked status as past_due", [
                    'user_id' => $userId,
                    'invoice_id' => $invoice->id
                ]);
            }
        }
    }
}
