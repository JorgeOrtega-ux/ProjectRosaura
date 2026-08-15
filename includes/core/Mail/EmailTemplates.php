<?php

namespace App\Core\Mail;
use App\Core\System\Translator;

class EmailTemplates {
    
    public static function get($templateName, $data = [], $lang = 'es-419') {
        $jsonPath = defined('ROOT_PATH') ? ROOT_PATH . '/config/email_templates.json' : dirname(__DIR__, 3) . '/config/email_templates.json';
        if (!file_exists($jsonPath)) {
            $jsonPath = '/var/www/html/config/email_templates.json';
        }
        if (!file_exists($jsonPath)) {
            return "<p style='color: #111;'>Template system configuration missing.</p>";
        }
        
        $templates = json_decode(file_get_contents($jsonPath), true);
        if (!$templates || !isset($templates[$templateName])) {
            return "<p style='color: #111;'>Template not found: " . htmlspecialchars($templateName) . "</p>";
        }
        
        $template = $templates[$templateName];
        
        // Find correct language content
        $htmlContent = '';
        if (isset($template['html'][$lang])) {
            $htmlContent = $template['html'][$lang];
        } elseif (isset($template['html']['es-419'])) {
            $htmlContent = $template['html']['es-419'];
        } elseif (isset($template['html']['en'])) {
            $htmlContent = $template['html']['en'];
        } else {
            $htmlContent = reset($template['html']) ?: '';
        }
        
        // Special conditional variables for moderation/account_status_update
        if ($templateName === 'account_status_update') {
            $action = $data['action'] ?? '';
            $endDate = $data['endDate'] ?? '';
            $timeText = '';
            if ($action === 'suspended') {
                if (!empty($endDate)) {
                    $formattedDate = date('d/m/Y h:i A', strtotime($endDate));
                    $timeText = "<p style='color: #666666; font-size: 14px;'>" . Translator::getForLang($lang, 'email_account_status_temp', ['date' => $formattedDate]) . "</p>";
                } else {
                    $timeText = "<p style='color: #666666; font-size: 14px;'>" . Translator::getForLang($lang, 'email_account_status_perm') . "</p>";
                }
            }
            $data['timeText'] = $timeText;
            
            $actionTextStr = $action === 'deleted' ? Translator::getForLang($lang, 'email_status_deleted') : Translator::getForLang($lang, 'email_status_suspended');
            $data['actionText'] = $actionTextStr;
        }
        
        // Special variables for 2fa_status_changed
        if ($templateName === '2fa_status_changed') {
            $status = $data['status'] ?? '';
            $statusTextStr = $status === 'enabled' ? Translator::getForLang($lang, 'email_2fa_enabled') : Translator::getForLang($lang, 'email_2fa_disabled');
            $colorText = $status === 'enabled' ? '#2e7d32' : '#d32f2f';
            $data['statusText'] = $statusTextStr;
            $data['color'] = $colorText;
        }

        // Support ticket created message block
        if ($templateName === 'support_ticket_created') {
            $msg = trim($data['message'] ?? '');
            if (!empty($msg)) {
                $lbl = ($lang === 'en' || strpos($lang, 'en') === 0) ? 'Message submitted:' : 'Mensaje enviado:';
                $data['ticketMessageBlock'] = "<div style='margin-top: 14px; padding-top: 12px; border-top: 1px solid #00000010;'><p style='margin: 0 0 6px 0; color: #777777; font-size: 13px;'><strong>" . $lbl . "</strong></p><p style='margin: 0; color: #333333; font-size: 13px; line-height: 1.5; white-space: pre-wrap; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #00000010;'>" . htmlspecialchars($msg) . "</p></div>";
            } else {
                $data['ticketMessageBlock'] = '';
            }
        }

        // Support chat transcript blocks
        if ($templateName === 'support_chat_transcript') {
            $summary = trim($data['summary'] ?? '');
            if (!empty($summary)) {
                $lblSummary = ($lang === 'en' || strpos($lang, 'en') === 0) ? 'Resolution summary:' : 'Resumen de resolución:';
                $data['resolutionBlock'] = "<p style='margin: 6px 0 0 0; font-size: 13px; color: #555555;'><strong>" . $lblSummary . "</strong> <span style='color: #111111;'>" . htmlspecialchars($summary) . "</span></p>";
            } else {
                $data['resolutionBlock'] = '';
            }
        }
        
        if (!isset($data['expiresIn'])) {
            $data['expiresIn'] = 15;
        }
        
        // Interpolate data values
        foreach ($data as $key => $val) {
            if (is_scalar($val) || $val === null) {
                $htmlContent = str_replace('{{' . $key . '}}', (string)$val, $htmlContent);
            }
        }
        
        // Load layout wrapper from JSON
        $layout = $templates['layout'] ?? '<html><body>{{content}}</body></html>';
        
        $notificationTitle = Translator::getForLang($lang, 'email_notification_title');
        
        // Interpolate layout wrapper
        $layout = str_replace('{{lang}}', htmlspecialchars($lang), $layout);
        $layout = str_replace('{{notificationTitle}}', htmlspecialchars($notificationTitle), $layout);
        $layout = str_replace('{{content}}', $htmlContent, $layout);
        
        return $layout;
    }
}