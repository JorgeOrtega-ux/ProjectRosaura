<?php

namespace App\Api\Services\Stripe;

use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\SubscriptionRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\System\Logger;
use App\Core\System\SubscriptionPlanConstants;

class StripeServices {

    private $sessionManager;
    private $subscriptionRepo;
    private $userRepo;

    private const PRICE_MAP = [
        1 => [ 
            'monthly' => 'STRIPE_PRICE_PRO_MONTHLY',
            'yearly'  => 'STRIPE_PRICE_PRO_YEARLY'
        ],
        2 => [ 
            'monthly' => 'STRIPE_PRICE_ADVANCED_MONTHLY',
            'yearly'  => 'STRIPE_PRICE_ADVANCED_YEARLY'
        ]
    ];

    private function getCoinPrices(): array {
        $packages = [];
        if (class_exists(\App\Core\System\StorePackagesConfig::class) && method_exists(\App\Core\System\StorePackagesConfig::class, 'getCoinPackages')) {
            try {
                $packages = \App\Core\System\StorePackagesConfig::getCoinPackages();
                if (!is_array($packages)) $packages = [];
            } catch (\Throwable $e) {
                $packages = [];
            }
        }

        $prices = [];
        foreach ($packages as $amount => $pkg) {
            $prices[$amount] = $_ENV[$pkg['stripe_env_key']] ?? $pkg['default_price_id'];
        }
        return $prices;
    }

    private function getPriceToTierMap(): array {
        $map = [];
        foreach (self::PRICE_MAP as $tier => $periods) {
            foreach ($periods as $period => $envKey) {
                $priceId = $_ENV[$envKey] ?? null;
                if ($priceId) {
                    $map[$priceId] = ['tier' => $tier, 'period' => $period];
                }
            }
        }
        return $map;
    }

    public function __construct(
        SessionManagerInterface $sessionManager,
        SubscriptionRepositoryInterface $subscriptionRepo,
        UserRepositoryInterface $userRepo
    ) {
        $this->sessionManager = $sessionManager;
        $this->subscriptionRepo = $subscriptionRepo;
        $this->userRepo = $userRepo;
    }

