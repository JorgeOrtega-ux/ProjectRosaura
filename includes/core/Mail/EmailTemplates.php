<?php
// includes/core/Mail/EmailTemplates.php

namespace App\Core\Mail;
use App\Core\System\Translator;

class EmailTemplates {
    
    public static function get($templateName, $data = [], $lang = 'es-419') {
        extract($data);
        
        $expiresIn = $data['expiresIn'] ?? 15;
        
        $content = '';

        switch ($templateName) {
            case 'verification_code':
                $title = Translator::getForLang($lang, 'email_greeting', ['username' => $username ?? '']);
                $p1 = Translator::getForLang($lang, 'email_verification_p1');
                $p2 = Translator::getForLang($lang, 'email_expires_in', ['expiresIn' => $expiresIn]);
                $p3 = Translator::getForLang($lang, 'email_ignore_notice');
                
                $content = "
                    <h2 style='color: #111111; margin-top: 0;'>{$title}</h2>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>{$p1}</p>
                    
                    <div style='text-align: center; margin: 35px 0;'>
                        <span style='font-size: 26px; font-weight: bold; background-color: #f5f5fa; color: #111111; padding: 15px 25px; border-radius: 8px; letter-spacing: 4px; border: 1px solid #00000020; display: inline-block;'>{$code}</span>
                    </div>
                    
                    <p style='color: #666666; font-size: 14px;'>{$p2}</p>
                    <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                    <p style='font-size: 12px; color: #999999;'>{$p3}</p>
                ";
                break;

            case 'password_reset':
                $title = Translator::getForLang($lang, 'email_greeting', ['username' => $username ?? '']);
                $p1 = Translator::getForLang($lang, 'email_password_reset_p1');
                $btn = Translator::getForLang($lang, 'email_password_reset_btn');
                $p2 = Translator::getForLang($lang, 'email_expires_in', ['expiresIn' => $expiresIn]);
                $p3 = Translator::getForLang($lang, 'email_password_reset_ignore');

                $content = "
                    <h2 style='color: #111111; margin-top: 0;'>{$title}</h2>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>{$p1}</p>
                    
                    <div style='text-align: center; margin: 35px 0;'>
                        <a href='{$resetLink}' style='background-color: #111111; color: #ffffff; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;'>{$btn}</a>
                    </div>
                    
                    <p style='color: #666666; font-size: 14px;'>{$p2}</p>
                    <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                    <p style='font-size: 12px; color: #999999;'>{$p3}</p>
                ";
                break;

            case 'email_update_code':
                $title = Translator::getForLang($lang, 'email_greeting', ['username' => $username ?? '']);
                $p1 = Translator::getForLang($lang, 'email_update_code_p1');
                $p2 = Translator::getForLang($lang, 'email_expires_in', ['expiresIn' => $expiresIn]);
                $p3 = Translator::getForLang($lang, 'email_update_ignore');

                $content = "
                    <h2 style='color: #111111; margin-top: 0;'>{$title}</h2>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>{$p1}</p>
                    
                    <div style='text-align: center; margin: 35px 0;'>
                        <span style='font-size: 26px; font-weight: bold; background-color: #f5f5fa; color: #111111; padding: 15px 25px; border-radius: 8px; letter-spacing: 4px; border: 1px solid #00000020; display: inline-block;'>{$code}</span>
                    </div>
                    
                    <p style='color: #666666; font-size: 14px;'>{$p2}</p>
                    <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                    <p style='font-size: 12px; color: #999999;'>{$p3}</p>
                ";
                break;

            case 'security_alert_email_changed':
                $title = Translator::getForLang($lang, 'email_security_greeting', ['username' => $username ?? '']);
                $p1 = Translator::getForLang($lang, 'email_security_email_changed_p1');
                $p2 = Translator::getForLang($lang, 'email_security_email_changed_p2');
                $unrec = Translator::getForLang($lang, 'email_unrecognized_action');
                $contact = Translator::getForLang($lang, 'email_contact_support');

                $content = "
                    <h2 style='color: #111111; margin-top: 0;'>{$title}</h2>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>{$p1}</p>
                    
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>{$p2} <br><b style='color: #111111; font-size: 16px;'>{$newEmail}</b></p>
                    
                    <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                    <p style='font-size: 13px; color: #d32f2f; font-weight: bold;'>{$unrec}</p>
                    <p style='font-size: 13px; color: #666666;'>{$contact}</p>
                ";
                break;

            case 'account_status_update':
                $title = Translator::getForLang($lang, 'email_moderation_greeting', ['username' => $username ?? '']);
                $actionTextStr = $action === 'deleted' ? Translator::getForLang($lang, 'email_status_deleted') : Translator::getForLang($lang, 'email_status_suspended');
                $p1 = Translator::getForLang($lang, 'email_account_status_p1', ['actionText' => $actionTextStr]);
                $reasonText = Translator::getForLang($lang, 'email_account_status_reason');
                $safeReason = htmlspecialchars($reason ?? Translator::getForLang($lang, 'email_reason_unspecified'));
                $contact2 = Translator::getForLang($lang, 'email_contact_support_2');
                
                $timeText = '';
                if ($action === 'suspended') {
                    if (!empty($endDate)) {
                        $formattedDate = date('d/m/Y h:i A', strtotime($endDate));
                        $timeText = "<p style='color: #666666; font-size: 14px;'>" . Translator::getForLang($lang, 'email_account_status_temp', ['date' => $formattedDate]) . "</p>";
                    } else {
                        $timeText = "<p style='color: #666666; font-size: 14px;'>" . Translator::getForLang($lang, 'email_account_status_perm') . "</p>";
                    }
                }

                $content = "
                    <h2 style='color: #111111; margin-top: 0;'>{$title}</h2>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>{$p1}</p>
                    
                    <div style='background-color: #fffaf9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #d32f2f30;'>
                        <p style='margin: 0; color: #d32f2f; font-size: 14px;'><b>{$reasonText}</b> {$safeReason}</p>
                    </div>
                    
                    {$timeText}
                    
                    <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                    <p style='font-size: 12px; color: #999999;'>{$contact2}</p>
                ";
                break;

            case '2fa_status_changed':
                $title = Translator::getForLang($lang, 'email_security_greeting', ['username' => $username ?? '']);
                $statusTextStr = $status === 'enabled' ? Translator::getForLang($lang, 'email_2fa_enabled') : Translator::getForLang($lang, 'email_2fa_disabled');
                $colorText = $status === 'enabled' ? '#2e7d32' : '#d32f2f';
                $p1 = Translator::getForLang($lang, 'email_2fa_status_p1', ['color' => $colorText, 'statusText' => $statusTextStr]);
                $unrec = Translator::getForLang($lang, 'email_unrecognized_action');
                $unrecP = Translator::getForLang($lang, 'email_2fa_unrecognized');

                $content = "
                    <h2 style='color: #111111; margin-top: 0;'>{$title}</h2>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>{$p1}</p>
                    
                    <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                    <p style='font-size: 13px; color: #d32f2f; font-weight: bold;'>{$unrec}</p>
                    <p style='font-size: 13px; color: #666666;'>{$unrecP}</p>
                ";
                break;

            case 'password_changed':
                $title = Translator::getForLang($lang, 'email_security_greeting', ['username' => $username ?? '']);
                $p1 = Translator::getForLang($lang, 'email_password_changed_p1');
                $p2 = Translator::getForLang($lang, 'email_password_changed_p2');
                $notyou = Translator::getForLang($lang, 'email_not_you');
                $unrecP = Translator::getForLang($lang, 'email_password_changed_unrecognized');

                $content = "
                    <h2 style='color: #111111; margin-top: 0;'>{$title}</h2>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>{$p1}</p>
                    <p style='color: #666666; font-size: 15px; line-height: 1.5;'>{$p2}</p>
                    
                    <hr style='border: none; border-top: 1px solid #00000020; margin: 25px 0;'>
                    <p style='font-size: 13px; color: #d32f2f; font-weight: bold;'>{$notyou}</p>
                    <p style='font-size: 13px; color: #666666;'>{$unrecP}</p>
                ";
                break;

            default:
                $content = "<p style='color: #111;'>" . Translator::getForLang($lang, 'email_template_not_found') . "</p>";
                break;
        }

        $notificationTitle = Translator::getForLang($lang, 'email_notification_title');

        return "
        <!DOCTYPE html>
        <html lang='{$lang}'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>{$notificationTitle}</title>
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