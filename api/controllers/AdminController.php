<?php
// api/controllers/AdminController.php

namespace App\Api\Controllers;

use App\Api\Services\AdminServices;

class AdminController {
    
    private $adminServices;

    public function __construct(AdminServices $adminServices) {
        $this->adminServices = $adminServices;
    }

    public function get_user($input) { return $this->adminServices->getUser($input); }
    public function update_avatar($input) { return $this->adminServices->updateAvatar($input); }
    public function delete_avatar($input) { return $this->adminServices->deleteAvatar($input); }
    public function update_username($input) { return $this->adminServices->updateUsername($input); }
    public function update_email($input) { return $this->adminServices->updateEmail($input); }
    public function update_preference($input) { return $this->adminServices->updatePreference($input); }
    public function update_role($input) { return $this->adminServices->updateRole($input); }
    public function update_status($input) { return $this->adminServices->updateStatus($input); }
}
?>