<?php

namespace App\Core\Repositories;

use PDO;
use App\Core\Interfaces\LocationRepositoryInterface;
use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

class LocationRepository implements LocationRepositoryInterface {
    private $db;

    public function __construct(DatabaseManager $databaseManager) {
        $this->db = $databaseManager->getConnection(DB::CONN_CANVASES);
    }

    public function getCountries(): array {
        $stmt = $this->db->query("SELECT id, name, iso2, phone_code FROM db_locations.countries ORDER BY name ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getStatesByCountry(int $countryId): array {
        $stmt = $this->db->prepare("SELECT id, name, state_code FROM db_locations.states WHERE country_id = :cid ORDER BY name ASC");
        $stmt->execute([':cid' => $countryId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getCitiesByState(int $stateId): array {
        $stmt = $this->db->prepare("SELECT id, name FROM db_locations.cities WHERE state_id = :sid ORDER BY name ASC");
        $stmt->execute([':sid' => $stateId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}
?>