<?php

namespace App\Core\Security;

use App\Core\Helpers\EnvLoader;
use App\Core\System\Logger;
use Exception;

class DataCipher {
    private const CIPHER_ALGO = 'aes-256-gcm';
    private const IV_LENGTH = 12;
    private const TAG_LENGTH = 16;
    private const PREFIX = 'v1:';

    private static ?string $masterKey = null;

    /**
     * Retrieve or derive 256-bit encryption key from environment.
     */
    private static function getKey(): string {
        if (self::$masterKey !== null) {
            return self::$masterKey;
        }

        $rawKey = EnvLoader::get('PII_ENCRYPTION_KEY', '') 
            ?: EnvLoader::get('APP_KEY', '') 
            ?: EnvLoader::get('INTERNAL_API_SECRET', 'rosaura_pii_default_master_key_secure');

        self::$masterKey = hash('sha256', $rawKey, true);
        return self::$masterKey;
    }

    /**
     * Encrypt a plaintext string using AES-256-GCM.
     *
     * @param string|null $plaintext
     * @param string|null $additionalData
     * @return string|null Envelope formatted string 'v1:{base64}' or null if empty
     */
    public static function encrypt(?string $plaintext, ?string $additionalData = null): ?string {
        if ($plaintext === null || $plaintext === '') {
            return $plaintext;
        }

        try {
            $key = self::getKey();
            $iv = random_bytes(self::IV_LENGTH);
            $tag = '';

            $ciphertext = openssl_encrypt(
                $plaintext,
                self::CIPHER_ALGO,
                $key,
                OPENSSL_RAW_DATA,
                $iv,
                $tag,
                $additionalData ?? '',
                self::TAG_LENGTH
            );

            if ($ciphertext === false) {
                Logger::error("DataCipher encryption failed");
                return $plaintext;
            }

            // Envelope: IV (12 bytes) + Tag (16 bytes) + Ciphertext
            $envelope = $iv . $tag . $ciphertext;
            return self::PREFIX . base64_encode($envelope);

        } catch (Exception $e) {
            Logger::error("DataCipher encryption exception: " . $e->getMessage());
            return $plaintext;
        }
    }

    /**
     * Decrypt a ciphertext string using AES-256-GCM.
     * If the payload is not in envelope format (legacy plain text), returns as-is.
     *
     * @param string|null $payload
     * @param string|null $additionalData
     * @return string|null
     */
    public static function decrypt(?string $payload, ?string $additionalData = null): ?string {
        if ($payload === null || $payload === '') {
            return $payload;
        }

        // Backward compatibility: if not prefixed with envelope version, return plaintext
        if (!str_starts_with($payload, self::PREFIX)) {
            return $payload;
        }

        try {
            $key = self::getKey();
            $rawEncoded = substr($payload, strlen(self::PREFIX));
            $envelope = base64_decode($rawEncoded, true);

            if ($envelope === false || strlen($envelope) < (self::IV_LENGTH + self::TAG_LENGTH)) {
                return $payload;
            }

            $iv = substr($envelope, 0, self::IV_LENGTH);
            $tag = substr($envelope, self::IV_LENGTH, self::TAG_LENGTH);
            $ciphertext = substr($envelope, self::IV_LENGTH + self::TAG_LENGTH);

            $plaintext = openssl_decrypt(
                $ciphertext,
                self::CIPHER_ALGO,
                $key,
                OPENSSL_RAW_DATA,
                $iv,
                $tag,
                $additionalData ?? ''
            );

            if ($plaintext === false) {
                Logger::error("DataCipher decryption authentication failed (tampered data or wrong key)");
                return $payload;
            }

            return $plaintext;

        } catch (Exception $e) {
            Logger::error("DataCipher decryption exception: " . $e->getMessage());
            return $payload;
        }
    }
}
