<?php
// includes/core/Mail/EmailTemplates.php

namespace App\Core\Mail;

class EmailTemplates {
    
    public static function get($templateName, $data = []) {
        extract($data);
        
        // Variable dinámica para el tiempo de expiración (Fallback a 15 min)
        $expiresIn = $data['expiresIn'] ?? 15;
        
        $content = '';

        switch ($templateName) {
            case 'verification_code':
                $content = "
                    <h2 style='color: #111111; margin-top: 0;'>Hola, {$username}</h2>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Gracias por registrarte en Project Rosaura. Para completar tu registro y verificar tu cuenta, por favor ingresa el siguiente código:</p>
                    
                    <div style='text-align: center; margin: 35px 0;'>
                        <span style='font-size: 26px; font-weight: bold; background-color: #f5f5fa; color: #111111; padding: 15px 25px; border-radius: 8px; letter-spacing: 4px; border: 1px solid #00000020; display: inline-block;'>{$code}</span>
                    </div>
                    
                    <p style='color: #666666; font-size: 14px;'>Este código expirará en {$expiresIn} minutos.</p>
                    <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                    <p style='font-size: 12px; color: #999999;'>Si no solicitaste este registro, puedes ignorar este correo de forma segura.</p>
                ";
                break;

            case 'password_reset':
                $content = "
                    <h2 style='color: #111111; margin-top: 0;'>Hola, {$username}</h2>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva:</p>
                    
                    <div style='text-align: center; margin: 35px 0;'>
                        <a href='{$resetLink}' style='background-color: #111111; color: #ffffff; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;'>Restablecer contraseña</a>
                    </div>
                    
                    <p style='color: #666666; font-size: 14px;'>Este enlace expirará en {$expiresIn} minutos.</p>
                    <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                    <p style='font-size: 12px; color: #999999;'>Si no realizaste esta solicitud, ignora este correo. Tu cuenta sigue segura.</p>
                ";
                break;

            case 'email_update_code':
                $content = "
                    <h2 style='color: #111111; margin-top: 0;'>Hola, {$username}</h2>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Has solicitado actualizar el correo electrónico de tu cuenta. Para continuar y verificar tu identidad, por favor ingresa el siguiente código de confirmación:</p>
                    
                    <div style='text-align: center; margin: 35px 0;'>
                        <span style='font-size: 26px; font-weight: bold; background-color: #f5f5fa; color: #111111; padding: 15px 25px; border-radius: 8px; letter-spacing: 4px; border: 1px solid #00000020; display: inline-block;'>{$code}</span>
                    </div>
                    
                    <p style='color: #666666; font-size: 14px;'>Este código expirará en {$expiresIn} minutos.</p>
                    <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                    <p style='font-size: 12px; color: #999999;'>Si no realizaste esta solicitud, puedes ignorar este correo de forma segura y tu cuenta se mantendrá protegida.</p>
                ";
                break;

            case 'security_alert_email_changed':
                $content = "
                    <h2 style='color: #111111; margin-top: 0;'>Alerta de Seguridad, {$username}</h2>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Te informamos que un administrador ha modificado la dirección de correo electrónico asociada a tu cuenta.</p>
                    
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Tu nuevo correo registrado es: <br><b style='color: #111111; font-size: 16px;'>{$newEmail}</b></p>
                    
                    <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                    <p style='font-size: 13px; color: #d32f2f; font-weight: bold;'>¿No reconoces esta acción?</p>
                    <p style='font-size: 13px; color: #666666;'>Si tú no solicitaste este cambio o crees que fue un error, por favor ponte en contacto con nuestro equipo de soporte inmediatamente para asegurar tu cuenta.</p>
                ";
                break;

            case 'account_status_update':
                $actionText = $action === 'deleted' ? 'eliminada permanentemente' : 'suspendida temporal o definitivamente';
                $timeText = '';
                
                if ($action === 'suspended') {
                    if (!empty($endDate)) {
                        $formattedDate = date('d/m/Y h:i A', strtotime($endDate));
                        $timeText = "<p style='color: #666666; font-size: 14px;'>La suspensión finalizará el: <b style='color: #111111;'>{$formattedDate}</b>.</p>";
                    } else {
                        $timeText = "<p style='color: #666666; font-size: 14px;'>La suspensión es de carácter <b style='color: #111111;'>permanente</b>.</p>";
                    }
                }

                $content = "
                    <h2 style='color: #111111; margin-top: 0;'>Aviso de seguridad, {$username}</h2>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Te informamos que tu cuenta ha sido <b>{$actionText}</b> por nuestro equipo de moderación.</p>
                    
                    <div style='background-color: #fffaf9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #d32f2f30;'>
                        <p style='margin: 0; color: #d32f2f; font-size: 14px;'><b>Motivo:</b> " . htmlspecialchars($reason ?? 'No especificado') . "</p>
                    </div>
                    
                    {$timeText}
                    
                    <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                    <p style='font-size: 12px; color: #999999;'>Si consideras que esto es un error, por favor contacta a nuestro equipo de soporte.</p>
                ";
                break;

            default:
                $content = "<p style='color: #111;'>Contenido del correo no especificado o plantilla no encontrada.</p>";
                break;
        }

        return "
        <!DOCTYPE html>
        <html lang='es'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Notificación - Project Rosaura</title>
        </head>
        <body style='margin: 0; padding: 0; background-color: #f5f5fa; font-family: Arial, sans-serif;'>
            <div style='padding: 20px; background-color: #f5f5fa; color: #111;'>
                <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #00000020;'>
                    {$content}
                </div>
            </div>
        </body>
        </html>
        ";
    }
}
?>