<?php
// includes/core/Mailer.php

namespace App\Core;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

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
            
            $this->mail->Body = "
                <div style='font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5fa; color: #111;'>
                    <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #00000020;'>
                        <h2 style='color: #111111; margin-top: 0;'>Hola, {$username}</h2>
                        <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Gracias por registrarte en Project Rosaura. Para completar tu registro y verificar tu cuenta, por favor ingresa el siguiente código:</p>
                        
                        <div style='text-align: center; margin: 35px 0;'>
                            <span style='font-size: 26px; font-weight: bold; background-color: #f5f5fa; color: #111111; padding: 15px 25px; border-radius: 8px; letter-spacing: 4px; border: 1px solid #00000020; display: inline-block;'>{$code}</span>
                        </div>
                        
                        <p style='color: #666666; font-size: 14px;'>Este código expirará en 15 minutos.</p>
                        <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                        <p style='font-size: 12px; color: #999999;'>Si no solicitaste este registro, puedes ignorar este correo de forma segura.</p>
                    </div>
                </div>
            ";
            
            $this->mail->AltBody = "Hola {$username},\n\nTu código de verificación es: {$code}\n\nEste código expira en 15 minutos.\n\nAtentamente,\nEl equipo de Project Rosaura";

            return $this->mail->send();
        } catch (Exception $e) {
            error_log("Fallo al enviar correo a {$toEmail}: {$this->mail->ErrorInfo}");
            return false;
        }
    }

    public function sendPasswordResetLink($toEmail, $username, $resetLink) {
        try {
            $this->mail->clearAddresses();
            $this->mail->addAddress($toEmail, $username);

            $this->mail->isHTML(true);
            $this->mail->Subject = 'Restablecer contraseña - Project Rosaura';
            
            $this->mail->Body = "
                <div style='font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5fa; color: #111;'>
                    <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #00000020;'>
                        <h2 style='color: #111111; margin-top: 0;'>Hola, {$username}</h2>
                        <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva:</p>
                        
                        <div style='text-align: center; margin: 35px 0;'>
                            <a href='{$resetLink}' style='background-color: #111111; color: #ffffff; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;'>Restablecer contraseña</a>
                        </div>
                        
                        <p style='color: #666666; font-size: 14px;'>Este enlace expirará en 15 minutos.</p>
                        <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                        <p style='font-size: 12px; color: #999999;'>Si no realizaste esta solicitud, ignora este correo. Tu cuenta sigue segura.</p>
                    </div>
                </div>
            ";
            
            $this->mail->AltBody = "Hola {$username},\n\nHaz recibido una solicitud para restablecer tu contraseña. Visita el siguiente enlace para crear una nueva: \n\n{$resetLink}\n\nEste enlace expira en 15 minutos.\n\nAtentamente,\nEl equipo de Project Rosaura";

            return $this->mail->send();
        } catch (Exception $e) {
            error_log("Fallo al enviar correo a {$toEmail}: {$this->mail->ErrorInfo}");
            return false;
        }
    }
}
?>