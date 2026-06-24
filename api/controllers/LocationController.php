<?php
// api/controllers/LocationController.php
namespace App\Api\Controllers;

use App\Api\Services\LocationServices;
use App\Core\Interfaces\SessionManagerInterface;

class LocationController extends BaseController {
    
    private $locationServices;
    private $session;

    public function __construct(LocationServices $locationServices, SessionManagerInterface $session) {
        $this->locationServices = $locationServices;
        $this->session = $session;
    }

    public function get_countries($input) {
        try {
            $result = $this->locationServices->getCountries();
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_states($input) {
        try {
            // El mapeador de rutas debe inyectar country_id
            $countryId = $input['country_id'] ?? $input['id'] ?? null;
            if (!$countryId) {
                return $this->respond(['success' => false, 'message' => 'ID de país no proporcionado.']);
            }
            $result = $this->locationServices->getStates((int)$countryId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_cities($input) {
        try {
            // El mapeador de rutas debe inyectar state_id
            $stateId = $input['state_id'] ?? $input['id'] ?? null;
            if (!$stateId) {
                return $this->respond(['success' => false, 'message' => 'ID de estado no proporcionado.']);
            }
            $result = $this->locationServices->getCities((int)$stateId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
?>