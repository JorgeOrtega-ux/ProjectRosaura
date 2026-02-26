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
            'color' => '#d32f2f',
            'title' => __('require_2fa_title'),
            'desc' => __('require_2fa_desc'),
            'buttons' => [
                ['url' => '/ProjectRosaura/settings/2fa', 'text' => __('btn_configure_2fa'), 'class' => 'component-button--dark'],
                ['url' => '/ProjectRosaura/', 'text' => __('btn_back_home'), 'class' => '']
            ]
        ];
        break;

    case '404':
    default:
        http_response_code(404);
        $config = [
            'icon' => 'gpp_bad', // Puedes usar un ícono estándar para 404
            'color' => '#d32f2f',
            'title' => __('404_title'),
            'desc' => __('404_desc'),
            'buttons' => [
                ['url' => '/ProjectRosaura/', 'text' => __('btn_back_home'), 'class' => 'component-button--dark']
            ]
        ];
        break;
}
?>

<div class="view-content">
    <div class="component-wrapper">
        <div class="component-header-card" style="text-align: center; padding: 40px 24px; max-width: 500px; margin: 40px auto;">
            
            <?php if (!empty($config['icon'])): ?>
            <div class="component-card__icon-container component-card__icon-container--bordered" style="width: 64px; height: 64px; margin: 0 auto 16px auto;">
                <span class="material-symbols-rounded" style="font-size: 32px; color: <?php echo $config['color']; ?>;"><?php echo $config['icon']; ?></span>
            </div>
            <?php endif; ?>
            
            <h1 class="component-page-title" style="color: <?php echo $config['color']; ?>; margin-bottom: 12px;">
                <?php echo $config['title']; ?>
            </h1>
            
            <p class="component-page-description" style="margin-bottom: 32px; font-size: 16px; line-height: 1.5;">
                <?php echo $config['desc']; ?>
            </p>
            
            <div style="display: flex; flex-direction: column; gap: 12px; align-items: center; justify-content: center;">
                <?php foreach ($config['buttons'] as $btn): ?>
                    <button class="component-button <?php echo $btn['class']; ?> component-button--h45" style="width: 100%; max-width: 250px;" data-nav="<?php echo $btn['url']; ?>">
                        <?php echo $btn['text']; ?>
                    </button>
                <?php endforeach; ?>
            </div>

        </div>
    </div>
</div>