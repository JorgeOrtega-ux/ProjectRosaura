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
            'monthly' => 'STRIPE_PRICE_PLUS_MONTHLY',
            'yearly'  => 'STRIPE_PRICE_PLUS_YEARLY'
        ],
        2 => [ 
            'monthly' => 'STRIPE_PRICE_PRO_MONTHLY',
            'yearly'  => 'STRIPE_PRICE_PRO_YEARLY'
        ],
        3 => [ 
            'monthly' => 'STRIPE_PRICE_ULTRA_MONTHLY',
            'yearly'  => 'STRIPE_PRICE_ULTRA_YEARLY'
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
            $envKey = $pkg['stripe_env_key'] ?? '';
            $priceId = (!empty($envKey) && !empty($_ENV[$envKey])) ? $_ENV[$envKey] : ($pkg['default_price_id'] ?? null);
            if ($priceId) {
                $prices[$amount] = $priceId;
            }
        }
        return $prices;
    }

    private function resolvePriceId(int $tier, string $billingPeriod): ?string {
        // 1. Try environment variable mapping
        $envKey = self::PRICE_MAP[$tier][$billingPeriod] ?? null;
        if ($envKey && !empty($_ENV[$envKey])) {
            return $_ENV[$envKey];
        }

        // 2. Fallback: check subscription_tiers database table
        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $col = ($billingPeriod === 'yearly') ? 'stripe_price_id_yearly' : 'stripe_price_id_monthly';
            $stmt = $pdo->prepare("SELECT {$col} FROM subscription_tiers WHERE tier_level = ? AND is_active = 1 LIMIT 1");
            $stmt->execute([$tier]);
            $priceId = $stmt->fetchColumn();
            if (!empty($priceId)) {
                return $priceId;
            }
        } catch (\Throwable $e) {
            Logger::error("Error resolving Stripe price ID from DB", ['tier' => $tier, 'error' => $e->getMessage()]);
        }

        return null;
    }

    private function getPriceToTierMap(): array {
        $map = [];
        foreach (self::PRICE_MAP as $tier => $periods) {
            foreach ($periods as $period => $envKey) {
                $priceId = $_ENV[$envKey] ?? ($_ENV['STRIPE_PRICE_ADVANCED_' . strtoupper($period)] ?? null);
                if ($priceId) {
                    $map[$priceId] = ['tier' => $tier, 'period' => $period];
                }
            }
        }

        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->query("SELECT tier_level, stripe_price_id_monthly, stripe_price_id_yearly FROM subscription_tiers WHERE is_active = 1");
            while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $tLevel = (int)$row['tier_level'];
                if (!empty($row['stripe_price_id_monthly'])) {
                    $map[$row['stripe_price_id_monthly']] = ['tier' => $tLevel, 'period' => 'monthly'];
                }
                if (!empty($row['stripe_price_id_yearly'])) {
                    $map[$row['stripe_price_id_yearly']] = ['tier' => $tLevel, 'period' => 'yearly'];
                }
            }
        } catch (\Throwable $e) {
            // Silently continue if database is unreachable
        }

        return $map;
    }

    private function getBaseUrl(array $input): string {
        if (!empty($input['return_url'])) {
            $parsed = parse_url($input['return_url']);
            if (isset($parsed['scheme']) && isset($parsed['host'])) {
                $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';
                return rtrim($parsed['scheme'] . '://' . $parsed['host'] . $port, '/');
            }
        }
        if (!empty($_SERVER['HTTP_ORIGIN'])) {
            return rtrim($_SERVER['HTTP_ORIGIN'], '/');
        }
        if (!empty($_SERVER['HTTP_REFERER'])) {
            $parsed = parse_url($_SERVER['HTTP_REFERER']);
            if (isset($parsed['scheme']) && isset($parsed['host'])) {
                $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';
                return rtrim($parsed['scheme'] . '://' . $parsed['host'] . $port, '/');
            }
        }
        return APP_URL;
    }

    public function __construct(
        SessionManagerInterface $sessionManager,
        SubscriptionRepositoryInterface $subscriptionRepo,
        UserRepositoryInterface $userRepo
    ) {
        $this->sessionManager = $sessionManager;
        $this->subscriptionRepo = $subscriptionRepo;
        $this->userRepo = $userRepo;
        \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
    }

    public function getUpcomingInvoicePreview(int $tier, string $billingPeriod): array {
        if (!$this->sessionManager->isLoggedIn()) {
            return ['success' => false, 'message' => 'Unauthorized'];
        }
        $userId = $this->sessionManager->getActiveAccountId();

        \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

        $newPriceId = $this->resolvePriceId($tier, $billingPeriod);
        if (!$newPriceId) {
            return ['success' => false, 'message' => 'Price not configured.'];
        }

        $stripeCustomerId = $this->subscriptionRepo->getStripeCustomerIdByUserId($userId);
        if (!$stripeCustomerId) {
            try {
                $price = \Stripe\Price::retrieve($newPriceId);
                return [
                    'success' => true,
                    'amount_due' => $price->unit_amount,
                    'currency' => $price->currency,
                    'is_upgrade' => false
                ];
            } catch (\Exception $e) {
                return ['success' => false, 'message' => $e->getMessage()];
            }
        }

        $activeLocalSub = $this->subscriptionRepo->findActiveByUserId($userId);
        if ($activeLocalSub && !empty($activeLocalSub['stripe_subscription_id'])) {
            try {
                $stripe = new \Stripe\StripeClient($_ENV['STRIPE_SECRET_KEY']);
                $subscription = $stripe->subscriptions->retrieve($activeLocalSub['stripe_subscription_id']);
                
                $invoice = $stripe->invoices->createPreview([
                    'customer' => $stripeCustomerId,
                    'subscription' => $subscription->id,
                    'subscription_details' => [
                        'items' => [
                            [
                                'id' => $subscription->items->data[0]->id,
                                'price' => $newPriceId,
                            ],
                        ],
                        'proration_behavior' => 'create_prorations'
                    ]
                ]);

                return [
                    'success' => true,
                    'amount_due' => $invoice->amount_due,
                    'currency' => $invoice->currency,
                    'is_upgrade' => true
                ];
            } catch (\Exception $e) {
                Logger::error("Stripe API Error fetching upcoming invoice", ['error' => $e->getMessage()]);
                return ['success' => false, 'message' => $e->getMessage()];
            }
        } else {
            try {
                $price = \Stripe\Price::retrieve($newPriceId);
                return [
                    'success' => true,
                    'amount_due' => $price->unit_amount,
                    'currency' => $price->currency,
                    'is_upgrade' => false
                ];
            } catch (\Exception $e) {
                return ['success' => false, 'message' => $e->getMessage()];
            }
        }
    }

    public function createCheckoutSession(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $tier = isset($input['tier']) ? (int) $input['tier'] : 0;
        $billingPeriod = $input['billing_period'] ?? 'monthly';

        // Verify if the tier level is a paid tier (greater than 0)
        if ($tier <= 0) {
            return ['success' => false, 'message_key' => 'stripe.invalid_tier'];
        }

        if (!in_array($billingPeriod, ['monthly', 'yearly'])) {
            return ['success' => false, 'message_key' => 'stripe.invalid_billing_period'];
        }

        $currentTier = $this->sessionManager->getSubscriptionTier();
        if ($currentTier === $tier) {
            return ['success' => false, 'message_key' => 'stripe.already_on_plan'];
        }

        $priceId = $this->resolvePriceId($tier, $billingPeriod);
        if (!$priceId) {
            Logger::error("Stripe Price ID not configured", ['tier' => $tier, 'billing_period' => $billingPeriod]);
            return ['success' => false, 'message_key' => 'stripe.price_not_configured'];
        }

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

            $forceCheckout = (bool)($input['force_checkout'] ?? false);
            $purchasePreference = $forceCheckout ? 'verify' : ($user['purchase_preference'] ?? $this->sessionManager->get('purchase_preference', 'verify'));
            
            if ($purchasePreference === 'fast') {
                try {
                    $customer = \Stripe\Customer::retrieve($stripeCustomerId);
                    $defaultPmId = $customer->invoice_settings->default_payment_method;
                    
                    if (!$defaultPmId) {
                        $paymentMethods = \Stripe\PaymentMethod::all([
                            'customer' => $stripeCustomerId,
                            'type' => 'card',
                            'limit' => 1
                        ]);
                        if (!empty($paymentMethods->data)) {
                            $defaultPmId = $paymentMethods->data[0]->id;
                            \Stripe\Customer::update($stripeCustomerId, [
                                'invoice_settings' => [
                                    'default_payment_method' => $defaultPmId
                                ]
                            ]);
                        }
                    }

                    if ($defaultPmId) {
                        $subscription = \Stripe\Subscription::create([
                            'customer' => $stripeCustomerId,
                            'items' => [['price' => $priceId]],
                            'default_payment_method' => $defaultPmId,
                            'payment_behavior' => 'error_if_incomplete',
                            'metadata' => [
                                'user_id' => (string) $userId,
                                'tier' => (string) $tier,
                                'billing_period' => $billingPeriod
                            ]
                        ]);

                        if ($subscription->status === 'active') {
                            $this->subscriptionRepo->createSubscription([
                                'user_id' => $userId,
                                'stripe_customer_id' => $stripeCustomerId,
                                'stripe_checkout_session_id' => 'sub_fast_' . $subscription->id,
                                'tier' => $tier,
                                'billing_period' => $billingPeriod,
                                'status' => 'active'
                            ]);
                            $this->subscriptionRepo->updateByCheckoutSessionId('sub_fast_' . $subscription->id, [
                                'stripe_subscription_id' => $subscription->id
                            ]);
                            $this->subscriptionRepo->updateUserTier($userId, $tier);

                            

                            $accounts = $this->sessionManager->getLinkedAccounts();
                            if (isset($accounts[$userId])) {
                                $accounts[$userId]['subscription_tier'] = $tier;
                                $this->sessionManager->set(\App\Core\System\SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
                                $this->sessionManager->syncRootState();
                            }
                            
                            try {
                                $redisCache = new \App\Config\Database\RedisCache();
                                $inv = new \App\Core\System\CacheInvalidator($redisCache->getClient());
                                $inv->user($userId);
                                $inv->userSubscription($userId);
                                $redisCache->getClient()?->del(\App\Core\System\CacheConstants::PREFIX_USER_PAYMENT_HISTORY . $userId);
                            } catch (\Exception $e) {}

                            $invoice = \Stripe\Invoice::retrieve($subscription->latest_invoice);
                            
                            $this->subscriptionRepo->createPaymentRecord([
                                'user_id' => $userId,
                                'stripe_payment_intent_id' => $invoice->payment_intent ?? null,
                                'stripe_invoice_id' => $invoice->id,
                                'amount_cents' => $invoice->amount_paid ?? 0,
                                'currency' => strtolower($invoice->currency ?? 'usd'),
                                'description' => "Subscription {$tierName} ({$periodLabel})",
                                'status' => 'succeeded'
                            ]);
                            
                            try {
                                $redisCache = new \App\Config\Database\RedisCache();
                                $redisClient = $redisCache->getClient();
                                if ($redisClient) {
                                    $redisClient->rpush('queue:emails', json_encode([
                                        'type' => 'subscription_confirmation',
                                        'user_id' => $userId,
                                        'tierName' => $tierName,
                                        'billingPeriod' => $billingPeriod
                                    ]));
                                }
                            } catch (\Exception $e) {}
                            
                            return [
                                'success' => true,
                                'fast_payment' => true,
                                'message_key' => 'stripe.payment_successful',
                                'checkout_url' => null
                            ];
                        }
                    }
                } catch (\Exception $e) {
                    Logger::info("Fast subscription failed or requires auth, falling back to checkout", ['user_id' => $userId, 'error' => $e->getMessage()]);
                }
            }

            $baseUrl = $this->getBaseUrl($input);
            Logger::info("Stripe Checkout preparing return URLs", ['base_url' => $baseUrl, 'user_id' => $userId]);

            $session = \Stripe\Checkout\Session::create([
                'customer' => $stripeCustomerId,
                'mode' => 'subscription',
                'line_items' => [[
                    'price' => $priceId,
                    'quantity' => 1
                ]],
                'success_url' => $baseUrl . '/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $baseUrl . '/upgrade?status=cancel',
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

        try {
            $redisInstance = new \App\Config\Database\RedisCache();
            $redisClient = $redisInstance->getClient();
            if ($redisClient) {
                $lockKey = "user_lock:stripe_coin:{$userId}";
                if (!$redisClient->set($lockKey, "1", 'EX', 2, 'NX')) {
                    return ['success' => false, 'message_key' => 'error.too_many_requests'];
                }
            }
        } catch (\Throwable $e) {}

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

            $purchasePreference = $this->sessionManager->get('purchase_preference', 'verify');
            
            if ($purchasePreference === 'fast') {
                try {
                    $customer = \Stripe\Customer::retrieve($stripeCustomerId);
                    $defaultPmId = $customer->invoice_settings->default_payment_method;
                    
                    if (!$defaultPmId) {
                        $paymentMethods = \Stripe\PaymentMethod::all([
                            'customer' => $stripeCustomerId,
                            'type' => 'card',
                            'limit' => 1
                        ]);
                        if (!empty($paymentMethods->data)) {
                            $defaultPmId = $paymentMethods->data[0]->id;
                            \Stripe\Customer::update($stripeCustomerId, [
                                'invoice_settings' => [
                                    'default_payment_method' => $defaultPmId
                                ]
                            ]);
                        }
                    }

                    if ($defaultPmId) {
                        $price = \Stripe\Price::retrieve($priceId);
                        
                        $paymentIntent = \Stripe\PaymentIntent::create([
                            'amount' => $price->unit_amount,
                            'currency' => $price->currency,
                            'customer' => $stripeCustomerId,
                            'payment_method' => $defaultPmId,
                            'off_session' => true,
                            'confirm' => true,
                            'description' => "Purchase of {$coinsAmount} coins",
                            'metadata' => [
                                'type' => 'coins',
                                'user_id' => (string) $userId,
                                'amount' => (string) $coinsAmount
                            ]
                        ]);

                        if ($paymentIntent->status === 'succeeded') {
                            $storeRepo = new \App\Core\Repositories\StoreRepository(new \App\Config\Database\DatabaseManager());
                            $storeRepo->processCoinPurchaseSession([
                                'user_id' => $userId,
                                'stripe_payment_intent_id' => $paymentIntent->id,
                                'stripe_checkout_session_id' => 'pi_fast_' . $paymentIntent->id,
                                'item_type' => 'coins',
                                'item_amount' => $coinsAmount,
                                'amount_cents' => $price->unit_amount,
                                'currency' => $price->currency,
                                'status' => 'succeeded'
                            ]);

                            $this->subscriptionRepo->createPaymentRecord([
                                'user_id' => $userId,
                                'stripe_payment_intent_id' => $paymentIntent->id,
                                'stripe_invoice_id' => null,
                                'amount_cents' => $price->unit_amount,
                                'currency' => $price->currency,
                                'description' => "Purchase of {$coinsAmount} coins (Fast)",
                                'status' => 'succeeded'
                            ]);
                            
                            return [
                                'success' => true,
                                'fast_payment' => true,
                                'message_key' => 'stripe.payment_successful',
                                'checkout_url' => null 
                            ];
                        }
                    }
                } catch (\Exception $e) {
                    Logger::info("Fast payment failed or requires auth, falling back to checkout", ['user_id' => $userId, 'error' => $e->getMessage()]);
                }
            }

            $baseUrl = $this->getBaseUrl($input);
            $returnUrl = isset($input['return_url']) ? rtrim($input['return_url'], '/') : $baseUrl . '/store';
            Logger::info("Stripe Coin Checkout preparing return URLs", ['return_url' => $returnUrl, 'user_id' => $userId]);

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
                    'description' => "Purchase of {$coinsAmount} coins",
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

        // Verify if the requested tier is a valid tier
        if ($tier < 0) {
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

        $user = $this->userRepo->findById($userId);
        $purchasePreference = $user['purchase_preference'] ?? $this->sessionManager->get('purchase_preference', 'verify');

        if ($purchasePreference === 'verify') {
            $submittedPassword = trim($input['password'] ?? '');
            if (empty($submittedPassword) || !password_verify($submittedPassword, $user['password'] ?? '')) {
                return ['success' => false, 'message' => __('auth.incorrect_password')];
            }
        }

        if ($tier <= 0) {
            \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
            try {
                $subscription = \Stripe\Subscription::retrieve($activeLocalSub['stripe_subscription_id']);
                
                \Stripe\Subscription::update($subscription->id, [
                    'cancel_at_period_end' => true
                ]);
                
                Logger::info("Stripe Subscription canceled at period end (downgrade to basic)", [
                    'user_id' => $userId,
                    'subscription_id' => $subscription->id
                ]);
                return ['success' => true, 'updated' => true, 'message' => 'Suscripción cancelada. Terminará al final del periodo actual.'];
            } catch (\Exception $e) {
                Logger::error("Stripe API Error canceling subscription", ['error' => $e->getMessage()]);
                return ['success' => false, 'message' => __('err_stripe_api')];
            }
        }

        $newPriceId = $this->resolvePriceId($tier, $billingPeriod);
        if (!$newPriceId) {
            Logger::error("Stripe Price ID not configured", ['tier' => $tier, 'billing_period' => $billingPeriod]);
            return ['success' => false, 'message_key' => 'stripe.price_not_configured'];
        }

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
            
            

            $accounts = $this->sessionManager->getLinkedAccounts();
            if (isset($accounts[$userId])) {
                $accounts[$userId]['subscription_tier'] = $tier;
                $this->sessionManager->set(\App\Core\System\SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
                $this->sessionManager->syncRootState();
            }

            

            try {
                $redisCache = new \App\Config\Database\RedisCache();
                $inv = new \App\Core\System\CacheInvalidator($redisCache->getClient());
                $inv->user($userId);
                $inv->userSubscription($userId);
                $redisCache->getClient()?->del(\App\Core\System\CacheConstants::PREFIX_USER_PAYMENT_HISTORY . $userId);
            } catch (\Exception $e) {
                Logger::error("Failed to clear user cache on upgrade", ['user_id' => $userId, 'error' => $e->getMessage()]);
            }
            
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

        // Try to read from Redis cache
        $redisClient = null;
        $cacheKey = \App\Core\System\CacheConstants::PREFIX_USER_PAYMENT_HISTORY . $userId;
        try {
            $redisCache = new \App\Config\Database\RedisCache();
            $redisClient = $redisCache->getClient();
            if ($redisClient) {
                $cached = $redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) {
                    $cachedData = json_decode($cached, true);
                    if (is_array($cachedData)) {
                        return [
                            'success' => true,
                            'data' => $cachedData
                        ];
                    }
                }
            }
        } catch (\Exception $e) {
            // Fallback: proceed without cache
        }

        $stripeCustomerId = $this->subscriptionRepo->getStripeCustomerIdByUserId($userId);
        $history = [];
        
        $fetchLimit = isset($input['limit']) ? min((int) $input['limit'], 100) : 100;
        $offset = isset($input['offset']) ? (int) $input['offset'] : 0;
        
        if ($stripeCustomerId) {
            try {
                \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
                $charges = \Stripe\Charge::all([
                    'customer' => $stripeCustomerId,
                    'limit' => $fetchLimit,
                    'expand' => ['data.invoice']
                ]);
                
                foreach ($charges->data as $charge) {
                    $desc = $charge->description;
                    if (empty($desc) && isset($charge->metadata->type) && $charge->metadata->type === 'coins') {
                        $desc = "Purchase of " . ($charge->metadata->amount ?? '') . " coins";
                    }

                    $pdfUrl = null;
                    if (!empty($charge->invoice) && is_object($charge->invoice) && !empty($charge->invoice->invoice_pdf)) {
                        $pdfUrl = $charge->invoice->invoice_pdf;
                    }

                    $history[] = [
                        'id' => $charge->id,
                        'created_at' => date('Y-m-d H:i:s', $charge->created),
                        'description' => $desc ?: 'Subscription',
                        'amount_cents' => $charge->amount,
                        'currency' => $charge->currency,
                        'status' => $charge->status,
                        'receipt_url' => $charge->receipt_url ?? null,
                        'pdf_url' => $pdfUrl
                    ];
                }
            } catch (\Exception $e) {
                $history = $this->subscriptionRepo->getPaymentHistory($userId, $fetchLimit, $offset);
            }
        } else {
            $history = $this->subscriptionRepo->getPaymentHistory($userId, $fetchLimit, $offset);
        }

        if ($redisClient) {
            try {
                $redisClient->setex($cacheKey, \App\Core\System\CacheConstants::TTL_ONE_HOUR, json_encode($history));
            } catch (\Exception $e) {
                // Ignore cache write errors
            }
        }

        return [
            'success' => true,
            'data' => $history
        ];
    }

    private function getStripePdfUrl(string $id): ?string {
        \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

        if (strpos($id, 'in_') === 0) {
            try {
                $invoice = \Stripe\Invoice::retrieve($id);
                if (!empty($invoice->invoice_pdf)) {
                    return $invoice->invoice_pdf;
                }
            } catch (\Exception $e) {}
        }

        if (strpos($id, 'ch_') === 0 || strpos($id, 'py_') === 0) {
            try {
                $charge = \Stripe\Charge::retrieve($id);

                // 1. Direct charge->invoice
                if (!empty($charge->invoice)) {
                    $invId = is_string($charge->invoice) ? $charge->invoice : ($charge->invoice->id ?? null);
                    if ($invId) {
                        $invoice = \Stripe\Invoice::retrieve($invId);
                        if (!empty($invoice->invoice_pdf)) {
                            return $invoice->invoice_pdf;
                        }
                    }
                }

                // 2. Payment intent invoice
                if (!empty($charge->payment_intent)) {
                    $piId = is_string($charge->payment_intent) ? $charge->payment_intent : ($charge->payment_intent->id ?? null);
                    if ($piId) {
                        $pi = \Stripe\PaymentIntent::retrieve($piId);
                        if (!empty($pi->invoice)) {
                            $invId = is_string($pi->invoice) ? $pi->invoice : ($pi->invoice->id ?? null);
                            if ($invId) {
                                $invoice = \Stripe\Invoice::retrieve($invId);
                                if (!empty($invoice->invoice_pdf)) {
                                    return $invoice->invoice_pdf;
                                }
                            }
                        }
                    }
                }

                // 3. Search invoices by customer
                if (!empty($charge->customer)) {
                    $customerId = is_string($charge->customer) ? $charge->customer : ($charge->customer->id ?? null);
                    if ($customerId) {
                        $invoices = \Stripe\Invoice::all([
                            'customer' => $customerId,
                            'limit' => 15
                        ]);
                        foreach ($invoices->data as $inv) {
                            if (($inv->charge && $inv->charge === $charge->id) || ($inv->payment_intent && $inv->payment_intent === $charge->payment_intent)) {
                                if (!empty($inv->invoice_pdf)) {
                                    return $inv->invoice_pdf;
                                }
                            }
                        }
                        foreach ($invoices->data as $inv) {
                            if (abs($inv->amount_paid - $charge->amount) < 10 && !empty($inv->invoice_pdf)) {
                                return $inv->invoice_pdf;
                            }
                        }
                    }
                }

                // 4. Scrape receipt_url HTML for pay.stripe.com/invoice/.../pdf link
                if (!empty($charge->receipt_url)) {
                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, $charge->receipt_url);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                    curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                    $html = curl_exec($ch);
                    curl_close($ch);

                    if ($html && preg_match('/(https:\/\/pay\.stripe\.com\/invoice\/[^\s"\'\>]+(?:\/pdf|\?pdf=1))/i', $html, $matches)) {
                        return $matches[1];
                    }
                }
            } catch (\Exception $e) {
                Logger::error("Error in getStripePdfUrl", ['id' => $id, 'error' => $e->getMessage()]);
            }
        }

        return null;
    }

    private function createStyledPdfReceiptBytes(array $data): string {
        $date = $data['date'] ?? date('d/m/Y');
        $id = $data['id'] ?? 'REC-' . time();
        $desc = $data['description'] ?? 'Suscripcion / Compra';
        $amount = $data['amount'] ?? '$0.00';
        $status = strtoupper($data['status'] ?? 'PAGADO');

        $desc = iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $desc);
        $status = iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $status);

        $stream = "";
        $stream .= "0.1 0.12 0.15 rg\n";
        $stream .= "40 770 515 45 re\nf\n";
        $stream .= "1 1 1 rg\n";
        $stream .= "BT /F2 16 Tf 55 785 Td (PROJECT ROSAURA) Tj ET\n";
        $stream .= "BT /F1 10 Tf 420 785 Td (COMPROBANTE DE PAGO) Tj ET\n";
        $stream .= "0.15 0.15 0.15 rg\n";
        $stream .= "BT /F2 10 Tf 50 735 Td (ID de Transaccion:) Tj ET\n";
        $stream .= "BT /F1 10 Tf 160 735 Td (" . $id . ") Tj ET\n";
        $stream .= "BT /F2 10 Tf 50 715 Td (Fecha de Emision:) Tj ET\n";
        $stream .= "BT /F1 10 Tf 160 715 Td (" . $date . ") Tj ET\n";
        $stream .= "BT /F2 10 Tf 50 695 Td (Estado del Pago:) Tj ET\n";
        $stream .= "BT /F2 10 Tf 160 695 Td (" . $status . ") Tj ET\n";
        $stream .= "0.85 0.85 0.85 rg\n";
        $stream .= "50 670 495 1 re\nf\n";
        $stream .= "0.3 0.3 0.3 rg\n";
        $stream .= "BT /F2 10 Tf 50 650 Td (DESCRIPCION) Tj ET\n";
        $stream .= "BT /F2 10 Tf 450 650 Td (IMPORTE) Tj ET\n";
        $stream .= "0.85 0.85 0.85 rg\n";
        $stream .= "50 640 495 1 re\nf\n";
        $stream .= "0.2 0.2 0.2 rg\n";
        $stream .= "BT /F1 10 Tf 50 620 Td (" . $desc . ") Tj ET\n";
        $stream .= "BT /F2 10 Tf 450 620 Td (" . $amount . ") Tj ET\n";
        $stream .= "0.85 0.85 0.85 rg\n";
        $stream .= "50 600 495 1 re\nf\n";
        $stream .= "0.1 0.1 0.1 rg\n";
        $stream .= "BT /F2 11 Tf 350 575 Td (TOTAL PAGADO:) Tj ET\n";
        $stream .= "BT /F2 12 Tf 450 575 Td (" . $amount . ") Tj ET\n";
        $stream .= "0.5 0.5 0.5 rg\n";
        $stream .= "BT /F1 9 Tf 50 500 Td (Este documento es un comprobante digital generado por Project Rosaura.) Tj ET\n";
        $stream .= "BT /F1 9 Tf 50 485 Td (Si tienes alguna duda sobre tu compra, puedes contactar con nuestro soporte oficial.) Tj ET\n";

        $len = strlen($stream);

        $pdf = "%PDF-1.4\n";
        $pdf .= "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        $pdf .= "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        $pdf .= "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n";
        $pdf .= "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
        $pdf .= "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n";
        $pdf .= "6 0 obj\n<< /Length " . $len . " >>\nstream\n" . $stream . "\nendstream\nendobj\n";

        $o1 = strpos($pdf, "1 0 obj");
        $o2 = strpos($pdf, "2 0 obj");
        $o3 = strpos($pdf, "3 0 obj");
        $o4 = strpos($pdf, "4 0 obj");
        $o5 = strpos($pdf, "5 0 obj");
        $o6 = strpos($pdf, "6 0 obj");

        $xref = "xref\n0 7\n0000000000 65535 f \n";
        $xref .= sprintf("%010d 00000 n \n", $o1);
        $xref .= sprintf("%010d 00000 n \n", $o2);
        $xref .= sprintf("%010d 00000 n \n", $o3);
        $xref .= sprintf("%010d 00000 n \n", $o4);
        $xref .= sprintf("%010d 00000 n \n", $o5);
        $xref .= sprintf("%010d 00000 n \n", $o6);

        $trailer = "trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n" . strlen($pdf) . "\n%%EOF";

        return $pdf . $xref . $trailer;
    }

    public function downloadReceipt(array $input) {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            exit('Unauthorized');
        }

        $id = $input['id'] ?? '';
        if (empty($id)) {
            http_response_code(400);
            exit('Missing payment ID');
        }

        $userId = $this->sessionManager->getActiveAccountId();
        \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

        $pdfUrl = $this->getStripePdfUrl($id);
        $pdfData = null;

        if ($pdfUrl) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $pdfUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 20);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            $fetched = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && !empty($fetched) && strpos($fetched, '%PDF') === 0) {
                $pdfData = $fetched;
            }
        }

        if (!$pdfData) {
            $receiptData = [
                'id' => $id,
                'date' => date('d/m/Y'),
                'description' => 'Comprobante de Pago',
                'amount' => '$0.00',
                'status' => 'PAGADO'
            ];

            try {
                if (strpos($id, 'ch_') === 0 || strpos($id, 'py_') === 0) {
                    $charge = \Stripe\Charge::retrieve($id);
                    $receiptData['date'] = date('d/m/Y', $charge->created);
                    $receiptData['description'] = $charge->description ?: 'Comprobante de Compra';
                    $receiptData['amount'] = '$' . number_format($charge->amount / 100, 2) . ' ' . strtoupper($charge->currency);
                    $receiptData['status'] = $charge->status === 'succeeded' ? 'PAGADO' : strtoupper($charge->status);
                } elseif (strpos($id, 'in_') === 0) {
                    $invoice = \Stripe\Invoice::retrieve($id);
                    $receiptData['date'] = date('d/m/Y', $invoice->created);
                    $receiptData['description'] = 'Comprobante de Suscripción';
                    $receiptData['amount'] = '$' . number_format($invoice->amount_paid / 100, 2) . ' ' . strtoupper($invoice->currency);
                    $receiptData['status'] = $invoice->paid ? 'PAGADO' : 'PENDIENTE';
                }
            } catch (\Exception $e) {}

            $pdfData = $this->createStyledPdfReceiptBytes($receiptData);
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="Comprobante_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $id) . '.pdf"');
        header('Content-Length: ' . strlen($pdfData));
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('Pragma: public');
        echo $pdfData;
        exit;
    }

    public function getSubscriptionStatus(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();

        $sessionId = $input['session_id'] ?? ($_GET['session_id'] ?? null);
        if ($sessionId) {
            try {
                \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
                $stripeSession = \Stripe\Checkout\Session::retrieve($sessionId);
                if ($stripeSession && $stripeSession->payment_status === 'paid') {
                    $metadata = $stripeSession->metadata;
                    $tier = isset($metadata->tier) ? (int)$metadata->tier : 0;
                    $billingPeriod = $metadata->billing_period ?? 'monthly';

                    if ($tier > 0) {
                        $this->subscriptionRepo->updateByCheckoutSessionId($sessionId, [
                            'status' => 'active',
                            'stripe_subscription_id' => $stripeSession->subscription ?? null,
                            'stripe_customer_id' => $stripeSession->customer ?? null
                        ]);

                        $this->subscriptionRepo->updateUserTier($userId, $tier);

                        $subColor = '{"type":"solid","colors":[{"hex":"var(--text-muted)"}]}';
                        try {
                            $db = new \App\Config\Database\DatabaseManager();
                            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
                            $stmtCol = $pdo->prepare("SELECT color FROM subscription_tiers WHERE tier_level = ? LIMIT 1");
                            $stmtCol->execute([$tier]);
                            $rowCol = $stmtCol->fetch(\PDO::FETCH_ASSOC);
                            if ($rowCol && !empty($rowCol['color'])) {
                                $subColor = $rowCol['color'];
                            }
                        } catch (\Throwable $e) {}

                        $accounts = $this->sessionManager->getLinkedAccounts();
                        if (isset($accounts[$userId])) {
                            $accounts[$userId]['subscription_tier'] = $tier;
                            $accounts[$userId]['real_subscription_tier'] = $tier;
                            $accounts[$userId]['subscription_color'] = $subColor;
                            $this->sessionManager->set(\App\Core\System\SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
                            $this->sessionManager->set('subscription_color', $subColor);
                            $this->sessionManager->syncRootState();
                        }

                        try {
                            $redisCache = new \App\Config\Database\RedisCache();
                            $inv = new \App\Core\System\CacheInvalidator($redisCache->getClient());
                            $inv->user($userId);
                            $inv->userSubscription($userId);
                            $redisCache->getClient()?->del(\App\Core\System\CacheConstants::PREFIX_USER_PAYMENT_HISTORY . $userId);
                        } catch (\Throwable $e) {}

                        try {
                            $container = new \App\Core\Container();
                            $lockManager = $container->get(\App\Api\Services\Canvas\CanvasLockManager::class);
                            $lockManager->evaluateUserCanvases($userId);
                        } catch (\Throwable $e) {}
                    }
                }
            } catch (\Throwable $e) {
                Logger::error("Stripe API Error retrieving checkout session for status check", ['session_id' => $sessionId, 'error' => $e->getMessage()]);
            }
        }

        $subscription = $this->subscriptionRepo->findActiveByUserId($userId);

        $user = $this->userRepo->findById($userId);
        $userTier = (int)($user['subscription_tier'] ?? ($_SESSION['subscription_tier'] ?? 0));

        if ($subscription && !empty($subscription['stripe_subscription_id'])) {
            try {
                \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
                $stripeSub = \Stripe\Subscription::retrieve($subscription['stripe_subscription_id']);

                $subscription['cancel_at_period_end'] = $stripeSub->cancel_at_period_end;
                $subscription['current_period_end'] = $stripeSub->current_period_end;
                $subscription['status'] = $stripeSub->status;
                if (isset($subscription['tier'])) {
                    $userTier = (int)$subscription['tier'];
                }
            } catch (\Exception $e) {
                Logger::error("Stripe API Error fetching subscription status", [
                    'user_id' => $userId,
                    'error' => $e->getMessage()
                ]);
            }
        }

        if (!$subscription) {
            $subscription = [
                'tier' => $userTier,
                'status' => 'active',
                'billing_period' => 'free',
                'cancel_at_period_end' => false,
                'current_period_end' => null
            ];
        } else {
            $subscription['tier'] = $userTier;
        }

        if (empty($subscription['current_period_end']) && $subscription['tier'] > 0) {
            $createdAt = strtotime($subscription['created_at'] ?? 'now');
            $period = (isset($subscription['billing_period']) && $subscription['billing_period'] === 'yearly') ? '+1 year' : '+1 month';
            $subscription['current_period_end'] = date('Y-m-d H:i:s', strtotime($period, $createdAt));
        }

        $usedStorageMB = round($this->userRepo->getStorageUsed($userId), 2);
        $planLimits = \App\Core\System\SubscriptionPlanConstants::getTierLimits($userTier);
        $maxStorageMB = (float)($planLimits['max_storage_mb'] ?? 20);
        $remainingStorageMB = max(0, round($maxStorageMB - $usedStorageMB, 2));
        $usedPercentage = $maxStorageMB > 0 ? min(100, round(($usedStorageMB / $maxStorageMB) * 100, 1)) : 0;

        $subscription['storage'] = [
            'used_mb' => $usedStorageMB,
            'max_mb' => $maxStorageMB,
            'remaining_mb' => $remainingStorageMB,
            'used_percentage' => $usedPercentage
        ];

        $tokenUsage = $this->userRepo->getTemplateTokenUsage($userId);
        $maxTokens = (int)($planLimits['max_template_tokens'] ?? 0);
        $usedTokens = (int)($tokenUsage['used'] ?? 0);
        $remainingTokens = max(0, $maxTokens - $usedTokens);
        $tokensPercentage = $maxTokens > 0 ? min(100, round(($usedTokens / $maxTokens) * 100, 1)) : 0;

        $subscription['tokens'] = [
            'used_tokens' => $usedTokens,
            'max_tokens' => $maxTokens,
            'remaining_tokens' => $remainingTokens,
            'used_percentage' => $tokensPercentage,
            'reset_at' => $tokenUsage['reset_at'],
            'reset_in_seconds' => $tokenUsage['reset_in_seconds'],
            'has_feature' => ($maxTokens > 0)
        ];

        $subscriptionColor = '{"type":"solid","colors":[{"hex":"var(--text-muted)"}]}';
        if ($userTier > 0) {
            try {
                $db = new \App\Config\Database\DatabaseManager();
                $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
                $stmtCol = $pdo->prepare("SELECT color FROM subscription_tiers WHERE tier_level = ? LIMIT 1");
                $stmtCol->execute([$userTier]);
                $rowCol = $stmtCol->fetch(\PDO::FETCH_ASSOC);
                if ($rowCol && !empty($rowCol['color'])) {
                    $subscriptionColor = $rowCol['color'];
                }
            } catch (\Throwable $e) {}
        }
        $subscription['color'] = $subscriptionColor;

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

        if (!$cancelAtPeriodEnd) {
            // User is trying to RE-ENABLE auto-renewal. Check if they have a valid payment method attached.
            $pms = $this->getPaymentMethods([]);
            if ($pms['success'] && empty($pms['data'])) {
                return [
                    'success' => false,
                    'message' => 'Debes agregar una tarjeta de pago antes de activar la renovación automática.'
                ];
            }
        }

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

    public function deletePaymentMethod(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $pmId = trim($input['payment_method_id'] ?? '');

        if (empty($pmId)) {
            return ['success' => false, 'message' => __('err_missing_parameters')];
        }

        $subscriptionStatus = $this->getSubscriptionStatus([]);
        if ($subscriptionStatus['success'] && !empty($subscriptionStatus['data'])) {
            $subData = $subscriptionStatus['data'];
            $hasActivePaidTier = (int)($subData['tier'] ?? 0) > 0 && ($subData['status'] ?? '') === 'active';
            $isAutoRenewActive = !($subData['cancel_at_period_end'] ?? false);

            if ($hasActivePaidTier && $isAutoRenewActive) {
                return [
                    'success' => false,
                    'message' => 'No puedes eliminar tu tarjeta mientras tengas una suscripción activa con renovación automática. Desactiva la renovación automática primero.'
                ];
            }
        }

        try {
            \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
            $pm = \Stripe\PaymentMethod::retrieve($pmId);
            $pm->detach();

            return ['success' => true, 'message' => 'Tarjeta de pago eliminada correctamente.'];
        } catch (\Exception $e) {
            Logger::error("Stripe API Error deleting payment method", ['user_id' => $userId, 'pm_id' => $pmId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => $e->getMessage()];
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

            $baseUrl = $this->getBaseUrl($input);
            Logger::info("Stripe Setup Session preparing return URLs", ['base_url' => $baseUrl, 'user_id' => $userId]);

            $session = \Stripe\Checkout\Session::create([
                'payment_method_types' => ['card'],
                'mode' => 'setup',
                'customer' => $stripeCustomerId,
                'success_url' => $baseUrl . '/settings/billing?status=success',
                'cancel_url' => $baseUrl . '/settings/billing?status=cancel',
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
