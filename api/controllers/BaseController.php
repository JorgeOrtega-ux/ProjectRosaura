<?php
namespace App\Api\Controllers;

use App\Core\System\Logger;

class BaseController {
    
    protected function handleException(\Throwable $e, $methodName) {
        $className = (new \ReflectionClass($this))->getShortName();
        
        Logger::critical("Unhandled exception in {$className}::{$methodName}: " . $e->getMessage(), ['exception' => $e]);
        
        if (strpos($e->getMessage(), 'Security Violation') !== false || strpos($e->getMessage(), 'Unauthorized') !== false) {
            http_response_code(403);
            return ['success' => false, 'message' => __('err_unauthorized')];
        }
        
        http_response_code(500);
        return ['success' => false, 'message' => __('err_internal_server_error')];
    }

    protected function respond($result) {
        if (isset($result['http_code'])) {
            http_response_code($result['http_code']);
            unset($result['http_code']);
        } elseif (isset($result['success']) && !$result['success']) {
            $forbiddenKeys = [
                'error.unauthorized',
                'admin.insufficient_privileges',
                'admin.hierarchical_restriction',
                'admin.insufficient_privileges_to_grant_critical',
                'admin.role_weight_too_low_for_critical',
                'admin.cannot_edit_superadmin_permissions',
                'admin.cannot_delete_base_role',
                'admin.cannot_edit_base_role'
            ];
            
            if (isset($result['message_key']) && in_array($result['message_key'], $forbiddenKeys)) {
                http_response_code(403);
            }
        }
        return $result;
    }
}
?>