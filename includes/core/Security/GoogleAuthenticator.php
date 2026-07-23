<?php

namespace App\Core\Security;

class GoogleAuthenticator {
    private int $codeLength = 6;
    private static string $base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public function createSecret(int $secretLength = 16): string {
        $secret = '';
        for ($i = 0; $i < $secretLength; $i++) {
            $secret .= self::$base32Chars[random_int(0, 31)];
        }
        return $secret;
    }

    public function getQRCodeUrl(string $name, string $email, string $secret): string {
        return "otpauth://totp/" . rawurlencode($name) . ":" . rawurlencode($email) . "?secret=" . $secret . "&issuer=" . rawurlencode($name);
    }

    public function verifyCode(string $secret, string $code, int $discrepancy = 4, ?int $currentTimeSlice = null): bool {
        if ($currentTimeSlice === null) {
            $currentTimeSlice = (int) floor(time() / 30);
        }
        
        $code = trim($code);
        if (strlen($code) !== 6 || !ctype_digit($code)) {
            return false;
        }

        $calculatedCodes = [];
        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $calculated = $this->getCode($secret, $currentTimeSlice + $i);
            $calculatedCodes[] = $calculated;
            if (hash_equals($calculated, $code)) {
                return true;
            }
        }

        if (class_exists('\\App\\Core\\System\\Logger')) {
            \App\Core\System\Logger::security("2FA verification failed", 'warning', [
                'provided_code' => $code,
                'secret_preview' => substr($secret, 0, 4) . '***',
                'time_slice' => $currentTimeSlice,
                'server_time' => date('Y-m-d H:i:s'),
                'expected_codes' => $calculatedCodes
            ]);
        }

        return false;
    }

    public function getCode(string $secret, ?int $timeSlice = null): string {
        if ($timeSlice === null) {
            $timeSlice = (int) floor(time() / 30);
        }

        $secretKey = $this->base32Decode($secret);
        if ($secretKey === false || $secretKey === '') {
            return '';
        }

        $time = pack('N*', 0) . pack('N*', $timeSlice);
        $hm = hash_hmac('sha1', $time, $secretKey, true);
        $offset = ord(substr($hm, -1)) & 0x0F;
        $hashpart = substr($hm, $offset, 4);
        $value = unpack('N', $hashpart)[1] & 0x7FFFFFFF;
        $modulo = 10 ** $this->codeLength;

        return str_pad((string) ($value % $modulo), $this->codeLength, '0', STR_PAD_LEFT);
    }

    private function base32Decode(string $secret) {
        $secret = strtoupper(trim(str_replace(['=', ' '], '', $secret)));
        if (empty($secret)) return '';

        $lookupTable = array_flip(str_split(self::$base32Chars));
        $binaryString = '';

        foreach (str_split($secret) as $char) {
            if (!isset($lookupTable[$char])) {
                return false;
            }
            $binaryString .= str_pad(decbin($lookupTable[$char]), 5, '0', STR_PAD_LEFT);
        }

        $bytes = '';
        foreach (str_split($binaryString, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $bytes .= chr((int) bindec($chunk));
            }
        }

        return $bytes;
    }
}
?>