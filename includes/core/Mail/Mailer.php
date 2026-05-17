<?php
// includes/core/Mail/Mailer.php

namespace App\Core\Mail;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;
use Exception;
use App\Core\System\Logger;
use App\Config\DatabaseManager;
use App\Core\System\Translator;
use App\Core\Helpers\Utils;

class Mailer {
    private $mail;

    public function __construct() {
        if (!isset($_ENV['SMTP_HOST'], $_ENV['SMTP_USER'], $_ENV['SMTP_PASS'], $_ENV['SMTP_PORT'])) {
            Logger::critical("Critical Failure: Missing essential SMTP configuration in environment variables.");
            throw new Exception("Critical Failure: Missing essential SMTP configuration in environment variables.");
        }

        $this->mail = new PHPMailer(true);
        
        $this->mail->isSMTP();
        $this->mail->Host       = $_ENV['SMTP_HOST'];
        $this->mail->SMTPAuth   = true;
        $this->mail->Username   = $_ENV['SMTP_USER'];
        $this->mail->Password   = $_ENV['SMTP_PASS'];
        $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; 
        $this->mail->Port       = (int)$_ENV['SMTP_PORT'];
        $this->mail->CharSet    = 'UTF-8';

        $fromEmail = $_ENV['SMTP_FROM_EMAIL'] ?? $_ENV['SMTP_USER'];
        $fromName  = trim($_ENV['SMTP_FROM_NAME'] ?? '"Project Rosaura"', '"\'');
        
        $this->mail->setFrom($fromEmail, $fromName);
    }

    private function getTargetLanguage($email) {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection('identity');
            
            $stmt = $pdo->prepare("SELECT p.language FROM user_preferences p JOIN users u ON p.user_id = u.id WHERE u.email = ? LIMIT 1");
            $stmt->execute([$email]);
            $lang = $stmt->fetchColumn();
            
            $available = Translator::getAvailableLanguages();
            if ($lang && array_key_exists($lang, $available)) {
                return $lang;
            }
        } catch (\Throwable $e) {
            Logger::warning("Could not fetch user language for email, falling back to headers", ['email' => $email]);
        }

