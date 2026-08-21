<?php
require '/var/www/html/includes/core/bootstrap.php';

$_SESSION['accounts'][3]['user_name'] = 'user3';
$_SESSION['user_id'] = 3;

global $sessionManager;
class MockSession {
    public function isLoggedIn() { return true; }
    public function getActiveAccountId() { return 3; }
}
$sessionManager = new MockSession();

$service = new \App\Api\Services\App\AppViewService();
$data = $service->getCanvasDesignData('d899a361-7ade-43a9-aef1-77d93cce481e');
echo "RESULT FOR USER 3:\n";
print_r($data);
