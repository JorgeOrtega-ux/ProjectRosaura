<?php
// includes/views/system/message.php
global $systemMessageType;

// Por defecto será 404 si no se especifica
$type = $systemMessageType ?? '404';

$config = [];

switch ($type) {
    case 'maintenance':
        http_response_code(503); // Standard status code for service unavailable
        $config = [
            'icon' => 'construction',
            'title' => __('maintenance_title') ?? 'Modo Mantenimiento',
            'desc' => __('maintenance_desc') ?? 'El sistema se encuentra en mantenimiento para mejoras y actualizaciones. Por favor, vuelve más tarde.'
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

    case 'deleted':
        http_response_code(403);
        $config = [
            'icon' => 'person_off',
            'title' => __('deleted_title'),
            'desc' => __('deleted_desc')
        ];
        break;

    case 'unauthorized_studio': // NUEVO MENSAJE DE STUDIO
        http_response_code(403);
        $config = [
            'icon' => 'lock',
            'title' => __('unauthorized_studio_title') ?? 'Acceso Denegado',
            'desc' => __('unauthorized_studio_desc') ?? 'Esta sección de Rosaura Studio no existe o no tienes los permisos necesarios para acceder al estudio de otro usuario.'
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