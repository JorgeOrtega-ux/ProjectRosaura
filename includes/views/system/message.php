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









Una cosa quiero que en panel de administracion agregues un btn en la seccion de dashboard en el top que diga algo como gestionar mensajes, en esa nueva seccion se me mostrara en forma de tabla todos los mensajes que se han enviado en todos los chats de los lienzos, mostrando de que, mensaje, quien lo envio, nombre del lienzo, fecha y hora, estado (si esta visible o eliminado o en revision) tambien quiero que al seleccionar algun mensaje en el top se generen btns de que para marcar como revision, marcar como eliminado, hacer visible, por ahora solo eso