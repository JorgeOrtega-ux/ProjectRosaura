<?php

namespace App\Core\Interfaces;

interface LocationRepositoryInterface {
    public function getCountries(): array;
    public function getStatesByCountry(int $countryId): array;
    public function getCitiesByState(int $stateId): array;
}
?>