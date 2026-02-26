<?php
// includes/views/system/message.php
global $systemMessageType;

// Por defecto será 404 si no se especifica
$type = $systemMessageType ?? '404';

$config = [];

switch ($type) {
    case 'require_2fa':
        http_response_code(403);
        $config = [
            'icon' => 'shield_lock',
            'title' => __('require_2fa_title'),
            'desc' => __('require_2fa_desc')
        ];
        break;

    case 'suspended':
        http_response_code(403);
        $config = [
            'icon' => 'block',
            'title' => __('suspended_title'),
            'desc' => __('suspended_desc')
        ];
        break;

    case 'deleted':
        http_response_code(403);
        $config = [
            'icon' => 'person_off',
            'title' => __('deleted_title'),
            'desc' => __('deleted_desc')
        ];
        break;

    case '404':
    default:
        http_response_code(404);
        $config = [
            'icon' => 'gpp_bad', 
            'title' => __('404_title'),
            'desc' => __('404_desc')
        ];
        break;
}
?>

<div class="view-content component-message-layout">
    <div class="component-message-box">
        
        <?php if (!empty($config['icon'])): ?>
        <div class="component-message-icon-wrapper">
            <span class="material-symbols-rounded component-message-icon"><?php echo $config['icon']; ?></span>
        </div>
        <?php endif; ?>
        
        <h1 class="component-message-title">
            <?php echo $config['title']; ?>
        </h1>
        
        <p class="component-message-desc">
            <?php echo $config['desc']; ?>
        </p>

    </div>
</div>