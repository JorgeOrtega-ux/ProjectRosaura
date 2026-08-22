<?php
namespace App\Api\Controllers\Stripe;

use App\Api\Controllers\BaseController;

use App\Api\Services\Stripe\StripeService;

class StripeController extends BaseController {

    private $stripeServices;

    public function __construct(StripeService $stripeServices) {
        $this->stripeServices = $stripeServices;
    }

    public function create_checkout($input) {
        try { return $this->respond($this->stripeServices->createCheckoutSession($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }


    public function preview_upgrade($input) {
        try { 
            if (!isset($input['tier'])) {
                return $this->respond(['success' => false, 'message' => 'Missing tier']);
            }
            
            $tier = (int) $input['tier'];
            $billingPeriod = $input['billing_period'] ?? 'monthly';
            return $this->respond($this->stripeServices->getUpcomingInvoicePreview($tier, $billingPeriod)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_subscription($input) {
        try { return $this->respond($this->stripeServices->updateSubscription($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_payment_history($input) {
        try { return $this->respond($this->stripeServices->getPaymentHistory($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function download_receipt($input) {
        try { return $this->stripeServices->downloadReceipt($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_subscription_status($input) {
        try { return $this->respond($this->stripeServices->getSubscriptionStatus($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function create_setup_session($input) {
        try { return $this->respond($this->stripeServices->createSetupSession($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_payment_methods($input) {
        try { return $this->respond($this->stripeServices->getPaymentMethods($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function cancel_or_reactivate_subscription($input) {
        try { return $this->respond($this->stripeServices->cancelOrReactivateSubscription($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function cancel_subscription($input) {
        try { return $this->respond($this->stripeServices->cancelOrReactivateSubscription($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function toggle_auto_renewal($input) {
        try { return $this->respond($this->stripeServices->cancelOrReactivateSubscription($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function delete_payment_method($input) {
        try { return $this->respond($this->stripeServices->deletePaymentMethod($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }
}
?>
