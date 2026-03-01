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
    public function get_moderation_kardex($input) { return $this->adminServices->getModerationKardex($input); }
    public function add_admin_note($input) { return $this->adminServices->addAdminNote($input); }

    // --- NUEVAS ACCIONES PARA SERVER CONFIG ---
    public function get_server_config() { return $this->adminServices->getServerConfig(); }
    public function update_server_config($input) { return $this->adminServices->updateServerConfig($input); }

    // --- NUEVAS ACCIONES PARA BACKUPS ---
    public function create_backup() { return $this->adminServices->createBackup(); }
    public function restore_backup($input) { return $this->adminServices->restoreBackup($input); }
    public function delete_backup($input) { return $this->adminServices->deleteBackup($input); }
}
?>