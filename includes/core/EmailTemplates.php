<?php
// includes/core/EmailTemplates.php

namespace App\Core;

class EmailTemplates {
    
    /**
     * Genera el HTML completo para un correo combinando la plantilla específica con el layout maestro.
     * * @param string $templateName Nombre de la plantilla (ej. 'verification_code')
     * @param array $data Arreglo asociativo con las variables necesarias para la plantilla
     * @return string Código HTML final
     */
    public static function get($templateName, $data = []) {
        // Extraemos las variables del array para usarlas directamente (ej. $data['username'] -> $username)
        extract($data);
        
        $content = '';

        // 1. Seleccionamos el contenido específico según el tipo de correo
        switch ($templateName) {
            case 'verification_code':
                $content = "
                    <h2 style='color: #111111; margin-top: 0;'>Hola, {$username}</h2>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Gracias por registrarte en Project Rosaura. Para completar tu registro y verificar tu cuenta, por favor ingresa el siguiente código:</p>
                    
                    <div style='text-align: center; margin: 35px 0;'>
                        <span style='font-size: 26px; font-weight: bold; background-color: #f5f5fa; color: #111111; padding: 15px 25px; border-radius: 8px; letter-spacing: 4px; border: 1px solid #00000020; display: inline-block;'>{$code}</span>
                    </div>
                    
                    <p style='color: #666666; font-size: 14px;'>Este código expirará en 15 minutos.</p>
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
                    
                    <p style='color: #666666; font-size: 14px;'>Este enlace expirará en 15 minutos.</p>
                    <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                    <p style='font-size: 12px; color: #999999;'>Si no realizaste esta solicitud, ignora este correo. Tu cuenta sigue segura.</p>
                ";
                break;

            default:
                $content = "<p style='color: #111;'>Contenido del correo no especificado o plantilla no encontrada.</p>";
                break;
        }

        // 2. Retornamos el Layout Maestro inyectando el $content en el centro
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