        $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
        return Utils::getClosestLanguage($acceptLang) ?: 'es-419';
    }

    /**
     * Obtiene el límite dinámico de expiración desde la base de datos de configuración global.
     */
    private function getExpirationConfig($type) {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection('identity');
            $column = ($type === 'verification') ? 'verification_code_expiration_minutes' : 'password_reset_expiration_minutes';
            
            $stmt = $pdo->query("SELECT {$column} FROM server_config LIMIT 1");
            $minutes = (int)$stmt->fetchColumn();
            
            return $minutes > 0 ? $minutes : 15;
        } catch (\Throwable $e) {
            Logger::warning("Failed to fetch dynamic expiration for {$type}, defaulting to 15 mins", ['exception' => $e]);
            return 15;
        }
    }

    public function sendVerificationCode($toEmail, $username, $code) {
        try {
            $lang = $this->getTargetLanguage($toEmail);
            $expiresIn = $this->getExpirationConfig('verification');
            
            $this->mail->clearAddresses();
            $this->mail->addAddress($toEmail, $username);

            $this->mail->isHTML(true);
            $this->mail->Subject = Translator::getForLang($lang, 'email_verification_subject');
            
            $this->mail->Body = EmailTemplates::get('verification_code', [
                'username' => $username,
                'code' => $code
            ], $lang);
            
            $this->mail->AltBody = Translator::getForLang($lang, 'email_verification_alt', [
                'username' => $username,
                'code' => $code,
                'expiresIn' => $expiresIn
            ]);

            return $this->mail->send();
        } catch (PHPMailerException $e) {
            Logger::error("Failed to send verification email", ['to_email' => $toEmail, 'smtp_error' => $this->mail->ErrorInfo, 'exception' => $e]);
            return false;
        }
    }

    public function sendPasswordResetLink($toEmail, $username, $resetLink) {
        try {
            $lang = $this->getTargetLanguage($toEmail);
            $expiresIn = $this->getExpirationConfig('reset');

            $this->mail->clearAddresses();
            $this->mail->addAddress($toEmail, $username);

            $this->mail->isHTML(true);
            $this->mail->Subject = Translator::getForLang($lang, 'email_password_reset_subject');
            
            $this->mail->Body = EmailTemplates::get('password_reset', [
                'username' => $username,
                'resetLink' => $resetLink
            ], $lang);
            
            $this->mail->AltBody = Translator::getForLang($lang, 'email_password_reset_alt', [
                'username' => $username,
                'resetLink' => $resetLink,
                'expiresIn' => $expiresIn
            ]);

            return $this->mail->send();
        } catch (PHPMailerException $e) {
            Logger::error("Failed to send password reset email", ['to_email' => $toEmail, 'smtp_error' => $this->mail->ErrorInfo, 'exception' => $e]);
            return false;
        }
    }

    public function sendEmailUpdateCode($toEmail, $username, $code) {
        try {
            $lang = $this->getTargetLanguage($toEmail);
            $expiresIn = $this->getExpirationConfig('verification');

            $this->mail->clearAddresses();
            $this->mail->addAddress($toEmail, $username);

            $this->mail->isHTML(true);
            $this->mail->Subject = Translator::getForLang($lang, 'email_update_subject');
            
            $this->mail->Body = EmailTemplates::get('email_update_code', [
                'username' => $username,
                'code' => $code
            ], $lang);
            
            $this->mail->AltBody = Translator::getForLang($lang, 'email_update_code_alt', [
                'username' => $username,
                'code' => $code,
                'expiresIn' => $expiresIn
            ]);

            return $this->mail->send();
        } catch (PHPMailerException $e) {
            Logger::error("Failed to send email update verification code", ['to_email' => $toEmail, 'smtp_error' => $this->mail->ErrorInfo, 'exception' => $e]);
            return false;
        }
    }

    public function sendSecurityAlertEmailChanged($toEmail, $username, $newEmail) {
        try {
            $lang = $this->getTargetLanguage($toEmail);
            $this->mail->clearAddresses();
            $this->mail->addAddress($toEmail, $username);

            $this->mail->isHTML(true);
            $this->mail->Subject = Translator::getForLang($lang, 'email_security_email_changed_subject');
            
            $this->mail->Body = EmailTemplates::get('security_alert_email_changed', [
                'username' => $username,
                'newEmail' => $newEmail
            ], $lang);
            
            $this->mail->AltBody = Translator::getForLang($lang, 'email_security_email_changed_alt', [
                'username' => $username,
                'newEmail' => $newEmail
            ]);

            return $this->mail->send();
        } catch (PHPMailerException $e) {
            Logger::error("Failed to send security alert for email change", ['to_email' => $toEmail, 'smtp_error' => $this->mail->ErrorInfo, 'exception' => $e]);
            return false;
        }
    }

    public function sendAccountStatusNotification($toEmail, $username, $action, $reason, $endDate = null) {
        try {
            $lang = $this->getTargetLanguage($toEmail);
            $this->mail->clearAddresses();
            $this->mail->addAddress($toEmail, $username);

            $this->mail->isHTML(true);
            $this->mail->Subject = Translator::getForLang($lang, 'email_account_status_subject');
            
            $this->mail->Body = EmailTemplates::get('account_status_update', [
                'username' => $username,
                'action' => $action,
                'reason' => $reason,
                'endDate' => $endDate
            ], $lang);
            
            $this->mail->AltBody = Translator::getForLang($lang, 'email_account_status_alt', [
                'username' => $username,
                'reason' => $reason
            ]);

            return $this->mail->send();
        } catch (PHPMailerException $e) {
            Logger::error("Failed to send account status notification email", ['to_email' => $toEmail, 'smtp_error' => $this->mail->ErrorInfo, 'exception' => $e]);
            return false;
        }
    }

    public function send2FAStatusNotification($toEmail, $username, $status) {
        try {
            $lang = $this->getTargetLanguage($toEmail);
            $this->mail->clearAddresses();
            $this->mail->addAddress($toEmail, $username);

            $this->mail->isHTML(true);
            $this->mail->Subject = Translator::getForLang($lang, 'email_2fa_status_subject');
            
            $this->mail->Body = EmailTemplates::get('2fa_status_changed', [
                'username' => $username,
                'status' => $status
            ], $lang);
            
            $statusTranslated = $status === 'enabled' ? Translator::getForLang($lang, 'email_2fa_enabled') : Translator::getForLang($lang, 'email_2fa_disabled');
            $this->mail->AltBody = Translator::getForLang($lang, 'email_2fa_status_alt', [
                'username' => $username,
                'status' => $statusTranslated
            ]);

            return $this->mail->send();
        } catch (PHPMailerException $e) {
            Logger::error("Failed to send 2FA status notification email", ['to_email' => $toEmail, 'smtp_error' => $this->mail->ErrorInfo, 'exception' => $e]);
            return false;
        }
    }

    public function sendPasswordChangeNotification($toEmail, $username) {
        try {
            $lang = $this->getTargetLanguage($toEmail);
            $this->mail->clearAddresses();
            $this->mail->addAddress($toEmail, $username);

            $this->mail->isHTML(true);
            $this->mail->Subject = Translator::getForLang($lang, 'email_password_changed_subject');
            
            $this->mail->Body = EmailTemplates::get('password_changed', [
                'username' => $username
            ], $lang);
            
            $this->mail->AltBody = Translator::getForLang($lang, 'email_password_changed_alt', [
                'username' => $username
            ]);

            return $this->mail->send();
        } catch (PHPMailerException $e) {
            Logger::error("Failed to send password change notification email", ['to_email' => $toEmail, 'smtp_error' => $this->mail->ErrorInfo, 'exception' => $e]);
            return false;
        }
    }
}
?>