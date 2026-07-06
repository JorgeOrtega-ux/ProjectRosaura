<?php
namespace App\Api\Controllers;

use App\Api\Services\StoreServices;

class StoreController extends BaseController {

    private $storeServices;

    public function __construct(StoreServices $storeServices) {
        $this->storeServices = $storeServices;
    }

    public function buy_perk($input) {
        try { return $this->respond($this->storeServices->buyPerk($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_balance($input) {
        try { return $this->respond($this->storeServices->getBalance($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }
}
