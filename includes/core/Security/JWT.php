<?php

namespace App\Core\Security;

class JWT {
    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public static function encode(array $payload, string $secret, string $algo = 'HS256'): string {
        $header = ['typ' => 'JWT', 'alg' => $algo];
        $headerJson = json_encode($header);
        $payloadJson = json_encode($payload);

        $base64UrlHeader = self::base64UrlEncode($headerJson);
        $base64UrlPayload = self::base64UrlEncode($payloadJson);

        $signatureInput = $base64UrlHeader . "." . $base64UrlPayload;
        
        if ($algo === 'HS256') {
            $signature = hash_hmac('sha256', $signatureInput, $secret, true);
        } else {
            throw new \Exception("Unsupported algorithm");
        }

        $base64UrlSignature = self::base64UrlEncode($signature);

        return $signatureInput . "." . $base64UrlSignature;
    }

    public static function decode(string $jwt, string $secret, string $algo = 'HS256'): ?array {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            return null;
        }

        list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;

        $signatureInput = $headerEncoded . "." . $payloadEncoded;
        
        if ($algo === 'HS256') {
            $expectedSignature = hash_hmac('sha256', $signatureInput, $secret, true);
        } else {
            return null;
        }

        $expectedSignatureEncoded = self::base64UrlEncode($expectedSignature);

        if (!hash_equals($expectedSignatureEncoded, $signatureEncoded)) {
            return null;
        }

        $payloadJson = self::base64UrlDecode($payloadEncoded);
        $payload = json_decode($payloadJson, true);

        if (!$payload) {
            return null;
        }

        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }
}
