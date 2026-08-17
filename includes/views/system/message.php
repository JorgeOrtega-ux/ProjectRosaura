<?php
global $systemMessageType;
$type = $systemMessageType ?? '404';

$config = [];

switch ($type) {
    case 'maintenance':
        http_response_code(503);
        $config = [
            'icon' => 'construction',
            'title' => __('maintenance_title'),
            'desc' => __('maintenance_desc')
        ];
        break;

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

    case 'canvas_banned':
        http_response_code(403);
        $config = [
            'icon' => 'gavel',
            'title' => __('canvas_banned_title'),
            'desc' => __('err_user_banned_from_canvas')
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

    case 'subscription_required':
        http_response_code(403);
        $config = [
            'icon' => 'workspace_premium',
            'title' => __('subscription_required_title'),
            'desc' => __('subscription_required_desc')
        ];
        break;

    case 'no_permission':
        http_response_code(403);
        $config = [
            'icon' => 'lock',
            'title' => __('no_permission_title') ?? 'Acceso Denegado',
            'desc' => __('no_permission_desc') ?? 'No estás autorizado para realizar esta acción.'
        ];
        break;

    case 'region_blocked':
        http_response_code(403);
        $config = [
            'icon' => 'public_off',
            'title' => __('region_blocked_title') ?: 'Servicio no disponible en tu región',
            'desc' => __('region_blocked_desc') ?: 'Este servicio o función no se encuentra disponible actualmente para tu país o región.'
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