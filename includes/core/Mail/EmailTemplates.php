<?php

namespace App\Core\Mail;
use App\Core\System\Translator;

class EmailTemplates {
    
    public static function get($templateName, $data = [], $lang = 'es-419') {
        $jsonPath = defined('ROOT_PATH') ? ROOT_PATH . '/config/data/email_templates.json' : dirname(__DIR__, 3) . '/config/data/email_templates.json';
        if (!file_exists($jsonPath)) {
            $jsonPath = '/var/www/html/config/data/email_templates.json';
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