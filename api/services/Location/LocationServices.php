<?php

namespace App\Api\Services\Location;

use Exception;
use App\Core\Interfaces\LocationRepositoryInterface;
use App\Core\System\Logger;

class LocationServices {
    private $locationRepository;

    public function __construct(LocationRepositoryInterface $locationRepository) {
        $this->locationRepository = $locationRepository;
    }

    public function getCountries(): array {
        try {
            $countries = $this->locationRepository->getCountries();
            return ['success' => true, 'data' => $countries];
        } catch (Exception $e) {
            Logger::error('Error fetching countries', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_fetch_countries')];
        }
    }

    public function getStates(int $countryId): array {
        try {
            $states = $this->locationRepository->getStatesByCountry($countryId);
            return ['success' => true, 'data' => $states];
        } catch (Exception $e) {
            Logger::error('Error fetching states', ['country_id' => $countryId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_fetch_states')];
        }
    }

    public function getCities(int $stateId): array {
        try {
            $cities = $this->locationRepository->getCitiesByState($stateId);
            return ['success' => true, 'data' => $cities];
        } catch (Exception $e) {
            Logger::error('Error fetching cities', ['state_id' => $stateId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_fetch_cities')];
        }
    }
}
?>