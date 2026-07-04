<?php
// api/services/StripeServices.php

namespace App\Api\Services;

use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\SubscriptionRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\System\Logger;
use App\Core\System\SubscriptionPlanConstants;

class StripeServices {

    private $sessionManager;
    private $subscriptionRepo;
    private $userRepo;

    // Mapeo de tier + billing_period a variables de entorno de Price IDs
    private const PRICE_MAP = [
        1 => [ // Pro
            'monthly' => 'STRIPE_PRICE_PRO_MONTHLY',
            'yearly'  => 'STRIPE_PRICE_PRO_YEARLY'
        ],
        2 => [ // Advanced
            'monthly' => 'STRIPE_PRICE_ADVANCED_MONTHLY',
            'yearly'  => 'STRIPE_PRICE_ADVANCED_YEARLY'
        ]
    ];

    // Mapeo inverso: Price ID → tier
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

    /**
     * Crea una Stripe Checkout Session y retorna la URL de pago.
     */
    public function createCheckoutSession(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $tier = isset($input['tier']) ? (int) $input['tier'] : 0;
        $billingPeriod = $input['billing_period'] ?? 'monthly';

        // Validaciones
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

        // Obtener Price ID de Stripe
        $envKey = self::PRICE_MAP[$tier][$billingPeriod] ?? null;
        if (!$envKey || empty($_ENV[$envKey])) {
            Logger::error("Stripe Price ID not configured", ['env_key' => $envKey]);
            return ['success' => false, 'message_key' => 'stripe.price_not_configured'];
        }
        $priceId = $_ENV[$envKey];

        // Configurar Stripe
        \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

        // Obtener o crear Customer de Stripe
        $user = $this->userRepo->findById($userId);
        if (!$user) {
            return ['success' => false, 'message_key' => 'error.user_not_found'];
        }

        $stripeCustomerId = $this->subscriptionRepo->getStripeCustomerIdByUserId($userId);

        try {
            if ($stripeCustomerId) {
                // Verificar que el customer existe en Stripe
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

            // Crear Checkout Session
            $tierName = SubscriptionPlanConstants::getTierLimits($tier)['name'];
            $periodLabel = $billingPeriod === 'yearly' ? 'Anual' : 'Mensual';

            $session = \Stripe\Checkout\Session::create([
                'customer' => $stripeCustomerId,
                'mode' => 'subscription',
                'line_items' => [[
                    'price' => $priceId,
                    'quantity' => 1
                ]],
                'success_url' => APP_URL . '/premium?session_id={CHECKOUT_SESSION_ID}&status=success',
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

            // Guardar registro de suscripción con status incomplete
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
            return ['success' => false, 'message_key' => 'stripe.api_error'];
        }
    }

    public function getPaymentHistory(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        
        // Intentamos consultar a Stripe directamente para no depender del Webhook en localhost
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
                    $history[] = [
                        'id' => $charge->id,
                        'created_at' => date('Y-m-d H:i:s', $charge->created),
                        'description' => $charge->description ?: 'Suscripción',
                        'amount_cents' => $charge->amount,
                        'currency' => $charge->currency,
                        'status' => $charge->status // 'succeeded', 'pending', 'failed'
                    ];
                }
            } catch (\Exception $e) {
                // Fallback a base de datos local si Stripe falla
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

    /**
     * Obtiene el estado actual de suscripción del usuario.
     */
    public function getSubscriptionStatus(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $subscription = $this->subscriptionRepo->findActiveByUserId($userId);

        return [
            'success' => true,
            'data' => $subscription
        ];
    }

    /**
     * Crea una Setup Session en Stripe para agregar un nuevo método de pago sin cobrar.
     */
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

        // Configurar Stripe
        \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

        $stripeCustomerId = $this->subscriptionRepo->getStripeCustomerIdByUserId($userId);

        try {
            if ($stripeCustomerId) {
                // Verificar que el customer existe en Stripe
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

            // Crear Setup Session
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

    /**
     * Obtiene los métodos de pago guardados del usuario actual.
     */
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
            foreach ($paymentMethods->data as $pm) {
                $cards[] = [
                    'id' => $pm->id,
                    'brand' => $pm->card->brand,
                    'last4' => $pm->card->last4,
                    'exp_month' => $pm->card->exp_month,
                    'exp_year' => $pm->card->exp_year,
                    'is_default' => false // Stripe API no marca un default general para Cards si no es a nivel de Customer, pero por ahora false
                ];
            }
            
            // Si queremos obtener la default del customer:
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
