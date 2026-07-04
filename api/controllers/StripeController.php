<?php
// api/controllers/StripeController.php

namespace App\Api\Controllers;

use App\Api\Services\StripeServices;

class StripeController extends BaseController {

    private $stripeServices;

    public function __construct(StripeServices $stripeServices) {
        $this->stripeServices = $stripeServices;
    }

    public function create_checkout($input) {
        try { return $this->respond($this->stripeServices->createCheckoutSession($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_payment_history($input) {
        try { return $this->respond($this->stripeServices->getPaymentHistory($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_subscription_status($input) {
        try { return $this->respond($this->stripeServices->getSubscriptionStatus($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }
}
?>
