<?php

namespace App\Core\Middlewares;

use App\Core\Interfaces\MiddlewareInterface;
use App\Core\Security\TurnstileValidator;
use App\Core\Helpers\Utils;
use App\Core\System\HttpConstants;
use App\Core\System\Logger;

class TurnstileMiddleware implements MiddlewareInterface {
    private TurnstileValidator $validator;

    public function __construct(TurnstileValidator $validator = null) {
        $this->validator = $validator ?? new TurnstileValidator();
    }

    public function handle(array $input, array $params = []): bool {
        $token = $input['turnstile_token'] ?? $input['cf-turnstile-response'] ?? null;
        $ip = Utils::getIpAddress();

        if (!$this->validator->isValid($token, $ip)) {
            Logger::security("Turnstile validation failed in middleware", 'warning', [
                'ip' => $ip,
                'token_present' => !empty($token)
            ]);

            http_response_code(HttpConstants::FORBIDDEN);
            echo json_encode([
                'success' => false,
                'message_key' => 'error.captcha_failed',
                'message' => __('err_captcha_failed')
            ]);
            return false;
        }

        return true;
    }
}
?>