    public function createCheckoutSession(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $tier = isset($input['tier']) ? (int) $input['tier'] : 0;
        $billingPeriod = $input['billing_period'] ?? 'monthly';

        if (!in_array($tier, [SubscriptionPlanConstants::TIER_PRO, SubscriptionPlanConstants::TIER_ADVANCED])) {
            return ['success' => false, 'message_key' => 'stripe.invalid_tier'];
        }

        if (!in_array($billingPeriod, ['monthly', 'yearly'])) {
            return ['success' => false, 'message_key' => 'stripe.invalid_billing_period'];
        }

        $currentTier = $this->sessionManager->getSubscriptionTier();
        if ($currentTier === $tier) {
            return ['success' => false, 'message_key' => 'stripe.already_on_plan'];
        }

        $envKey = self::PRICE_MAP[$tier][$billingPeriod] ?? null;
        if (!$envKey || empty($_ENV[$envKey])) {
            Logger::error("Stripe Price ID not configured", ['env_key' => $envKey]);
            return ['success' => false, 'message_key' => 'stripe.price_not_configured'];
        }
        $priceId = $_ENV[$envKey];

        \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

        $user = $this->userRepo->findById($userId);
        if (!$user) {
            return ['success' => false, 'message_key' => 'error.user_not_found'];
        }

        $stripeCustomerId = $this->subscriptionRepo->getStripeCustomerIdByUserId($userId);

        try {
            if ($stripeCustomerId) {
                
                try {
                    $stripeCustomer = \Stripe\Customer::retrieve($stripeCustomerId);
                    if (!empty($stripeCustomer->deleted)) {
                        $stripeCustomerId = null;
                    }
                } catch (\Exception $e) {
                    $stripeCustomerId = null;
                }
            }

            if (!$stripeCustomerId) {
                $stripeCustomer = \Stripe\Customer::create([
                    'email' => $user['email'],
                    'name' => $user['username'],
                    'metadata' => ['user_id' => $userId]
                ]);
                $stripeCustomerId = $stripeCustomer->id;
                $this->subscriptionRepo->updateUserStripeCustomerId($userId, $stripeCustomerId);
            }

            $tierName = SubscriptionPlanConstants::getTierLimits($tier)['name'];
            $periodLabel = $billingPeriod === 'yearly' ? 'Anual' : 'Mensual';

            $session = \Stripe\Checkout\Session::create([
                'customer' => $stripeCustomerId,
                'mode' => 'subscription',
                'line_items' => [[
                    'price' => $priceId,
                    'quantity' => 1
                ]],
                'success_url' => APP_URL . '/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => APP_URL . '/premium?status=cancel',
                'metadata' => [
                    'user_id' => (string) $userId,
                    'tier' => (string) $tier,
                    'billing_period' => $billingPeriod
                ],
                'subscription_data' => [
                    'metadata' => [
                        'user_id' => (string) $userId,
                        'tier' => (string) $tier,
                        'billing_period' => $billingPeriod
                    ]
                ]
            ]);

            $this->subscriptionRepo->createSubscription([
                'user_id' => $userId,
                'stripe_customer_id' => $stripeCustomerId,
                'stripe_checkout_session_id' => $session->id,
                'tier' => $tier,
                'billing_period' => $billingPeriod,
                'status' => 'incomplete'
            ]);

            Logger::info("Stripe Checkout Session created", [
                'user_id' => $userId,
                'session_id' => $session->id,
                'tier' => $tier,
                'period' => $billingPeriod
            ]);

            return [
                'success' => true,
                'checkout_url' => $session->url
            ];

        } catch (\Stripe\Exception\ApiErrorException $e) {
            Logger::error("Stripe API Error creating checkout session", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message_key' => 'stripe.api_error', 'message' => __('err_stripe_api')];
        }
    }

    public function createCoinCheckoutSession(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $coinsAmount = isset($input['amount']) ? (int) $input['amount'] : 0;

        $coinPrices = $this->getCoinPrices();
        if (!isset($coinPrices[$coinsAmount])) {
            return ['success' => false, 'message_key' => 'stripe.invalid_coin_amount'];
        }

        $priceId = $coinPrices[$coinsAmount];
        \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

        $user = $this->userRepo->findById($userId);
        if (!$user) {
            return ['success' => false, 'message_key' => 'error.user_not_found'];
        }

        $stripeCustomerId = $this->subscriptionRepo->getStripeCustomerIdByUserId($userId);

        try {
            if ($stripeCustomerId) {
                try {
                    $stripeCustomer = \Stripe\Customer::retrieve($stripeCustomerId);
                    if (!empty($stripeCustomer->deleted)) {
                        $stripeCustomerId = null;
                    }
                } catch (\Exception $e) {
                    $stripeCustomerId = null;
                }
            }

            if (!$stripeCustomerId) {
                $stripeCustomer = \Stripe\Customer::create([
                    'email' => $user['email'],
                    'name' => $user['username'],
                    'metadata' => ['user_id' => $userId]
                ]);
                $stripeCustomerId = $stripeCustomer->id;
                $this->subscriptionRepo->updateUserStripeCustomerId($userId, $stripeCustomerId);
            }

            $returnUrl = isset($input['return_url']) ? rtrim($input['return_url'], '/') : APP_URL . '/store';

            $session = \Stripe\Checkout\Session::create([
                'customer' => $stripeCustomerId,
                'mode' => 'payment',
                'line_items' => [[
                    'price' => $priceId,
                    'quantity' => 1
                ]],
                'success_url' => $returnUrl . '?checkout=success&session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $returnUrl . '?status=cancel',
                'metadata' => [
                    'type' => 'coins',
                    'user_id' => (string) $userId,
                    'amount' => (string) $coinsAmount
                ],
                'payment_intent_data' => [
                    'description' => "Compra de {$coinsAmount} monedas",
                    'metadata' => [
                        'type' => 'coins',
                        'user_id' => (string) $userId,
                        'amount' => (string) $coinsAmount
                    ]
                ]
            ]);

            Logger::info("Stripe Coin Checkout Session created", [
                'user_id' => $userId,
                'session_id' => $session->id,
                'amount' => $coinsAmount
            ]);

            return [
                'success' => true,
                'checkout_url' => $session->url
            ];

        } catch (\Stripe\Exception\ApiErrorException $e) {
            Logger::error("Stripe API Error creating coin checkout session", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message_key' => 'stripe.api_error', 'message' => __('err_stripe_api')];
        }
    }

    public function updateSubscription(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $tier = isset($input['tier']) ? (int) $input['tier'] : 0;
        $billingPeriod = $input['billing_period'] ?? 'monthly';

        if (!in_array($tier, [SubscriptionPlanConstants::TIER_BASIC, SubscriptionPlanConstants::TIER_PRO, SubscriptionPlanConstants::TIER_ADVANCED])) {
            return ['success' => false, 'message_key' => 'stripe.invalid_tier'];
        }

        if (!in_array($billingPeriod, ['monthly', 'yearly'])) {
            return ['success' => false, 'message_key' => 'stripe.invalid_billing_period'];
        }

        $currentTier = $this->sessionManager->getSubscriptionTier();
        if ($currentTier === $tier) {
            return ['success' => false, 'message_key' => 'stripe.already_on_plan'];
        }

        $activeLocalSub = $this->subscriptionRepo->findActiveByUserId($userId);
        if (!$activeLocalSub || empty($activeLocalSub['stripe_subscription_id'])) {
            return ['success' => false, 'message_key' => 'stripe.no_active_subscription'];
        }

        if ($tier === SubscriptionPlanConstants::TIER_BASIC) {
            \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
            try {
                $subscription = \Stripe\Subscription::retrieve($activeLocalSub['stripe_subscription_id']);
                $subscription->cancel();
                
                $this->subscriptionRepo->updateUserTier($userId, SubscriptionPlanConstants::TIER_BASIC);
                $this->subscriptionRepo->updateByStripeSubscriptionId($subscription->id, [
                    'status' => 'canceled',
                    'canceled_at' => date('Y-m-d H:i:s')
                ]);
                
                try {
                    $container = new \App\Core\Container();
                    $lockManager = $container->get(\App\Api\Services\Canvas\CanvasLockManager::class);
                    $lockManager->evaluateUserCanvases((int) $userId);
                } catch (\Exception $e) {
                    Logger::error("Failed to evaluate canvases on downgrade", ['user_id' => $userId, 'error' => $e->getMessage()]);
                }
                Logger::info("Stripe Subscription canceled (downgraded to basic)", [
                    'user_id' => $userId,
                    'subscription_id' => $subscription->id
                ]);
                return ['success' => true, 'updated' => true];
            } catch (\Exception $e) {
                Logger::error("Stripe API Error canceling subscription", ['error' => $e->getMessage()]);
                return ['success' => false, 'message' => __('err_stripe_api')];
            }
        }

        $envKey = self::PRICE_MAP[$tier][$billingPeriod] ?? null;
        if (!$envKey || empty($_ENV[$envKey])) {
            Logger::error("Stripe Price ID not configured", ['env_key' => $envKey]);
            return ['success' => false, 'message_key' => 'stripe.price_not_configured'];
        }
        $newPriceId = $_ENV[$envKey];

        \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

        try {
            $subscription = \Stripe\Subscription::retrieve($activeLocalSub['stripe_subscription_id']);

            \Stripe\Subscription::update($subscription->id, [
                'items' => [
                    [
                        'id' => $subscription->items->data[0]->id,
                        'price' => $newPriceId,
                    ],
                ],
                'proration_behavior' => 'always_invoice',
                'metadata' => [
                    'user_id' => (string) $userId,
                    'tier' => (string) $tier,
                    'billing_period' => $billingPeriod
                ]
            ]);

            $this->subscriptionRepo->updateUserTier($userId, $tier);
            $this->subscriptionRepo->updateByStripeSubscriptionId($subscription->id, [
                'tier' => $tier,
                'billing_period' => $billingPeriod
            ]);
            
            try {
                $container = new \App\Core\Container();
                $lockManager = $container->get(\App\Api\Services\Canvas\CanvasLockManager::class);
                $lockManager->evaluateUserCanvases((int) $userId);
            } catch (\Exception $e) {
                Logger::error("Failed to evaluate canvases on upgrade", ['user_id' => $userId, 'error' => $e->getMessage()]);
            }

            Logger::info("Stripe Subscription updated", [
                'user_id' => $userId,
                'subscription_id' => $subscription->id,
                'tier' => $tier,
                'period' => $billingPeriod
            ]);

            try {
                $redisCache = new \App\Config\Database\RedisCache();
                $redisClient = $redisCache->getClient();
                if ($redisClient) {
                    $tierName = SubscriptionPlanConstants::getTierLimits($tier)['name'];
                    $redisClient->rpush('queue:emails', json_encode([
                        'type' => 'subscription_confirmation',
                        'user_id' => $userId,
                        'tierName' => $tierName,
                        'billingPeriod' => $billingPeriod
                    ]));
                    Logger::info("Enqueued subscription_confirmation email for user after upgrade", ['user_id' => $userId]);
                }
            } catch (\Exception $e) {
                Logger::error("Failed to enqueue email for user after upgrade", ['user_id' => $userId, 'error' => $e->getMessage()]);
            }

            return [
                'success' => true,
                'updated' => true
            ];

        } catch (\Stripe\Exception\ApiErrorException $e) {
            $msg = $e->getMessage();
            Logger::error("Stripe API Error updating subscription", [
                'user_id' => $userId,
                'error' => $msg
            ]);
            
            if (strpos(strtolower($msg), 'no attached payment source') !== false || strpos(strtolower($msg), 'default payment method') !== false) {
                return [
                    'success' => false, 
                    'message_key' => 'stripe.no_payment_method', 
                    'message' => __('err_stripe_no_payment_method')
                ];
            }
            
            return ['success' => false, 'message_key' => 'stripe.api_error', 'message' => __('err_stripe_api')];
        }
    }

    public function getPaymentHistory(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();

        $stripeCustomerId = $this->subscriptionRepo->getStripeCustomerIdByUserId($userId);
        $history = [];
        
        if ($stripeCustomerId) {
            try {
                \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
                $charges = \Stripe\Charge::all([
                    'customer' => $stripeCustomerId,
                    'limit' => 20
                ]);
                
                foreach ($charges->data as $charge) {
                    $desc = $charge->description;
                    if (empty($desc) && isset($charge->metadata->type) && $charge->metadata->type === 'coins') {
                        $desc = "Compra de " . ($charge->metadata->amount ?? '') . " monedas";
                    }
                    $history[] = [
                        'id' => $charge->id,
                        'created_at' => date('Y-m-d H:i:s', $charge->created),
                        'description' => $desc ?: 'Suscripción',
                        'amount_cents' => $charge->amount,
                        'currency' => $charge->currency,
                        'status' => $charge->status 
                    ];
                }
            } catch (\Exception $e) {
                
                $limit = isset($input['limit']) ? min((int) $input['limit'], 50) : 20;
                $offset = isset($input['offset']) ? (int) $input['offset'] : 0;
                $history = $this->subscriptionRepo->getPaymentHistory($userId, $limit, $offset);
            }
        } else {
            $limit = isset($input['limit']) ? min((int) $input['limit'], 50) : 20;
            $offset = isset($input['offset']) ? (int) $input['offset'] : 0;
            $history = $this->subscriptionRepo->getPaymentHistory($userId, $limit, $offset);
        }

        return [
            'success' => true,
            'data' => $history
        ];
    }

    public function getSubscriptionStatus(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $subscription = $this->subscriptionRepo->findActiveByUserId($userId);

        if ($subscription && !empty($subscription['stripe_subscription_id'])) {
            try {
                \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
                $stripeSub = \Stripe\Subscription::retrieve($subscription['stripe_subscription_id']);

                $subscription['cancel_at_period_end'] = $stripeSub->cancel_at_period_end;
                $subscription['current_period_end'] = $stripeSub->current_period_end;
                $subscription['status'] = $stripeSub->status;
            } catch (\Exception $e) {
                Logger::error("Stripe API Error fetching subscription status", [
                    'user_id' => $userId,
                    'error' => $e->getMessage()
                ]);
            }
        }

        if ($subscription && empty($subscription['current_period_end'])) {
            $createdAt = strtotime($subscription['created_at'] ?? 'now');
            $period = (isset($subscription['billing_period']) && $subscription['billing_period'] === 'yearly') ? '+1 year' : '+1 month';
            $subscription['current_period_end'] = date('Y-m-d H:i:s', strtotime($period, $createdAt));
        }

        return [
            'success' => true,
            'data' => $subscription
        ];
    }

    public function toggleAutoRenewal(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $cancelAtPeriodEnd = isset($input['cancel_at_period_end']) ? filter_var($input['cancel_at_period_end'], FILTER_VALIDATE_BOOLEAN) : false;

        $activeLocalSub = $this->subscriptionRepo->findActiveByUserId($userId);
        if (!$activeLocalSub || empty($activeLocalSub['stripe_subscription_id'])) {
            return ['success' => false, 'message_key' => 'stripe.no_active_subscription'];
        }

        \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

        try {
            $updatedSub = \Stripe\Subscription::update($activeLocalSub['stripe_subscription_id'], [
                'cancel_at_period_end' => $cancelAtPeriodEnd
            ]);

            Logger::info("Stripe Subscription auto-renewal toggled", [
                'user_id' => $userId,
                'subscription_id' => $updatedSub->id,
                'cancel_at_period_end' => $cancelAtPeriodEnd
            ]);

            return [
                'success' => true,
                'cancel_at_period_end' => $updatedSub->cancel_at_period_end
            ];
        } catch (\Exception $e) {
            Logger::error("Stripe API Error toggling auto-renewal", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message_key' => 'stripe.api_error', 'message' => __('err_stripe_api')];
        }
    }

    public function createSetupSession(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $user = $this->userRepo->findById($userId);
        if (!$user) {
            return ['success' => false, 'message_key' => 'error.user_not_found'];
        }

        \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

        $stripeCustomerId = $this->subscriptionRepo->getStripeCustomerIdByUserId($userId);

        try {
            if ($stripeCustomerId) {
                
                try {
                    $stripeCustomer = \Stripe\Customer::retrieve($stripeCustomerId);
                    if (!empty($stripeCustomer->deleted)) {
                        $stripeCustomerId = null;
                    }
                } catch (\Exception $e) {
                    $stripeCustomerId = null;
                }
            }

            if (!$stripeCustomerId) {
                $stripeCustomer = \Stripe\Customer::create([
                    'email' => $user['email'],
                    'name' => $user['username'],
                    'metadata' => ['user_id' => $userId]
                ]);
                $stripeCustomerId = $stripeCustomer->id;
                $this->subscriptionRepo->updateUserStripeCustomerId($userId, $stripeCustomerId);
            }

            $session = \Stripe\Checkout\Session::create([
                'payment_method_types' => ['card'],
                'mode' => 'setup',
                'customer' => $stripeCustomerId,
                'success_url' => APP_URL . '/settings/billing?status=success',
                'cancel_url' => APP_URL . '/settings/billing?status=cancel',
                'metadata' => [
                    'user_id' => (string) $userId
                ]
            ]);

            Logger::info("Stripe Setup Session created", [
                'user_id' => $userId,
                'session_id' => $session->id
            ]);

            return [
                'success' => true,
                'checkout_url' => $session->url
            ];

        } catch (\Stripe\Exception\ApiErrorException $e) {
            Logger::error("Stripe API Error creating setup session", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message_key' => 'stripe.api_error'];
        }
    }

    public function getPaymentMethods(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $stripeCustomerId = $this->subscriptionRepo->getStripeCustomerIdByUserId($userId);

        if (!$stripeCustomerId) {
            return [
                'success' => true,
                'data' => []
            ];
        }

        try {
            \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
            
            $paymentMethods = \Stripe\PaymentMethod::all([
                'customer' => $stripeCustomerId,
                'type' => 'card',
            ]);

            $cards = [];
            $seenFingerprints = [];
            foreach ($paymentMethods->data as $pm) {
                
                $fingerprint = $pm->card->fingerprint;
                if (in_array($fingerprint, $seenFingerprints)) {
                    
                    try {
                        $pm->detach();
                    } catch (\Exception $e) {}
                    continue;
                }
                $seenFingerprints[] = $fingerprint;

                $cards[] = [
                    'id' => $pm->id,
                    'brand' => $pm->card->brand,
                    'last4' => $pm->card->last4,
                    'exp_month' => $pm->card->exp_month,
                    'exp_year' => $pm->card->exp_year,
                    'is_default' => false 
                ];
            }

            try {
                $customer = \Stripe\Customer::retrieve($stripeCustomerId);
                if (isset($customer->invoice_settings->default_payment_method)) {
                    $defaultPmId = $customer->invoice_settings->default_payment_method;
                    foreach ($cards as &$c) {
                        if ($c['id'] === $defaultPmId) {
                            $c['is_default'] = true;
                        }
                    }
                }
            } catch (\Exception $e) {}

            return [
                'success' => true,
                'data' => $cards
            ];
            
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Logger::error("Stripe API Error getting payment methods", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message_key' => 'stripe.api_error'];
        }
    }
}
?>
