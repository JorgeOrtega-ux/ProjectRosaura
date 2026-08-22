<?php
namespace App\Api\Services\Auth;

use App\Core\Container;
use App\Core\Interfaces\VerificationCodeRepositoryInterface;
use App\Core\System\DatabaseConstants;
use App\Core\System\Logger;

class AuthViewService {

    /**
     * Calcula la ruta relativa para las solicitudes HTTP.
     */
    private function getRelativePath(): string {
        $requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $appUrlPath = parse_url(defined('APP_URL') ? APP_URL : '', PHP_URL_PATH) ?: '';
        $relativePath = $requestUri;
        if ($appUrlPath !== '' && $appUrlPath !== '/' && strpos($requestUri, $appUrlPath) === 0) {
            $relativePath = substr($requestUri, strlen($appUrlPath));
        }

        if ($relativePath === '' || $relativePath === false) {
            $relativePath = '/';
        }
        if (strlen($relativePath) > 1 && substr($relativePath, -1) === '/') {
            $relativePath = rtrim($relativePath, '/');
        }
        return $relativePath;
    }

    /**

     */
    public function getLoginViewData(): array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $relativePath = $this->getRelativePath();

        $errorMsg = null;
        if ($relativePath === '/login/two-factor') {
            $sessionKey = defined('\App\Core\System\SessionConstants::KEY_PENDING_2FA') 
                          ? \App\Core\System\SessionConstants::KEY_PENDING_2FA 
                          : 'pending_2fa';
                          
            $pending2FA = $_SESSION[$sessionKey] ?? [];
            
            if (empty($pending2FA)) {
                $errorMsg = __('reg_no_data');
            }
        }
        global $sessionManager, $isLoggedIn;
        $isUserLoggedIn = ($isLoggedIn ?? false) || ($sessionManager && $sessionManager->isLoggedIn()) || (!empty($_SESSION['active_account']) && !empty($_SESSION['accounts']));
        $linkedAccounts = $isUserLoggedIn ? ($_SESSION['accounts'] ?? []) : [];
        $isMultiSessionAdd = $isUserLoggedIn && !empty($_SESSION['active_account']) && count($linkedAccounts) > 0;

        return [
            'relativePath' => $relativePath,
            'errorMsg' => $errorMsg,
            'linkedAccounts' => $linkedAccounts,
            'isMultiSessionAdd' => $isMultiSessionAdd
        ];
    }

    /**
     * Obtiene y prepara los datos para la vista de registro (register.php).
     */
    public function getRegisterViewData(): array {
        $relativePath = $this->getRelativePath();
        global $serverConfig;
        $maxUsernameLen = $serverConfig['max_username_length'] ?? 32;
        $maxPasswordLen = $serverConfig['max_password_length'] ?? 64;

        return [
            'relativePath' => $relativePath,
            'errorMsg' => null,
            'maxUsernameLen' => $maxUsernameLen,
            'maxPasswordLen' => $maxPasswordLen
        ];
    }

    /**

     */
    public function getResetPasswordViewData(?string $token): array {
        $isValid = false;
        $userEmail = '';

        if (!empty($token)) {
            try {
                global $container;
                if (!isset($container)) {
                    $container = new Container();
                }
                
                $verificationRepo = $container->get(VerificationCodeRepositoryInterface::class);
                $verification = $verificationRepo->findValidByCodeAndType($token, DatabaseConstants::VERIFY_TYPE_PASSWORD);
                
                if ($verification) {
                    $isValid = true;
                    $payload = json_decode($verification['payload'] ?? '', true);
                    if (isset($payload['email'])) {
                        $userEmail = $payload['email'];
                    }
                }
            } catch (\Throwable $e) {
                Logger::error("Error in reset password view data validation: " . $e->getMessage(), ['exception' => $e]);
                $isValid = false;
            }
        }

        return [
            'token' => $token,
            'isValid' => $isValid,
            'userEmail' => $userEmail
        ];
    }
}
