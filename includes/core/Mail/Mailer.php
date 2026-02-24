<?php
// includes/core/Mailer.php

namespace App\Core;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use App\Core\Logger;

class Mailer {
    private $mail;

    public function __construct() {
        $this->mail = new PHPMailer(true);
        
        $this->mail->isSMTP();
        $this->mail->Host       = $_ENV['SMTP_HOST'] ?? 'smtp.gmail.com';
        $this->mail->SMTPAuth   = true;
        $this->mail->Username   = $_ENV['SMTP_USER'] ?? '';
        $this->mail->Password   = $_ENV['SMTP_PASS'] ?? '';
        $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; 
        $this->mail->Port       = $_ENV['SMTP_PORT'] ?? 465;
        $this->mail->CharSet    = 'UTF-8';

        $fromEmail = $_ENV['SMTP_FROM_EMAIL'] ?? $_ENV['SMTP_USER'];
        $fromName  = $_ENV['SMTP_FROM_NAME'] ?? 'Project Rosaura';
        $this->mail->setFrom($fromEmail, $fromName);
    }

    public function sendVerificationCode($toEmail, $username, $code) {
        try {
            $this->mail->clearAddresses();
            $this->mail->addAddress($toEmail, $username);

            $this->mail->isHTML(true);
            $this->mail->Subject = 'Código de Verificación - Project Rosaura';
            
            $this->mail->Body = EmailTemplates::get('verification_code', [
                'username' => $username,
                'code' => $code
            ]);
            
            $this->mail->AltBody = "Hola {$username},\n\nTu código de verificación es: {$code}\n\nEste código expira en 15 minutos.\n\nAtentamente,\nEl equipo de Project Rosaura";

            return $this->mail->send();
        } catch (Exception $e) {
            Logger::security("Fallo al enviar correo de verificación a {$toEmail}: {$this->mail->ErrorInfo}", Logger::LEVEL_ERROR);
            return false;
        }
    }

    public function sendPasswordResetLink($toEmail, $username, $resetLink) {
        try {
            $this->mail->clearAddresses();
            $this->mail->addAddress($toEmail, $username);

            $this->mail->isHTML(true);
            $this->mail->Subject = 'Restablecer contraseña - Project Rosaura';
            
            $this->mail->Body = EmailTemplates::get('password_reset', [
                'username' => $username,
                'resetLink' => $resetLink
            ]);
            
            $this->mail->AltBody = "Hola {$username},\n\nHaz recibido una solicitud para restablecer tu contraseña. Visita el siguiente enlace para crear una nueva: \n\n{$resetLink}\n\nEste enlace expira en 15 minutos.\n\nAtentamente,\nEl equipo de Project Rosaura";

            return $this->mail->send();
        } catch (Exception $e) {
            Logger::security("Fallo al enviar correo de restablecimiento a {$toEmail}: {$this->mail->ErrorInfo}", Logger::LEVEL_ERROR);
            return false;
        }
    }

    public function sendEmailUpdateCode($toEmail, $username, $code) {
        try {
            $this->mail->clearAddresses();
            $this->mail->addAddress($toEmail, $username);

            $this->mail->isHTML(true);
            $this->mail->Subject = 'Actualización de correo - Project Rosaura';
            
            $this->mail->Body = EmailTemplates::get('email_update_code', [
                'username' => $username,
                'code' => $code
            ]);
            
            $this->mail->AltBody = "Hola {$username},\n\nTu código de verificación para autorizar el cambio de correo es: {$code}\n\nEste código expira en 15 minutos.\n\nAtentamente,\nEl equipo de Project Rosaura";

            return $this->mail->send();
        } catch (Exception $e) {
            Logger::security("Fallo al enviar correo de cambio de email a {$toEmail}: {$this->mail->ErrorInfo}", Logger::LEVEL_ERROR);
            return false;
        }
    }
}
?>